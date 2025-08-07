// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import { AgentService } from '../core/AgentService.js';
import { createLogger } from '../core/Logger.js';

import {
  HTMLToMarkdownTool,
} from './HTMLToMarkdownTool.js';
import {
  SchemaBasedExtractorTool, type SchemaDefinition
} from './SchemaBasedExtractorTool.js';
import {
  NavigateURLTool, type Tool, type ErrorResult
} from './Tools.js';

const logger = createLogger('Tool:CombinedExtraction');

/**
 * Result interface for the combined extraction tool
 */
export interface CombinedExtractionResult {
  success: boolean;
  url: string;
  title?: string;
  error?: string;
  // Optional fields based on what was requested
  extractedData?: any;
  markdownContent?: string;
}

/**
 * Arguments for the combined extraction tool
 */
export interface CombinedExtractionArgs {
  url: string;
  schema?: SchemaDefinition;
  markdownResponse?: boolean;
  reasoning: string;
  extractionInstruction?: string;
}

/**
 * Tool that combines URL navigation, schema-based extraction, and HTML-to-Markdown conversion
 * This tool can navigate to a URL and optionally extract structured data based on a schema
 * and/or convert the page content to Markdown.
 */
export class CombinedExtractionTool implements Tool<CombinedExtractionArgs, CombinedExtractionResult | ErrorResult> {
  name = 'navigate_url_and_extraction';
  description = 'Navigates to a URL and optionally extracts structured data based on a schema and/or converts the page content to Markdown.';


  schema = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to navigate to'
      },
      schema: {
        type: 'object',
        description: 'JSON Schema definition of the data to extract'
      },
      markdownResponse: {
        type: 'boolean',
        description: 'If true, converts the page content to Markdown'
      },
      reasoning: {
        type: 'string',
        description: 'Reasoning for the action displayed to the user'
      },
    },
    required: ['url', 'reasoning', 'schema', 'markdownResponse']
  };

  /**
   * Execute the combined extraction
   */
  async execute(args: CombinedExtractionArgs): Promise<CombinedExtractionResult | ErrorResult> {
    logger.info('Executing with args', { args });
    const { url, schema, markdownResponse, reasoning, extractionInstruction } = args;
    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();

    if (!apiKey) {
      return {
        success: false,
        url,
        error: 'API key not configured'
      };
    }

    try {
      // STEP 1: Navigate to the URL using NavigateURLTool
      logger.info('Navigating to URL', { url });
      const navigateUrlTool = new NavigateURLTool();
      const navigationResult = await navigateUrlTool.execute({ url, reasoning });

      // Check if we got an error result
      if ('error' in navigationResult) {
        return {
          success: false,
          url,
          error: `Navigation failed: ${navigationResult.error}`
        };
      }

      // At this point, navigationResult is definitely NavigationResult
      // Navigation is considered successful if there's no error field
      // (NavigationResult doesn't have an error field, only ErrorResult does)

      // Basic result with navigation info
      const result: CombinedExtractionResult = {
        success: true,
        url: navigationResult.url,
        title: navigationResult.metadata?.title
      };

      // STEP 2: Wait for target availability
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) {
        return {
          success: false,
          url,
          error: 'No page target available after navigation'
        };
      }

      // STEP 3: Process according to requested extraction types
      // If schema is provided, extract structured data
      if (schema && schema?.type === 'object') {
        logger.info('Extracting data based on schema', { schema });
        const schemaExtractorTool = new SchemaBasedExtractorTool();
        const schemaResult = await schemaExtractorTool.execute({
          schema,
          instruction: extractionInstruction
        });

        if (!schemaResult.success) {
          // Don't fail the entire operation, just add the error to the result
          result.error = `Schema extraction failed: ${schemaResult.error}`;
        } else {
          result.extractedData = schemaResult.data;
        }
      }

      // If markdown conversion is requested
      if (markdownResponse) {
        logger.info('Converting page to Markdown');
        const htmlToMarkdownTool = new HTMLToMarkdownTool();
        const markdownResult = await htmlToMarkdownTool.execute({
          instruction: extractionInstruction,
          reasoning: reasoning || 'Converting page content to markdown for readability',
        });

        if (!markdownResult.success) {
          // Don't fail the entire operation if we already have schema data
          if (!result.extractedData) {
            result.error = `Markdown conversion failed: ${markdownResult.error}`;
          }
        } else {
          result.markdownContent = markdownResult.markdownContent || '';
        }
      }

      // Return the combined result
      return result;

    } catch (error: any) {
      logger.error('Error during execution', { error: error.message, stack: error.stack });
      return {
        success: false,
        url,
        error: `Error during execution: ${error.message}`
      };
    }
  }
}
