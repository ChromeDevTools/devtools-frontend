// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Utils from '../common/utils.js';
import type { AccessibilityNode } from '../common/context.js';
import { AgentService } from '../core/AgentService.js';
import { createLogger } from '../core/Logger.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';

import type { Tool } from './Tools.js';

const logger = createLogger('Tool:StreamlinedSchemaExtractor');

export interface StreamlinedExtractionResult {
  success: boolean;
  data: any | null;
  error?: string;
}

interface ExecutionContext {
  success: true;
  schema: any;
  instruction: string;
  apiKey: string;
  urlMappings: Record<string, string>;
  treeText: string;
}


/**
 * Streamlined schema-based extractor using direct URL resolution
 */
export class StreamlinedSchemaExtractorTool implements Tool<StreamlinedSchemaExtractionArgs, StreamlinedExtractionResult> {
  name = 'extract_schema_streamlined';
  description = `Tool for extracting structured data from web pages using JSON schema.
  - Returns: { success, data, error (if any) }`;


  private readonly MAX_URL_RETRIES = 4;
  private readonly MAX_JSON_RETRIES = 2;
  private readonly RETRY_DELAY_MS = 10000; // 10 second delay between retries

  schema = {
    type: 'object',
    properties: {
      schema: {
        type: 'object',
        description: 'JSON Schema definition of the data to extract'
      },
      instruction: {
        type: 'string',
        description: 'Natural language instruction for the extraction'
      },
      reasoning: {
        type: 'string',
        description: 'Brief reasoning about what data to extract'
      }
    },
    required: ['schema', 'instruction']
  };


  async execute(args: StreamlinedSchemaExtractionArgs): Promise<StreamlinedExtractionResult> {
    try {
      const context = await this.setupExecution(args);
      if (context.success !== true) {
        return context as StreamlinedExtractionResult;
      }

      const extractionResult = await this.performExtraction(context as ExecutionContext);
      const finalData = await this.resolveUrlsWithRetry(extractionResult, context as ExecutionContext);

      return {
        success: true,
        data: finalData
      };

    } catch (error) {
      logger.error('Execution Error:', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: null
      };
    }
  }

  private async setupExecution(args: StreamlinedSchemaExtractionArgs): Promise<ExecutionContext | StreamlinedExtractionResult> {
    const { schema, instruction } = args;
    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();

    if (!apiKey) {
      return {
        success: false,
        data: null,
        error: 'API key not configured'
      };
    }

    if (!schema) {
      return {
        success: false,
        data: null,
        error: 'Schema is required'
      };
    }

    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return {
        success: false,
        error: 'No page target available',
        data: null
      };
    }

    const accessibilityData = await this.getAccessibilityData(target);

