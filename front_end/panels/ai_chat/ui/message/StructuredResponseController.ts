// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { ChatMessage } from '../../models/ChatTypes.js';
import type { CombinedMessage } from './MessageCombiner.js';
import { getMessageStateKey } from '../../core/structured_response.js';
import { MarkdownViewerUtil } from '../../common/MarkdownViewerUtil.js';

export type AIState = 'pending' | 'opened' | 'failed' | 'not-attempted';

export class StructuredResponseController {
  #aiAssistantStates = new Map<string, 'pending' | 'opened' | 'failed'>();
  #lastProcessedMessageKey: string | null = null;
  #onStateChanged: () => void;

  constructor(onStateChanged: () => void) {
    this.#onStateChanged = onStateChanged;
  }

  resetLastProcessed(): void {
    this.#lastProcessedMessageKey = null;
  }

  handleNewMessages(previousMessages: ChatMessage[]|undefined, newMessages: ChatMessage[]|undefined): void {
    if (!previousMessages || !newMessages) {
      return;
    }
    const willHaveMoreMessages = (newMessages?.length || 0) > (previousMessages?.length || 0);
    if (!willHaveMoreMessages) {
      return;
    }
    // When new messages are added, reset states for previous final structured messages
    const previousLastFinalIndex = previousMessages.findLastIndex(msg =>
      (msg as any).entity === 'model' && (msg as any).action === 'final'
    );
    if (previousLastFinalIndex >= 0) {
      const previousLast = previousMessages[previousLastFinalIndex] as any;
      const answer = previousLast?.answer as string | undefined;
      if (answer) {
        const structured = this.#tryParseStructured(answer);
        if (structured) {
          const key = getMessageStateKey(structured);
          const cur = this.getState(key);
          if (cur === 'pending') {
            this.#aiAssistantStates.set(key, 'failed');
          }
        }
      }
    }
  }

  computeStateAndMaybeOpen(structuredResponse: { reasoning: string, markdownReport: string },
                           combinedIndex: number,
                           combinedMessages: CombinedMessage[]): { aiState: AIState, isLastMessage: boolean } {
    const messageKey = getMessageStateKey(structuredResponse);
    const isLast = this.#isLastStructuredMessage(combinedMessages, combinedIndex);

    if (isLast && messageKey !== this.#lastProcessedMessageKey) {
      const state = this.getState(messageKey);
      if (state === 'not-attempted') {
        this.#aiAssistantStates.set(messageKey, 'pending');
        this.#open(markdownContent(structuredResponse), messageKey);
        this.#lastProcessedMessageKey = messageKey;
      }
    }

    const aiState = this.getState(messageKey);
    return { aiState, isLastMessage: isLast };
  }

  getState(messageKey: string): AIState {
    return this.#aiAssistantStates.get(messageKey) || 'not-attempted';
  }

  // Determine if the current combined index is the last structured final answer
  #isLastStructuredMessage(combined: CombinedMessage[], currentIndex: number): boolean {
    let last = -1;
    for (let i = 0; i < combined.length; i++) {
      const m: any = combined[i];
      if (m?.entity === 'model' && m?.action === 'final') {
        const sr = this.#tryParseStructured(m?.answer || '');
        if (sr) {
          last = i;
        }
      }
    }
    return last === currentIndex;
  }

  async #open(markdown: string, key: string): Promise<void> {
    try {
      await MarkdownViewerUtil.openInAIAssistantViewer(markdown);
      this.#aiAssistantStates.set(key, 'opened');
    } catch (e) {
      this.#aiAssistantStates.set(key, 'failed');
    }
    this.#onStateChanged();
  }

  #tryParseStructured(answer: string): { reasoning: string, markdownReport: string } | null {
    try {
      // Lightweight probe: the caller (ChatView) uses authoritative parser already.
      // Here we only need stable key; ChatView provides full rendering.
      const matchReasoning = answer.includes('<REASONING>') && answer.includes('</REASONING>');
      const matchReport = answer.includes('<MARKDOWN_REPORT>') && answer.includes('</MARKDOWN_REPORT>');
      if (!matchReasoning || !matchReport) {
        return null;
      }
      // Extract minimal payload for key generation.
      const reasoning = answer.substring(answer.indexOf('<REASONING>') + 11, answer.indexOf('</REASONING>')).trim();
      const markdownReport = answer.substring(answer.indexOf('<MARKDOWN_REPORT>') + 17, answer.indexOf('</MARKDOWN_REPORT>')).trim();
      return { reasoning, markdownReport };
    } catch {
      return null;
    }
  }
}

function markdownContent(sr: { reasoning: string, markdownReport: string }): string {
  return sr.markdownReport;
}

