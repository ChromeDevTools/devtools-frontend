// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {LiteLLMClient, type LiteLLMResponse} from './LiteLLMClient.js';
import {OpenAIClient, type OpenAIResponse} from './OpenAIClient.js';

/**
 * Unified options for LLM calls that work across different providers
 */
export interface UnifiedLLMOptions {
  endpoint?: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?: any;
  n?: number;
  stream?: boolean;
  maxRetries?: number;
  signal?: AbortSignal;
  systemPrompt?: string;
  tools?: any[];
  tool_choice?: any;
}

/**
 * Unified response that includes function calls
 */
export interface UnifiedLLMResponse {
  text?: string;
  functionCall?: {
    name: string,
    arguments: any,
  };
  rawResponse?: any;
  reasoning?: {
    summary?: string[] | null,
    effort?: string,
  };
}

/**
 * Model configuration from localStorage
 */
interface ModelOption {
  value: string;
  type: 'openai' | 'litellm';
  label?: string;
}

/**
 * UnifiedLLMClient provides a single interface for calling different LLM providers
 * (OpenAI, LiteLLM) based on the model type configuration.
 */
export class UnifiedLLMClient {
  private static readonly MODEL_OPTIONS_KEY = 'ai_chat_model_options';
  private static readonly LITELLM_ENDPOINT_KEY = 'ai_chat_litellm_endpoint';
  private static readonly LITELLM_API_KEY_KEY = 'ai_chat_litellm_api_key';

  /**
   * Main unified method to call any LLM based on model configuration
   * Returns string for backward compatibility
   */
  static async callLLM(
    apiKey: string,
    modelName: string,
    userPrompt: string,
    options?: UnifiedLLMOptions
  ): Promise<string> {
    const response = await this.callLLMWithResponse(apiKey, modelName, userPrompt, options);
    return response.text || '';
  }

