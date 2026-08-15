// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
/**
 * Headless model managing comment thread data, CRUD operations, and comment mode.
 */
export class CommentManager extends Common.ObjectWrapper.ObjectWrapper {
    #commentThreads = new Map();
    #commentMode = false;
    #nextId = 1;
    setCommentMode(active) {
        if (this.#commentMode === active) {
            return;
        }
        this.#commentMode = active;
        this.dispatchEventToListeners("CommentModeChanged" /* Events.COMMENT_MODE_CHANGED */, active);
    }
    isCommentMode() {
        return this.#commentMode;
    }
    createCommentThread(anchor, text, author = 'DEVELOPER', changes) {
        const id = `comment-${this.#nextId++}`;
        const thread = {
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
        this.dispatchEventToListeners("CommentThreadsChanged" /* Events.COMMENT_THREADS_CHANGED */, this.getCommentThreads());
        return thread;
    }
    getCommentThread(id) {
        return this.#commentThreads.get(id);
    }
    getCommentThreads() {
        return Array.from(this.#commentThreads.values());
    }
    removeCommentThread(id) {
        if (!this.#commentThreads.has(id)) {
            return;
        }
        this.#commentThreads.delete(id);
        this.dispatchEventToListeners("CommentThreadsChanged" /* Events.COMMENT_THREADS_CHANGED */, this.getCommentThreads());
    }
    clear() {
        this.setCommentMode(false);
        this.#commentThreads.clear();
        this.dispatchEventToListeners("CommentThreadsChanged" /* Events.COMMENT_THREADS_CHANGED */, []);
    }
}
//# sourceMappingURL=CommentManager.js.map