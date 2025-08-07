// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Utils from '../common/utils.js';
import { AgentService } from '../core/AgentService.js';
import { createLogger } from '../core/Logger.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';

import { NodeIDsToURLsTool, type Tool } from './Tools.js';

const logger = createLogger('Tool:SchemaBasedExtractor');

// Define the structure for the metadata LLM call's expected response
interface ExtractionMetadata {
  progress: string;
  completed: boolean;
  reasoning?: string; // Explanation of what data was found and why fields might be missing
  pageContext?: string; // Brief description of what type of page/content was analyzed
  missingFields?: string; // Comma-separated list of fields that couldn't be extracted
}

// Update the result interface to include metadata
export interface SchemaExtractionResult {
  success: boolean;
  data: any | null;
  error?: string;
  metadata?: ExtractionMetadata; // Added metadata field
}

/**
 * Tool for extracting structured data from DOM based on schema definitions
 */
export class SchemaBasedExtractorTool implements Tool<SchemaExtractionArgs, SchemaExtractionResult> {
  name = 'extract_schema_data';
  description = `Extracts structured data from a web page's DOM using a user-provided JSON schema and natural language instruction.
  - The schema defines the exact structure and types of data to extract (e.g., text, numbers, URLs).
  - For fields representing URLs, specify them in the schema as: { type: 'string', format: 'url' }.
  - The tool uses the page's accessibility tree for robust extraction, including hidden or dynamic content.
  - The extraction process is multi-step: it first extracts data (using accessibility node IDs for URLs), then resolves those IDs to actual URLs, and finally provides metadata about extraction progress and completeness.
  - If a detailed or specific extraction is required, clarify it in the instruction.
  - Returns: { success, data, error (if any), metadata }.

Schema Examples:
• Single product: {"type": "object", "properties": {"name": {"type": "string"}, "price": {"type": "number"}, "url": {"type": "string", "format": "url"}}}
• List of items: {"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {"title": {"type": "string"}, "link": {"type": "string", "format": "url"}}}}}}
• Search results: {"type": "object", "properties": {"results": {"type": "array", "items": {"type": "object", "properties": {"title": {"type": "string"}, "snippet": {"type": "string"}, "url": {"type": "string", "format": "url"}}}}}}
• News articles: {"type": "object", "properties": {"articles": {"type": "array", "items": {"type": "object", "properties": {"headline": {"type": "string"}, "author": {"type": "string"}, "publishDate": {"type": "string"}, "link": {"type": "string", "format": "url"}}}}}}`;

  schema = {
    type: 'object',
    properties: {
      schema: {
        type: 'object',
        description: 'JSON Schema definition of the data to extract'
      },
      instruction: {
        type: 'string',
        description: 'Natural language instruction for the extraction agent'
      },
      reasoning: {
        type: 'string',
        description: 'Reasoning about the extraction process displayed to the user'
      }
    },
    required: ['schema', 'instruction', 'reasoning']
  };


  /**
   * Execute the schema-based extraction
   */

