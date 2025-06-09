// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Utils from '../common/utils.js';
import { AgentService } from '../core/AgentService.js';
import { createLogger } from '../core/Logger.js';
import { UnifiedLLMClient } from '../core/UnifiedLLMClient.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';

import { waitForPageLoad, type Tool } from './Tools.js';

const logger = createLogger('Tool:HTMLToMarkdown');

/**
 * Result interface for HTML to Markdown extraction
 */
export interface HTMLToMarkdownResult {
  success: boolean;
  markdownContent: string | null;
  error?: string;
}

/**
 * Arguments for HTML to Markdown extraction
 */
export interface HTMLToMarkdownArgs {
  instruction?: string;
  reasoning: string;
}

/**
 * Tool for extracting the main article content from a webpage and converting it to Markdown
 */
export class HTMLToMarkdownTool implements Tool<HTMLToMarkdownArgs, HTMLToMarkdownResult> {
  name = 'html_to_markdown';
  description = 'Extracts the main article content from a webpage and converts it to well-formatted Markdown, removing ads, navigation, and other distracting elements.';

  schema = {
    type: 'object',
    properties: {
      instruction: {
        type: 'string',
        description: 'Natural language instruction for the extraction agent'
      },
      reasoning: {
        type: 'string',
        description: 'Reasoning about the extraction process displayed to the user'
      }
    },
    required: ['reasoning']
  };

