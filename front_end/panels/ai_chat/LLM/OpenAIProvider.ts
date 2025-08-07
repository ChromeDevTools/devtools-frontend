// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { LLMMessage, LLMResponse, LLMCallOptions, LLMProvider, ModelInfo, MessageContent } from './LLMTypes.js';
import { LLMBaseProvider } from './LLMProvider.js';
import { LLMRetryManager } from './LLMErrorHandler.js';
import { LLMResponseParser } from './LLMResponseParser.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('OpenAIProvider');

/**
 * Enum to distinguish between model families with different request/response formats
 */
enum ModelFamily {
  GPT = 'gpt',
  O = 'o'
}

/**
 * Responses API message format for tool calls and results
 */
interface ResponsesAPIFunctionCall {
  type: 'function_call';
  name: string;
  arguments: string;
  call_id: string;
}

interface ResponsesAPIFunctionOutput {
  type: 'function_call_output';
  call_id: string;
  output: string;
}

/**
 * OpenAI provider implementation using the Responses API
 */
export class OpenAIProvider extends LLMBaseProvider {
  private static readonly API_ENDPOINT = 'https://api.openai.com/v1/responses';
  
  readonly name: LLMProvider = 'openai';

  constructor(private readonly apiKey: string) {
    super();
  }

  /**
   * Determines the model family based on the model name
   */
  private getModelFamily(modelName: string): ModelFamily {
    // Check if model name starts with 'o' to identify O series models
    if (modelName.startsWith('o')) {
      return ModelFamily.O;
    }
    // Otherwise, assume it's a GPT model (gpt-3.5-turbo, gpt-4, etc.)
    return ModelFamily.GPT;
  }

  /**
   * Converts tools from standard format to responses API format
   */
  private convertToolsFormat(tools: any[]): any[] {
    return tools.map(tool => {
      if (tool.type === 'function' && tool.function) {
        // Convert from standard format to responses API format
        return {
          type: 'function',
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters || { type: 'object', properties: {} }
        };
      }
      return tool; // Return as-is if already in correct format
    });
  }

  /**
   * Convert MessageContent to Responses API format based on model family
   * Throws error if conversion fails
   */
  private convertContentToResponsesAPI(content: MessageContent | undefined, modelFamily: ModelFamily): any {
    // For GPT models (including GPT-4.1), handle content conversion
    if (modelFamily === ModelFamily.GPT) {
      if (!content) {
        return '';
      }
      if (typeof content === 'string') {
        return content;
      }
      // For multimodal content on GPT models, we need to return the structured format
      if (Array.isArray(content)) {
        // All models use Responses API format since we're using /v1/responses endpoint
        // This includes GPT-4.1 models which require input_text/input_image types
        return content.map((item, index) => {
          if (item.type === 'text') {
            return { type: 'input_text', text: item.text };
          } else if (item.type === 'image_url') {
            if (!item.image_url?.url) {
              throw new Error(`Invalid image content at index ${index}: missing image_url.url`);
            }
            return { type: 'input_image', image_url: item.image_url.url };
          } else {
            throw new Error(`Unknown content type at index ${index}: ${(item as any).type}`);
          }
        });
      }
      return String(content);
    }

    // For O-series models, use structured responses API format
    if (!content) {
      return [{ type: 'input_text', text: '' }];
    }

    if (typeof content === 'string') {
      return [{ type: 'input_text', text: content }];
    }

    if (Array.isArray(content)) {
      return content.map((item, index) => {
        if (item.type === 'text') {
          return { type: 'input_text', text: item.text };
        } else if (item.type === 'image_url') {
          if (!item.image_url?.url) {
            throw new Error(`Invalid image content at index ${index}: missing image_url.url`);
          }
          // O-series uses different image format
          return { type: 'input_image', image_url: item.image_url.url };
        } else {
          throw new Error(`Unknown content type at index ${index}: ${(item as any).type}`);
        }
      });
    }

    throw new Error(`Invalid content type: expected string or array, got ${typeof content}`);
  }