    return {
      success: true,
      schema,
      instruction,
      apiKey,
      urlMappings: accessibilityData.urlMappings,
      treeText: accessibilityData.treeText
    };
  }

  private async getAccessibilityData(target: SDK.Target.Target): Promise<{urlMappings: Record<string, string>, treeText: string}> {
    const processedTreeResult = await Utils.getAccessibilityTree(target);
    return {
      treeText: processedTreeResult.simplified,
      urlMappings: processedTreeResult.idToUrl || {}
    };
  }

  private async performExtraction(context: ExecutionContext): Promise<any> {
    return await this.extractWithJsonRetry(
      context.schema, 
      context.treeText, 
      context.instruction, 
      context.apiKey,
      this.MAX_JSON_RETRIES
    );
  }

  private async resolveUrlsWithRetry(extractionResult: any, context: ExecutionContext): Promise<any> {
    const urlFields = this.findUrlFields(context.schema);
    let finalData = this.resolveUrlsDirectly(extractionResult, context.urlMappings, urlFields);

    // Check for unresolved URLs and retry if needed
    for (let attempt = 1; attempt <= this.MAX_URL_RETRIES; attempt++) {
      const unresolvedNodeIds = this.findUnresolvedNodeIds(finalData, urlFields);
      
      if (unresolvedNodeIds.length === 0) {
        break; // All URLs resolved successfully
      }

      logger.debug(`Attempt ${attempt}: Found ${unresolvedNodeIds.length} unresolved nodeIDs, asking LLM to try different ones`);
      
      // Add delay before retry to prevent overloading the LLM
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
      }
      
      const retryResult = await this.retryUrlResolution(
        context.schema,
        context.treeText,
        context.instruction,
        extractionResult,
        unresolvedNodeIds,
        context.apiKey,
        attempt
      );
      
      if (retryResult) {
        finalData = this.resolveUrlsDirectly(retryResult, context.urlMappings, urlFields);
        extractionResult = retryResult; // Update for next iteration
      } else {
        logger.warn(`URL retry attempt ${attempt} failed`);
        break;
      }
    }

    return finalData;
  }

  private async extractWithJsonRetry(
    schema: any,
    treeText: string,
    instruction: string,
    apiKey: string,
    maxRetries: number
  ): Promise<any> {
    const systemPrompt = `You are a data extraction agent. Extract structured data from the accessibility tree according to the provided schema.

CRITICAL RULES - VIOLATION WILL RESULT IN FAILURE:
1. For URL fields in the schema, extract ONLY the numeric nodeId from the tree (e.g., from "[19951] link: microsoft", extract 19951)
2. NEVER HALLUCINATE OR MAKE UP DATA - only extract what actually exists in the accessibility tree
3. If data doesn't exist in the tree, use null or omit the field entirely
4. Return valid JSON that matches the schema exactly
5. URLs will be resolved automatically after extraction
6. Double-check every value against the actual tree content before including it

EXAMPLES OF WHAT NOT TO DO:
- Don't invent nodeIds that aren't in the tree
- Don't make up text content that isn't visible
- Don't assume or guess at values

Return ONLY the JSON object with real data from the accessibility tree.`;

    const basePrompt = `INSTRUCTION: ${instruction}

SCHEMA:
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

ACCESSIBILITY TREE:
\`\`\`
${treeText}
\`\`\`

Extract data according to the schema. For URL fields, return the nodeId number only (e.g., 19951 not "http://...").

IMPORTANT: Only extract data that you can see in the accessibility tree above. Do not make up, guess, or hallucinate any values.`;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        let extractionPrompt = basePrompt;
        
        if (attempt > 1) {
          extractionPrompt += `\n\nIMPORTANT: Previous attempt ${attempt - 1} failed due to invalid JSON. Please ensure you return ONLY valid JSON that can be parsed. Do not hallucinate any data - only extract what actually exists in the tree.`;
        }

        const { model, provider } = AIChatPanel.getMiniModelWithProvider();
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
        const result = llmResponse.text;
        
        logger.debug(`JSON extraction successful on attempt ${attempt}`);
        return result;

      } catch (error) {
        if (attempt <= maxRetries) {
          logger.warn(`JSON parsing failed on attempt ${attempt}, retrying...`, error);
          // Add delay before next attempt to prevent overloading the LLM
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
        } else {
          logger.error(`JSON extraction failed after ${attempt} attempts:`, error instanceof Error ? error.message : String(error));
          throw new Error(`Data extraction failed after ${attempt} attempts: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  private findUnresolvedNodeIds(data: any, urlFields: string[]): string[] {
    const unresolvedNodeIds: string[] = [];

    const checkValue = (value: any, path: string): void => {
      const isUrlField = urlFields.some(field => {
        const normalizedField = field.replace(/\[\]/g, '');
        const normalizedPath = path.replace(/\[\d+\]/g, '[]');
        return normalizedPath.endsWith(normalizedField) || 
               normalizedPath.includes(normalizedField) ||
               normalizedField.endsWith(path.replace(/\[\d+\]/g, ''));
      });

      if (isUrlField && (typeof value === 'number' || typeof value === 'string')) {
        const nodeIdStr = value.toString();
        // Check if it's still a numeric nodeId (not a resolved URL)
        if (/^\d+$/.test(nodeIdStr) && !unresolvedNodeIds.includes(nodeIdStr)) {
          unresolvedNodeIds.push(nodeIdStr);
        }
      }

      if (Array.isArray(value)) {
        value.forEach((item, index) => 
          checkValue(item, `${path}[${index}]`)
        );
      } else if (value && typeof value === 'object') {
        for (const [key, val] of Object.entries(value)) {
          checkValue(val, `${path}.${key}`);
        }
      }
    };

    if (Array.isArray(data)) {
      data.forEach((item, index) => checkValue(item, `[${index}]`));
    } else if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        checkValue(value, key);
      }
    }

    return unresolvedNodeIds;
  }

  private async retryUrlResolution(
    schema: any,
    treeText: string,
    instruction: string,
    originalResult: any,
    unresolvedNodeIds: string[],
    apiKey: string,
    attemptNumber: number
  ): Promise<any> {
    const systemPrompt = `You are a data extraction agent. A previous extraction attempt was made but some nodeIDs could not be resolved to URLs.

CRITICAL RULES - VIOLATION WILL RESULT IN FAILURE:
1. The previous extraction was partially successful but had URL resolution issues
2. These specific nodeIDs failed to resolve to URLs: ${unresolvedNodeIds.join(', ')}
3. Find DIFFERENT nodeIDs from the accessibility tree for the same content
4. Extract ONLY the numeric nodeId from the tree (e.g., from "[19951] link: microsoft", extract 19951)
5. NEVER HALLUCINATE OR MAKE UP DATA - only extract what actually exists in the tree
6. If you cannot find valid alternative nodeIDs, return null for those fields
7. Return valid JSON that matches the schema exactly
8. Double-check that any nodeID you use actually appears in the accessibility tree

EXAMPLES OF WHAT NOT TO DO:
- Don't invent new nodeIds that aren't in the tree
- Don't reuse the failed nodeIds: ${unresolvedNodeIds.join(', ')}
- Don't make up alternative values

Your task is to re-extract the data, choosing better nodeIDs that can be resolved to actual URLs.`;

    const extractionPrompt = `INSTRUCTION: ${instruction}

SCHEMA:
\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

PREVIOUS EXTRACTION RESULT:
\`\`\`json
${JSON.stringify(originalResult, null, 2)}
\`\`\`

FAILED NODEIDS (attempt ${attemptNumber}): ${unresolvedNodeIds.join(', ')}

The previous extraction failed to resolve the above nodeIDs to URLs. Please re-extract the data, choosing DIFFERENT nodeIDs from the accessibility tree below for the same content.

ACCESSIBILITY TREE:
\`\`\`
${treeText}
\`\`\`

Extract data according to the schema. For URL fields, return different nodeId numbers that can be resolved to actual URLs.

CRITICAL: Only use nodeIds that you can actually see in the accessibility tree above. Do not invent, guess, or make up any nodeIds.`;

    try {
      const { model, provider } = AIChatPanel.getMiniModelWithProvider();
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
      const result = llmResponse.text;
      
      return result;
    } catch (error) {
      logger.error(`Error in URL retry attempt ${attemptNumber}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }




  /**
   * Find URL fields in schema
   */
  private findUrlFields(schema: any): string[] {
    const urlFields: string[] = [];

    const findInProperties = (properties: Record<string, any>, prefix = ''): void => {
      for (const [key, value] of Object.entries(properties)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value.type === 'string' && value.format === 'url') {
          urlFields.push(fullKey);
        } else if (value.type === 'array' && value.items?.type === 'string' && value.items?.format === 'url') {
          urlFields.push(fullKey);
        } else if (value.type === 'object' && value.properties) {
          findInProperties(value.properties, fullKey);
        } else if (value.type === 'array' && value.items?.type === 'object' && value.items?.properties) {
          findInProperties(value.items.properties, `${fullKey}[]`);
        }
      }
    };

    if (schema.properties) {
      findInProperties(schema.properties);
    }

    return urlFields;
  }

  /**
   * Resolve URLs directly using accessibility tree URL mappings
   */
  private resolveUrlsDirectly(data: any, urlMappings: Record<string, string>, urlFields: string[]): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const resolveValue = (value: any, path: string): any => {
      const isUrlField = urlFields.some(field => {
        const normalizedField = field.replace(/\[\]/g, '');
        const normalizedPath = path.replace(/\[\d+\]/g, '[]');
        return normalizedPath.endsWith(normalizedField) || 
               normalizedPath.includes(normalizedField) ||
               normalizedField.endsWith(path.replace(/\[\d+\]/g, ''));
      });

      if (isUrlField && (typeof value === 'number' || typeof value === 'string')) {
        const accessibilityId = value.toString();
        const url = urlMappings[accessibilityId];
        return url || value; // Return URL if found, otherwise keep original value
      }

      if (Array.isArray(value)) {
        return value.map((item, index) => 
          resolveValue(item, `${path}[${index}]`)
        );
      }

      if (value && typeof value === 'object') {
        const resolved: any = {};
        for (const [key, val] of Object.entries(value)) {
          resolved[key] = resolveValue(val, `${path}.${key}`);
        }
        return resolved;
      }

      return value;
    };

    if (Array.isArray(data)) {
      return data.map((item, index) => resolveValue(item, `[${index}]`));
    }

    const resolved: any = {};
    for (const [key, value] of Object.entries(data)) {
      resolved[key] = resolveValue(value, key);
    }
    return resolved;
  }
}

/**
 * Arguments for streamlined schema extraction
 */
export interface StreamlinedSchemaExtractionArgs {
  schema: any;
  instruction: string;
  reasoning?: string;
}