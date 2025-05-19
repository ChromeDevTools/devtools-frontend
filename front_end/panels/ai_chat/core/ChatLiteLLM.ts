// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { getTools } from '../tools/Tools.js';

import * as BaseOrchestratorAgent from './BaseOrchestratorAgent.js';
import { LiteLLMClient, type LiteLLMResponse, type ParsedLLMAction, type LiteLLMCallOptions } from './LiteLLMClient.js';
import { enhancePromptWithPageContext } from './PageInfoManager.js';
import type { AgentState } from './State.js';

// Define interfaces for our custom implementation
interface ModelResponse {
  parsedAction: {
    action: 'tool' | 'final', // Discriminator
    toolName?: string, // Defined if action is 'tool'
    toolArgs?: Record<string, unknown>, // Defined if action is 'tool'
    answer?: string, // Defined if action is 'final'. This is the user-facing message or error.
  };
}

interface Model {
  generate(prompt: string, systemPrompt: string, state: AgentState): Promise<ModelResponse>;
}

// Create the appropriate tools for the agent based on agent type
function getAgentToolsFromState(state: AgentState): ReturnType<typeof getTools> {
  // Use the helper from BaseOrchestratorAgent to get the pre-filtered list
  return BaseOrchestratorAgent.getAgentTools(state.selectedAgentType ?? ''); // Pass agentType or empty string
}

// Ensure ChatLiteLLM tracks interaction state
export class ChatLiteLLM implements Model {
  private apiKey: string | null;
  private modelName: string;
  private temperature: number;
  private endpoint?: string;
  private baseUrl?: string;
  // Add a counter to track how many times generate has been called per interaction
  private callCount = 0;
  // Maximum number of calls per interaction
  private maxCallsPerInteraction = 25;

  constructor(options: {
    liteLLMApiKey: string | null,
    modelName: string,
    temperature?: number,
    endpoint?: string,
    baseUrl?: string,
  }) {
    this.apiKey = options.liteLLMApiKey;
    this.modelName = options.modelName;
    this.temperature = options.temperature ?? 1.0;
    this.endpoint = options.endpoint;
    this.baseUrl = options.baseUrl;
  }

  // Method to reset the call counter when a new user message is received
  resetCallCount(): void {
    this.callCount = 0;
  }

  // Method to check if we've exceeded the maximum number of calls
  hasExceededMaxCalls(): boolean {
    return this.callCount >= this.maxCallsPerInteraction;
  }

  async generate(prompt: string, systemPrompt: string, state: AgentState): Promise<ModelResponse> {
    // Increment the call counter
    this.callCount++;

    // Check if we've exceeded the maximum number of calls
    if (this.hasExceededMaxCalls()) {
      // Return a forced final response when limit is exceeded
      return {
        parsedAction: {
          action: 'final',
          answer: 'I reached the maximum number of tool calls. I need to provide a direct answer based on what I know so far. Let me know if you need more clarification.',
        },
      };
    }

    console.log('Generating response from LiteLLM:');
    console.log(prompt);
    try {
      // Get agent-specific tools to include in the request
      const tools = getAgentToolsFromState(state).map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.schema
        }
      }));

      // Get the enhanced system prompt - use the async version
      const enhancedSystemPrompt = await enhancePromptWithPageContext(systemPrompt);

      // Prepare options for LiteLLMClient
      const clientOptions: LiteLLMCallOptions = {
        tools,
        systemPrompt: enhancedSystemPrompt,
        temperature: this.temperature,
        endpoint: this.endpoint,
        baseUrl: this.baseUrl
      };

      // Call LiteLLMClient
      const liteLLMResponse: LiteLLMResponse = await LiteLLMClient.callLiteLLM(
        this.apiKey,
        this.modelName,
        prompt,
        clientOptions
      );

      // Parse the response
      const parsedAction = LiteLLMClient.parseLiteLLMResponse(liteLLMResponse);

      // Convert to the expected ModelResponse format
      const modelResponse: ModelResponse = {
        parsedAction: {
          action: parsedAction.type === 'tool_call' ? 'tool' : 'final',
          toolName: parsedAction.type === 'tool_call' ? parsedAction.name : undefined,
          toolArgs: parsedAction.type === 'tool_call' ? parsedAction.args : undefined,
          answer: parsedAction.type === 'final_answer' ? parsedAction.answer : (parsedAction.type === 'error' ? parsedAction.error : undefined),
        },
      };

      return modelResponse;
    } catch (error) {
      console.error('[ChatLiteLLM] Error during LiteLLM call:', error);
      // Return error as final answer
      return {
        parsedAction: {
          action: 'final',
          answer: `Error calling LiteLLM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }
}
