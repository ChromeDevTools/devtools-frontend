// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { LLMMessage, LLMResponse, LLMCallOptions, LLMProvider, ModelInfo } from './LLMTypes.js';
import { LLMBaseProvider } from './LLMProvider.js';
import { LLMRetryManager } from './LLMErrorHandler.js';
import { LLMResponseParser } from './LLMResponseParser.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('OpenRouterProvider');

/**
 * OpenRouter model information
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  top_provider: {
    context_length: number;
    max_completion_tokens?: number;
  };
  per_request_limits?: {
    prompt_tokens: string;
    completion_tokens: string;
  };
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

/**
 * OpenRouter provider implementation using OpenAI-compatible Chat Completions API
 * https://openrouter.ai/docs/api-reference
 */
export class OpenRouterProvider extends LLMBaseProvider {
  private static readonly API_BASE_URL = 'https://openrouter.ai/api/v1';
  private static readonly CHAT_COMPLETIONS_PATH = '/chat/completions';
  private static readonly MODELS_PATH = '/models';
  
  readonly name: LLMProvider = 'openrouter';
  
  // Cache for vision models
  private visionModelsCache: Set<string> | null = null;
  private visionModelsCacheExpiry: number = 0;
  private static readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  constructor(private readonly apiKey: string) {
    super();
  }

  /**
   * Check if a model doesn't support temperature parameter
   * OpenAI's GPT-5, O3, and O4 models accessed through OpenRouter don't support temperature
   */
  private shouldExcludeTemperature(modelName: string): boolean {
    // OpenAI models that don't support temperature parameter
    // These are accessed through OpenRouter as 'openai/model-name'
    const noTemperatureModels = [
      'openai/gpt-5',
      'openai/o3',
      'openai/o4'
    ];
    
    return noTemperatureModels.some(pattern => modelName.includes(pattern));
  }

  /**
   * Get the chat completions endpoint URL
   */
  private getChatEndpoint(): string {
    return `${OpenRouterProvider.API_BASE_URL}${OpenRouterProvider.CHAT_COMPLETIONS_PATH}`;
  }

  /**
   * Get the models endpoint URL
   */
  private getModelsEndpoint(): string {
    return `${OpenRouterProvider.API_BASE_URL}${OpenRouterProvider.MODELS_PATH}`;
  }

  /**
   * Get the models endpoint URL with tool support filter
   */
  private getToolSupportingModelsEndpoint(): string {
    return `${OpenRouterProvider.API_BASE_URL}${OpenRouterProvider.MODELS_PATH}?supported_parameters=tools`;
  }

  /**
   * Get the models endpoint URL with tool support filter
   * We'll filter for vision capabilities client-side since OpenRouter uses union logic
   */
  private getVisionModelsEndpoint(): string {
    return `${OpenRouterProvider.API_BASE_URL}${OpenRouterProvider.MODELS_PATH}?supported_parameters=tools`;
  }

  /**
   * Converts LLMMessage format to OpenRouter/OpenAI format
   */
  private convertMessagesToOpenRouter(messages: LLMMessage[]): any[] {
    return messages.map(msg => {
      const baseMessage: any = {
        role: msg.role,
        content: msg.content
      };

      // Add optional fields if present
      if (msg.tool_calls) {
        baseMessage.tool_calls = msg.tool_calls;
      }
      if (msg.tool_call_id) {
        baseMessage.tool_call_id = msg.tool_call_id;
      }
      if (msg.name) {
        baseMessage.name = msg.name;
      }

      return baseMessage;
    });
  }

