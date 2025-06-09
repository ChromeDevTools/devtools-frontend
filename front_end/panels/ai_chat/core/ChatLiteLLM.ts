// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { getTools } from '../tools/Tools.js';

import * as BaseOrchestratorAgent from './BaseOrchestratorAgent.js';
import { createLogger } from './Logger.js';
import { enhancePromptWithPageContext } from './PageInfoManager.js';
import type { AgentState } from './State.js';
import { UnifiedLLMClient } from './UnifiedLLMClient.js';
import { ChatMessageEntity, type ChatMessage } from '../ui/ChatView.js';

const logger = createLogger('ChatLiteLLM');

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
  generateWithMessages(messages: ChatMessage[], systemPrompt: string, state: AgentState): Promise<ModelResponse>;
  resetCallCount(): void;
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
  // Add a counter to track how many times generate has been called per interaction
  private callCount = 0;
  // Maximum number of calls per interaction
  private maxCallsPerInteraction = 25;

  constructor(options: {
    liteLLMApiKey: string | null,
    modelName: string,
    temperature?: number,
  }) {
    this.apiKey = options.liteLLMApiKey;
    this.modelName = options.modelName;
    this.temperature = options.temperature ?? 1.0;
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
    // Convert single prompt to message format for backward compatibility
    const messages: ChatMessage[] = [{
      entity: ChatMessageEntity.USER,
      text: prompt
    }];
    
    return this.generateWithMessages(messages, systemPrompt, state);
  }

  async generateWithMessages(messages: ChatMessage[], systemPrompt: string, state: AgentState): Promise<ModelResponse> {
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

    logger.debug('Generating response from LiteLLM', { messageCount: messages.length });
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

      // Use UnifiedLLMClient for consistent message handling
      const unifiedResponse = await UnifiedLLMClient.callLLMWithMessages(
        this.apiKey || '',
        this.modelName,
        messages,
        {
          tools,
          systemPrompt: enhancedSystemPrompt,
          temperature: this.temperature,
        }
      );

      // Process the response using UnifiedLLMClient's parser
      const parsedAction = UnifiedLLMClient.parseResponse(unifiedResponse);

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
      logger.error('Error during UnifiedLLMClient call:', error);
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
