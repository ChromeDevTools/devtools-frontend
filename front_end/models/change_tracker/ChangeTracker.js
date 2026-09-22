// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Root from '../../core/root/root.js';
export const MAX_RECORDS = 1000;
export class ChangeTracker {
    #records = new Map();
    #commentManager;
    #maxRecords;
    #lastRecord;
    constructor(commentManager, maxRecords = MAX_RECORDS) {
        this.#commentManager = commentManager;
        this.#maxRecords = Math.max(1, maxRecords);
    }
    get maxRecords() {
        return this.#maxRecords;
    }
    get isTracking() {
        return Boolean(Root.Runtime.hostConfig.devToolsComments?.enabled) && this.#commentManager.isAgentAttached();
    }
    trackChange(description, anchor) {
        if (!this.isTracking) {
            return null;
        }
        const record = {
            id: crypto.randomUUID(),
            description,
            timestamp: Date.now(),
        };
        while (this.#records.size >= this.#maxRecords) {
            this.#evictOldestRecord();
        }
        const thread = this.#commentManager.createCommentThread(anchor, undefined, undefined, [record]);
        this.#records.set(thread.id, record);
        this.#lastRecord = record;
        return record;
    }
    #evictOldestRecord() {
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
    getChanges() {
        return Array.from(this.#records.values());
    }
    getLastChange() {
        return this.#lastRecord;
    }
    clear() {
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
//# sourceMappingURL=ChangeTracker.js.map