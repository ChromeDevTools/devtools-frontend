// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { getTools } from '../tools/Tools.js';
import { ChatMessageEntity, type ModelChatMessage, type ToolResultMessage } from '../ui/ChatView.js';

import type { Model } from './ChatOpenAI.js'; // Import Model interface
import { type ChatPromptFormatter, createSystemPrompt, getAgentToolsFromState } from './GraphHelpers.js'; // To be created
import type { AgentState } from './State.js';
import type { Runnable } from './Types.js';

export function createAgentNode(model: Model, formatter: ChatPromptFormatter): Runnable<AgentState, AgentState> {
  const agentNode = new class AgentNode implements Runnable<AgentState, AgentState> {
    private model: Model;
    private formatter: ChatPromptFormatter;

    constructor(model: Model, formatter: ChatPromptFormatter) {
      this.model = model;
      this.formatter = formatter;
    }

    async invoke(state: AgentState): Promise<AgentState> {
      console.log('AgentNode: Invoked with state. Last message:',
        state.messages.length > 0 ? state.messages[state.messages.length - 1] : 'No messages');

      // Reset call count on new user message
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage?.entity === ChatMessageEntity.USER) {
        this.model.resetCallCount();
      }

      if (lastMessage?.entity === ChatMessageEntity.TOOL_RESULT && lastMessage?.toolName === 'finalize_with_critique') {
        console.log('Found finalize_with_critique tool result:', lastMessage);
        console.log('Raw resultText:', lastMessage.resultText);

        try {
          // Parse the result to check if the critique was accepted
          const result = JSON.parse(lastMessage.resultText);

          console.log('Finalize with critique parsed result:', result);
          console.log('Result properties - accepted:', result.accepted, ', satisfiesCriteria:', result.satisfiesCriteria);

          // Check both accepted and satisfiesCriteria for compatibility
          const isAccepted = result.accepted === true || result.satisfiesCriteria === true;

          console.log('isAccepted decision:', isAccepted);

          if (isAccepted) {
            const answerText = result.answer;

            if (answerText) {
              const newModelMessage: ModelChatMessage = {
                entity: ChatMessageEntity.MODEL,
                action: 'final',
                answer: answerText,
                isFinalAnswer: true,
              };

              console.log('AgentNode: Created final answer message');

              return {
                ...state,
                messages: [...state.messages, newModelMessage],
                error: undefined,
              };
            }
            console.log('Coudnt find the answer');
          } else {
            // If critique rejected, return to agent with feedback
            console.log('Critique REJECTED the answer - routing back to AGENT');
            console.log('Critique feedback:', result.feedback || 'Critique rejected the answer without specific feedback');
          }
        } catch (error) {
          console.error('Error parsing finalize_with_critique result:', error);
        }
      }

      const promptText = this.formatter.format({ messages: state.messages });

      // 1. Create the system prompt based on the current state (including selected type)
      const systemPrompt = createSystemPrompt(state); // Needs to be imported or moved

      // 2. Call the model with the formatted history, system prompt, and state
      // No need to update page info here as it's handled by PageInfoManager
      const response = await this.model.generate(promptText, systemPrompt, state);
      console.log('AgentNode Response:', response);
      const parsedAction = response.parsedAction!;

      // Directly create the ModelChatMessage object
      let newModelMessage: ModelChatMessage;
      if (parsedAction.action === 'tool') {
        newModelMessage = {
          entity: ChatMessageEntity.MODEL,
          action: 'tool',
          toolName: parsedAction.toolName,
          toolArgs: parsedAction.toolArgs,
          isFinalAnswer: false,
          reasoning: response.openAIReasoning?.summary,
        };

        console.log('AgentNode: Created tool message with toolName:', parsedAction.toolName);
        if (parsedAction.toolName === 'finalize_with_critique') {
          console.log('AgentNode: finalize_with_critique call with args:', JSON.stringify(parsedAction.toolArgs));
        }
      } else {
        newModelMessage = {
          entity: ChatMessageEntity.MODEL,
          action: 'final',
          answer: parsedAction.answer,
          isFinalAnswer: true,
          reasoning: response.openAIReasoning?.summary,
        };

        console.log('AgentNode: Created final answer message');
      }

      console.log('New Model Message:', newModelMessage);

      return {
        ...state,
        messages: [...state.messages, newModelMessage],
        error: undefined,
      };
    }
  }(model, formatter);
  return agentNode;
}