  /**
   * Execute the HTML to Markdown extraction
   */
  async execute(args: HTMLToMarkdownArgs): Promise<HTMLToMarkdownResult> {
    logger.info('Executing with args', { args });
    const { instruction } = args;
    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();
    const READINESS_TIMEOUT_MS = 15000; // 15 seconds timeout for page readiness

    if (!apiKey) {
      return {
        success: false,
        markdownContent: null,
        error: 'API key not configured'
      };
    }

    try {
      // *** Add wait for page load ***
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) {
        throw new Error('No page target available');
      }
      try {
        logger.info('Checking page readiness', { timeoutMs: READINESS_TIMEOUT_MS });
        await waitForPageLoad(target, READINESS_TIMEOUT_MS);
        logger.info('Page is ready or timeout reached');
      } catch (readinessError: any) {
         logger.error('Page readiness check failed', { error: readinessError.message, stack: readinessError.stack });
      }

      // Get the page content from the accessibility tree
      logger.info('Getting page content from accessibility tree');
      const content = await this.getPageContent(target);

      if (!content) {
        return {
          success: false,
          markdownContent: null,
          error: 'Failed to retrieve page content'
        };
      }

      logger.info('Retrieved page content', { contentLength: content.length });

      // Create prompts for the LLM
      const systemPrompt = this.createSystemPrompt();
      const userPrompt = this.createUserPrompt(content, instruction);

      // Call the LLM for extraction
      logger.info('Calling LLM for extraction');
      const extractionResult = await this.callExtractionLLM({
        systemPrompt,
        userPrompt,
        apiKey,
      });

      logger.info('Extraction completed successfully');

      // Return the result
      return {
        success: true,
        markdownContent: extractionResult.markdownContent
      };

    } catch (error: any) {
      logger.error('Error during extraction', { error: error.message, stack: error.stack });
      return {
        success: false,
        markdownContent: null,
        error: `Error extracting markdown: ${error.message}`
      };
    }
  }

  /**
   * Get page content from the accessibility tree
   */
  private async getPageContent(target: SDK.Target.Target): Promise<string> {
    if (!target) {
      throw new Error('No page target available');
    }

    // Get accessibility tree using existing utility
    const processedTreeResult = await Utils.getAccessibilityTree(target);
    return processedTreeResult.simplified;
  }

  /**
   * Create system prompt for the LLM
   */
  private createSystemPrompt(): string {
    return `# Accessibility Tree to Markdown Conversion Agent

## Objective
You are an Accessibility Tree to Markdown conversion agent designed to transform web pages into clean, distraction-free Markdown content. Your purpose is to enhance the reading experience by extracting the main article content while removing distracting elements such as advertisements, navigation menus, popups, sidebars, and unnecessary formatting.

## Input
- Accessibility Tree representation of a web page
- Optional user preferences for conversion

## Output
- Clean, well-formatted Markdown content
- A brief summary of what was extracted and what was removed (optional)

## Core Responsibilities

### 1. Accessibility Tree Analysis
- Leverage the hierarchical structure of the Accessibility Tree to identify the main content
- Use accessibility roles and properties to distinguish content types
- Recognize content boundaries through parent-child relationships in the tree
- Identify landmarks and ARIA roles that signify different page sections

### 2. Content Extraction
- Extract the primary textual content, focusing on:
  - Elements with roles like "heading", "article", "main", "document"
  - Text nodes that are descendants of content containers
  - Images with proper alternative text
  - Tables marked with appropriate semantic roles
  - Lists and their items
  - Quotes and emphasized content

### 3. Content Filtering
- Remove distracting elements by filtering out:
  - Nodes with roles like "banner", "navigation", "complementary", "advertisement"
  - Elements marked as "presentation" that don't contribute to content
  - Hidden elements (those with aria-hidden="true")
  - Repetitive UI controls and widgets
  - Content identified as not being part of the main article flow

### 4. Markdown Conversion
- Convert accessibility nodes to appropriate Markdown syntax:
  - Heading roles → Markdown headings (#, ##, etc. based on level)
  - Text nodes → Plain text with appropriate paragraph breaks
  - Strong/emphasized text → **bold**, *italic*
  - Link roles → [text](url)
  - Image roles → ![alt text](image url)
  - List roles → Markdown bullet/numbered lists
  - Blockquote roles → > quoted text
  - Code/preformatted text → \`\`\` code \`\`\`
  - Table roles → Markdown tables
  - Separator roles → ---

### 5. Structure Preservation
- Maintain the logical hierarchy of the Accessibility Tree
- Preserve the reading order based on the tree traversal
- Respect parent-child relationships when determining content flow
- Maintain the content's semantic structure

### 6. Image Handling
- Include images that have proper alternative text
- Convert image captions based on related accessibility properties
- Filter out decorative images (those marked with alt="" or role="presentation")
- Preserve the relationship between images and their descriptive text

### 7. Metadata Extraction
- Identify document title from the Accessibility Tree
- Extract author information from appropriate labeled elements
- Preserve publication date when available in a structured format

## Advanced Features

### Semantic Understanding
- Use semantic roles to better understand content purpose
- Leverage ARIA properties and states for additional context
- Identify custom roles and their intended meaning

### Content Relationships
- Preserve relationships between elements (such as labels and their controls)
- Maintain the connection between headers and their content sections
- Understand figure/figcaption relationships

### Adaptive Processing
- Adjust extraction strategy based on the complexity of the Accessibility Tree
- Handle different page types (article, documentation, product page, etc.)
- Apply specialized processing for specific content domains

## Implementation Guidelines

1. **Prioritize Semantic Structure**: The Accessibility Tree already provides semantic meaning—use this to your advantage.

2. **Follow Focus Order**: The natural traversal of the Accessibility Tree often indicates the intended reading order.

3. **Respect ARIA Landmarks**: Use landmarks like "main", "article", and "contentinfo" to guide your extraction.

4. **Contextual Analysis**: Look at parent-child relationships to understand content context and importance.

5. **Text Alternatives**: Use provided text alternatives for non-text content as defined in the Accessibility Tree.

## Example Conversions

### News Article
- Identify the article node in the Accessibility Tree
- Extract headings, paragraphs, and related images
- Filter out navigation, sidebar, and footer nodes

### Technical Documentation
- Preserve code blocks identified by appropriate roles
- Maintain table structures with their accessibility properties
- Keep the hierarchical structure of sections and subsections

### Blog Post
- Identify the main content area using landmark roles
- Extract article title, author information, and publication date
- Preserve the flow of text, images, and embedded media

## Performance Considerations
- Leverage the already-processed nature of the Accessibility Tree for faster extraction
- Use efficient tree traversal techniques
- Prioritize nodes with high information density

## Edge Cases

### Dynamic Content
- Handle nodes that represent expandable content
- Account for content loaded on-demand in the Accessibility Tree
- Address tabbed interfaces and their content

### Complex Controls
- Extract meaningful content from complex UI controls
- Handle custom widgets with specialized ARIA roles
- Convert interactive elements to appropriate static content

### Non-Standard Implementations
- Handle pages with improper accessibility implementations
- Apply fallback strategies when semantic information is missing
- Infer structure when standard roles are not used correctly

## Success Criteria
Your conversion is successful when:
- The main article content is preserved in its entirety
- The logical structure and reading flow are maintained
- Distracting elements are removed
- The resulting Markdown is clean, well-formatted, and readable
- The essence and meaning of the original content remain intact
- Accessibility information is leveraged to enhance the quality of extraction
    `;
  }

  /**
   * Create user prompt for the LLM
   */
  private createUserPrompt(content: string, instruction?: string): string {
    return `Here is the accessibility tree:

${content}

Here is the instruction from planning agent:

${instruction}
`;
  }

  /**
   * Call LLM for extraction
   */
  private async callExtractionLLM(params: {
    systemPrompt: string,
    userPrompt: string,
    apiKey: string,
  }): Promise<{
    markdownContent: string,
  }> {
    // Call LLM using the unified client
    const response = await UnifiedLLMClient.callLLM(
      params.apiKey,
      AIChatPanel.getNanoModel(),
      params.userPrompt,
      {
        systemPrompt: params.systemPrompt,
        temperature: 0.2, // Lower temperature for more deterministic results
      }
    );

    // Process the response - UnifiedLLMClient returns string directly
    const markdownContent = response || '';

    return {
      markdownContent
    };
  }
}
