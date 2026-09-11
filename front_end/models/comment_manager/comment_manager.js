var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/comment_manager/CD4ABridge.ts
var CD4ABridge_exports = {};
__export(CD4ABridge_exports, {
  CD4ABridge: () => CD4ABridge,
  Events: () => Events2
});
import * as Common2 from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as SDK from "../../core/sdk/sdk.js";

// ../../front_end/models/comment_manager/CommentManager.ts
var CommentManager_exports = {};
__export(CommentManager_exports, {
  CommentManager: () => CommentManager,
  Events: () => Events
});
import * as Common from "../../core/common/common.js";
var Events = /* @__PURE__ */ ((Events3) => {
  Events3["COMMENT_THREADS_CHANGED"] = "CommentThreadsChanged";
  Events3["COMMENT_MODE_CHANGED"] = "CommentModeChanged";
  return Events3;
})(Events || {});
var CommentManager = class extends Common.ObjectWrapper.ObjectWrapper {
  #commentThreads = /* @__PURE__ */ new Map();
  #commentMode = false;
  #nextId = 1;
  setCommentMode(active) {
    if (this.#commentMode === active) {
      return;
    }
    this.#commentMode = active;
    this.dispatchEventToListeners("CommentModeChanged" /* COMMENT_MODE_CHANGED */, active);
  }
  isCommentMode() {
    return this.#commentMode;
  }
  createCommentThread(anchor, text, author = "DEVELOPER", changes) {
    const index = this.#nextId++;
    const id = `comment-${index}`;
    const comment = {
      author,
      text,
      timestamp: Date.now()
    };
    const thread = {
      id,
      anchor,
      comments: [comment],
      status: "ACTIVE",
      transmitted: false,
      changes,
      index
    };
    this.#commentThreads.set(id, thread);
    this.dispatchEventToListeners("CommentThreadsChanged" /* COMMENT_THREADS_CHANGED */, this.getCommentThreads());
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
        author: "AGENT",
        text: replyText.trim(),
        timestamp: Date.now()
      };
      thread.comments.push(comment);
    }
    thread.status = "RESOLVED";
    this.dispatchEventToListeners("CommentThreadsChanged" /* COMMENT_THREADS_CHANGED */, this.getCommentThreads());
    return true;
  }
  removeCommentThread(id) {
    if (!this.#commentThreads.has(id)) {
      return;
    }
    this.#commentThreads.delete(id);
    this.dispatchEventToListeners("CommentThreadsChanged" /* COMMENT_THREADS_CHANGED */, this.getCommentThreads());
  }
  clear() {
    this.setCommentMode(false);
    this.#commentThreads.clear();
    this.dispatchEventToListeners("CommentThreadsChanged" /* COMMENT_THREADS_CHANGED */, []);
  }
};

// ../../front_end/models/comment_manager/CD4ABridge.ts
var Events2 = /* @__PURE__ */ ((Events3) => {
  Events3["COMMENT_THREADS_CHANGED"] = "CommentThreadsChanged";
  return Events3;
})(Events2 || {});
var CD4ABridge = class extends Common2.ObjectWrapper.ObjectWrapper {
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
      this.#commentManager.addEventListener(
        "CommentThreadsChanged" /* COMMENT_THREADS_CHANGED */,
        () => {
          this.dispatchEventToListeners("CommentThreadsChanged" /* COMMENT_THREADS_CHANGED */);
        }
      )
    ];
  }
  dispose() {
    Common2.EventTarget.removeEventListeners(this.#eventListeners);
  }
  getCommentThreads() {
    const threads = this.#commentManager.takeComments();
    return threads.map((thread) => {
      const threadPayload = {
        id: thread.id,
        text: thread.comments[0]?.text ?? ""
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
      this.#inspectorFrontendHost.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.ShowPanel,
        panelName
      );
    }
    if (target?.networkRequestId && this.#networkLog) {
      const [request] = this.#networkLog.requestsForId(target.networkRequestId);
      if (request) {
        await Common2.Revealer.reveal(request);
      }
    }
    if (target?.backendNodeId !== void 0 && this.#targetManager) {
      const primaryTarget = this.#targetManager.primaryPageTarget();
      const domModel = primaryTarget?.model(SDK.DOMModel.DOMModel);
      if (domModel) {
        const cdpNodeId = target.backendNodeId;
        const nodeMap = await domModel.pushNodesByBackendIdsToFrontend(/* @__PURE__ */ new Set([cdpNodeId]));
        const node = nodeMap?.get(cdpNodeId);
        if (node) {
          await Common2.Revealer.reveal(node);
        }
      }
    }
  }
};
export {
  CD4ABridge_exports as CD4ABridge,
  CommentManager_exports as CommentManager
};
//# sourceMappingURL=comment_manager.js.map
