// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export interface EditorAnchorSignature {
  /** 1-based line number for CodeMirror text editor anchors */
  lineNumber: number;
  /** File path associated with the editor */
  filePath?: string;
}

export interface CommentAnchorSignature {
  /** Visual logging tree path, e.g. "Panel: elements > Pane: styles > TreeOutline > TreeItem: color" */
  vePath: string;
  /** Normalized text content of the target node */
  textSignature: string;
  /** Text content of the parent container VE node for sibling disambiguation */
  parentTextSignature?: string;
  /** 0-indexed position among siblings sharing the same visual logging path */
  siblingIndex?: number;
  /** Optional backend RequestId for Network panel elements (`data-network-request-id`) */
  networkRequestId?: string;
  /** Optional backend NodeId for Elements panel DOM nodes (`data-backend-node-id`) */
  backendNodeId?: number;
  /** Optional editor anchor coordinates for CodeMirror text editors */
  editor?: EditorAnchorSignature;
}

export interface Comment {
  author: 'DEVELOPER'|'AGENT';
  text: string;
  timestamp: number;
}

export interface CommentThread {
  id: string;
  anchor: CommentAnchorSignature;
  comments: Comment[];
  status: 'ACTIVE'|'RESOLVED';
  changes?: Array<Record<string, unknown>>;
}

export const enum Events {
  COMMENT_THREADS_CHANGED = 'CommentThreadsChanged',
  COMMENT_MODE_CHANGED = 'CommentModeChanged',
}

export interface EventTypes {
  [Events.COMMENT_THREADS_CHANGED]: CommentThread[];
  [Events.COMMENT_MODE_CHANGED]: boolean;
}

/**
 * Headless model managing comment thread data, CRUD operations, and comment mode.
 */
export class CommentManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly #commentThreads = new Map<string, CommentThread>();
  #commentMode = false;
  #nextId = 1;

  setCommentMode(active: boolean): void {
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
      text: string,
      author: 'DEVELOPER'|'AGENT' = 'DEVELOPER',
      changes?: Array<Record<string, unknown>>,
      ): CommentThread {
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
    if (!this.#commentThreads.has(id)) {
      return;
    }
    this.#commentThreads.delete(id);
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, this.getCommentThreads());
  }

  clear(): void {
    this.setCommentMode(false);
    this.#commentThreads.clear();
    this.dispatchEventToListeners(Events.COMMENT_THREADS_CHANGED, []);
  }
}
