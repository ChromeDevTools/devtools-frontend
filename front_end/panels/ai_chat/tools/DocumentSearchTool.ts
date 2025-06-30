// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from '../core/Logger.js';
import { VectorDBClient, type VectorSearchResult } from './VectorDBClient.js';
import type { Tool } from './Tools.js';

const logger = createLogger('Tool:DocumentSearch');

/**
 * Arguments for document search operation
 */
export interface DocumentSearchArgs {
  query: string;
  limit?: number;
  tags?: string[];
  domain?: string;
  reasoning: string;
}

/**
 * Formatted search result for display
 */
export interface FormattedSearchResult {
  id: string;
  title: string;
  url: string;
  content: string;
  relevanceScore: number;
  domain: string;
  tags: string[];
  bookmarkedAt: string;
}

/**
 * Result from document search operation
 */
export interface DocumentSearchResult {
  success: boolean;
  results?: FormattedSearchResult[];
  totalResults?: number;
  query?: string;
  error?: string;
  message?: string;
}

/**
 * Tool for searching previously bookmarked documents using semantic similarity
 */
export class DocumentSearchTool implements Tool<DocumentSearchArgs, DocumentSearchResult> {
  name = 'document_search';
  description = 'Searches through previously bookmarked documents using semantic similarity. Finds relevant content based on natural language queries, not just keyword matching.';

  schema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language search query to find relevant documents'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10, max: 50)',
        minimum: 1,
        maximum: 50
      },
      tags: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Filter results by specific tags'
      },
      domain: {
        type: 'string',
        description: 'Filter results by domain (e.g., "github.com", "stackoverflow.com")'
      },
      reasoning: {
        type: 'string',
        description: 'Reasoning for the search, displayed to the user'
      }
    },
    required: ['query', 'reasoning']
  };

  /**
   * Execute the document search operation
   */
  async execute(args: DocumentSearchArgs): Promise<DocumentSearchResult> {
    logger.info('Executing document search with args', { args });

    try {
      // Validate input
      if (!args.query || args.query.trim().length === 0) {
        return {
          success: false,
          error: 'Search query cannot be empty'
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

      // Prepare search parameters
      const limit = Math.min(args.limit || 5, 20); // Default to 5, max 20
      const filter = this.buildSearchFilter(args);

      // Execute search
      const vectorClient = new VectorDBClient(vectorDBConfig);
      const searchResult = await vectorClient.searchDocuments(
        args.query,
        limit,
        filter
      );

      if (!searchResult.success) {
        return {
          success: false,
          error: `Search failed: ${searchResult.error}`
        };
      }

      // Format results for display
      const formattedResults = this.formatSearchResults(searchResult.results || []);

      logger.info('Document search completed', { 
        query: args.query,
        resultsCount: formattedResults.length 
      });

      // Generate appropriate message
      const message = this.generateSearchMessage(args.query, formattedResults.length);

      return {
        success: true,
        results: formattedResults,
        totalResults: formattedResults.length,
        query: args.query,
        message
      };

    } catch (error: any) {
      logger.error('Error searching documents', { error: error.message, stack: error.stack });
      return {
        success: false,
        error: `Error searching documents: ${error.message}`
      };
    }
  }

  /**
   * Build search filter based on arguments
   */
  private buildSearchFilter(args: DocumentSearchArgs): Record<string, any> | undefined {
    const filter: Record<string, any> = {};

    if (args.tags && args.tags.length > 0) {
      filter.tags = { $in: args.tags };
    }

    if (args.domain) {
      filter.domain = args.domain;
    }

    // Return undefined if no filters, otherwise return the filter object
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  /**
   * Format search results for display
   */
  private formatSearchResults(results: VectorSearchResult[]): FormattedSearchResult[] {
    return results.map(result => {
      // Extract excerpt from content (first 300 characters)
      const contentExcerpt = this.extractContentExcerpt(result.content);
      
      // Format timestamp
      const bookmarkedAt = this.formatTimestamp(result.metadata.timestamp);

      return {
        id: result.id,
        title: result.metadata.title,
        url: result.metadata.url,
        content: contentExcerpt,
        relevanceScore: Math.round(result.score * 100) / 100, // Round to 2 decimal places
        domain: result.metadata.domain || 'unknown',
        tags: result.metadata.tags || [],
        bookmarkedAt
      };
    });
  }

  /**
   * Extract a meaningful excerpt from content
   */
  private extractContentExcerpt(content: string): string {
    // Remove markdown formatting for cleaner excerpt
    const cleanContent = content
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/\n\s*\n/g, ' ') // Replace multiple newlines with space
      .trim();

    // Return first 300 characters with ellipsis if longer
    if (cleanContent.length <= 300) {
      return cleanContent;
    }

    // Find a good breaking point near 300 characters
    const breakPoint = cleanContent.indexOf(' ', 280);
    return cleanContent.substring(0, breakPoint > 0 ? breakPoint : 300) + '...';
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)} months ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Generate appropriate search message
   */
  private generateSearchMessage(query: string, resultCount: number): string {
    if (resultCount === 0) {
      return `No documents found for "${query}". Try a different search term or check if you have any bookmarks saved.`;
    } else if (resultCount === 1) {
      return `Found 1 relevant document for "${query}".`;
    } else {
      return `Found ${resultCount} relevant documents for "${query}". Results are ranked by semantic similarity.`;
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