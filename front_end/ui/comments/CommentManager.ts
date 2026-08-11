// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {
  type CommentThread,
  resolveCommentAnchor,
} from './CommentAnchorResolver.js';

export interface EventTypes {
  [Events.COMMENT_THREADS_CHANGED]: CommentThread[];
}

export const enum Events {
  COMMENT_THREADS_CHANGED = 'CommentThreadsChanged',
}

/**
 * Manages comment threads and provides CRUD operations.
 */
export class CommentManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #commentThreads = new Map<string, CommentThread>();
  #nextId = 1;

  createComment(
      element: Element,
      text: string,
      author: 'DEVELOPER'|'AGENT' = 'DEVELOPER',
      changes?: Array<Record<string, unknown>>,
      ): CommentThread|null {
    const anchor = resolveCommentAnchor(element);
    if (!anchor) {
      return null;
    }

    const id = `comment-${this.#nextId++}`;
    const thread: CommentThread = {
      id,
      anchor,
      comments: [{
        author,
        text,
        timestamp: Date.now(),
      }],
      status: 'ACTIVE',
      changes,
    };

    this.#commentThreads.set(id, thread);
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, this.getCommentThreads());

    return thread;
  }

  getCommentThread(id: string): CommentThread|undefined {
    return this.#commentThreads.get(id);
  }

  getCommentThreads(): CommentThread[] {
    return Array.from(this.#commentThreads.values());
  }

  removeCommentThread(id: string): void {
    const thread = this.#commentThreads.get(id);
    if (!thread) {
      return;
    }
    this.#commentThreads.delete(id);
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, this.getCommentThreads());
  }

  clear(): void {
    this.#commentThreads.clear();
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, []);
  }
}
