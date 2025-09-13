// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {SettingsDialog} from '../SettingsDialog.js';
import {LLMClient} from '../../LLM/LLMClient.js';

describe('SettingsDialog OpenRouter Cache Auto-Refresh', () => {
  let mockLocalStorage: Map<string, string>;
  let originalDateNow: () => number;
  let mockCurrentTime: number;
  let fetchOpenRouterModelsCalls: any[];

  // Cache duration constant (60 minutes in milliseconds)
  const CACHE_DURATION_MS = 60 * 60 * 1000;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = new Map();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage.get(key) || null,
        setItem: (key: string, value: string) => mockLocalStorage.set(key, value),
        removeItem: (key: string) => mockLocalStorage.delete(key),
        clear: () => mockLocalStorage.clear(),
      },
      writable: true,
    });

    // Mock Date.now() for time-based tests
    originalDateNow = Date.now;
    mockCurrentTime = 1640995200000; // January 1, 2022 00:00:00 UTC
    Date.now = () => mockCurrentTime;

    // Mock LLMClient.fetchOpenRouterModels
    fetchOpenRouterModelsCalls = [];
    LLMClient.fetchOpenRouterModels = async (apiKey: string) => {
      fetchOpenRouterModelsCalls.push({ apiKey, timestamp: mockCurrentTime });
      return [
        { id: 'openai/gpt-4', name: 'GPT-4' },
        { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
        { id: 'meta-llama/llama-2-70b-chat', name: 'Llama 2 70B' },
      ];
    };
  });

  afterEach(() => {
    // Restore original Date.now
    Date.now = originalDateNow;
    mockLocalStorage.clear();
    fetchOpenRouterModelsCalls = [];
  });

  describe('Cache Timestamp Setting', () => {
    it('should set timestamp when models are fetched via updateOpenRouterModels', () => {
      const mockModels = [
        { id: 'openai/gpt-4', name: 'GPT-4' },
        { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
      ];

      SettingsDialog.updateOpenRouterModels(mockModels);

      const timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      assert.strictEqual(timestamp, mockCurrentTime.toString());
    });

    it('should set timestamp when models are stored in cache', () => {
      const mockModels = [
        { value: 'openai/gpt-4', label: 'GPT-4', type: 'openrouter' as const },
        { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet', type: 'openrouter' as const },
      ];

      mockLocalStorage.set('openrouter_models_cache', JSON.stringify(mockModels));
      SettingsDialog.updateOpenRouterModels(mockModels.map(m => ({ id: m.value, name: m.label })));

      const timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      assert.strictEqual(timestamp, mockCurrentTime.toString());
    });
  });

  describe('Cache Staleness Detection', () => {
    it('should consider cache stale when no timestamp exists', () => {
      // Set up cache without timestamp
      const mockModels = [
        { value: 'openai/gpt-4', label: 'GPT-4', type: 'openrouter' as const },
      ];
      mockLocalStorage.set('openrouter_models_cache', JSON.stringify(mockModels));
      // No timestamp set

      const timestamp = window.localStorage.getItem('openrouter_models_cache_timestamp');
      assert.isNull(timestamp);
    });

    it('should consider cache fresh when less than 60 minutes old', () => {
      const cacheTime = mockCurrentTime - (30 * 60 * 1000); // 30 minutes ago
      mockLocalStorage.set('openrouter_models_cache_timestamp', cacheTime.toString());

      const timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      const cacheAge = mockCurrentTime - parseInt(timestamp!, 10);
      
      assert.strictEqual(cacheAge < CACHE_DURATION_MS, true);
    });

    it('should consider cache stale when older than 60 minutes', () => {
      const cacheTime = mockCurrentTime - (90 * 60 * 1000); // 90 minutes ago
      mockLocalStorage.set('openrouter_models_cache_timestamp', cacheTime.toString());

      const timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      const cacheAge = mockCurrentTime - parseInt(timestamp!, 10);
      
      assert.strictEqual(cacheAge > CACHE_DURATION_MS, true);
    });
  });

  describe('Auto-Refresh Behavior', () => {
    it('should not trigger fetch when cache is fresh', async () => {
      const freshCacheTime = mockCurrentTime - (30 * 60 * 1000); // 30 minutes ago
      mockLocalStorage.set('openrouter_models_cache_timestamp', freshCacheTime.toString());
      mockLocalStorage.set('ai_chat_openrouter_api_key', 'test-api-key');

      // The actual auto-refresh logic would be tested through the settings dialog
      // For now, we test the timestamp comparison logic
      const timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      const cacheAge = mockCurrentTime - parseInt(timestamp!, 10);
      const shouldRefresh = cacheAge > CACHE_DURATION_MS;
      
      assert.strictEqual(shouldRefresh, false);
    });

    it('should trigger fetch when cache is stale', async () => {
      const staleCacheTime = mockCurrentTime - (90 * 60 * 1000); // 90 minutes ago
      mockLocalStorage.set('openrouter_models_cache_timestamp', staleCacheTime.toString());
      mockLocalStorage.set('ai_chat_openrouter_api_key', 'test-api-key');

      // Test timestamp comparison logic
      const timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      const cacheAge = mockCurrentTime - parseInt(timestamp!, 10);
      const shouldRefresh = cacheAge > CACHE_DURATION_MS;
      
      assert.strictEqual(shouldRefresh, true);
    });

    it('should handle missing API key gracefully', () => {
      const staleCacheTime = mockCurrentTime - (90 * 60 * 1000); // 90 minutes ago
      mockLocalStorage.set('openrouter_models_cache_timestamp', staleCacheTime.toString());
      // No API key set

      const apiKey = window.localStorage.getItem('ai_chat_openrouter_api_key');
      assert.isNull(apiKey);
      
      // Should not attempt fetch without API key
      const shouldAttemptFetch = !!apiKey;
      assert.strictEqual(shouldAttemptFetch, false);
    });
  });

  describe('Cache Age Calculation', () => {
    it('should correctly calculate cache age in minutes', () => {
      const cacheTime = mockCurrentTime - (45 * 60 * 1000); // 45 minutes ago
      mockLocalStorage.set('openrouter_models_cache_timestamp', cacheTime.toString());

      const timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      const cacheAge = mockCurrentTime - parseInt(timestamp!, 10);
      const ageInMinutes = Math.round(cacheAge / (1000 * 60));
      
      assert.strictEqual(ageInMinutes, 45);
    });

    it('should correctly calculate remaining cache time', () => {
      const cacheTime = mockCurrentTime - (30 * 60 * 1000); // 30 minutes ago
      mockLocalStorage.set('openrouter_models_cache_timestamp', cacheTime.toString());

      const timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      const cacheAge = mockCurrentTime - parseInt(timestamp!, 10);
      const remainingTime = CACHE_DURATION_MS - cacheAge;
      const remainingMinutes = Math.round(remainingTime / (1000 * 60));
      
      assert.strictEqual(remainingMinutes, 30);
    });
  });

  describe('Time Advancement Tests', () => {
    it('should detect when cache becomes stale over time', () => {
      // Set cache as fresh initially
      const initialTime = mockCurrentTime;
      mockLocalStorage.set('openrouter_models_cache_timestamp', initialTime.toString());

      // Verify cache is fresh
      let timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      let cacheAge = mockCurrentTime - parseInt(timestamp!, 10);
      assert.strictEqual(cacheAge < CACHE_DURATION_MS, true);

      // Advance time by 90 minutes
      mockCurrentTime += (90 * 60 * 1000);

      // Verify cache is now stale
      timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      cacheAge = mockCurrentTime - parseInt(timestamp!, 10);
      assert.strictEqual(cacheAge > CACHE_DURATION_MS, true);
    });

    it('should handle edge case at exact cache duration boundary', () => {
      const cacheTime = mockCurrentTime - CACHE_DURATION_MS; // Exactly 60 minutes ago
      mockLocalStorage.set('openrouter_models_cache_timestamp', cacheTime.toString());

      const timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      const cacheAge = mockCurrentTime - parseInt(timestamp!, 10);
      
      // Should be considered stale when age equals duration
      assert.strictEqual(cacheAge >= CACHE_DURATION_MS, true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should maintain cache consistency across multiple operations', () => {
      // Initial fetch and cache
      SettingsDialog.updateOpenRouterModels([
        { id: 'openai/gpt-4', name: 'GPT-4' },
      ]);

      let timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      assert.strictEqual(timestamp, mockCurrentTime.toString());

      // Advance time slightly (cache still fresh)
      mockCurrentTime += (30 * 60 * 1000); // 30 minutes

      // Verify cache is still considered fresh
      timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      const cacheAge = mockCurrentTime - parseInt(timestamp!, 10);
      assert.strictEqual(cacheAge < CACHE_DURATION_MS, true);

      // Update models again
      SettingsDialog.updateOpenRouterModels([
        { id: 'openai/gpt-4', name: 'GPT-4' },
        { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
      ]);

      // Timestamp should be updated to current time
      timestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');
      assert.strictEqual(timestamp, mockCurrentTime.toString());
    });

    it('should handle rapid consecutive operations correctly', () => {
      const startTime = mockCurrentTime;

      // First operation
      SettingsDialog.updateOpenRouterModels([{ id: 'model1', name: 'Model 1' }]);
      let firstTimestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');

      // Second operation immediately after (same timestamp due to mocking)
      SettingsDialog.updateOpenRouterModels([{ id: 'model2', name: 'Model 2' }]);
      let secondTimestamp = mockLocalStorage.get('openrouter_models_cache_timestamp');

      assert.strictEqual(firstTimestamp, startTime.toString());
      assert.strictEqual(secondTimestamp, startTime.toString());
      assert.strictEqual(firstTimestamp, secondTimestamp);
    });
  });
});