export function createToolExecutorNode(state: AgentState): Runnable<AgentState, AgentState> {
  const tools = getAgentToolsFromState(state); // Adjusted to use getAgentToolsFromState
  const toolMap = new Map<string, ReturnType<typeof getTools>[number]>();
  tools.forEach((tool: ReturnType<typeof getTools>[number]) => toolMap.set(tool.name, tool));

  const toolExecutorNode = new class ToolExecutorNode implements Runnable<AgentState, AgentState> {
    private toolMap: Map<string, ReturnType<typeof getTools>[number]>;

    constructor(toolMap: Map<string, ReturnType<typeof getTools>[number]>) {
      this.toolMap = toolMap;
    }

    async invoke(state: AgentState): Promise<AgentState> {
      const lastMessage = state.messages[state.messages.length - 1];

      // Expect the last message to be the MODEL action requesting the tool
      if (lastMessage?.entity !== ChatMessageEntity.MODEL || lastMessage.action !== 'tool' || !lastMessage.toolName) {
        console.error('ToolExecutorNode: Expected last message to be a MODEL tool action.', lastMessage);
        return { ...state, error: 'Internal Error: Invalid state for tool execution.' };
      }

      // Get tool details from the ModelChatMessage
      const toolName = lastMessage.toolName;
      const toolArgs = lastMessage.toolArgs || {};
      let resultText: string;
      let isError = false;

      try {
        const selectedTool = this.toolMap.get(toolName);
        if (!selectedTool) {
          throw new Error(`Tool ${toolName} not found`);
        }

        // Execute the tool, casting toolArgs to any to satisfy the specific tool signature
        const result = await selectedTool.execute(toolArgs as any);

        // Special handling for finalize_with_critique tool results to ensure proper format
        if (toolName === 'finalize_with_critique') {
          console.log('ToolExecutorNode: finalize_with_critique result:', result);
          // Make sure the result is properly stringified
          resultText = typeof result === 'string' ? result : JSON.stringify(result);
        } else {
          resultText = JSON.stringify(result, null, 2);
        }

        isError = (typeof result === 'object' && result !== null && 'error' in result);

      } catch (err) {
        resultText = `Error during tool execution: ${err instanceof Error ? err.message : String(err)}`;
        console.error(resultText, `Tool: ${toolName}`, toolArgs);
        isError = true;
      }

      // Create the NEW ToolResultMessage
      const toolResultMessage: ToolResultMessage = {
        entity: ChatMessageEntity.TOOL_RESULT,
        toolName,
        resultText,
        isError,
        ...(isError && { error: resultText })
      };

      console.log('ToolExecutorNode: Adding tool result message:', toolResultMessage);

      // Add the result message to the state
      return {
        ...state,
        messages: [...state.messages, toolResultMessage],
        error: isError ? resultText : undefined,
      };
    }
  }(toolMap);
  return toolExecutorNode;
}

export function createFinalNode(): Runnable<AgentState, AgentState> {
  const finalNode = new class FinalNode implements Runnable<AgentState, AgentState> {
    async invoke(state: AgentState): Promise<AgentState> {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage?.entity !== ChatMessageEntity.MODEL || !lastMessage.isFinalAnswer) {
        console.warn('FinalNode: Invoked, but last message was not a final MODEL answer as expected.');
      }
      // Node remains simple, just returns state, assuming AgentNode set it correctly.
      return {
        ...state,
        error: undefined, // Clear any errors from previous steps
      };
    }
  }();
  return finalNode;
}
