// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {AIChatPanel, DEFAULT_PROVIDER_MODELS, type ModelOption, resetAIChatPanelInstanceForTesting} from './AIChatPanel.js';
import {LLMProviderRegistry} from '../LLM/LLMProviderRegistry.js';
import {AgentService} from '../core/AgentService.js';
import {ChatMessageEntity} from './ChatView.js';

declare global {
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void): void;
  function beforeEach(fn: () => void): void;
  function afterEach(fn: () => void): void;
  namespace assert {
    function strictEqual(actual: unknown, expected: unknown): void;
    function deepEqual(actual: unknown, expected: unknown): void;
    function isNull(value: unknown): void;
  }
}

describe('AIChatPanel Model Validation', () => {
  let panel: AIChatPanel;
  let mockLocalStorage: Map<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = new Map();
    
    // Override localStorage methods
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage.get(key) || null,
        setItem: (key: string, value: string) => mockLocalStorage.set(key, value),
        removeItem: (key: string) => mockLocalStorage.delete(key),
        clear: () => mockLocalStorage.clear(),
      },
      writable: true,
    });
    
    // Clear any existing singleton instance
    resetAIChatPanelInstanceForTesting();
    
    // Clear provider registry
    LLMProviderRegistry.clear();
    
    // Set up default test state
    mockLocalStorage.set('ai_chat_provider', 'openrouter');
    mockLocalStorage.set('ai_chat_model_selection', 'google/gemini-2.5-flash-lite-preview-06-17');
    mockLocalStorage.set('ai_chat_mini_model', 'google/gemini-2.5-flash');
    mockLocalStorage.set('ai_chat_nano_model', 'google/gemini-2.5-flash-lite-preview-06-17');
    
    // Mock model options for OpenRouter
    const mockOpenRouterModels: ModelOption[] = [
      { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', type: 'openrouter' },
      { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', type: 'openrouter' },
      { value: 'openai/gpt-4o', label: 'GPT-4o', type: 'openrouter' },
    ];
    
    mockLocalStorage.set('ai_chat_all_model_options', JSON.stringify(mockOpenRouterModels));
    
    // Create panel instance
    panel = AIChatPanel.instance();
  });

  afterEach(() => {
    // Clean up
    LLMProviderRegistry.clear();
    mockLocalStorage.clear();
  });

  describe('#validateAndFixModelSelections', () => {
    it('should return true when all models are valid', () => {
      // Set up valid models
      mockLocalStorage.set('ai_chat_model_selection', 'google/gemini-2.5-flash');
      mockLocalStorage.set('ai_chat_mini_model', 'google/gemini-2.5-flash');
      mockLocalStorage.set('ai_chat_nano_model', 'google/gemini-2.5-flash');
      
      // Call public testing method
      const result = panel.validateAndFixModelSelectionsForTesting();
      
      assert.strictEqual(result, true);
    });

    it('should fix invalid main model and return false', () => {
      // Set up invalid main model
      mockLocalStorage.set('ai_chat_model_selection', 'invalid/model');
      
      const result = panel.validateAndFixModelSelectionsForTesting();
      
      assert.strictEqual(result, false);
      // Should reset to provider default
      assert.strictEqual(panel.getSelectedModel(), DEFAULT_PROVIDER_MODELS.openrouter.main);
    });

    it('should fix invalid mini model by falling back to provider default', () => {
      // Set up invalid mini model
      mockLocalStorage.set('ai_chat_mini_model', 'invalid/mini-model');
      
      const result = panel.validateAndFixModelSelectionsForTesting();
      
      assert.strictEqual(result, false);
      // Should reset to provider default mini model
      assert.strictEqual(AIChatPanel.getMiniModel(), DEFAULT_PROVIDER_MODELS.openrouter.mini);
    });

    it('should clear invalid mini model when no provider default exists', () => {
      // Set up scenario where provider has no mini default
      mockLocalStorage.set('ai_chat_provider', 'litellm');
      mockLocalStorage.set('ai_chat_mini_model', 'invalid/mini-model');
      
      const mockLiteLLMModels: ModelOption[] = [
        { value: 'custom-model-1', label: 'Custom Model 1', type: 'litellm' },
        { value: 'custom-model-2', label: 'Custom Model 2', type: 'litellm' },
      ];
      mockLocalStorage.set('ai_chat_all_model_options', JSON.stringify(mockLiteLLMModels));
      
      const result = panel.validateAndFixModelSelectionsForTesting();
      
      assert.strictEqual(result, false);
      // Should clear mini model (falls back to main model)
      assert.strictEqual(mockLocalStorage.get('ai_chat_mini_model'), null);
    });

    it('should fix invalid nano model by falling back to provider default', () => {
      // Set up invalid nano model
      mockLocalStorage.set('ai_chat_nano_model', 'invalid/nano-model');
      
      const result = panel.validateAndFixModelSelectionsForTesting();
      
      assert.strictEqual(result, false);
      // Should reset to provider default nano model
      assert.strictEqual(AIChatPanel.getNanoModel(), DEFAULT_PROVIDER_MODELS.openrouter.nano);
    });

    it('should handle multiple invalid models', () => {
      // Set up multiple invalid models
      mockLocalStorage.set('ai_chat_model_selection', 'invalid/main');
      mockLocalStorage.set('ai_chat_mini_model', 'invalid/mini');
      mockLocalStorage.set('ai_chat_nano_model', 'invalid/nano');
      
      const result = panel.validateAndFixModelSelectionsForTesting();
      
      assert.strictEqual(result, false);
      // All should be reset to provider defaults
      assert.strictEqual(panel.getSelectedModel(), DEFAULT_PROVIDER_MODELS.openrouter.main);
      assert.strictEqual(AIChatPanel.getMiniModel(), DEFAULT_PROVIDER_MODELS.openrouter.mini);
      assert.strictEqual(AIChatPanel.getNanoModel(), DEFAULT_PROVIDER_MODELS.openrouter.nano);
    });

    it('should return false when no models are available for provider', () => {
      // Set up scenario with no available models
      mockLocalStorage.set('ai_chat_all_model_options', JSON.stringify([]));
      
      const result = panel.validateAndFixModelSelectionsForTesting();
      
      assert.strictEqual(result, false);
    });
  });

  describe('Model getter methods', () => {
    it('getMiniModel should validate and return valid model', () => {
      // Set up valid mini model
      mockLocalStorage.set('ai_chat_mini_model', 'google/gemini-2.5-flash');
      
      const result = AIChatPanel.getMiniModel();
      
      assert.strictEqual(result, 'google/gemini-2.5-flash');
    });

    it('getMiniModel should fall back to main model when mini model is invalid', () => {
      // Set up invalid mini model
      mockLocalStorage.set('ai_chat_mini_model', 'invalid/mini-model');
      mockLocalStorage.set('ai_chat_model_selection', 'google/gemini-2.5-flash');
      
      const result = AIChatPanel.getMiniModel();
      
      // Should fall back to main model
      assert.strictEqual(result, 'google/gemini-2.5-flash');
    });

    it('getNanoModel should validate and return valid model', () => {
      // Set up valid models
      mockLocalStorage.set('ai_chat_nano_model', 'google/gemini-2.5-flash-lite-preview-06-17');
      
      // Note: This model is not in our mock list, so it should fall back
      const result = AIChatPanel.getNanoModel();
      
      // Should fall back to mini model default
      assert.strictEqual(result, DEFAULT_PROVIDER_MODELS.openrouter.mini);
    });

    it('getNanoModel should cascade through fallbacks correctly', () => {
      // Set up all invalid models
      mockLocalStorage.set('ai_chat_nano_model', 'invalid/nano');
      mockLocalStorage.set('ai_chat_mini_model', 'invalid/mini');
      mockLocalStorage.set('ai_chat_model_selection', 'google/gemini-2.5-flash');
      
      const result = AIChatPanel.getNanoModel();
      
      // Should cascade: invalid nano -> invalid mini -> valid main
      assert.strictEqual(result, 'google/gemini-2.5-flash');
    });
  });

  describe('Provider switching', () => {
    it('should reset models when switching to provider with incompatible models', () => {
      // Start with OpenRouter models
      mockLocalStorage.set('ai_chat_provider', 'openrouter');
      mockLocalStorage.set('ai_chat_model_selection', 'anthropic/claude-sonnet-4');
      
      // Switch to OpenAI provider
      mockLocalStorage.set('ai_chat_provider', 'openai');
      
      // Set up OpenAI models
      const mockOpenAIModels: ModelOption[] = [
        { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1', type: 'openai' },
        { value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini', type: 'openai' },
      ];
      mockLocalStorage.set('ai_chat_all_model_options', JSON.stringify(mockOpenAIModels));
      
      const result = panel.validateAndFixModelSelectionsForTesting();
      
      assert.strictEqual(result, false);
      // Should reset to OpenAI default
      assert.strictEqual(panel.getSelectedModel(), DEFAULT_PROVIDER_MODELS.openai.main);
    });
  });

  describe('Error scenarios', () => {
    it('should handle corrupted localStorage gracefully', () => {
      // Set up corrupted model options
      mockLocalStorage.set('ai_chat_all_model_options', 'invalid-json');
      
      // Should not throw an error
      const result = panel.validateAndFixModelSelectionsForTesting();
      
      // Should return false due to no available models
      assert.strictEqual(result, false);
    });

    it('should handle missing provider defaults gracefully', () => {
      // Set up unknown provider
      mockLocalStorage.set('ai_chat_provider', 'unknown-provider');
      
      const result = panel.validateAndFixModelSelectionsForTesting();
      
      // Should fall back to OpenAI defaults
      assert.strictEqual(result, false);
    });
  });

  describe('Integration with sendMessage', () => {
    it('should validate models before sending message', async () => {
      // Set up invalid model
      mockLocalStorage.set('ai_chat_model_selection', 'invalid/model');
      
      // Mock agent service
      const mockAgentService = {
        sendMessage: async () => Promise.resolve(),
      };
      (panel as any)['#agentService'] = mockAgentService;
      (panel as any)['#canSendMessages'] = true;
      
      // Mock provider registry to return true
      const originalHasProvider = LLMProviderRegistry.hasProvider;
      LLMProviderRegistry.hasProvider = () => true;
      
      await panel.sendMessage('test message');
      
      // Should have fixed the model before proceeding
      assert.strictEqual(panel.getSelectedModel(), DEFAULT_PROVIDER_MODELS.openrouter.main);
      
      // Restore original function
      LLMProviderRegistry.hasProvider = originalHasProvider;
    });
  });
});