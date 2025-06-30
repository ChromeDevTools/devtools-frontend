// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { integer } from '../../../generated/protocol.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('VectorDBClient');

/**
 * Document data structure for storing in vector database
 */
export interface VectorDocument {
  content: string;
  metadata: {
    url: string;
    title: string;
    timestamp: number;
    domain: string;
    tags?: string[];
    excerpt?: string;
  };
}

/**
 * Search result from vector database
 */
export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    url: string;
    title: string;
    timestamp: number;
    domain: string;
    tags?: string[];
  };
}

/**
 * Vector database store response
 */
export interface VectorStoreResponse {
  success: boolean;
  id?: integer;
  error?: string;
}

/**
 * Vector database search response  
 */
export interface VectorSearchResponse {
  success: boolean;
  results?: VectorSearchResult[];
  error?: string;
}

/**
 * Milvus configuration
 */
export interface MilvusConfig {
  endpoint: string;
  username?: string;
  password?: string;
  collection: string;
  openaiApiKey?: string;
}

/**
 * Milvus vector database client
 * Implements semantic search for browser bookmarks using Milvus + OpenAI embeddings
 */
export class VectorDBClient {
  private endpoint: string;
  private token: string | undefined;
  private collectionName: string;
  private openaiApiKey: string | undefined;
  private dimension = 1536; // OpenAI text-embedding-3-small dimension

  constructor(config: MilvusConfig) {
    this.endpoint = config.endpoint.endsWith('/') ? config.endpoint.slice(0, -1) : config.endpoint;
    this.collectionName = config.collection;
    this.openaiApiKey = config.openaiApiKey;
    
    // Handle authentication: API token or username:password
    if (config.password) {
      if (config.username && config.username !== 'root') {
        // Username provided and not default - use username:password authentication (self-hosted)
        this.token = btoa(`${config.username}:${config.password}`);
      } else {
        // No username or default username - treat password as direct API token (Milvus Cloud)
        this.token = config.password;
      }
    }
  }

