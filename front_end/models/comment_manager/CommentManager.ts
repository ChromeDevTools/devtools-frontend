// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {
  type ChangeRecord,
  type Comment,
  type CommentAnchorSignature,
  CommentThread,
  type CommentThreadOptions,
  type CommentThreadStatus,
  type DOMNodeAnchorSignature,
  type EditorAnchorSignature,
  Events as CommentThreadEvents,
  type TimelineAnchorSignature,
} from './CommentThread.js';

export {
  type ChangeRecord,
  type Comment,
  type CommentAnchorSignature,
  CommentThread,
  type CommentThreadOptions,
  type CommentThreadStatus,
  type DOMNodeAnchorSignature,
  type EditorAnchorSignature,
  type TimelineAnchorSignature,
};

export const enum Events {
  COMMENT_THREADS_CHANGED = 'CommentThreadsChanged',
  COMMENT_MODE_CHANGED = 'CommentModeChanged',
  AGENT_ATTACHED_CHANGED = 'AgentAttachedChanged',
}

export interface EventTypes {
  [Events.COMMENT_THREADS_CHANGED]: CommentThread[];
  [Events.COMMENT_MODE_CHANGED]: boolean;
  [Events.AGENT_ATTACHED_CHANGED]: boolean;
}

/**
 * Headless model managing comment thread data, CRUD operations, and comment mode.
 */
export class CommentManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #commentThreads = new Map<string, CommentThread>();
  #commentMode = false;
  #agentAttached = false;

  constructor() {
    super();
    CommentThread.resetIndex();
  }

  #onThreadChanged(): void {
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, this.getCommentThreads());
  }

  setAgentAttached(value: boolean): void {
    if (this.#agentAttached === value) {
      return;
    }
    this.#agentAttached = value;
    if (!value) {
      this.setCommentMode(false);
    }
    this.dispatchEventToListeners(Events.AGENT_ATTACHED_CHANGED, value);
  }

  isAgentAttached(): boolean {
    return this.#agentAttached;
  }

  setCommentMode(active: boolean): void {
    if (active && !this.#agentAttached) {
      return;
    }
    if (this.#commentMode === active) {
      return;
    }
    this.#commentMode = active;
    this.dispatchEventToListeners(Events.COMMENT_MODE_CHANGED, active);
  }

  isCommentMode(): boolean {
    return this.#commentMode;
  }

  createCommentThread(
      anchor: CommentAnchorSignature,
      text?: string,
      author: 'DEVELOPER'|'AGENT' = 'DEVELOPER',
      changes?: ChangeRecord[],
      ): CommentThread {
    const comments: Comment[] = text ? [{
      author,
      text,
      timestamp: Date.now(),
    }] :
                                       [];
    const thread = new CommentThread({
      anchor,
      comments,
      changes,
    });
    thread.addEventListener(CommentThreadEvents.CHANGED, this.#onThreadChanged, this);

    this.#commentThreads.set(thread.id, thread);
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, this.getCommentThreads());
    return thread;
  }

  getCommentThread(id: string): CommentThread|undefined {
    return this.#commentThreads.get(id);
  }

  getCommentThreads(): CommentThread[] {
    return Array.from(this.#commentThreads.values());
  }

  takeComments(): CommentThread[] {
    const threads: CommentThread[] = [];
    for (const thread of this.#commentThreads.values()) {
      if (thread.status === 'SENT_TO_AGENT' && !thread.transmitted) {
        thread.transmitted = true;
        threads.push(thread);
      }
    }
    return threads;
  }

  resolveCommentThread(threadId: string, replyText?: string): boolean {
    const thread = this.#commentThreads.get(threadId);
    if (!thread) {
      return false;
    }
    thread.resolve(replyText);
    return true;
  }

  removeCommentThread(id: string): void {
    const thread = this.#commentThreads.get(id);
    if (!thread) {
      return;
    }
    thread.removeEventListener(CommentThreadEvents.CHANGED, this.#onThreadChanged, this);
    this.#commentThreads.delete(id);
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, this.getCommentThreads());
  }

  clear(): void {
    this.setCommentMode(false);
    for (const thread of this.#commentThreads.values()) {
      thread.removeEventListener(CommentThreadEvents.CHANGED, this.#onThreadChanged, this);
    }
    this.#commentThreads.clear();
    CommentThread.resetIndex();
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, []);
  }
}
