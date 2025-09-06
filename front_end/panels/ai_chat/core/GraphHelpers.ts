// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { getTools } from '../tools/Tools.js';
import { ChatMessageEntity, type ChatMessage } from '../models/ChatTypes.js';

import * as BaseOrchestratorAgent from './BaseOrchestratorAgent.js';
import { createLogger } from './Logger.js';
import { enhancePromptWithPageContext } from './PageInfoManager.js';
import type { AgentState } from './State.js';
import { NodeType } from './Types.js';

const logger = createLogger('GraphHelpers');


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
