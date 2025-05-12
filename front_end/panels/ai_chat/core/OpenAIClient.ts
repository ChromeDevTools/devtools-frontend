// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Types for OpenAI API request and response
 */
export interface OpenAICallOptions {
  tools?: Array<any>;
  tool_choice?: any;
  systemPrompt?: string;
  temperature?: number;
  reasoningLevel?: 'low' | 'medium' | 'high';
}

export interface OpenAIResponse {
  text?: string;
  functionCall?: {
    name: string;
    arguments: any;
  };
  rawResponse: any;
  reasoning?: {
    summary?: string[] | null;
    effort?: string;
  };
}

/**
 * Standardized structure for parsed LLM action
 */
export type ParsedLLMAction = 
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'final_answer'; answer: string }
  | { type: 'error'; error: string };

/**
 * Enum to distinguish between model families with different request/response formats
 */
export enum ModelFamily {
  GPT = 'gpt',
  O = 'o'
}

/**
 * OpenAIClient class for making requests to OpenAI API
 */
export class OpenAIClient {
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
   * Call the OpenAI API with the provided parameters
   */
  public static async callOpenAI(
    apiKey: string,
    modelName: string,
    prompt: string,
    options?: OpenAICallOptions
  ): Promise<OpenAIResponse> {
    console.log("OpenAIClient: Calling OpenAI...");
    console.log("Model:", modelName);
    console.log("Prompt:", prompt);

    // Determine model family
    const modelFamily = this.getModelFamily(modelName);
    console.log("Model Family:", modelFamily);

    // Construct payload body based on model family
    const payloadBody: any = {
      model: modelName,
    };

    if (modelFamily === ModelFamily.O) {
      // O format uses 'input' with content arrays
      const messages = [];

      // Add system prompt if provided
      if (options?.systemPrompt) {
        messages.push({
          role: 'system',
          content: [{ type: "input_text", text: options.systemPrompt }]
        });
      }

      // Add user message
      messages.push({
        role: 'user',
        content: [{ type: "input_text", text: prompt }]
      });

      payloadBody.input = messages;
    } else {
      // GPT format uses 'input' (formerly 'messages') with string content
      const messages = [];

      // Add system prompt if provided
      if (options?.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt
        });
      }

      if (options?.temperature) {
        payloadBody.temperature = options.temperature;
      }

      // Add user message
      messages.push({
        role: 'user',
        content: prompt
      });

      payloadBody.input = messages; // Updated from 'messages' to 'input' per API change
    }

    // Add tools if provided (handle format differences if needed)
    if (options?.tools) {
      payloadBody.tools = options.tools;
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

    console.log("Request payload:", payloadBody);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payloadBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log("OpenAI Response:", data);

      if (data.usage) {
        console.log("OpenAI Usage: Input tokens:", data.usage.input_tokens, "Output tokens:", data.usage.output_tokens);
      }

      // Process the response based on model family
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

      if (!data || !data.output) {
        throw new Error("No output from OpenAI");
      }

      if (data.output && data.output.length > 0) {
        // Find function call or message by type instead of assuming position
        const functionCallOutput = data.output.find((item: any) => item.type === "function_call");
        const messageOutput = data.output.find((item: any) => item.type === "message");

        if (functionCallOutput) {
          // Process function call
          try {
            result.functionCall = {
              name: functionCallOutput.name,
              arguments: JSON.parse(functionCallOutput.arguments)
            };
          } catch (error) {
            console.error("Error parsing function arguments:", error);
            result.functionCall = {
              name: functionCallOutput.name,
              arguments: functionCallOutput.arguments // Keep as string if parsing fails
            };
          }
        }
        else if (messageOutput && messageOutput.content && messageOutput.content.length > 0 && messageOutput.content[0].type === "output_text") {
          // Process text response
          result.text = messageOutput.content[0].text.trim();
        }
      }

      return result;
    } catch (error) {
      console.error("OpenAI API request failed:", error);
      throw error;
    }
  }

  /**
   * Parses the raw OpenAI response into a standardized action structure
   */
  public static parseOpenAIResponse(response: OpenAIResponse): ParsedLLMAction {
    if (response.functionCall) {
      return {
        type: 'tool_call',
        name: response.functionCall.name,
        args: response.functionCall.arguments || {},
      };
    } else if (response.text) {
      const rawContent = response.text;
      // Attempt to parse text as JSON tool call (fallback for some models)
      if (rawContent.trim().startsWith('{') && rawContent.includes('"action":"tool"')) { // Heuristic
        try {
          const contentJson = JSON.parse(rawContent);
          if (contentJson.action === 'tool' && contentJson.toolName) {
            return {
              type: 'tool_call',
              name: contentJson.toolName,
              args: contentJson.toolArgs || {},
            };
          } else {
            // Fallback to treating it as text if JSON structure is not a valid tool call
            return { type: 'final_answer', answer: rawContent };
          }
        } catch (e) {
          // If JSON parsing fails, treat it as plain text
          return { type: 'final_answer', answer: rawContent };
        }
      } else {
        // Treat as plain text final answer
        return { type: 'final_answer', answer: rawContent };
      }
    } else {
      // No function call or text found
      console.error('OpenAIClient: LLM response had no function call or text.');
      return { type: 'error', error: 'LLM returned empty response.' };
    }
  }
} 