  /**
   * Converts messages to responses API format based on model family
   */
  private convertMessagesToResponsesAPI(messages: LLMMessage[], modelFamily: ModelFamily): any[] {
    try {
      return messages.map((msg, index) => {
        if (msg.role === 'system' || msg.role === 'user') {
          return {
            role: msg.role,
            content: this.convertContentToResponsesAPI(msg.content, modelFamily)
          };
        } else if (msg.role === 'assistant') {
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            // Convert tool calls to responses API format
            const toolCall = msg.tool_calls[0]; // Take first tool call
            let argsString: string;
            
            // Ensure arguments are in string format for responses API
            if (typeof toolCall.function.arguments === 'string') {
              argsString = toolCall.function.arguments;
            } else {
              argsString = JSON.stringify(toolCall.function.arguments);
            }
            
            return {
              type: 'function_call',
              name: toolCall.function.name,
              arguments: argsString,
              call_id: toolCall.id
            } as ResponsesAPIFunctionCall;
          } else {
            // Regular assistant message with content
            // For O-series models, assistant content uses 'output_text'
            if (modelFamily === ModelFamily.O) {
              const content = typeof msg.content === 'string' ? msg.content : 
                             Array.isArray(msg.content) ? msg.content.map(c => c.type === 'text' ? c.text : '').join('') :
                             String(msg.content || '');
              return {
                role: 'assistant',
                content: [{ type: 'output_text', text: content }]
              };
            } else {
              // For GPT models, use simple content format
              return {
                role: 'assistant',
                content: this.convertContentToResponsesAPI(msg.content, modelFamily)
              };
            }
          }
        } else if (msg.role === 'tool') {
          // Convert tool result to responses API format
          // Tool responses are always text in the current implementation
          return {
            type: 'function_call_output',
            call_id: msg.tool_call_id,
            output: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          } as ResponsesAPIFunctionOutput;
        }
        
        throw new Error(`Unknown message role at index ${index}: ${msg.role}`);
      });
    } catch (error) {
      logger.error('Failed to convert messages to Responses API format:', error);
      throw new Error(`Message conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Processes the responses API output and extracts relevant information
   */
  private processResponsesAPIOutput(data: any): LLMResponse {
    const result: LLMResponse = {
      rawResponse: data
    };

    // Extract reasoning info if available (O models)
    if (data.reasoning) {
      result.reasoning = {
        summary: data.reasoning.summary,
        effort: data.reasoning.effort
      };
    }

    if (!data?.output) {
      throw new Error('No output from OpenAI');
    }

    if (data.output && data.output.length > 0) {
      // Find function call or message by type instead of assuming position
      const functionCallOutput = data.output.find((item: any) => item.type === 'function_call');
      const messageOutput = data.output.find((item: any) => item.type === 'message');

      if (functionCallOutput) {
        // Process function call
        try {
          result.functionCall = {
            name: functionCallOutput.name,
            arguments: JSON.parse(functionCallOutput.arguments)
          };
        } catch (error) {
          logger.error('Error parsing function arguments:', error);
          result.functionCall = {
            name: functionCallOutput.name,
            arguments: functionCallOutput.arguments // Keep as string if parsing fails
          };
        }
      }
      else if (messageOutput?.content && messageOutput.content.length > 0 && messageOutput.content[0].type === 'output_text') {
        // Process text response
        result.text = messageOutput.content[0].text.trim();
      }
    }

    return result;
  }

  /**
   * Creates a tracing observation for API errors
   */
  private async createErrorTracingObservation(error: Error, payloadBody: any): Promise<void> {
    try {
      const { getCurrentTracingContext, createTracingProvider } = await import('../tracing/TracingConfig.js');
      const context = getCurrentTracingContext();
      if (context) {
        const tracingProvider = createTracingProvider();
        await tracingProvider.createObservation({
          id: `error-openai-api-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: 'OpenAI API Error',
          type: 'event',
          startTime: new Date(),
          input: { 
            model: payloadBody.model,
            endpoint: OpenAIProvider.API_ENDPOINT,
            requestSize: JSON.stringify(payloadBody).length
          },
          error: error.message,
          metadata: {
            provider: 'openai',
            errorType: 'api_error',
            hasApiKey: !!this.apiKey
          }
        }, context.traceId);
      }
    } catch (tracingError) {
      // Don't fail the main operation due to tracing errors
      logger.debug('Failed to create error tracing observation:', tracingError);
    }
  }

  /**
   * Makes a request to the OpenAI Responses API
   */
  private async makeAPIRequest(payloadBody: any): Promise<any> {
    try {
      const response = await fetch(OpenAIProvider.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payloadBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('OpenAI API error:', JSON.stringify(errorData));
        const error = new Error(`OpenAI API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
        
        // Create tracing observation for API errors
        await this.createErrorTracingObservation(error, payloadBody);
        
        throw error;
      }

      const data = await response.json();
      logger.info('OpenAI Response:', data);

      if (data.usage) {
        logger.info('OpenAI Usage:', { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens });
      }

      return data;
    } catch (error) {
      logger.error('OpenAI API request failed:', error instanceof Error ? error.message : String(error));
      
      // Create tracing observation for network/fetch errors
      if (error instanceof Error) {
        await this.createErrorTracingObservation(error, payloadBody);
      }
      
      throw error;
    }
  }

  /**
   * Call the OpenAI API with messages
   */
  async callWithMessages(
    modelName: string,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResponse> {
    return LLMRetryManager.simpleRetry(async () => {
      logger.debug('Calling OpenAI responses API...', { model: modelName, messageCount: messages.length });

      // Determine model family
      const modelFamily = this.getModelFamily(modelName);
      logger.debug('Model Family:', modelFamily);

      // Construct payload body for responses API format
      const payloadBody: any = {
        model: modelName,
      };

      // Convert messages to responses API format
      const convertedMessages = this.convertMessagesToResponsesAPI(messages, modelFamily);
      payloadBody.input = convertedMessages;

      // Add temperature if provided, but not for O models (they don't support it)
      if (options?.temperature !== undefined && modelFamily !== ModelFamily.O) {
        payloadBody.temperature = options.temperature;
      }

      // Add tools if provided - convert from standard format to responses API format
      if (options?.tools) {
        payloadBody.tools = this.convertToolsFormat(options.tools);
      }

      // Add tool_choice if provided
      if (options?.tool_choice) {
        payloadBody.tool_choice = options.tool_choice;
      }

      // Add reasoning level for O-series model if provided
      if (options?.reasoningLevel && modelFamily === ModelFamily.O) {
        payloadBody.reasoning = {
          effort: options.reasoningLevel
        };
      }

      logger.info('Request payload:', payloadBody);

      const data = await this.makeAPIRequest(payloadBody);
      return this.processResponsesAPIOutput(data);
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
   * Get all OpenAI models supported by this provider
   */
  async getModels(): Promise<ModelInfo[]> {
    // Return hardcoded OpenAI models with their capabilities
    return [
      {
        id: 'gpt-4.1-2025-04-14',
        name: 'GPT-4.1',
        provider: 'openai',
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: true,
          structured: true
        }
      },
      {
        id: 'gpt-4.1-mini-2025-04-14',
        name: 'GPT-4.1 Mini',
        provider: 'openai',
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: true,
          structured: true
        }
      },
      {
        id: 'gpt-4.1-nano-2025-04-14',
        name: 'GPT-4.1 Nano',
        provider: 'openai',
        capabilities: {
          functionCalling: true,
          reasoning: false,
          vision: true,
          structured: true
        }
      },
      {
        id: 'o4-mini-2025-04-16',
        name: 'O4 Mini',
        provider: 'openai',
        capabilities: {
          functionCalling: true,
          reasoning: true,
          vision: true,
          structured: true
        }
      },
      {
        id: 'o3-mini-2025-01-31',
        name: 'O3 Mini',
        provider: 'openai',
        capabilities: {
          functionCalling: true,
          reasoning: true,
          vision: false,
          structured: true
        }
      }
    ];
  }

  /**
   * Parse response into standardized action structure
   */
  parseResponse(response: LLMResponse): ReturnType<typeof LLMResponseParser.parseResponse> {
    return LLMResponseParser.parseResponse(response);
  }

  /**
   * Validate that required credentials are available for OpenAI
   */
  validateCredentials(): {isValid: boolean, message: string, missingItems?: string[]} {
    const storageKeys = this.getCredentialStorageKeys();
    const apiKey = localStorage.getItem(storageKeys.apiKey!);
    
    if (!apiKey) {
      return {
        isValid: false,
        message: 'OpenAI API key is required. Please add your API key in Settings.',
        missingItems: ['API Key']
      };
    }
    
    return {
      isValid: true,
      message: 'OpenAI credentials are configured correctly.'
    };
  }

  /**
   * Get the storage keys this provider uses for credentials
   */
  getCredentialStorageKeys(): {apiKey: string} {
    return {
      apiKey: 'ai_chat_api_key'
    };
  }
}