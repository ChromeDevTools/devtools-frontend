// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { type AgentState } from './State.js';
import { getTools } from '../tools/Tools.js';
import { OpenAICallOptions, OpenAIClient, type OpenAIResponse, type ParsedLLMAction } from './OpenAIClient.js';
import { enhancePromptWithPageContext } from './PageInfoManager.js';
import * as BaseOrchestratorAgent from './BaseOrchestratorAgent.js';

// Define interfaces for our custom implementation
interface ModelResponse {
  parsedAction: {
    action: 'tool' | 'final'; // Discriminator
    toolName?: string; // Defined if action is 'tool'
    toolArgs?: Record<string, unknown>; // Defined if action is 'tool'
    answer?: string; // Defined if action is 'final'. This is the user-facing message or error.
  };
  openAIReasoning?: {
    summary?: string[] | null;
    effort?: string;
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


// Ensure ChatOpenAI tracks interaction state
export class ChatOpenAI implements Model {
  private apiKey: string;
  private modelName: string;
  private temperature: number;
  // Add a counter to track how many times generate has been called per interaction
  private callCount = 0;
  // Maximum number of calls per interaction
  private maxCallsPerInteraction = 25;

  constructor(options: { openAIApiKey: string, modelName: string, temperature?: number }) {
    this.apiKey = options.openAIApiKey;
    this.modelName = options.modelName;
    this.temperature = options.temperature ?? 1.0;
  }

  // Method to reset the call counter when a new user message is received
  resetCallCount(): void {
    this.callCount = 0;
  }

  // Method to check if we\'ve exceeded the maximum number of calls
  hasExceededMaxCalls(): boolean {
    return this.callCount >= this.maxCallsPerInteraction;
  }

  async generate(prompt: string, systemPrompt: string, state: AgentState): Promise<ModelResponse> {
    // Increment the call counter
    this.callCount++;

    // Check if we\'ve exceeded the maximum number of calls
    if (this.hasExceededMaxCalls()) {
      // Return a forced final response when limit is exceeded
      return {
        parsedAction: {
          action: 'final',
          answer: 'I reached the maximum number of tool calls. I need to provide a direct answer based on what I know so far. Let me know if you need more clarification.',
        },
      };
    }

    console.log('Generating response from OpenAI:');
    console.log(prompt);
    try {
      // Get agent-specific tools to include in the request
      const tools = getAgentToolsFromState(state).map(tool => ({
        type: 'function',
        name: tool.name,
        description: tool.description,
        parameters: tool.schema
      }));

      // Get the enhanced system prompt - use the async version
      const enhancedSystemPrompt = await enhancePromptWithPageContext(systemPrompt);

      // Prepare options for OpenAIClient
      const clientOptions: OpenAICallOptions = {
        tools,
        systemPrompt: enhancedSystemPrompt,
        temperature: this.temperature,
      };

      // Call OpenAIClient
      const openAIResponse: OpenAIResponse = await OpenAIClient.callOpenAI(
        this.apiKey,
        this.modelName,
        prompt,
        clientOptions
      );

      // Process the response from OpenAIClient using OpenAIClient.parseOpenAIResponse
      const parsedLlmAction: ParsedLLMAction = OpenAIClient.parseOpenAIResponse(openAIResponse);

      let parsedActionData: ModelResponse['parsedAction'];
      let openAIReasoning: ModelResponse['openAIReasoning'] = undefined;

      switch (parsedLlmAction.type) {
        case 'tool_call':
          parsedActionData = {
            action: 'tool',
            toolName: parsedLlmAction.name,
            toolArgs: parsedLlmAction.args,
          };
          break;
        case 'final_answer':
          parsedActionData = {
            action: 'final',
            answer: parsedLlmAction.answer,
          };
          break;
        case 'error':
          const errorMessage = `LLM response processing error: ${parsedLlmAction.error}`;
          parsedActionData = {
            action: 'final',
            answer: errorMessage,
          };
          break;
      }

      // Extract reasoning information if available
      if (openAIResponse.reasoning) {
        openAIReasoning = {
          summary: openAIResponse.reasoning.summary,
          effort: openAIResponse.reasoning.effort,
        };
      }

      return { parsedAction: parsedActionData, openAIReasoning };
    } catch (error) {
      // Error logging is handled within OpenAIClient, but re-throw if needed
      console.error('Error in ChatOpenAI.generate after calling OpenAIClient:', error);
      return {
        parsedAction: {
          action: 'final',
          answer: `error in calling API client: ${error}`,
        },
      };
    }
  }
}

// Export the interfaces and class
export type { ModelResponse, Model }; 