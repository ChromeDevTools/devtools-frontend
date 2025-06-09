// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { getTools } from '../tools/Tools.js';
import { ChatMessageEntity, type ModelChatMessage, type ToolResultMessage } from '../ui/ChatView.js';

import type { Model } from './ChatOpenAI.js'; // Import Model interface
import { createSystemPromptAsync, getAgentToolsFromState } from './GraphHelpers.js';
import { createLogger } from './Logger.js';
import type { AgentState } from './State.js';
import type { Runnable } from './Types.js';

const logger = createLogger('AgentNodes');

export function createAgentNode(model: Model): Runnable<AgentState, AgentState> {
  const agentNode = new class AgentNode implements Runnable<AgentState, AgentState> {
    private model: Model;

    constructor(model: Model) {
      this.model = model;
    }

    async invoke(state: AgentState): Promise<AgentState> {
      logger.debug('AgentNode: Invoked with state. Last message:',
        state.messages.length > 0 ? state.messages[state.messages.length - 1] : 'No messages');

      // Reset call count on new user message
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage?.entity === ChatMessageEntity.USER) {
        this.model.resetCallCount();
      }

      if (lastMessage?.entity === ChatMessageEntity.TOOL_RESULT && lastMessage?.toolName === 'finalize_with_critique') {
        logger.debug('Found finalize_with_critique tool result:', lastMessage);
        logger.debug('Raw resultText:', lastMessage.resultText);

        try {
          // Parse the result to check if the critique was accepted
          const result = JSON.parse(lastMessage.resultText);

          logger.debug('Finalize with critique parsed result:', result);
          logger.debug('Result properties', { accepted: result.accepted, satisfiesCriteria: result.satisfiesCriteria });

          // Check both accepted and satisfiesCriteria for compatibility
          const isAccepted = result.accepted === true || result.satisfiesCriteria === true;

          logger.debug('isAccepted decision:', isAccepted);

          if (isAccepted) {
            const answerText = result.answer;

            if (answerText) {
              const newModelMessage: ModelChatMessage = {
                entity: ChatMessageEntity.MODEL,
                action: 'final',
                answer: answerText,
                isFinalAnswer: true,
              };

              logger.debug('AgentNode: Created final answer message');

              return {
                ...state,
                messages: [...state.messages, newModelMessage],
                error: undefined,
              };
            }
            logger.warn('Coudnt find the answer');
          } else {
            // If critique rejected, return to agent with feedback
            logger.info('Critique REJECTED the answer - routing back to AGENT');
            logger.info('Critique feedback:', result.feedback || 'Critique rejected the answer without specific feedback');
          }
        } catch (error) {
          logger.error('Error parsing finalize_with_critique result:', error);
        }
      }

      // 1. Create the enhanced system prompt based on the current state (including selected type)
      const systemPrompt = await createSystemPromptAsync(state);

      // 2. Call the model with the message array directly instead of using ChatPromptFormatter
      const response = await this.model.generateWithMessages(state.messages, systemPrompt, state);
      logger.debug('AgentNode Response:', response);
      const parsedAction = response.parsedAction!;

      // Directly create the ModelChatMessage object
      let newModelMessage: ModelChatMessage;
      if (parsedAction.action === 'tool') {
        const toolCallId = crypto.randomUUID(); // Generate unique ID for OpenAI format
        newModelMessage = {
          entity: ChatMessageEntity.MODEL,
          action: 'tool',
          toolName: parsedAction.toolName,
          toolArgs: parsedAction.toolArgs,
          toolCallId, // Add for linking with tool response
          isFinalAnswer: false,
          reasoning: response.openAIReasoning?.summary,
        };

        logger.debug('AgentNode: Created tool message', { toolName: parsedAction.toolName, toolCallId });
        if (parsedAction.toolName === 'finalize_with_critique') {
          logger.debug('AgentNode: finalize_with_critique call with args:', JSON.stringify(parsedAction.toolArgs));
        }
      } else {
        newModelMessage = {
          entity: ChatMessageEntity.MODEL,
          action: 'final',
          answer: parsedAction.answer,
          isFinalAnswer: true,
          reasoning: response.openAIReasoning?.summary,
        };

        logger.debug('AgentNode: Created final answer message');
      }

      logger.debug('New Model Message:', newModelMessage);

      return {
        ...state,
        messages: [...state.messages, newModelMessage],
        error: undefined,
      };
    }
  }(model);
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
        logger.error('ToolExecutorNode: Expected last message to be a MODEL tool action.', lastMessage);
        return { ...state, error: 'Internal Error: Invalid state for tool execution.' };
      }

      // Get tool details from the ModelChatMessage
      const toolName = lastMessage.toolName;
      const toolArgs = lastMessage.toolArgs || {};
      const toolCallId = lastMessage.toolCallId; // Extract tool call ID for linking
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
          logger.debug('ToolExecutorNode: finalize_with_critique result:', result);
          // Make sure the result is properly stringified
          resultText = typeof result === 'string' ? result : JSON.stringify(result);
        } else {
          resultText = JSON.stringify(result, null, 2);
        }

        isError = (typeof result === 'object' && result !== null && 'error' in result);

      } catch (err) {
        resultText = `Error during tool execution: ${err instanceof Error ? err.message : String(err)}`;
        logger.error(resultText, { tool: toolName, args: toolArgs });
        isError = true;
      }

      // Create the NEW ToolResultMessage
      const toolResultMessage: ToolResultMessage = {
        entity: ChatMessageEntity.TOOL_RESULT,
        toolName,
        resultText,
        isError,
        toolCallId, // Link back to the tool call for OpenAI format
        ...(isError && { error: resultText })
      };

      logger.debug('ToolExecutorNode: Adding tool result message with toolCallId:', { toolCallId, toolResultMessage });

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
        logger.warn('FinalNode: Invoked, but last message was not a final MODEL answer as expected.');
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