  /**
   * Ensure collection exists with proper schema for bookmarks
   */
  async ensureCollection(): Promise<void> {
    try {
      // Check if collection exists
      const describeResponse = await this.makeRequest('GET', `/v2/vectordb/collections/describe`, {
        collectionName: this.collectionName
      });

      if (describeResponse.ok) {
        logger.info('Collection already exists', { collection: this.collectionName });
        return;
      }

      // Create collection with bookmark schema
      logger.info('Creating collection for bookmarks', { collection: this.collectionName });
      
      const createResponse = await this.makeRequest('POST', '/v2/vectordb/collections/create', {
        collectionName: this.collectionName,
        dimension: this.dimension,
        fields: [
          {
            fieldName: 'id',
            dataType: 'Int64',
            isPrimary: true
          },
          {
            fieldName: 'url',
            dataType: 'VarChar',
            elementTypeParams: { max_length: '2000' }
          },
          {
            fieldName: 'title',
            dataType: 'VarChar',
            elementTypeParams: { max_length: '500' }
          },
          {
            fieldName: 'content',
            dataType: 'VarChar',
            elementTypeParams: { max_length: '65535' }
          },
          {
            fieldName: 'vector',
            dataType: 'FloatVector',
            elementTypeParams: { dim: this.dimension.toString() }
          },
          {
            fieldName: 'timestamp',
            dataType: 'Int64'
          },
          {
            fieldName: 'domain',
            dataType: 'VarChar',
            elementTypeParams: { max_length: '200' }
          },
          {
            fieldName: 'tags',
            dataType: 'JSON'
          }
        ],
        indexParams: [
          {
            fieldName: 'vector',
            indexName: 'vector_index',
            indexType: 'HNSW',
            metricType: 'COSINE',
            params: { M: '16', efConstruction: '200' }
          }
        ]
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create collection: ${errorText}`);
      }

      logger.info('Collection created successfully', { collection: this.collectionName });
    } catch (error: any) {
      logger.error('Failed to ensure collection', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate OpenAI embedding for text content
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small',
          dimensions: this.dimension
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${errorText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error: any) {
      logger.error('Failed to generate embedding', { error: error.message });
      throw error;
    }
  }

  /**
   * Store a document in Milvus with embedding
   */
  async storeDocument(document: VectorDocument): Promise<VectorStoreResponse> {
    try {
      logger.info('Storing document in Milvus', { 
        url: document.metadata.url, 
        title: document.metadata.title 
      });

      // Ensure collection exists
      await this.ensureCollection();

      // Generate embedding for content
      const embedding = await this.generateEmbedding(document.content);

      logger.info('Generated embedding for document', { url: document.metadata.url, embedding });
      // Create document ID from URL hash
      const documentId = this.generateDocumentId(document.metadata.url);

      // Prepare entity for Milvus
      const entity = {
        id: documentId,
        url: document.metadata.url,
        title: document.metadata.title,
        content: document.content,
        vector: embedding,
        timestamp: document.metadata.timestamp || Date.now(),
        domain: document.metadata.domain,
        tags: document.metadata.tags || []
      };

      logger.info('Prepared entity for Milvus', { entity });
      // Insert into Milvus
      const response = await this.makeRequest('POST', '/v2/vectordb/entities/insert', {
        collectionName: this.collectionName,
        data: [entity]
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to insert document: ${errorText}`);
      }

      const result = await response.json();
      logger.info('Document stored successfully', { id: documentId });

      return {
        success: true,
        id: documentId
      };
    } catch (error: any) {
      logger.error('Failed to store document', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search documents using semantic similarity
   */
  async searchDocuments(query: string, limit: number = 5, filters?: Record<string, unknown>): Promise<VectorSearchResponse> {
    try {
      logger.info('Searching documents in Milvus', { query, limit, filters });

      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Build search request
      const searchRequest = {
        collectionName: this.collectionName,
        data: [queryEmbedding],
        annsField: 'vector',
        limit,
        outputFields: ['id', 'url', 'title', 'content', 'timestamp', 'domain', 'tags'],
        filter: this.buildFilter(filters)
      };

      // Execute search
      const response = await this.makeRequest('POST', '/v2/vectordb/entities/search', searchRequest);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Search failed: ${errorText}`);
      }

      const result = await response.json();
      const searchResults = this.formatSearchResults(result.data || []);

      logger.info('Document search completed', { resultCount: searchResults.length });

      return {
        success: true,
        results: searchResults
      };
    } catch (error: any) {
      logger.error('Failed to search documents', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test connection to Milvus
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Testing Milvus connection', { endpoint: this.endpoint });

      const response = await this.makeRequest('POST', '/v2/vectordb/collections/list');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Connection failed: ${errorText}`);
      }

      logger.info('Milvus connection test successful');
      return { success: true };
    } catch (error: any) {
      logger.error('Milvus connection test failed', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Make HTTP request to Milvus
   */
  private async makeRequest(method: string, path: string, body?: any): Promise<Response> {
    const url = `${this.endpoint}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      method,
      headers
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(body);
    } else if (body && method === 'GET') {
      // For GET requests, add params to URL
      const params = new URLSearchParams();
      Object.entries(body).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      const fullUrl = `${url}?${params.toString()}`;
      return fetch(fullUrl, config);
    }

    return fetch(url, config);
  }

  /**
   * Build Milvus filter expression from search options
   */
  private buildFilter(filters?: Record<string, unknown>): string | undefined {
    if (!filters) return undefined;

    const conditions: string[] = [];

    if (filters.domain) {
      conditions.push(`domain == "${filters.domain}"`);
    }

    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(tag => `JSON_CONTAINS(tags, '"${tag}"')`);
      conditions.push(`(${tagConditions.join(' OR ')})`);
    }

    if (filters.dateFrom || filters.dateTo) {
      if (filters.dateFrom) conditions.push(`timestamp >= ${filters.dateFrom}`);
      if (filters.dateTo) conditions.push(`timestamp <= ${filters.dateTo}`);
    }

    return conditions.length > 0 ? conditions.join(' AND ') : undefined;
  }

  /**
   * Format Milvus search results to our interface
   */
  private formatSearchResults(milvusResults: any[]): VectorSearchResult[] {
    logger.info('results from Milvus', { milvusResults });
    return milvusResults.map((result: any) => ({
      id: result.id,
      content: result.content,
      score: result.distance || result.score || 0,
      metadata: {
        url: result.url,
        title: result.title,
        timestamp: result.timestamp,
        domain: result.domain,
        tags: Array.isArray(result.tags) ? result.tags : []
      }
    }));
  }

  /**
   * Generate document ID from URL
   */
  private generateDocumentId(url: string): integer {
    // Simple hash function for URL to create stable document IDs
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Return the absolute value of the hash as an integer
    return Math.abs(hash);
  }

  /**
   * Create VectorDBClient from localStorage settings
   */
  static fromSettings(): VectorDBClient | null {
    const endpoint = localStorage.getItem('ai_chat_milvus_endpoint');
    const username = localStorage.getItem('ai_chat_milvus_username') || 'root';
    const password = localStorage.getItem('ai_chat_milvus_password') || 'Milvus';
    const collection = localStorage.getItem('ai_chat_milvus_collection') || 'bookmarks';
    const openaiApiKey = localStorage.getItem('ai_chat_milvus_openai_key');

    if (!endpoint) {
      logger.warn('No Milvus endpoint configured in settings');
      return null;
    }

    return new VectorDBClient({
      endpoint,
      username,
      password,
      collection,
      openaiApiKey: openaiApiKey || undefined
    });
  }
}