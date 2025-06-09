// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { getTools } from '../tools/Tools.js';
import { ChatMessageEntity, type ChatMessage } from '../ui/ChatView.js';

import * as BaseOrchestratorAgent from './BaseOrchestratorAgent.js';
import { createLogger } from './Logger.js';
import { enhancePromptWithPageContext } from './PageInfoManager.js';
import type { AgentState } from './State.js';
import { NodeType } from './Types.js';

const logger = createLogger('GraphHelpers');

// DEPRECATED: ChatPromptFormatter
// This class was used to concatenate messages into a single string for older LLM APIs.
// Now we use the message-based approach with UnifiedLLMClient for proper conversation handling.
// Kept for backward compatibility but should not be used in new code.
export class ChatPromptFormatter {
  format(values: { messages: ChatMessage[] }): string {
    logger.warn('ChatPromptFormatter is deprecated. Use message-based approach with UnifiedLLMClient instead.');
    const messageHistory = values.messages || [];
    const formattedParts: string[] = [];

    // Find the last GetAccessibilityTreeTool result, if any
    let lastAccessibilityTreeIndex = -1;
    for (let i = messageHistory.length - 1; i >= 0; i--) {
      const message = messageHistory[i];
      if (message.entity === ChatMessageEntity.TOOL_RESULT &&
        message.toolName === 'get_accessibility_tree') {
        lastAccessibilityTreeIndex = i;
        break;
      }
    }

    for (let i = 0; i < messageHistory.length; i++) {
      const message = messageHistory[i];
      switch (message.entity) {
        case ChatMessageEntity.USER:
          if (message.text) {
            formattedParts.push(`user: ${message.text}`);
          }
          break;
        case ChatMessageEntity.MODEL:
          // Format model message based on its action
          if (message.action === 'tool') {
            // Represent tool call in natural language instead of JSON to avoid LLM confusion
            formattedParts.push(`assistant: Used tool "${message.toolName || 'unknown'}" to ${message.reasoning || 'perform an action'}.`);
          } else if (message.answer) {
            // Represent final answer - now just using plain markdown text
            formattedParts.push(`assistant: ${message.answer}`);
          }
          break;
        case ChatMessageEntity.TOOL_RESULT:
          // For GetAccessibilityTreeTool, only include the most recent result
          if (message.toolName === 'get_accessibility_tree' && i !== lastAccessibilityTreeIndex) {
            // Skip older accessibility tree results
            const resultPrefix = message.isError ? `tool_error[${message.toolName}]` : `tool_result[${message.toolName}]`;
            formattedParts.push(`${resultPrefix}: Hidden to save on tokens`);
            continue;
          }

          // Represent tool results clearly
          const resultPrefix = message.isError ? `tool_error[${message.toolName}]` : `tool_result[${message.toolName}]`;
          formattedParts.push(`${resultPrefix}: ${message.resultText}`);
          break;
      }
    }
    return formattedParts.join('\n\n');
  }
}

// Replace createSystemPrompt with this version
export function createSystemPrompt(state: AgentState): string {
  const { selectedAgentType } = state;

  // Get base prompt
  const basePrompt = selectedAgentType ?
    BaseOrchestratorAgent.getSystemPrompt(selectedAgentType) :
    BaseOrchestratorAgent.getSystemPrompt('default');

  // Use the enhancePromptWithPageContext function to add page info
  return basePrompt; // Just return the base prompt initially, we'll update with page context asynchronously
}

// Add a new async version that will be used instead
export async function createSystemPromptAsync(state: AgentState): Promise<string> {
  const { selectedAgentType } = state;

  // Get base prompt
  const basePrompt = selectedAgentType ?
    BaseOrchestratorAgent.getSystemPrompt(selectedAgentType) :
    BaseOrchestratorAgent.getSystemPrompt('default');

  // Use the enhancePromptWithPageContext function to add page info
  return await enhancePromptWithPageContext(basePrompt);
}

// Create the appropriate tools for the agent based on agent type
export function getAgentToolsFromState(state: AgentState): ReturnType<typeof getTools> {
  // Use the helper from BaseOrchestratorAgent to get the pre-filtered list
  return BaseOrchestratorAgent.getAgentTools(state.selectedAgentType ?? ''); // Pass agentType or empty string
}

// routeNextNode remains the central logic decider, used by edge functions
// It returns a string key (NodeType or 'end') used by conditional edges
export function routeNextNode(state: AgentState): string { // Return type is now just string
  if (state.messages.length === 0) {
    // Should not happen if entry point is AGENT, but handle defensively
    return NodeType.AGENT;
  }

  const lastMessage = state.messages[state.messages.length - 1];

  switch (lastMessage.entity) {
    case ChatMessageEntity.USER:
      return NodeType.AGENT;

    case ChatMessageEntity.MODEL:
      if (lastMessage.action === 'tool') {
        return NodeType.TOOL_EXECUTOR;
      } if (lastMessage.action === 'final') {
        return NodeType.FINAL; // Route TO FinalNode
      }
        logger.warn('routeNextNode: MODEL message has invalid action:', lastMessage.action);
        return 'end'; // Map invalid action to 'end' key

    case ChatMessageEntity.TOOL_RESULT:
      return NodeType.AGENT;

    default:
      logger.warn('routeNextNode: Unhandled last message entity type encountered.');
      return 'end'; // Map unhandled types to 'end' key
  }
}
