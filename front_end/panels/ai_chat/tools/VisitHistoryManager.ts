// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Interface for visit history data
import { createLogger } from '../core/Logger.js';

const logger = createLogger('VisitHistoryManager');
export interface VisitData {
  url: string;
  domain: string;
  title: string;
  timestamp: number;
  keywords: string[];
}

// Class for storing and retrieving visited page data
export class VisitHistoryManager {
  private static instance: VisitHistoryManager;
  private dbName = 'visitHistoryDB';
  private storeName = 'visitHistory';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private initialized = false;

  static getInstance(): VisitHistoryManager {
    if (!VisitHistoryManager.instance) {
      VisitHistoryManager.instance = new VisitHistoryManager();
    }
    return VisitHistoryManager.instance;
  }

  private constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    // TODO: Add ability to disable visit history
    return await new Promise((resolve, reject) => {
      if (this.initialized) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = event => {
        logger.error('Error opening visit history database:', event);
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = event => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.initialized = true;
        logger.info('Visit history database opened successfully');
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create the store with an auto-incrementing key
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });

          // Create indices for searching
          store.createIndex('urlIndex', 'url', { unique: false });
          store.createIndex('domainIndex', 'domain', { unique: false });
          store.createIndex('timestampIndex', 'timestamp', { unique: false });
          store.createIndex('keywordsIndex', 'keywords', { unique: false, multiEntry: true });

          logger.info('Visit history object store created');
        }
      };
    });
  }

  /**
   * Extracts keywords from page content
   * Basic implementation using frequency analysis
   */
  private async extractKeywords(text: string, accessibilityTree: string | null): Promise<string[]> {
    // Combine text sources
    const combinedText = [
      text || '',
      accessibilityTree || ''
    ].join(' ');

    // Get only meaningful words (filter out common words, short words)
    const words = combinedText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word =>
        word.length > 3 &&
        !['this', 'that', 'with', 'from', 'have', 'some', 'what', 'were', 'when', 'your', 'will', 'been', 'they', 'them'].includes(word)
      );

    // Count word frequency
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    // Sort by frequency and take top 10 words
    const keywords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return keywords;
  }

  /**
   * Extracts domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      logger.error('Error extracting domain from URL:', e);
      return '';
    }
  }

  /**
   * Stores a page visit in the database
   */
  async storeVisit(pageInfo: { url: string, title: string }, accessibilityTree: string | null): Promise<void> {
    await this.initDB();

    if (!this.db) {
      logger.error('Database not initialized');
      return;
    }

    try {
      const { url, title } = pageInfo;
      const domain = this.extractDomain(url);
      const keywords = await this.extractKeywords(title, accessibilityTree);

      const visitData: VisitData = {
        url,
        domain,
        title,
        timestamp: Date.now(),
        keywords
      };

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // First check if we already have a recent entry for this URL
      const urlIndex = store.index('urlIndex');
      const existingEntries = await new Promise<IDBCursorWithValue[]>(resolve => {
        const result: IDBCursorWithValue[] = [];
        const request = urlIndex.openCursor(IDBKeyRange.only(url));

        request.onsuccess = event => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            result.push(cursor);
            cursor.continue();
          } else {
            resolve(result);
          }
        };

        request.onerror = () => resolve([]);
      });

      // Check if we have a recent entry (within last hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const recentEntry = existingEntries.find(cursor => {
        // Add null check before accessing cursor.value and its properties
        if (!cursor?.value) {return false;}

        const value = cursor.value as VisitData;
        return value && value.timestamp > oneHourAgo;
      });

      if (recentEntry?.value) {
        // Update the existing entry with new timestamp and possibly new keywords
        const existingData = recentEntry.value as VisitData;
        const updatedData = {
          ...existingData,
          timestamp: Date.now(),
          // Merge keywords, remove duplicates
          keywords: [...new Set([...existingData.keywords, ...keywords])]
        };

        store.put(updatedData);
      } else {
        // Add new entry
        store.add(visitData);
      }

      logger.info('Stored visit:', visitData);
    } catch (error) {
      logger.error('Error storing visit:', error);
    }
  }

  /**
   * Retrieves visit history filtered by domain
   */
  async getVisitsByDomain(domain: string): Promise<VisitData[]> {
    await this.initDB();

    if (!this.db) {
      logger.error('Database not initialized');
      return [];
    }

    return await new Promise(resolve => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('domainIndex');

      const results: VisitData[] = [];
      const request = index.openCursor(IDBKeyRange.only(domain));

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push(cursor.value as VisitData);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        logger.error('Error retrieving visits by domain');
        resolve([]);
      };
    });
  }

  /**
   * Retrieves visit history filtered by keyword
   */
  async getVisitsByKeyword(keyword: string): Promise<VisitData[]> {
    await this.initDB();

    if (!this.db) {
      logger.error('Database not initialized');
      return [];
    }

    return await new Promise(resolve => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('keywordsIndex');

      const results: VisitData[] = [];
      const request = index.openCursor(IDBKeyRange.only(keyword.toLowerCase()));

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push(cursor.value as VisitData);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        logger.error('Error retrieving visits by keyword');
        resolve([]);
      };
    });
  }

  /**
   * Retrieves all visit history within a date range
   */
  async getVisitsByDateRange(startTime: number, endTime: number): Promise<VisitData[]> {
    await this.initDB();

    if (!this.db) {
      logger.error('Database not initialized');
      return [];
    }

    return await new Promise(resolve => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestampIndex');

      const results: VisitData[] = [];
      const request = index.openCursor(IDBKeyRange.bound(startTime, endTime));

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push(cursor.value as VisitData);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        logger.error('Error retrieving visits by date range');
        resolve([]);
      };
    });
  }

  /**
   * Performs a search across all visit data using multiple criteria
   */
  async searchVisits(options: {
    domain?: string,
    keyword?: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  }): Promise<VisitData[]> {
    await this.initDB();

    if (!this.db) {
      logger.error('Database not initialized');
      return [];
    }

    const { domain, keyword, startTime, endTime, limit = 100 } = options;

    return await new Promise(resolve => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const results: VisitData[] = [];
      let request: IDBRequest;

      // Choose the most efficient index based on provided filters
      if (domain) {
        const index = store.index('domainIndex');
        request = index.openCursor(IDBKeyRange.only(domain));
      } else if (keyword) {
        const index = store.index('keywordsIndex');
        request = index.openCursor(IDBKeyRange.only(keyword.toLowerCase()));
      } else if (startTime && endTime) {
        const index = store.index('timestampIndex');
        request = index.openCursor(IDBKeyRange.bound(startTime, endTime));
      } else {
        // No specific filter, get all sorted by timestamp (most recent first)
        const index = store.index('timestampIndex');
        request = index.openCursor(null, 'prev');
      }

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const data = cursor.value as VisitData;
          let matches = true;

          // Apply additional filters that weren't used for the initial index selection
          if (domain && data.domain !== domain) {
            matches = false;
          }

          if (matches && keyword && !data.keywords.includes(keyword.toLowerCase())) {
            matches = false;
          }

          if (matches && startTime && data.timestamp < startTime) {
            matches = false;
          }

          if (matches && endTime && data.timestamp > endTime) {
            matches = false;
          }

          if (matches) {
            results.push(data);
          }

          // Stop when we hit the limit
          if (results.length < limit) {
            cursor.continue();
          } else {
            resolve(results);
          }
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        logger.error('Error searching visits');
        resolve([]);
      };
    });
  }

  /**
   * Clears all visit history data from the database
   */
  async clearHistory(): Promise<void> {
    await this.initDB();

    if (!this.db) {
      logger.error('Database not initialized');
      return;
    }

    return await new Promise<void>((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        // Clear all data from the store
        const request = store.clear();

        request.onsuccess = () => {
          logger.info('Visit history cleared successfully');
          resolve();
        };

        request.onerror = event => {
          logger.error('Error clearing visit history:', event);
          reject(new Error('Failed to clear visit history'));
        };
      } catch (error) {
        logger.error('Error clearing visit history:', error);
        reject(error);
      }
    });
  }
}

// Initialize VisitHistoryManager
VisitHistoryManager.getInstance();