  /**
   * Call LLM and get full response including function calls
   */
  static async callLLMWithResponse(
    apiKey: string,
    modelName: string,
    userPrompt: string,
    options?: UnifiedLLMOptions
  ): Promise<UnifiedLLMResponse> {
    const modelType = this.getModelType(modelName);

    console.log('[UnifiedLLMClient] Calling LLM:', {
      modelName,
      modelType,
      promptLength: userPrompt.length,
      hasOptions: Boolean(options),
    });

    try {
      if (modelType === 'litellm') {
        const response = await this.callLiteLLM(apiKey, modelName, userPrompt, options);
        return {
          text: response.text,
          functionCall: response.functionCall,
          rawResponse: response.rawResponse,
          reasoning: (response as any).reasoning, // LiteLLM may not have reasoning
        };
      }
        const response = await this.callOpenAI(apiKey, modelName, userPrompt, options);
        return {
          text: response.text,
          functionCall: response.functionCall,
          rawResponse: response.rawResponse,
          reasoning: response.reasoning,
        };

    } catch (error) {
      console.error('[UnifiedLLMClient] Error calling LLM:', {
        modelName,
        modelType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Determine the model type from localStorage configuration
   */
  private static getModelType(modelName: string): 'openai' | 'litellm' {
    try {
      const modelOptions = JSON.parse(localStorage.getItem(this.MODEL_OPTIONS_KEY) || '[]') as ModelOption[];
      const modelOption = modelOptions.find(opt => opt.value === modelName);
      return modelOption?.type || 'openai';
    } catch (e) {
      console.error('Error parsing model options:', e);
      return 'openai';
    }
  }

  /**
   * Call OpenAI models
   */
  private static async callOpenAI(
    apiKey: string,
    modelName: string,
    userPrompt: string,
    options?: UnifiedLLMOptions
  ) {
    try {
      // Convert UnifiedLLMOptions to OpenAI-specific options
      const openAIOptions = this.convertToOpenAIOptions(options);

      return await OpenAIClient.callOpenAI(
        apiKey,
        modelName,
        userPrompt,
        openAIOptions
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI call failed for model ${modelName}: ${errorMessage}`);
    }
  }

  /**
   * Call LiteLLM models
   */
  private static async callLiteLLM(
    apiKey: string,
    modelName: string,
    userPrompt: string,
    options?: UnifiedLLMOptions
  ) {
    try {
      const { endpoint, apiKey: liteLLMApiKey } = this.getLiteLLMConfig();

      // Convert UnifiedLLMOptions to LiteLLM-specific options
      const liteLLMOptions = this.convertToLiteLLMOptions(options, endpoint);

      return await LiteLLMClient.callLiteLLM(
        liteLLMApiKey || apiKey,
        modelName,
        userPrompt,
        liteLLMOptions
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`LiteLLM call failed for model ${modelName}: ${errorMessage}`);
    }
  }

  /**
   * Get LiteLLM configuration from localStorage
   */
  private static getLiteLLMConfig(): { endpoint: string, apiKey: string } {
    const endpoint = localStorage.getItem(this.LITELLM_ENDPOINT_KEY) || '';
    const apiKey = localStorage.getItem(this.LITELLM_API_KEY_KEY) || '';

    console.log('[UnifiedLLMClient] LiteLLM config:', {
      hasEndpoint: Boolean(endpoint),
      hasApiKey: Boolean(apiKey),
      endpointLength: endpoint.length,
    });

    if (!endpoint) {
      throw new Error('LiteLLM endpoint not configured. Please configure in AI Chat settings.');
    }

    return { endpoint, apiKey };
  }

  /**
   * Convert unified options to OpenAI-specific format
   */
  private static convertToOpenAIOptions(options?: UnifiedLLMOptions): any {
    if (!options) {return {};}

    return {
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      response_format: options.responseFormat,
      n: options.n,
      stream: options.stream,
      signal: options.signal,
      systemPrompt: options.systemPrompt,
      tools: options.tools,
      tool_choice: options.tool_choice,
    };
  }

  /**
   * Convert unified options to LiteLLM-specific format
   */
  private static convertToLiteLLMOptions(options?: UnifiedLLMOptions, endpoint?: string): any {
    if (!options) {return { endpoint };}

    // Transform tools for LiteLLM/Anthropic format
    let transformedTools = options.tools;
    if (options.tools) {
      transformedTools = options.tools.map(tool => {
        // If the tool is already in the correct format with 'function' property, return as is
        if ('function' in tool) {
          return tool;
        }

        // Transform OpenAI format to Anthropic format
        // OpenAI: { type: 'function', name: '...', description: '...', parameters: {...} }
        // Anthropic expects: { type: 'function', function: { name: '...', description: '...', parameters: {...} } }
        if (tool.type === 'function') {
          return {
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters
            }
          };
        }

        // Default: return as is if we don't recognize the format
        return tool;
      });
    }

    return {
      endpoint: options.endpoint || endpoint,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      response_format: options.responseFormat,
      n: options.n,
      stream: options.stream,
      signal: options.signal,
      systemPrompt: options.systemPrompt,
      tools: transformedTools,
      tool_choice: options.tool_choice,
    };
  }

  /**
   * Test if a model is available and working
   */
  static async testModel(
    modelName: string,
    apiKey?: string
  ): Promise<{ success: boolean, error?: string }> {
    try {
      await this.callLLM(
        apiKey || '',
        modelName,
        'Hello, this is a test message. Please respond with "OK".',
        { maxTokens: 5 }
      );
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get all configured models from localStorage
   */
  static getConfiguredModels(): ModelOption[] {
    try {
      return JSON.parse(localStorage.getItem(this.MODEL_OPTIONS_KEY) || '[]') as ModelOption[];
    } catch (e) {
      console.error('Error parsing model options:', e);
      return [];
    }
  }

  /**
   * Parse unified response to determine action type
   * Equivalent to OpenAIClient.parseOpenAIResponse
   */
  static parseResponse(response: UnifiedLLMResponse): ParsedLLMAction {
    if (response.functionCall) {
      return {
        type: 'tool_call',
        name: response.functionCall.name,
        args: response.functionCall.arguments,
      };
    }

    if (response.text) {
      return {
        type: 'final_answer',
        answer: response.text,
      };
    }

    return {
      type: 'error',
      error: 'No valid response from LLM',
    };
  }
}

/**
 * Standardized structure for parsed LLM action
 */
export type ParsedLLMAction =
  | { type: 'tool_call', name: string, args: Record<string, unknown> }
  | { type: 'final_answer', answer: string }
  | { type: 'error', error: string };