  /**
   * Makes a request to the OpenRouter API
   */
  private async makeAPIRequest(endpoint: string, payloadBody: any): Promise<any> {
    try {
      logger.debug('Making OpenRouter API request to:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://browseroperator.io', // Site URL for rankings on openrouter.ai
          'X-Title': 'Browser Operator', // Site title for rankings on openrouter.ai
        },
        body: JSON.stringify(payloadBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        logger.error('OpenRouter API error:', JSON.stringify(errorData, null, 2));
        throw new Error(`OpenRouter API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      logger.info('OpenRouter Response:', data);

      if (data.usage) {
        logger.info('OpenRouter Usage:', { 
          inputTokens: data.usage.prompt_tokens, 
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        });
        
        // Ensure usage data is preserved in rawResponse for tracing
        if (!data.rawResponse) {
          data.rawResponse = {};
        }
        data.rawResponse.usage = data.usage;
      }

      return data;
    } catch (error) {
      logger.error('OpenRouter API request failed:', error);
      throw error;
    }
  }

  /**
   * Processes the OpenRouter response and converts to LLMResponse format
   */
  private processOpenRouterResponse(data: any): LLMResponse {
    const result: LLMResponse = {
      rawResponse: data
    };
    
    // Ensure usage data is available for tracing
    if (data.usage && data.rawResponse) {
      data.rawResponse.usage = data.usage;
    }

    if (!data?.choices || data.choices.length === 0) {
      throw new Error('No choices in OpenRouter response');
    }

    const choice = data.choices[0];
    const message = choice.message;

    if (!message) {
      throw new Error('No message in OpenRouter choice');
    }

    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.function) {
        try {
          result.functionCall = {
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments)
          };
        } catch (error) {
          logger.error('Error parsing function arguments:', error);
          result.functionCall = {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments // Keep as string if parsing fails
          };
        }
      }
    } else if (message.content) {
      // Plain text response
      result.text = message.content.trim();
    }

    return result;
  }

  /**
   * Call the OpenRouter API with messages
   */
  async callWithMessages(
    modelName: string,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResponse> {
    return LLMRetryManager.simpleRetry(async () => {
      logger.debug('Calling OpenRouter with messages...', { model: modelName, messageCount: messages.length });

      // Construct payload body in OpenAI Chat Completions format
      const payloadBody: any = {
        model: modelName,
        messages: this.convertMessagesToOpenRouter(messages),
      };

      // Add temperature if provided and model supports it
      if (options?.temperature !== undefined && !this.shouldExcludeTemperature(modelName)) {
        payloadBody.temperature = options.temperature;
      }

      // Add tools if provided
      if (options?.tools) {
        // Ensure all tools have valid parameters
        payloadBody.tools = options.tools.map(tool => {
          if (tool.type === 'function' && tool.function) {
            return {
              ...tool,
              function: {
                ...tool.function,
                parameters: tool.function.parameters || { type: 'object', properties: {} }
              }
            };
          }
          return tool;
        });
      }

      // Add tool_choice if provided
      if (options?.tool_choice) {
        payloadBody.tool_choice = options.tool_choice;
      }

      logger.info('Request payload:', payloadBody);

      const data = await this.makeAPIRequest(this.getChatEndpoint(), payloadBody);
      return this.processOpenRouterResponse(data);
    }, options?.retryConfig);
  }

  /**
   * Simple call method for backward compatibility
   */
  async call(
    modelName: string,
    prompt: string,
    systemPrompt: string,
    options?: LLMCallOptions
  ): Promise<LLMResponse> {
    const messages: LLMMessage[] = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });

    return this.callWithMessages(modelName, messages, options);
  }

  /**
   * Parse response into standardized action structure
   */
  parseResponse(response: LLMResponse): ReturnType<typeof LLMResponseParser.parseResponse> {
    return LLMResponseParser.parseResponse(response);
  }

  /**
   * Fetch available models from OpenRouter API that support tool calls
   */
  async fetchModels(): Promise<OpenRouterModel[]> {
    logger.debug('Fetching available OpenRouter models that support tool calls...');

    try {
      const response = await fetch(this.getToolSupportingModelsEndpoint(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        logger.error('OpenRouter models API error:', JSON.stringify(errorData, null, 2));
        throw new Error(`OpenRouter models API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
      }

      const data: OpenRouterModelsResponse = await response.json();
      logger.debug('OpenRouter Models Response:', data);

      if (!data?.data || !Array.isArray(data.data)) {
        throw new Error('Invalid models response format');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to fetch OpenRouter models:', error);
      throw error;
    }
  }

  /**
   * Fetch available vision models from OpenRouter API
   */
  async fetchVisionModels(): Promise<OpenRouterModel[]> {
    logger.debug('Fetching available OpenRouter vision models...');

    try {
      const response = await fetch(this.getVisionModelsEndpoint(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        logger.error('OpenRouter vision models API error:', JSON.stringify(errorData, null, 2));
        throw new Error(`OpenRouter vision models API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
      }

      const data: OpenRouterModelsResponse = await response.json();
      logger.debug('OpenRouter Vision Models Response:', data);

      if (!data?.data || !Array.isArray(data.data)) {
        throw new Error('Invalid vision models response format');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to fetch OpenRouter vision models:', error);
      throw error;
    }
  }

  /**
   * Get all models supported by this provider
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      // Fetch models from OpenRouter API
      const openRouterModels = await this.fetchModels();
      
      return openRouterModels.map(model => ({
        id: model.id,
        name: model.name || model.id, // Use name if available, otherwise ID
        provider: 'openrouter' as LLMProvider,
        capabilities: {
          functionCalling: this.modelSupportsFunctionCalling(model),
          reasoning: this.modelSupportsReasoning(model),
          vision: this.modelSupportsVision(model),
          structured: true // Most OpenRouter models support structured output
        }
      }));
    } catch (error) {
      logger.warn('Failed to fetch models from OpenRouter API, using default list:', error);
      
      // Return default list of popular OpenRouter models as fallback
      return this.getDefaultModels();
    }
  }

  /**
   * Check if a model supports function calling based on its metadata
   */
  private modelSupportsFunctionCalling(_model: OpenRouterModel): boolean {
    // Since we now fetch models with supported_parameters=tools filter,
    // all returned models support function calling
    return true;
  }

  /**
   * Check if a model supports reasoning based on its metadata
   */
  private modelSupportsReasoning(model: OpenRouterModel): boolean {
    // Only certain models like OpenAI's O-series support advanced reasoning
    const reasoningModels = ['o1', 'o-preview'];
    
    return reasoningModels.some(modelType => 
      model.id.toLowerCase().includes(modelType) || 
      model.name?.toLowerCase().includes(modelType)
    );
  }

  /**
   * Check if a model supports vision based on its metadata
   */
  private modelSupportsVision(model: OpenRouterModel): boolean {
    // Check modality or model name for vision capabilities
    if (model.architecture?.modality === 'multimodal') {
      return true;
    }
    
    const visionModels = [
      'gpt-4-vision', 'gpt-4o', 'gpt-4o-mini',
      'claude-3', 'claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus', 'claude-3.5-sonnet',
      'gemini', 'gemini-pro', 'gemini-2.5', 'gemini-pro-vision',
      'llava', 'vision', 'multimodal'
    ];
    
    return visionModels.some(modelType => 
      model.id.toLowerCase().includes(modelType) || 
      model.name?.toLowerCase().includes(modelType)
    );
  }

  /**
   * Check if a specific model supports vision with API-based detection
   */
  async supportsVision(modelName: string): Promise<boolean> {
    const now = Date.now();
    
    // Check cache validity
    if (!this.visionModelsCache || now > this.visionModelsCacheExpiry) {
      try {
        logger.debug('Refreshing vision models cache from API...');
        const visionModels = await this.fetchVisionModels();
        
        // Filter models client-side to ensure they actually support image input
        // OpenRouter's API uses union logic, so we need to validate each model
        const actualVisionModels = visionModels.filter(model => {
          // Check if model actually supports image input in its architecture
          const hasImageInput = model.architecture?.input_modalities?.includes('image');
          
          if (!hasImageInput) {
            logger.debug(`Filtering out non-vision model: ${model.id} (input_modalities: ${JSON.stringify(model.architecture?.input_modalities)})`);
            return false;
          }
          
          return true;
        });
        
        this.visionModelsCache = new Set(actualVisionModels.map(m => m.id));
        this.visionModelsCacheExpiry = now + OpenRouterProvider.CACHE_DURATION_MS;
        logger.info(`Cached ${this.visionModelsCache.size} actual vision models (filtered from ${visionModels.length} returned by API)`);
      } catch (error) {
        logger.warn('Failed to fetch vision models, using fallback detection:', error);
        // Fallback to keyword-based detection
        const visionKeywords = ['gpt-4-vision', 'gpt-4o', 'claude-3', 'llava', 'vision', 'gemini-pro-vision'];
        return visionKeywords.some(keyword => modelName.toLowerCase().includes(keyword));
      }
    }
    
    return this.visionModelsCache.has(modelName);
  }

  /**
   * Get default list of popular OpenRouter models
   */
  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'openrouter' as LLMProvider,
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: true,
          structured: true
        }
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openrouter' as LLMProvider,
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: true,
          structured: true
        }
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'openrouter' as LLMProvider,
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: true,
          structured: true
        }
      },
      {
        id: 'meta-llama/llama-3.1-405b-instruct',
        name: 'Llama 3.1 405B Instruct',
        provider: 'openrouter' as LLMProvider,
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: false,
          structured: true
        }
      },
      {
        id: 'mistralai/mixtral-8x7b-instruct',
        name: 'Mixtral 8x7B Instruct',
        provider: 'openrouter' as LLMProvider,
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: false,
          structured: true
        }
      },
      {
        id: 'google/gemini-2.5-pro',
        name: 'Gemini Pro 2.5',
        provider: 'openrouter' as LLMProvider,
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: true,
          structured: true
        }
      },
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini Pro 2.5 Flash',
        provider: 'openrouter' as LLMProvider,
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: true,
          structured: true
        }
      }
    ];
  }

  /**
   * Test the OpenRouter connection with a simple completion request
   */
  async testConnection(modelName: string): Promise<{success: boolean, message: string}> {
    logger.debug('Testing OpenRouter connection...');

    try {
      const testPrompt = 'Please respond with "Connection successful!" to confirm the connection is working.';

      // Only add temperature if the model supports it
      const callOptions: LLMCallOptions = {};
      if (!this.shouldExcludeTemperature(modelName)) {
        callOptions.temperature = 0.1;
      }
      
      const response = await this.call(modelName, testPrompt, '', callOptions);

      if (response.text?.toLowerCase().includes('connection')) {
        return {
          success: true,
          message: `Successfully connected to OpenRouter with model ${modelName}`,
        };
      }
      return {
        success: true,
        message: `Connected to OpenRouter, but received unexpected response: ${response.text || 'No response'}`,
      };
    } catch (error) {
      logger.error('OpenRouter connection test failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Validate that required credentials are available for OpenRouter
   */
  validateCredentials(): {isValid: boolean, message: string, missingItems?: string[]} {
    logger.debug('=== VALIDATING OPENROUTER CREDENTIALS ===');
    logger.debug('Timestamp:', new Date().toISOString());
    
    const storageKeys = this.getCredentialStorageKeys();
    logger.debug('Storage keys:', storageKeys);
    
    const apiKey = localStorage.getItem(storageKeys.apiKey!);
    logger.debug('API key check:');
    logger.debug('- Storage key used:', storageKeys.apiKey);
    logger.debug('- API key exists:', !!apiKey);
    logger.debug('- API key length:', apiKey?.length || 0);
    logger.debug('- API key prefix:', apiKey?.substring(0, 8) + '...' || 'none');
    
    // Also check OAuth-related storage for debugging
    const authMethod = localStorage.getItem('openrouter_auth_method');
    const oauthToken = localStorage.getItem('openrouter_oauth_token');
    logger.debug('OAuth-related storage:');
    logger.debug('- Auth method:', authMethod);
    logger.debug('- OAuth token exists:', !!oauthToken);
    
    // Check all OpenRouter-related localStorage keys
    const allKeys = Object.keys(localStorage);
    const openRouterKeys = allKeys.filter(key => key.includes('openrouter') || key.includes('ai_chat'));
    logger.debug('All OpenRouter-related storage keys:');
    openRouterKeys.forEach(key => {
      const value = localStorage.getItem(key);
      logger.debug(`- ${key}:`, value?.substring(0, 50) + (value && value.length > 50 ? '...' : '') || 'null');
    });
    
    if (!apiKey) {
      logger.warn('❌ OpenRouter API key missing');
      return {
        isValid: false,
        message: 'OpenRouter API key is required. Please add your API key in Settings.',
        missingItems: ['API Key']
      };
    }
    
    logger.info('✅ OpenRouter credentials validation passed');
    return {
      isValid: true,
      message: 'OpenRouter credentials are configured correctly.'
    };
  }

  /**
   * Get the storage keys this provider uses for credentials
   */
  getCredentialStorageKeys(): {apiKey: string} {
    const keys = {
      apiKey: 'ai_chat_openrouter_api_key'
    };
    logger.debug('OpenRouter credential storage keys:', keys);
    return keys;
  }
}