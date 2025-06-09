// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createLogger } from './Logger.js';

const logger = createLogger('OpenAIClient');

/**
 * OpenAI-compatible message format
 */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

/**
 * Types for OpenAI API request and response
 */
export interface OpenAICallOptions {
  tools?: any[];
  tool_choice?: any;
  systemPrompt?: string; // For backward compatibility with simple prompt methods
  temperature?: number;
  reasoningLevel?: 'low' | 'medium' | 'high';
}

export interface OpenAIResponse {
  text?: string;
  functionCall?: {
    name: string,
    arguments: any,
  };
  rawResponse: any;
  reasoning?: {
    summary?: string[] | null,
    effort?: string,
  };
}

/**
 * Standardized structure for parsed LLM action
 */
export type ParsedLLMAction =
  | { type: 'tool_call', name: string, args: Record<string, unknown> }
  | { type: 'final_answer', answer: string }
  | { type: 'error', error: string };

/**
 * Enum to distinguish between model families with different request/response formats
 */
export enum ModelFamily {
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
 * OpenAIClient class for making requests to OpenAI Responses API
 */
export class OpenAIClient {
  private static readonly API_ENDPOINT = 'https://api.openai.com/v1/responses';

  /**
   * Determines the model family based on the model name
   */
  private static getModelFamily(modelName: string): ModelFamily {
    // Check if model name starts with 'o' to identify O series models
    if (modelName.startsWith('o')) {
      return ModelFamily.O;
    }
    // Otherwise, assume it's a GPT model (gpt-3.5-turbo, gpt-4, etc.)
    return ModelFamily.GPT;
  }

  /**
   * Converts tools from chat/completions format to responses API format
   */
  private static convertToolsFormat(tools: any[]): any[] {
    return tools.map(tool => {
      if (tool.type === 'function' && tool.function) {
        // Convert from chat/completions format to responses API format
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
   * Converts messages to responses API format based on model family
   */
  private static convertMessagesToResponsesAPI(
    messages: OpenAIMessage[], 
    modelFamily: ModelFamily
  ): any[] {
    return messages.map(msg => {
      if (msg.role === 'system') {
        if (modelFamily === ModelFamily.O) {
          return {
            role: 'system',
            content: [{ type: 'input_text', text: msg.content || '' }]
          };
        } else {
          return {
            role: 'system',
            content: msg.content || ''
          };
        }
      } else if (msg.role === 'user') {
        if (modelFamily === ModelFamily.O) {
          return {
            role: 'user',
            content: [{ type: 'input_text', text: msg.content || '' }]
          };
        } else {
          return {
            role: 'user',
            content: msg.content || ''
          };
        }
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
          if (modelFamily === ModelFamily.O) {
            return {
              role: 'assistant',
              content: [{ type: 'output_text', text: msg.content || '' }]
            };
          } else {
            return {
              role: 'assistant',
              content: msg.content || ''
            };
          }
        }
      } else if (msg.role === 'tool') {
        // Convert tool result to responses API format
        return {
          type: 'function_call_output',
          call_id: msg.tool_call_id,
          output: msg.content || ''
        } as ResponsesAPIFunctionOutput;
      }
      return msg;
    });
  }

  /**
   * Processes the responses API output and extracts relevant information
   */
  private static processResponsesAPIOutput(data: any): OpenAIResponse {
    const result: OpenAIResponse = {
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
   * Makes a request to the OpenAI Responses API
   */
  private static async makeAPIRequest(apiKey: string, payloadBody: any): Promise<any> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payloadBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      logger.info('OpenAI Response:', data);

      if (data.usage) {
        logger.info('OpenAI Usage:', { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens });
      }

      return data;
    } catch (error) {
      logger.error('OpenAI API request failed:', error);
      throw error;
    }
  }

  /**
   * Main method to call OpenAI API with messages using the responses API
   */
  static async callOpenAIWithMessages(
    apiKey: string,
    modelName: string,
    messages: OpenAIMessage[],
    options?: OpenAICallOptions
  ): Promise<OpenAIResponse> {
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

    // Add tools if provided - convert from chat/completions format to responses API format
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

    const data = await this.makeAPIRequest(apiKey, payloadBody);
    return this.processResponsesAPIOutput(data);
  }

  /**
   * Parses the raw OpenAI response into a standardized action structure
   */
  static parseOpenAIResponse(response: OpenAIResponse): ParsedLLMAction {
    if (response.functionCall) {
      return {
        type: 'tool_call',
        name: response.functionCall.name,
        args: response.functionCall.arguments || {},
      };
    } 
    
    if (response.text) {
      const rawContent = response.text;
      // Attempt to parse text as JSON tool call (fallback for some models)
      if (rawContent.trim().startsWith('{') && rawContent.includes('"action":"tool"')) {
        try {
          const contentJson = JSON.parse(rawContent);
          if (contentJson.action === 'tool' && contentJson.toolName) {
            return {
              type: 'tool_call',
              name: contentJson.toolName,
              args: contentJson.toolArgs || {},
            };
          }
          // Fallback to treating it as text if JSON structure is not a valid tool call
          return { type: 'final_answer', answer: rawContent };
        } catch (e) {
          // If JSON parsing fails, treat it as plain text
          return { type: 'final_answer', answer: rawContent };
        }
      } else {
        // Treat as plain text final answer
        return { type: 'final_answer', answer: rawContent };
      }
    }
    
    // No function call or text found
    logger.error('LLM response had no function call or text.');
    return { type: 'error', error: 'LLM returned empty response.' };
  }
}