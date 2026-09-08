// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
export var Events;
(function (Events) {
    Events["COMMENT_THREADS_CHANGED"] = "CommentThreadsChanged";
})(Events || (Events = {}));
/**
 * Headless model bridge connecting DevTools comments subsystem to CD4A.
 * Provides serialization, transmission state tracking, and element reveal capabilities.
 */
export class CD4ABridge extends Common.ObjectWrapper.ObjectWrapper {
    #commentManager;
    #targetManager;
    #networkLog;
    #inspectorFrontendHost;
    #eventListeners;
    constructor(commentManager, targetManager, networkLog, inspectorFrontendHost = Host.InspectorFrontendHost.InspectorFrontendHostInstance) {
        super();
        this.#commentManager = commentManager;
        this.#targetManager = targetManager;
        this.#networkLog = networkLog;
        this.#inspectorFrontendHost = inspectorFrontendHost;
        this.#eventListeners = [
            this.#commentManager.addEventListener("CommentThreadsChanged" /* CommentManager.Events.COMMENT_THREADS_CHANGED */, () => {
                this.dispatchEventToListeners("CommentThreadsChanged" /* Events.COMMENT_THREADS_CHANGED */);
            }),
        ];
    }
    dispose() {
        Common.EventTarget.removeEventListeners(this.#eventListeners);
    }
    getCommentThreads() {
        const threads = this.#commentManager.takeComments();
        return threads.map(thread => {
            const threadPayload = {
                id: thread.id,
                text: thread.comments[0]?.text ?? '',
            };
            if (thread.anchor.networkRequestId) {
                threadPayload.networkRequestId = thread.anchor.networkRequestId;
            }
            if (thread.anchor.node) {
                threadPayload.backendNodeId = thread.anchor.node.backendNodeId;
            }
            if (thread.anchor.editor) {
                threadPayload.editor = thread.anchor.editor;
            }
            return threadPayload;
        });
    }
    takeComments() {
        return this.getCommentThreads();
    }
    resolveCommentThread(threadId, replyText) {
        return this.#commentManager.resolveCommentThread(threadId, replyText);
    }
    async reveal(panelName, target) {
        if (panelName) {
            this.#inspectorFrontendHost.events.dispatchEventToListeners(Host.InspectorFrontendHostAPI.Events.ShowPanel, panelName);
        }
        if (target?.networkRequestId && this.#networkLog) {
            const [request] = this.#networkLog.requestsForId(target.networkRequestId);
            if (request) {
                await Common.Revealer.reveal(request);
            }
        }
        if (target?.backendNodeId !== undefined && this.#targetManager) {
            const primaryTarget = this.#targetManager.primaryPageTarget();
            const domModel = primaryTarget?.model(SDK.DOMModel.DOMModel);
            if (domModel) {
                const cdpNodeId = target.backendNodeId;
                const nodeMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([cdpNodeId]));
                const node = nodeMap?.get(cdpNodeId);
                if (node) {
                    await Common.Revealer.reveal(node);
                }
            }
        }
    }
}
//# sourceMappingURL=CD4ABridge.js.map