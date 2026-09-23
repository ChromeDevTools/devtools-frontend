// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';
import type * as CommentManager from '../comment_manager/comment_manager.js';

export type ChangeRecord = CommentManager.CommentManager.ChangeRecord;

export const MAX_RECORDS = 1000;

export class ChangeTracker {
  readonly #records = new Map<string, ChangeRecord>();
  readonly #commentManager: CommentManager.CommentManager.CommentManager;
  readonly #maxRecords: number;
  #lastRecord?: ChangeRecord;

  constructor(commentManager: CommentManager.CommentManager.CommentManager, maxRecords: number = MAX_RECORDS) {
    this.#commentManager = commentManager;
    this.#maxRecords = Math.max(1, maxRecords);
  }

  get maxRecords(): number {
    return this.#maxRecords;
  }

  get isTracking(): boolean {
    return Boolean(Root.Runtime.hostConfig.devToolsComments?.enabled) && this.#commentManager.isAgentAttached();
  }

  trackChange(
      description: string,
      anchor: CommentManager.CommentManager.CommentAnchorSignature,
      ): ChangeRecord|null {
    if (!this.isTracking) {
      return null;
    }
    const record: ChangeRecord = {
      id: crypto.randomUUID(),
      description,
      timestamp: Date.now(),
    };
    while (this.#records.size >= this.#maxRecords) {
      this.#evictOldestRecord();
    }

    const thread = this.#commentManager.createCommentThread(anchor, undefined, undefined, [record]);
    thread.save();
    this.#records.set(thread.id, record);
    this.#lastRecord = record;
    return record;
  }

  #evictOldestRecord(): void {
    // Delete the oldest record for which the comment thread has no user comments.
    // If all comment threads have user comments, delete the oldest record.
    for (const threadId of this.#records.keys()) {
      const thread = this.#commentManager.getCommentThread(threadId);
      if (!thread || thread.comments.length === 0) {
        this.#commentManager.removeCommentThread(threadId);
        this.#records.delete(threadId);
        return;
      }
    }

    const oldestThreadId = this.#records.keys().next().value;
    if (oldestThreadId) {
      this.#records.delete(oldestThreadId);
    }
  }

  getChanges(): ChangeRecord[] {
    return Array.from(this.#records.values());
  }

  getLastChange(): ChangeRecord|undefined {
    return this.#lastRecord;
  }

  clear(): void {
    for (const threadId of this.#records.keys()) {
      const thread = this.#commentManager.getCommentThread(threadId);
      if (!thread || thread.comments.length === 0) {
        this.#commentManager.removeCommentThread(threadId);
      }
    }
    this.#records.clear();
    this.#lastRecord = undefined;
  }
}