  async execute(args: SchemaExtractionArgs): Promise<SchemaExtractionResult> {
    logger.debug('Executing with args', args);
    
    const { schema, instruction, reasoning } = args;
    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();

    if (!apiKey) {
      return {
        success: false,
        data: null,
        error: 'API key not configured'
      };
    }

    // Enhanced schema validation with helpful error messages
    if (!schema) {
      return {
        success: false,
        data: null,
        error: 'Schema is required. Please provide a JSON Schema definition that describes the structure of data to extract. Example: {"type": "object", "properties": {"title": {"type": "string"}}}'
      };
    }

    try {
      // 1. Get primary target and wait for page load
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) {
        return {
          success: false,
          error: 'No page target available',
          data: null
        };
      }

      // const READINESS_TIMEOUT_MS = 15000; // 15 seconds timeout for page readiness
      // try {
      //   logger.info('Checking page readiness (Timeout: ${READINESS_TIMEOUT_MS}ms)...');
      //   await waitForPageLoad(target, READINESS_TIMEOUT_MS);
      //   logger.info('Page is ready or timeout reached.');
      // } catch (readinessError: any) {
      //    logger.error(`Page readiness check failed: ${readinessError.message}`);
      //    return {
      //       success: false,
      //       data: null,
      //       error: `Page did not become ready: ${readinessError.message}`
      //    };
      // }

      const rootBackendNodeId: Protocol.DOM.BackendNodeId | undefined = undefined;
      const rootNodeId: Protocol.DOM.NodeId | undefined = undefined;

      // 2. Transform schema to replace URL fields with numeric AX Node IDs (strings)
      const [transformedSchema, urlPaths] = this.transformUrlFieldsToIds(schema);
      logger.debug('Transformed Schema:', JSON.stringify(transformedSchema, null, 2));
      logger.debug('URL Paths:', urlPaths);

      // 3. Get raw accessibility tree nodes for the target scope to build URL mapping
      const accessibilityAgent = target.accessibilityAgent();
      const axTreeParams: Protocol.Accessibility.GetFullAXTreeRequest = {};

      // We can optionally use NodeId or BackendNodeId for scoping if needed in the future
      // Both are currently undefined since we're working with the full tree
      if (rootNodeId) {
        // NOTE: Depending on CDP version/implementation, scoping by NodeId might be preferred
        // if backendNodeId scoping doesn't work as expected.
        // Cast to 'any' if the specific property (nodeId or backendNodeId) isn't strictly typed.
        (axTreeParams as any).nodeId = rootNodeId;
      } else if (rootBackendNodeId) {
        // Fallback to backendNodeId if NodeId wasn't obtained or isn't supported for scoping
        (axTreeParams as any).backendNodeId = rootBackendNodeId;
      }

      const rawAxTree = await accessibilityAgent.invoke_getFullAXTree(axTreeParams);
      if (!rawAxTree?.nodes) {
        throw new Error('Failed to get raw accessibility tree nodes');
      }
      // Keep the URL mapping for logging purposes
      const idToUrlMapping = this.buildUrlMapping(rawAxTree.nodes);
      logger.debug(`Built URL mapping with ${Object.keys(idToUrlMapping).length} entries.`);

      // 4. Get the processed accessibility tree text using Utils
      // NOTE: Utils.getAccessibilityTree currently gets the *full* tree.
      // If scoping is critical, this might need adjustment or filtering based on the selector.
      // For now, we use the full tree text for the LLM context.
      const processedTreeResult = await Utils.getAccessibilityTree(target);
      const treeText = processedTreeResult.simplified;
      logger.debug('Processed Accessibility Tree Text (length):', treeText.length);
      // logger.debug('[SchemaBasedExtractorTool] Tree Text:', treeText); // Uncomment for full tree text

      // ---- Start Multi-step LLM Process ----

      // 5. Initial Extract Call
      logger.debug('Starting initial LLM extraction...');
      const initialExtraction = await this.callExtractionLLM({
        instruction: instruction || 'Extract data according to schema',
        domContent: treeText,
        schema: transformedSchema,
        apiKey,
      });

      logger.debug('Initial extraction result:', initialExtraction);
      if (!initialExtraction) { // Check if initial extraction failed
        return {
          success: false,
          error: 'Initial data extraction failed',
          data: null,
        };
      }

      // 6. Refine Call
      const refinedData = await this.callRefinementLLM({
        instruction: instruction || 'Refine the extracted data based on the original request',
        schema: transformedSchema, // Use the same transformed schema
        initialData: initialExtraction,
        apiKey,
      });

      logger.debug('Refinement result:', refinedData);
      if (!refinedData) { // Check if refinement failed
        return {
          success: false,
          error: 'Data refinement step failed',
          data: null,
        };
      }

      // 7. LLM + Tool Call for URL Resolution - New approach
      const finalData = await this.resolveUrlsWithLLM({
        data: refinedData,
        apiKey,
        schema, // Original schema to understand what fields are URLs
      });

      logger.debug('Data after URL resolution:',
        JSON.stringify(Array.isArray(finalData) ? finalData.slice(0, 2) : finalData, null, 2).substring(0, 500));

      // 7a. Check if any URL fields still contain numeric node IDs
      let urlResolutionWarning: string | undefined;
      const dataString = JSON.stringify(finalData);
      // Simple heuristic: if we have numbers where URLs are expected in common URL field names
      if (dataString.match(/"(url|link|href|website|webpage)"\s*:\s*\d+/i)) {
        urlResolutionWarning = 'Note: Some URL fields may contain unresolved node IDs instead of actual URLs.';
        logger.warn('Detected potential unresolved node IDs in URL fields');
      }

      // 8. Metadata Call
      const metadata = await this.callMetadataLLM({
        instruction: instruction || 'Assess extraction completion',
        extractedData: finalData, // Use the final data with URLs for assessment
        domContent: treeText, // Pass the DOM content for context
        schema, // Pass the schema to understand what was requested
        apiKey,
      });

      logger.debug('Metadata result:', metadata);
      if (!metadata) { // Check if metadata call failed
        // Decide if this should be a hard failure or just return without metadata
        logger.warn('Metadata extraction step failed, proceeding without metadata.');
        // If metadata is critical, return failure:
        // return {
        //   success: false,
        //   error: 'Metadata extraction step failed',
        //   data: null,
        // };
      }

      // ---- End Multi-step LLM Process ----

      // Prepare the result
      const result: SchemaExtractionResult = {
        success: true,
        data: finalData,
        metadata: metadata || undefined, // Include metadata if successful, otherwise undefined
      };

      // Add warning message to metadata if URL resolution was incomplete
      if (urlResolutionWarning && result.metadata) {
        result.metadata.progress = result.metadata.progress + ' ' + urlResolutionWarning;
      } else if (urlResolutionWarning) {
        // If no metadata, create minimal metadata with the warning
        result.metadata = {
          progress: urlResolutionWarning,
          completed: true
        };
      }

      return result;
    } catch (error) {
      logger.error('Execution Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: null
      };
    }
  }

  /**
   * Transforms schema object, converting URL string fields to numeric IDs
   * @returns Tuple with transformed schema and paths to URL fields
   */
  private transformUrlFieldsToIds(schema: SchemaDefinition): [SchemaDefinition, PathSegment[]] {
    const urlPaths: PathSegment[] = [];
    const transformedSchema = { ...schema };

    // Process root-level properties if they exist
    if (schema.properties) {
      transformedSchema.properties = this.processSchemaProperties(schema.properties || {}, [], urlPaths);
    }

    // Process items if this is an array schema
    if (schema.type === 'array' && schema.items) {
      logger.debug('Processing array items schema');

      // If items is an object with properties, process those
      if (schema.items.type === 'object' && schema.items.properties) {
        const itemProperties = schema.items.properties;
        const processedItemProperties = this.processSchemaProperties(itemProperties, ['*'], urlPaths);
        transformedSchema.items = {
          ...schema.items,
          properties: processedItemProperties
        };
      }
      // If items is a string with url format, transform it
      else if (schema.items.type === 'string' && schema.items.format === 'url') {
        transformedSchema.items = {
          type: 'number',
          description: 'Accessibility Node ID (as a number) of the element that points to a URL'
        };
        urlPaths.push({ segments: ['*'] });
      }
    }

    logger.debug('Transformation complete, found URL paths:', urlPaths);
    return [transformedSchema, urlPaths];
  }

  /**
   * Process schema properties recursively to find and transform URL fields
   */
  private processSchemaProperties(
    properties: Record<string, SchemaProperty>,
    currentPath: Array<string | number>,
    urlPaths: PathSegment[]
  ): Record<string, SchemaProperty> {
    const result: Record<string, SchemaProperty> = {};

    for (const [key, value] of Object.entries(properties)) {
      const newPath = [...currentPath, key];
      let processedValue = { ...value };

      if (value.type === 'string' && value.format === 'url') {
        // Transform to number and update description
        processedValue = {
          type: 'number',
          description: 'Accessibility Node ID (as a number) of the element that points to a URL'
        };
        urlPaths.push({ segments: newPath });
      } else if (value.type === 'object' && value.properties) {
        // Recurse for nested objects
        processedValue.properties = this.processSchemaProperties(value.properties, newPath, urlPaths);
      } else if (value.type === 'array' && value.items) {
        // Handle arrays
        const arrayPath = [...newPath, '*']; // Use '*' to represent array items
        let processedItems = { ...value.items };

        if (value.items.type === 'object' && value.items.properties) {
          // Recurse for objects within arrays
          processedItems.properties = this.processSchemaProperties(value.items.properties, arrayPath, urlPaths);
        } else if (value.items.type === 'string' && value.items.format === 'url') {
          // Transform URL strings within arrays
          processedItems = {
            type: 'number',
            description: 'Accessibility Node ID (as a number) of the element that points to a URL'
          };
          urlPaths.push({ segments: arrayPath });
        }
        processedValue.items = processedItems;
      }
      result[key] = processedValue;
    }
    return result;
  }

  /**
   * Builds a mapping from Accessibility Node ID (string) to URL from raw AX nodes.
   */
  private buildUrlMapping(nodes: Protocol.Accessibility.AXNode[]): Record<string, string> {
    logger.debug(`Building URL mapping from ${nodes.length} nodes`);
    const idToUrlMapping: Record<string, string> = {};
    for (const node of nodes) {
      const urlProperty = node.properties?.find(p =>
        p.name === Protocol.Accessibility.AXPropertyName.Url
      );

      // Use the string node.nodeId as the key
      if (urlProperty?.value?.type === 'string' && urlProperty.value.value && node.nodeId) {
        logger.debug(`Found URL mapping: nodeId=${node.nodeId}, url=${urlProperty.value.value}`);
        idToUrlMapping[node.nodeId] = String(urlProperty.value.value);
      }
    }

    // Log whether we found any mappings
    const mappingSize = Object.keys(idToUrlMapping).length;
    logger.debug(`URL Mapping complete: found ${mappingSize} URL mappings`);
    if (mappingSize === 0) {
      logger.warn('No URL mappings found! URLs will not be injected correctly.');
    } else {
      // Log the first few mappings as a sample
      const sampleEntries = Object.entries(idToUrlMapping).slice(0, 5);
      logger.debug('Sample URL mappings:', sampleEntries);
    }

    return idToUrlMapping;
  }

  /**
   * Initial LLM call to extract data based on schema and DOM content.
   */
  private async callExtractionLLM(options: {
    instruction: string,
    domContent: string,
    schema: SchemaDefinition,
    apiKey: string,
  }): Promise<any> {
    const { instruction, domContent, schema, apiKey } = options;
    logger.debug('Calling Extraction LLM...');
    const systemPrompt = `You are a structured data extraction agent in multi-agent system.
Your task is to extract data from the provided DOM content (represented as an accessibility tree) based on a given schema.
Focus on mapping the user's instruction to the elements in the accessibility tree.
IMPORTANT: When a URL is expected, you MUST provide the numeric Accessibility Node ID as a NUMBER type, not as a string.
CRITICAL RULES:
1. NEVER hallucinate or make up any data - only extract what actually exists in the accessibility tree
2. For URL fields, provide ONLY the numeric accessibility node ID (e.g., 12345, not "http://example.com")
3. If you cannot find requested data:
   - For required fields: Use null or an empty string/array as appropriate
   - For optional fields: Omit them entirely
   - NEVER make up fake data to fill fields
4. If the requested data doesn't exist, extract what IS available in that section of the DOM
5. Only extract text, numbers, and node IDs that are explicitly present in the accessibility tree
6. The actual URLs will be resolved in a later step using the node IDs
Return ONLY valid JSON that conforms exactly to the provided schema definition. 
Do not add any conversational text or explanations or thinking tags.`;

    const extractionPrompt = `
INSTRUCTION: ${instruction}

ACCESSIBILITY TREE CONTENT:
\`\`\`
${domContent}
\`\`\`

SCHEMA TO EXTRACT (Note: fields expecting URLs require the numeric Accessibility Node ID as a NUMBER type, not a string):
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

TASK: Extract structured data from the ACCESSIBILITY TREE CONTENT according to the INSTRUCTION and the SCHEMA TO EXTRACT.
Return a valid JSON object that conforms exactly to the schema structure. 
CRITICAL: 
- For URL fields, extract ONLY the numeric accessibility node ID from the tree (e.g., 12345)
- DO NOT create or hallucinate any data - only extract what exists in the tree
- If requested data is not found:
  * Return null/empty values for required fields
  * Omit optional fields entirely
  * Extract whatever IS present in that area of the DOM instead
- NEVER make up fake names, titles, descriptions, or any other data
- If you see "No data", "N/A", or similar in the DOM, extract it as-is
- These numeric IDs will be converted to actual URLs in a subsequent processing step
Only output the JSON object with real data from the accessibility tree.`;

    try {
      const { model, provider } = AIChatPanel.getNanoModelWithProvider();
      const llm = LLMClient.getInstance();
      const llmResponse = await llm.call({
        provider,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: extractionPrompt }
        ],
        systemPrompt: systemPrompt,
        temperature: 0.1,
        retryConfig: { maxRetries: 3, baseDelayMs: 1500 }
      });
      const response = llmResponse.text;
      if (!response) { throw new Error('No text response from extraction LLM'); }
      return this.parseJsonResponse(response);
    } catch (error) {
      logger.error('Error in callExtractionLLM:', error);
      return null; // Indicate failure
    }
  }

  /**
   * LLM call to refine the initially extracted data.
   */
  private async callRefinementLLM(options: {
    instruction: string,
    schema: SchemaDefinition,
    initialData: any,
    apiKey: string,
  }): Promise<any> {
    const { instruction, schema, initialData, apiKey } = options;
    logger.debug('Calling Refinement LLM...');
    const systemPrompt = `You are a data refinement agent in multi-agent system.
Your task is to refine previously extracted JSON data based on the original instruction and schema.
Ensure the refined output still strictly conforms to the provided schema.
CRITICAL RULES:
1. When a URL is expected, you MUST provide the numeric Accessibility Node ID as a NUMBER type, not as a string
2. NEVER create or hallucinate any data - work only with what was already extracted
3. DO NOT replace numeric node IDs with made-up URLs like "http://..." 
4. DO NOT add fake data to empty fields - if a field is null/empty, leave it that way
5. Only refine the structure and improve organization - do not invent new content
6. If the initial extraction has null/empty values, that means the data wasn't found - respect that
Focus on improving structure and organization while preserving the truthfulness of the extracted data.
Return ONLY the refined, valid JSON object.`;

    const refinePrompt = `
ORIGINAL INSTRUCTION: ${instruction}

SCHEMA (Note: fields expecting URLs require the numeric Accessibility Node ID as a NUMBER type, not a string):
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

INITIAL EXTRACTED DATA:
\`\`\`json
${JSON.stringify(initialData, null, 2)}
\`\`\`

TASK: Review the INITIAL EXTRACTED DATA. Refine it to better match the ORIGINAL INSTRUCTION and ensure it strictly conforms to the SCHEMA.
IMPORTANT: 
- Keep all numeric node IDs in URL fields exactly as they are (do not change them to URLs)
- These numeric IDs will be converted to actual URLs in a later processing step
- NEVER hallucinate or create URLs - if you see a number in a URL field, leave it as a number
- Focus on refining non-URL data and ensuring proper structure
Return only the refined JSON object. 
Do not add any conversational text or explanations or thinking tags.`;

    try {
      const { model, provider } = AIChatPanel.getNanoModelWithProvider();
      const llm = LLMClient.getInstance();
      const llmResponse = await llm.call({
        provider,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: refinePrompt }
        ],
        systemPrompt: systemPrompt,
        temperature: 0.1,
        retryConfig: { maxRetries: 3, baseDelayMs: 1500 }
      });
      const response = llmResponse.text;
      if (!response) { throw new Error('No text response from refinement LLM'); }
      return this.parseJsonResponse(response);
    } catch (error) {
      logger.error('Error in callRefinementLLM:', error);
      return null; // Indicate failure
    }
  }

  /**
   * LLM call to get metadata (progress and completion status).
   */
  private async callMetadataLLM(options: {
    instruction: string,
    extractedData: any,
    domContent: string,
    schema: SchemaDefinition,
    apiKey: string,
  }): Promise<ExtractionMetadata | null> {
    const { instruction, extractedData, domContent, schema, apiKey } = options;
    logger.debug('Calling Metadata LLM...');
    const metadataSchema = {
      type: 'object',
      properties: {
        progress: {
          type: 'string',
          description: 'A very concise summary of what has been extracted so far.',
        },
        completed: {
          type: 'boolean',
          description: 'Set to true ONLY if the original instruction has been fully and accurately addressed by the extracted data. Be conservative.',
        },
        reasoning: {
          type: 'string',
          description: 'Brief explanation of extraction results, including why any fields might be missing or contain null values.',
        },
        pageContext: {
          type: 'string',
          description: 'Brief description (10-20 words) of what type of page/content was analyzed (e.g., "GitHub repository page", "News article", "Product listing").',
        },
        missingFields: {
          type: 'string',
          description: 'Comma-separated list of field names that could not be extracted due to missing data on the page. Leave empty if all fields were successfully extracted.',
        },
      },
      required: ['progress', 'completed'],
    };

    const systemPrompt = `You are a metadata assessment agent in multi-agent system.
Your task is to evaluate the provided extracted data against the original instruction and determine the progress and completion status.
You must respond ONLY with a valid JSON object matching the following schema:
\`\`\`json
${JSON.stringify(metadataSchema, null, 2)}
\`\`\`
Do not add any conversational text or explanations or thinking tags.`;

    const metadataPrompt = `
ORIGINAL INSTRUCTION: ${instruction}

REQUESTED SCHEMA:
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

PAGE CONTENT (Accessibility Tree):
\`\`\`
${domContent.substring(0, 3000)}${domContent.length > 3000 ? '... [truncated]' : ''}
\`\`\`

EXTRACTED DATA:
\`\`\`json
${JSON.stringify(extractedData, null, 2)}
\`\`\`

TASK: Analyze the extraction results by comparing:
1. What was requested (INSTRUCTION and SCHEMA)
2. What was available on the page (PAGE CONTENT)
3. What was actually extracted (EXTRACTED DATA)

Identify any fields that are null/empty and explain why (e.g., "price field is null because this is a repository page, not a product page").
Describe the type of page/content that was analyzed.
Return ONLY a valid JSON object conforming to the required metadata schema.`;

    try {
      const { model, provider } = AIChatPanel.getNanoModelWithProvider();
      const llm = LLMClient.getInstance();
      const llmResponse = await llm.call({
        provider,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: metadataPrompt }
        ],
        systemPrompt: systemPrompt,
        temperature: 0.0, // Use low temp for objective assessment
        retryConfig: { maxRetries: 3, baseDelayMs: 1500 }
      });
      const response = llmResponse.text;
      if (!response) { throw new Error('No text response from metadata LLM'); }
      const parsedMetadata = this.parseJsonResponse(response);
      // Basic validation
      if (typeof parsedMetadata?.progress === 'string' && typeof parsedMetadata?.completed === 'boolean') {
        return parsedMetadata as ExtractionMetadata;
      }
      logger.error('Metadata LLM response did not match expected schema:', parsedMetadata);
      // Return null if metadata doesn't match schema, but don't throw, allow main function to decide
      return null;

    } catch (error) {
      logger.error('Error in callMetadataLLM:', error);
      return null; // Indicate failure
    }
  }

  /**
   * Helper to parse JSON, potentially extracting it from surrounding text.
   */
  private parseJsonResponse(responseText: string): any | null {
    try {
      // First, try parsing the whole string directly
      return JSON.parse(responseText);
    } catch (e) {
      // If direct parsing fails, remove all think tags and their content
      logger.debug('Removing think tags before parsing JSON');

      // Remove <think>...</think> tags and everything inside them (handles multiple think tags)
      let cleanedText = responseText.replace(/<think>[\s\S]*?<\/think>/g, '');

      // Remove any incomplete <think> tags without closing tags
      cleanedText = cleanedText.replace(/<think>[\s\S]*/g, '');

      // If after removing think tags, the text is empty or whitespace, give up
      if (!cleanedText.trim()) {
        logger.error('No content left after removing think tags');
        return null;
      }

      // First, look for JSON code blocks in the cleaned text
      const codeBlockMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          return JSON.parse(codeBlockMatch[1]);
        } catch (codeBlockError) {
          logger.error('Failed to parse JSON from code block:', codeBlockError);
        }
      }

      // Next, try to find a complete JSON object or array in the cleaned text
      // Find the last valid JSON in the text (in case there are multiple)
      let potentialJsons: string[] = [];
      const jsonMatches = cleanedText.match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/g);
      if (jsonMatches) {
        potentialJsons = jsonMatches;
      }

      // Try parsing each potential JSON, starting with the longest one
      // (longer matches are more likely to be complete)
      potentialJsons.sort((a, b) => b.length - a.length);

      for (const json of potentialJsons) {
        try {
          return JSON.parse(json);
        } catch (jsonError) {
          // Continue to the next potential JSON
        }
      }

      // If no valid JSON found yet, try a more aggressive approach
      const jsonObjectMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        try {
          return JSON.parse(jsonObjectMatch[0]);
        } catch (objectError) {
          logger.error('Failed to parse JSON object:', objectError);
        }
      }

      const jsonArrayMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (jsonArrayMatch) {
        try {
          return JSON.parse(jsonArrayMatch[0]);
        } catch (arrayError) {
          logger.error('Failed to parse JSON array:', arrayError);
        }
      }

      logger.error('Failed to parse and no valid JSON found in response after removing think tags');
      return null;
    }
  }

  /**
   * Recursively find and replace node IDs with URLs in a data structure
   */
  private findAndReplaceNodeIds(data: any, nodeIdToUrlMap: Record<number, string>): any {
    // Handle null/undefined
    if (data === null || data === undefined) {
      return data;
    }

    // Check if it's a numeric value that matches a node ID
    if (typeof data === 'number' && nodeIdToUrlMap[data]) {
      return nodeIdToUrlMap[data];
    }

    // Check if it's a string that represents a numeric node ID
    if (typeof data === 'string') {
      const numValue = parseInt(data, 10);
      if (!isNaN(numValue) && nodeIdToUrlMap[numValue]) {
        return nodeIdToUrlMap[numValue];
      }
    }

    // Recursively process arrays
    if (Array.isArray(data)) {
      return data.map(item => this.findAndReplaceNodeIds(item, nodeIdToUrlMap));
    }

    // Recursively process objects
    if (typeof data === 'object' && data !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.findAndReplaceNodeIds(value, nodeIdToUrlMap);
      }
      return result;
    }

    // Return data unchanged for other types
    return data;
  }

  /**
   * Collect all numeric values from a data structure that could be node IDs
   */
  private collectPotentialNodeIds(data: any, nodeIds: Set<number>): void {
    if (data === null || data === undefined) {
      return;
    }

    // Check if it's a numeric value
    if (typeof data === 'number' && data > 0 && Number.isInteger(data)) {
      nodeIds.add(data);
    }

    // Check if it's a string that represents a number
    if (typeof data === 'string') {
      const numValue = parseInt(data, 10);
      if (!isNaN(numValue) && numValue > 0 && Number.isInteger(numValue)) {
        nodeIds.add(numValue);
      }
    }

    // Recursively process arrays
    if (Array.isArray(data)) {
      data.forEach(item => this.collectPotentialNodeIds(item, nodeIds));
    }

    // Recursively process objects
    if (typeof data === 'object' && data !== null) {
      Object.values(data).forEach(value => this.collectPotentialNodeIds(value, nodeIds));
    }
  }

  /**
   * Resolve URLs in the data using programmatic approach (no LLM calls)
   */
  private async resolveUrlsWithLLM(options: {
    data: any,
    apiKey: string,
    schema: SchemaDefinition,
  }): Promise<any> {
    const { data, schema } = options;
    logger.debug('Starting URL resolution programmatically...');

    try {
      // 1. Collect all potential node IDs from the data
      const nodeIds = new Set<number>();
      this.collectPotentialNodeIds(data, nodeIds);

      if (nodeIds.size === 0) {
        logger.debug('No potential node IDs found in data');
        return data;
      }

      logger.debug(`Found ${nodeIds.size} potential node IDs to check:`, Array.from(nodeIds));

      // 2. Use NodeIDsToURLsTool to get URL mappings
      const urlTool = new NodeIDsToURLsTool();
      const urlResult = await urlTool.execute({ nodeIds: Array.from(nodeIds) });

      if ('error' in urlResult) {
        logger.error('Error from NodeIDsToURLsTool:', urlResult.error);
        return data; // Return original data if tool execution fails
      }

      // 3. Create a mapping for easy lookup
      const nodeIdToUrlMap: Record<number, string> = {};
      for (const item of urlResult.urls) {
        if (item.url) {
          nodeIdToUrlMap[item.nodeId] = item.url;
        }
      }

      logger.debug(`Created nodeId to URL mapping with ${Object.keys(nodeIdToUrlMap).length} entries`);

      // 4. Use programmatic replacement instead of LLM
      if (Object.keys(nodeIdToUrlMap).length === 0) {
        logger.debug('No valid URL mappings found, returning original data');
        return data;
      }

      // 5. Replace node IDs with URLs in the data
      const updatedData = this.findAndReplaceNodeIds(data, nodeIdToUrlMap);

      logger.debug('Successfully replaced nodeIDs with URLs programmatically');
      return updatedData;
    } catch (error) {
      logger.error('[SchemaBasedExtractorTool] Error in programmatic URL resolution:', error);
      return data; // Return original data on error
    }
  }
}

/**
 * Arguments for schema extraction
 */
export interface SchemaExtractionArgs {
  schema: SchemaDefinition;
  instruction?: string;
  reasoning?: string;
}

/**
 * Schema definition structure (JSON Schema-like)
 */
export interface SchemaDefinition {
  type: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  required?: string[];
  [key: string]: any;
}

/**
 * Schema property definition
 */
export interface SchemaProperty {
  type: string;
  description?: string;
  format?: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  [key: string]: any;
}

/**
 * Path segments for URL injection
 */
export interface PathSegment {
  segments: Array<string | number>;
}
