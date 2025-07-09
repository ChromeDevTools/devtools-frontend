// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { LLMMessage, LLMResponse, LLMCallOptions, LLMProvider, ModelInfo } from './LLMTypes.js';
import { LLMBaseProvider } from './LLMProvider.js';
import { LLMRetryManager } from './LLMErrorHandler.js';
import { LLMResponseParser } from './LLMResponseParser.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('LiteLLMProvider');

/**
 * LiteLLM model information from /v1/models endpoint
 */
export interface LiteLLMModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

export interface LiteLLMModelsResponse {
  object: string;
  data: LiteLLMModel[];
}

/**
 * LiteLLM provider implementation using OpenAI-compatible format
 */
export class LiteLLMProvider extends LLMBaseProvider {
  private static readonly DEFAULT_BASE_URL = 'http://localhost:4000';
  private static readonly CHAT_COMPLETIONS_PATH = '/v1/chat/completions';
  private static readonly MODELS_PATH = '/v1/models';
  
  readonly name: LLMProvider = 'litellm';

  constructor(
    private readonly apiKey: string | null,
    private readonly baseUrl?: string
  ) {
    super();
  }

  /**
   * Constructs the full endpoint URL based on configuration
   */
  private getEndpoint(): string {
    // Check if we have a valid baseUrl
    if (!this.baseUrl) {
      // Check localStorage as a fallback for endpoint
      const localStorageEndpoint = localStorage.getItem('ai_chat_litellm_endpoint');
      if (!localStorageEndpoint) {
        throw new Error('LiteLLM endpoint not configured. Please set endpoint in settings.');
      }
      logger.debug(`Using endpoint from localStorage: ${localStorageEndpoint}`);
      const baseUrl = localStorageEndpoint.replace(/\/$/, '');
      return `${baseUrl}${LiteLLMProvider.CHAT_COMPLETIONS_PATH}`;
    }
    
    // Remove trailing slash from base URL if present
    const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}${LiteLLMProvider.CHAT_COMPLETIONS_PATH}`;
  }

  /**
   * Gets the models endpoint URL
   */
  private getModelsEndpoint(): string {
    const baseEndpoint = this.baseUrl || LiteLLMProvider.DEFAULT_BASE_URL;
    return `${baseEndpoint.replace(/\/$/, '')}${LiteLLMProvider.MODELS_PATH}`;
  }

  /**
   * Converts LLMMessage format to OpenAI format
   */
  private convertMessagesToOpenAI(messages: LLMMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
      ...(msg.name && { name: msg.name })
    }));
  }

  /**
   * Makes a request to the LiteLLM API
   */
  private async makeAPIRequest(payloadBody: any): Promise<any> {
    try {
      const endpoint = this.getEndpoint();
      logger.debug('Using endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(payloadBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('LiteLLM API error:', errorData);
        throw new Error(`LiteLLM API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      logger.info('LiteLLM Response:', data);

      if (data.usage) {
        logger.info('LiteLLM Usage:', { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens });
      }

