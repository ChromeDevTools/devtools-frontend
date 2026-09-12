// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export var Events;
(function (Events) {
    Events["COMMENT_THREADS_CHANGED"] = "CommentThreadsChanged";
    Events["COMMENT_MODE_CHANGED"] = "CommentModeChanged";
})(Events || (Events = {}));
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
        const index = this.#nextId++;
        const id = `comment-${index}`;
        const comments = text ? [{
                author,
                text,
                timestamp: Date.now(),
            }] :
            [];
        const thread = {
            id,
            anchor,
            comments,
            status: 'ACTIVE',
            transmitted: false,
            changes,
            index,
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
    takeComments() {
        const threads = [];
        for (const thread of this.#commentThreads.values()) {
            if (!thread.transmitted) {
                thread.transmitted = true;
                threads.push(thread);
            }
        }
        return threads;
    }
    resolveCommentThread(threadId, replyText) {
        const thread = this.#commentThreads.get(threadId);
        if (!thread) {
            return false;
        }
        if (replyText && replyText.trim().length > 0) {
            const comment = {
                author: 'AGENT',
                text: replyText.trim(),
                timestamp: Date.now(),
            };
            thread.comments.push(comment);
        }
        thread.status = 'RESOLVED';
        this.dispatchEventToListeners("CommentThreadsChanged" /* Events.COMMENT_THREADS_CHANGED */, this.getCommentThreads());
        return true;
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