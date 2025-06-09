// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from '../core/Logger.js';
import { HTMLToMarkdownTool, type HTMLToMarkdownResult } from './HTMLToMarkdownTool.js';
import { NavigateURLTool, type Tool } from './Tools.js';

const logger = createLogger('Tool:Fetcher');

/**
 * Interface for the result of a URL fetch operation
 */
export interface FetchedContent {
  url: string;
  title: string;
  markdownContent: string;
  success: boolean;
  error?: string;
}

/**
 * Arguments for the FetcherTool
 */
export interface FetcherToolArgs {
  urls: string[];
  reasoning: string;
}

/**
 * Result of the FetcherTool operation
 */
export interface FetcherToolResult {
  sources: FetchedContent[];
  success: boolean;
  error?: string;
}

/**
 * Agent that fetches and extracts content from URLs
 *
 * This agent takes a list of URLs, navigates to each one, and extracts
 * the main content as markdown. It uses NavigateURLTool for navigation
 * and HTMLToMarkdownTool for content extraction.
 */
export class FetcherTool implements Tool<FetcherToolArgs, FetcherToolResult> {
  name = 'fetcher_tool';
  description = 'Navigates to URLs, extracts and cleans the main content, returning markdown for each source';

  schema = {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'List of URLs to fetch content from'
      },
      reasoning: {
        type: 'string',
        description: 'Reasoning for the action, displayed to the user'
      }
    },
    required: ['urls', 'reasoning']
  };

  private navigateURLTool = new NavigateURLTool();
  private htmlToMarkdownTool = new HTMLToMarkdownTool();

  /**
   * Execute the fetcher agent to process multiple URLs
   */
  async execute(args: FetcherToolArgs): Promise<FetcherToolResult> {
    logger.info('Executing with args', { args });
    const { urls, reasoning } = args;

    // Validate input
    if (!Array.isArray(urls) || urls.length === 0) {
      return {
        sources: [],
        success: false,
        error: 'No URLs provided'
      };
    }

    // Process all provided URLs
    const urlsToProcess = urls;
    const results: FetchedContent[] = [];

    // Process each URL sequentially
    for (const url of urlsToProcess) {
      try {
        logger.info('Processing URL', { url });
        const fetchedContent = await this.fetchContentFromUrl(url, reasoning);
        results.push(fetchedContent);
      } catch (error: any) {
        logger.error('Error processing URL', { url, error: error.message, stack: error.stack });
        results.push({
          url,
          title: '',
          markdownContent: '',
          success: false,
          error: `Failed to process URL: ${error.message}`
        });
      }
    }

    return {
      sources: results,
      success: results.some(r => r.success) // Consider successful if at least one URL was processed
    };
  }

  /**
   * Fetch and extract content from a single URL
   */
  private async fetchContentFromUrl(url: string, reasoning: string): Promise<FetchedContent> {
    try {
      // Step 1: Navigate to the URL
      logger.info('Navigating to URL', { url });
      // Note: NavigateURLTool requires both url and reasoning parameters
      const navigationResult = await this.navigateURLTool.execute({
        url,
        reasoning: `Navigating to ${url} to extract content for research`
      } as { url: string, reasoning: string });

      // Check for navigation errors
      if ('error' in navigationResult) {
        return {
          url,
          title: '',
          markdownContent: '',
          success: false,
          error: navigationResult.error
        };
      }

      // Wait for 1 second to ensure the page has time to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get metadata from navigation result
      const metadata = navigationResult.metadata ? navigationResult.metadata : { url: '', title: '' };

      // Step 2: Extract markdown content using HTMLToMarkdownTool
      logger.info('Extracting content from URL', { url });
      const extractionResult = await this.htmlToMarkdownTool.execute({
        instruction: 'Extract the main content focusing on article text, headings, and important information. Remove ads, navigation, and distracting elements.',
        reasoning
      });

      // Check for extraction errors
      if (!extractionResult.success || !extractionResult.markdownContent) {
        return {
          url,
          title: metadata?.title || '',
          markdownContent: '',
          success: false,
          error: extractionResult.error || 'Failed to extract content'
        };
      }

      // Return the fetched content
      return {
        url: metadata?.url || url,
        title: metadata?.title || '',
        markdownContent: extractionResult.markdownContent,
        success: true
      };
    } catch (error: any) {
      logger.error('Error processing URL', { url, error: error.message, stack: error.stack });
      return {
        url,
        title: '',
        markdownContent: '',
        success: false,
        error: `Error fetching content: ${error.message}`
      };
    }
  }
}
