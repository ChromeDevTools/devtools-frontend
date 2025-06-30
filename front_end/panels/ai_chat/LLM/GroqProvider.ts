// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { LLMMessage, LLMResponse, LLMCallOptions, LLMProvider, ModelInfo } from './LLMTypes.js';
import { LLMBaseProvider } from './LLMProvider.js';
import { LLMRetryManager } from './LLMErrorHandler.js';
import { LLMResponseParser } from './LLMResponseParser.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('GroqProvider');

/**
 * Groq model information
 */
export interface GroqModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  active: boolean;
  context_window: number;
}

export interface GroqModelsResponse {
  object: string;
  data: GroqModel[];
}

/**
 * Groq provider implementation using OpenAI-compatible Chat Completions API
 * https://console.groq.com/docs/api-reference#chat
 */
export class GroqProvider extends LLMBaseProvider {
  private static readonly API_BASE_URL = 'https://api.groq.com/openai/v1';
  private static readonly CHAT_COMPLETIONS_PATH = '/chat/completions';
  private static readonly MODELS_PATH = '/models';
  
  readonly name: LLMProvider = 'groq';

  constructor(private readonly apiKey: string) {
    super();
  }

  /**
   * Get the chat completions endpoint URL
   */
  private getChatEndpoint(): string {
    return `${GroqProvider.API_BASE_URL}${GroqProvider.CHAT_COMPLETIONS_PATH}`;
  }

  /**
   * Get the models endpoint URL
   */
  private getModelsEndpoint(): string {
    return `${GroqProvider.API_BASE_URL}${GroqProvider.MODELS_PATH}`;
  }

  /**
   * Converts LLMMessage format to Groq/OpenAI format
   */
  private convertMessagesToGroq(messages: LLMMessage[]): any[] {
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
   * Makes a request to the Groq API
   */
  private async makeAPIRequest(endpoint: string, payloadBody: any): Promise<any> {
    try {
      logger.debug('Making Groq API request to:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payloadBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        logger.error('Groq API error:', errorData);
        throw new Error(`Groq API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      logger.info('Groq Response:', data);

      if (data.usage) {
        logger.info('Groq Usage:', { 
          inputTokens: data.usage.prompt_tokens, 
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        });
      }

      return data;
    } catch (error) {
      logger.error('Groq API request failed:', error);
      throw error;
    }
  }

  /**
   * Processes the Groq response and converts to LLMResponse format
   */
  private processGroqResponse(data: any): LLMResponse {
    const result: LLMResponse = {
      rawResponse: data
    };

    if (!data?.choices || data.choices.length === 0) {
      throw new Error('No choices in Groq response');
    }

    const choice = data.choices[0];
    const message = choice.message;

    if (!message) {
      throw new Error('No message in Groq choice');
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
   * Call the Groq API with messages
   */
  async callWithMessages(
    modelName: string,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResponse> {
    return LLMRetryManager.simpleRetry(async () => {
      logger.debug('Calling Groq with messages...', { model: modelName, messageCount: messages.length });

      // Construct payload body in OpenAI Chat Completions format
      const payloadBody: any = {
        model: modelName,
        messages: this.convertMessagesToGroq(messages),
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

      const data = await this.makeAPIRequest(this.getChatEndpoint(), payloadBody);
      return this.processGroqResponse(data);
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
   * Fetch available models from Groq API
   */
  async fetchModels(): Promise<GroqModel[]> {
    logger.debug('Fetching available Groq models...');

    try {
      const response = await fetch(this.getModelsEndpoint(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        logger.error('Groq models API error:', errorData);
        throw new Error(`Groq models API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
      }

      const data: GroqModelsResponse = await response.json();
      logger.debug('Groq Models Response:', data);

      if (!data?.data || !Array.isArray(data.data)) {
        throw new Error('Invalid models response format');
      }

      // Filter out inactive models
      return data.data.filter(model => model.active !== false);
    } catch (error) {
      logger.error('Failed to fetch Groq models:', error);
      throw error;
    }
  }

  /**
   * Get all models supported by this provider
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      // Fetch models from Groq API
      const groqModels = await this.fetchModels();
      
      return groqModels.map(model => ({
        id: model.id,
        name: model.id, // Use ID as name
        provider: 'groq' as LLMProvider,
        capabilities: {
          functionCalling: this.modelSupportsFunctionCalling(model.id),
          reasoning: false, // Groq models don't have reasoning capabilities like O-series
          vision: this.modelSupportsVision(model.id),
          structured: true // All Groq models support structured output
        }
      }));
    } catch (error) {
      logger.warn('Failed to fetch models from Groq API, using default list:', error);
      
      // Return default list of known Groq models as fallback
      return this.getDefaultModels();
    }
  }

  /**
   * Check if a model supports function calling based on its ID
   */
  private modelSupportsFunctionCalling(modelId: string): boolean {
    // According to Groq docs, these models support function calling:
    const functionCallingModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-groq-70b-8192-tool-use-preview',
      'llama3-groq-8b-8192-tool-use-preview',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'gemma-7b-it'
    ];
    
    return functionCallingModels.some(model => modelId.includes(model));
  }

  /**
   * Check if a model supports vision based on its ID
   */
  private modelSupportsVision(modelId: string): boolean {
    // According to Groq docs, these models support vision:
    const visionModels = [
      'llama-3.2-90b-vision-preview',
      'llama-3.2-11b-vision-preview',
      'llava-v1.5-7b-4096-preview'
    ];
    
    return visionModels.some(model => modelId.includes(model));
  }

  /**
   * Get default list of known Groq models
   */
  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        provider: 'groq' as LLMProvider,
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: false,
          structured: true
        }
      },
      {
        id: 'llama-3.2-90b-vision-preview',
        name: 'Llama 3.2 90B Vision',
        provider: 'groq' as LLMProvider,
        capabilities: {
          functionCalling: false,
          reasoning: false,
          vision: true,
          structured: true
        }
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        provider: 'groq' as LLMProvider,
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: false,
          structured: true
        }
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma 2 9B',
        provider: 'groq' as LLMProvider,
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: false,
          structured: true
        }
      }
    ];
  }

  /**
   * Test the Groq connection with a simple completion request
   */
  async testConnection(modelName: string): Promise<{success: boolean, message: string}> {
    logger.debug('Testing Groq connection...');

    try {
      const testPrompt = 'Please respond with "Connection successful!" to confirm the connection is working.';

      const response = await this.call(modelName, testPrompt, '', {
        temperature: 0.1,
      });

      if (response.text?.toLowerCase().includes('connection')) {
        return {
          success: true,
          message: `Successfully connected to Groq with model ${modelName}`,
        };
      }
      return {
        success: true,
        message: `Connected to Groq, but received unexpected response: ${response.text || 'No response'}`,
      };
    } catch (error) {
      logger.error('Groq connection test failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}