      return data;
    } catch (error) {
      logger.error('LiteLLM API request failed:', error);
      throw error;
    }
  }

  /**
   * Processes the LiteLLM response and converts to LLMResponse format
   */
  private processLiteLLMResponse(data: any): LLMResponse {
    const result: LLMResponse = {
      rawResponse: data
    };

    if (!data?.choices || data.choices.length === 0) {
      throw new Error('No choices in LiteLLM response');
    }

    const choice = data.choices[0];
    const message = choice.message;

    if (!message) {
      throw new Error('No message in LiteLLM choice');
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
   * Call the LiteLLM API with messages
   */
  async callWithMessages(
    modelName: string,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResponse> {
    return LLMRetryManager.simpleRetry(async () => {
      logger.debug('Calling LiteLLM with messages...', { model: modelName, messageCount: messages.length });

      // Construct payload body in OpenAI format (LiteLLM is OpenAI-compatible)
      const payloadBody: any = {
        model: modelName,
        messages: this.convertMessagesToOpenAI(messages), // Direct OpenAI format - no conversion needed!
      };

      // Add temperature if provided
      if (options?.temperature !== undefined) {
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

      const data = await this.makeAPIRequest(payloadBody);
      return this.processLiteLLMResponse(data);
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
   * Fetch available models from LiteLLM endpoint
   */
  async fetchModels(): Promise<LiteLLMModel[]> {
    logger.debug('Fetching available models...');

    try {
      const modelsUrl = this.getModelsEndpoint();
      logger.debug('Using models endpoint:', modelsUrl);

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('LiteLLM models API error:', errorData);
        throw new Error(`LiteLLM models API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
      }

      const data: LiteLLMModelsResponse = await response.json();
      logger.debug('LiteLLM Models Response:', data);

      if (!data?.data || !Array.isArray(data.data)) {
        throw new Error('Invalid models response format');
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to fetch LiteLLM models:', error);
      throw error;
    }
  }

  /**
   * Get all models supported by this provider
   */
  async getModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];
    
    try {
      // Fetch models from LiteLLM API
      const fetchedModels = await this.fetchModels();
      for (const model of fetchedModels) {
        models.push({
          id: model.id,
          name: model.id, // Use ID as name for LiteLLM models
          provider: 'litellm',
          capabilities: {
            functionCalling: true,
            reasoning: false,
            vision: false,
            structured: true
          }
        });
      }
    } catch (error) {
      logger.warn('Failed to fetch models from LiteLLM API:', error);
    }
    
    // Add custom models from localStorage
    try {
      const customModelsJson = localStorage.getItem('ai_chat_custom_models');
      if (customModelsJson) {
        const customModels = JSON.parse(customModelsJson);
        if (Array.isArray(customModels)) {
          for (const customModel of customModels) {
            if (customModel.id && customModel.name) {
              models.push({
                id: customModel.id,
                name: customModel.name,
                provider: 'litellm',
                capabilities: {
                  functionCalling: true,
                  reasoning: false,
                  vision: false,
                  structured: true
                }
              });
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load custom models from localStorage:', error);
    }
    
    logger.debug(`LiteLLM Provider returning ${models.length} models`);
    return models;
  }

  /**
   * Test the LiteLLM connection with a simple completion request
   */
  async testConnection(modelName: string): Promise<{success: boolean, message: string}> {
    logger.debug('Testing connection...');

    try {
      const testPrompt = 'Please respond with "Connection successful!" to confirm the connection is working.';

      const response = await this.call(modelName, testPrompt, '', {
        temperature: 0.1,
      });

      if (response.text?.toLowerCase().includes('connection')) {
        return {
          success: true,
          message: `Successfully connected to LiteLLM with model ${modelName}`,
        };
      }
      return {
        success: true,
        message: `Connected to LiteLLM, but received unexpected response: ${response.text || 'No response'}`,
      };
    } catch (error) {
      logger.error('LiteLLM connection test failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Validate that required credentials are available for LiteLLM
   */
  validateCredentials(): {isValid: boolean, message: string, missingItems?: string[]} {
    const storageKeys = this.getCredentialStorageKeys();
    const endpoint = localStorage.getItem(storageKeys.endpoint!);
    const apiKey = localStorage.getItem(storageKeys.apiKey!) || localStorage.getItem('ai_chat_api_key');
    
    const missingItems: string[] = [];
    
    if (!endpoint) {
      missingItems.push('Endpoint URL');
    }
    
    if (missingItems.length > 0) {
      return {
        isValid: false,
        message: `LiteLLM configuration incomplete. Missing: ${missingItems.join(', ')}. Please configure in Settings.`,
        missingItems
      };
    }
    
    // Note: API key is optional for LiteLLM
    return {
      isValid: true,
      message: apiKey ? 
        'LiteLLM credentials are configured correctly.' : 
        'LiteLLM endpoint configured. API key is optional but may be required for some models.'
    };
  }

  /**
   * Get the storage keys this provider uses for credentials
   */
  getCredentialStorageKeys(): {apiKey: string, endpoint: string} {
    return {
      apiKey: 'ai_chat_litellm_api_key',
      endpoint: 'ai_chat_litellm_endpoint'
    };
  }
}