// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as Utils from '../common/utils.js';
import { createLogger } from '../core/Logger.js';
import { HTMLToMarkdownTool } from './HTMLToMarkdownTool.js';
import { VectorDBClient, type VectorDocument, type VectorStoreResponse } from './VectorDBClient.js';
import type { Tool } from './Tools.js';
import { integer } from '../../../generated/protocol.js';

const logger = createLogger('Tool:BookmarkStore');

/**
 * Arguments for bookmark store operation
 */
export interface BookmarkStoreArgs {
  title?: string;
  tags?: string[];
  reasoning: string;
  includeFullContent?: boolean;
}

/**
 * Result from bookmark store operation
 */
export interface BookmarkStoreResult {
  success: boolean;
  id?: integer;
  url?: string;
  title?: string;
  error?: string;
  message?: string;
}

/**
 * Tool for storing current page content as a bookmark in vector database
 */
export class BookmarkStoreTool implements Tool<BookmarkStoreArgs, BookmarkStoreResult> {
  name = 'bookmark_store';
  description = 'Stores the current page content and metadata in a vector database for later retrieval. Extracts clean markdown content and makes it searchable.';

  schema = {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Custom title for the bookmark (optional, will use page title if not provided)'
      },
      tags: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Tags to categorize the bookmark for easier discovery'
      },
      reasoning: {
        type: 'string',
        description: 'Reasoning for bookmarking this page, displayed to the user'
      },
      includeFullContent: {
        type: 'boolean',
        description: 'Whether to include full page content or just a summary (default: true)'
      }
    },
    required: ['reasoning']
  };

  private htmlToMarkdownTool = new HTMLToMarkdownTool();

  /**
   * Execute the bookmark store operation
   */
  async execute(args: BookmarkStoreArgs): Promise<BookmarkStoreResult> {
    logger.info('Executing bookmark store with args', { args });

    try {
      // Get the current page target
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) {
        return {
          success: false,
          error: 'No page target available - cannot bookmark current page'
        };
      }

      // Get current page URL and title
      const { url, pageTitle } = await this.getCurrentPageInfo(target);
      if (!url) {
        return {
          success: false,
          error: 'Could not determine current page URL'
        };
      }

      // Get vector DB configuration
      const vectorDBConfig = this.getVectorDBConfig();
      if (!vectorDBConfig.endpoint) {
        return {
          success: false,
          error: 'Vector database not configured. Please set up vector DB endpoint in Settings.'
        };
      }

      // Extract page content as markdown
      logger.info('Extracting page content for bookmark');
      const markdownResult = await this.htmlToMarkdownTool.execute({
        instruction: `Extract the main content from this page for bookmarking. Focus on the primary article or content that would be useful for later reference.`,
        reasoning: 'Extracting content for bookmark storage'
      });

      if (!markdownResult.success || !markdownResult.markdownContent) {
        return {
          success: false,
          error: `Failed to extract page content: ${markdownResult.error || 'Unknown error'}`
        };
      }

      // Prepare document for storage
      const document: VectorDocument = {
        content: markdownResult.markdownContent,
        metadata: {
          url,
          title: args.title || pageTitle || 'Untitled Page',
          timestamp: Date.now(),
          domain: this.extractDomain(url),
          tags: args.tags || [],
        }
      };

      // Store in vector database
      const vectorClient = new VectorDBClient(vectorDBConfig);
      const storeResult = await vectorClient.storeDocument(document);

      if (!storeResult.success) {
        return {
          success: false,
          error: `Failed to store bookmark: ${storeResult.error}`
        };
      }

      logger.info('Bookmark stored successfully', { 
        id: storeResult.id, 
        url, 
        title: document.metadata.title 
      });

      return {
        success: true,
        id: storeResult.id,
        url,
        title: document.metadata.title,
        message: `Successfully bookmarked "${document.metadata.title}" - content is now searchable in your document library.`
      };

    } catch (error: any) {
      logger.error('Error storing bookmark', { error: error.message, stack: error.stack });
      return {
        success: false,
        error: `Error storing bookmark: ${error.message}`
      };
    }
  }

  /**
   * Get current page URL and title
   */
  private async getCurrentPageInfo(target: SDK.Target.Target): Promise<{
    url: string;
    pageTitle: string;
  }> {
    try {
      // Get the runtime model to execute JavaScript
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      if (!runtimeModel) {
        throw new Error('Runtime model not available');
      }

      // Get the execution context for evaluation
      const executionContext = runtimeModel.defaultExecutionContext();
      if (!executionContext) {
        throw new Error('No execution context available');
      }

      // Execute JavaScript to get URL and title
      const result = await executionContext.evaluate(
        {
          expression: `({
            url: window.location.href,
            title: document.title
          })`,
          objectGroup: 'temp',
          includeCommandLineAPI: false,
          silent: true,
          returnByValue: true,
          generatePreview: false
        },
        /* userGesture */ false,
        /* awaitPromise */ false
      );

      if ('error' in result) {
        throw new Error(`Failed to get page information: ${result.error}`);
      }

      if (!result.object || !result.object.value) {
        throw new Error('Failed to get page information: No result returned');
      }

      const pageInfo = result.object.value;
      return {
        url: pageInfo.url || '',
        pageTitle: pageInfo.title || ''
      };

    } catch (error: any) {
      logger.error('Failed to get current page info', { error: error.message });
      return {
        url: '',
        pageTitle: ''
      };
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get vector database configuration from localStorage
   */
  private getVectorDBConfig() {
    return {
      endpoint: localStorage.getItem('ai_chat_milvus_endpoint') || '',
      username: localStorage.getItem('ai_chat_milvus_username') || 'root',
      password: localStorage.getItem('ai_chat_milvus_password') || 'Milvus',
      collection: localStorage.getItem('ai_chat_milvus_collection') || 'bookmarks',
      openaiApiKey: localStorage.getItem('ai_chat_milvus_openai_key') || undefined,
    };
  }
}