// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import { CommentThread, } from './CommentThread.js';
export { CommentThread, };
export var Events;
(function (Events) {
    Events["COMMENT_THREADS_CHANGED"] = "CommentThreadsChanged";
    Events["COMMENT_MODE_CHANGED"] = "CommentModeChanged";
    Events["AGENT_ATTACHED_CHANGED"] = "AgentAttachedChanged";
})(Events || (Events = {}));
/**
 * Headless model managing comment thread data, CRUD operations, and comment mode.
 */
export class CommentManager extends Common.ObjectWrapper.ObjectWrapper {
    #commentThreads = new Map();
    #commentMode = false;
    #agentAttached = false;
    constructor() {
        super();
        CommentThread.resetIndex();
    }
    #onThreadChanged() {
        this.dispatchEventToListeners("CommentThreadsChanged" /* Events.COMMENT_THREADS_CHANGED */, this.getCommentThreads());
    }
    setAgentAttached(value) {
        if (this.#agentAttached === value) {
            return;
        }
        this.#agentAttached = value;
        if (!value) {
            this.setCommentMode(false);
        }
        this.dispatchEventToListeners("AgentAttachedChanged" /* Events.AGENT_ATTACHED_CHANGED */, value);
    }
    isAgentAttached() {
        return this.#agentAttached;
    }
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
        const comments = text ? [{
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
        thread.addEventListener("Changed" /* CommentThreadEvents.CHANGED */, this.#onThreadChanged, this);
        this.#commentThreads.set(thread.id, thread);
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
            if (thread.status === 'ACTIVE' && !thread.transmitted) {
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
        thread.resolve(replyText);
        return true;
    }
    removeCommentThread(id) {
        const thread = this.#commentThreads.get(id);
        if (!thread) {
            return;
        }
        thread.removeEventListener("Changed" /* CommentThreadEvents.CHANGED */, this.#onThreadChanged, this);
        this.#commentThreads.delete(id);
        this.dispatchEventToListeners("CommentThreadsChanged" /* Events.COMMENT_THREADS_CHANGED */, this.getCommentThreads());
    }
    clear() {
        this.setCommentMode(false);
        for (const thread of this.#commentThreads.values()) {
            thread.removeEventListener("Changed" /* CommentThreadEvents.CHANGED */, this.#onThreadChanged, this);
        }
        this.#commentThreads.clear();
        CommentThread.resetIndex();
        this.dispatchEventToListeners("CommentThreadsChanged" /* Events.COMMENT_THREADS_CHANGED */, []);
    }
}
//# sourceMappingURL=CommentManager.js.map