// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { ChatMessage, ModelChatMessage, ToolResultMessage, AgentSessionMessage } from '../../models/ChatTypes.js';

export type CombinedModelMessage = ModelChatMessage & {
  combined?: true;
  resultText?: string;
  isError?: boolean;
  resultError?: string;
};

export type OrphanedToolResultMessage = ToolResultMessage & { orphaned?: true };

export type CombinedMessage = ChatMessage|CombinedModelMessage|OrphanedToolResultMessage;

/**
 * Combine adjacent model tool-call messages with their following tool-result messages
 * into a single logical item for rendering.
 *
 * Matching strategy (in priority order):
 *  - toolCallId (when present)
 *  - toolName equality with immediate adjacency (fallback)
 */
export function combineMessages(messages: ChatMessage[]): CombinedMessage[] {
  const result: CombinedMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Skip agent-lane items from chat feed
    if ((msg as any).uiLane === 'agent') {
      continue;
    }

    // Keep User messages and Final Model answers as-is
    if (msg.entity === 'user' || (msg.entity === 'model' && (msg as ModelChatMessage).action === 'final')) {
      result.push(msg);
      continue;
    }

    // Handle Model tool-call messages
    if (msg.entity === 'model' && (msg as ModelChatMessage).action === 'tool') {
      const modelMsg = msg as ModelChatMessage;
      const next = messages[i + 1];

      const nextIsMatchingToolResult = Boolean(
          next && (next as any).uiLane !== 'agent' && next.entity === 'tool_result' &&
          (
            // Prefer toolCallId match when available
            (!!(next as ToolResultMessage).toolCallId && (next as ToolResultMessage).toolCallId === modelMsg.toolCallId) ||
            // Fallback to name match for immediate adjacency
            (!(next as ToolResultMessage).toolCallId && (next as ToolResultMessage).toolName === modelMsg.toolName)
          ),
      );

      if (nextIsMatchingToolResult) {
        const tr = next as ToolResultMessage;
        const combined: CombinedModelMessage = {
          ...modelMsg,
          resultText: tr.resultText,
          isError: tr.isError,
          resultError: tr.error,
          combined: true,
        };
        result.push(combined);
        i++; // Skip the tool-result; it has been combined
      } else {
        // Tool call still running or result missing
        result.push(modelMsg);
      }
      continue;
    }

    // Handle orphaned tool-result messages
    if (msg.entity === 'tool_result') {
      const tr = msg as ToolResultMessage;
      // Agent-lane results already skipped above
      const prev = messages[i - 1];
      const isPrevMatchingModelCall = Boolean(
          prev && prev.entity === 'model' && (prev as ModelChatMessage).action === 'tool' &&
          (
            // Prefer matching by toolCallId when both present
            ((prev as ModelChatMessage).toolCallId && (msg as ToolResultMessage).toolCallId &&
              (prev as ModelChatMessage).toolCallId === (msg as ToolResultMessage).toolCallId) ||
            // Fallback to name equality for adjacency
            (!(msg as ToolResultMessage).toolCallId && (prev as ModelChatMessage).toolName === (msg as ToolResultMessage).toolName)
          ),
      );

      if (!isPrevMatchingModelCall) {
        result.push({ ...(msg as ToolResultMessage), orphaned: true });
      }
      continue;
    }

    // Fallback: push anything else as-is
    result.push(msg);
  }

  return result;
}
