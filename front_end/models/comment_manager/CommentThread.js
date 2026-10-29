// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
export var Events;
(function (Events) {
    Events["CHANGED"] = "Changed";
})(Events || (Events = {}));
export class CommentThread extends Common.ObjectWrapper.ObjectWrapper {
    id = crypto.randomUUID();
    anchor;
    /** True for comments generated from the change tracker. */
    isGeneratedComment;
    #isOrphaned = false;
    comments;
    status = 'DRAFT';
    #transmitted = false;
    constructor(options) {
        super();
        this.anchor = options.anchor;
        this.comments = options.comments ?? [];
        this.isGeneratedComment = Boolean(options.isGeneratedComment);
    }
    get isOrphaned() {
        return this.#isOrphaned;
    }
    setOrphaned(isOrphaned) {
        if (this.#isOrphaned === isOrphaned) {
            return;
        }
        this.#isOrphaned = isOrphaned;
        this.dispatchEventToListeners("Changed" /* Events.CHANGED */);
    }
    /**
     * True once the thread has been taken by the agent (e.g. via CD4ABridge).
     */
    get transmitted() {
        return this.#transmitted;
    }
    /**
     * Marks the thread as taken by the agent.
     */
    markTransmitted() {
        if (this.#transmitted) {
            return;
        }
        this.#transmitted = true;
        this.dispatchEventToListeners("Changed" /* Events.CHANGED */);
    }
    /**
     * Returns whether it was changed.
     */
    #saveText(text, author = 'DEVELOPER') {
        if (text && text.trim().length > 0) {
            this.comments.push({
                author,
                text: text.trim(),
                timestamp: Date.now(),
            });
            return true;
        }
        return false;
    }
    /**
     * Records UMA for a developer-authored comment when it leaves the DRAFT state.
     */
    #recordCommentCreated() {
        if (this.isGeneratedComment) {
            return;
        }
        const text = this.comments.find(c => c.author === 'DEVELOPER')?.text.trim();
        if (!text) {
            return;
        }
        Host.userMetrics.commentCreated(1);
        Host.userMetrics.commentSize(text.length);
    }
    save(text, author = 'DEVELOPER') {
        let changed = this.#saveText(text, author);
        if (this.status === 'DRAFT') {
            this.#recordCommentCreated();
            this.status = 'ACTIVE';
            changed = true;
        }
        if (changed) {
            this.dispatchEventToListeners("Changed" /* Events.CHANGED */);
        }
    }
    editComment(text) {
        const trimmed = text.trim();
        if (this.status !== 'ACTIVE' || !trimmed) {
            return;
        }
        const comment = this.comments.find(c => c.author === 'DEVELOPER');
        if (!comment || comment.text === trimmed) {
            return;
        }
        comment.text = trimmed;
        this.dispatchEventToListeners("Changed" /* Events.CHANGED */);
    }
    sendToAgent(text, author = 'DEVELOPER') {
        let changed = this.#saveText(text, author);
        if (this.status === 'DRAFT') {
            this.#recordCommentCreated();
        }
        if (this.status === 'DRAFT' || this.status === 'ACTIVE') {
            this.status = 'SENT_TO_AGENT';
            changed = true;
        }
        if (changed) {
            this.dispatchEventToListeners("Changed" /* Events.CHANGED */);
        }
    }
    resolve(replyText) {
        if (replyText && replyText.trim().length > 0) {
            this.comments.push({
                author: 'AGENT',
                text: replyText.trim(),
                timestamp: Date.now(),
            });
        }
        this.status = 'RESOLVED';
        this.dispatchEventToListeners("Changed" /* Events.CHANGED */);
    }
}
export class RevealableThread {
    thread;
    position;
    constructor(thread, position) {
        this.thread = thread;
        this.position = position;
    }
}
//# sourceMappingURL=CommentThread.js.map