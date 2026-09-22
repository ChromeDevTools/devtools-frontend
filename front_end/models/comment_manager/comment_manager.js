var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/comment_manager/CD4ABridge.ts
var CD4ABridge_exports = {};
__export(CD4ABridge_exports, {
  CD4ABridge: () => CD4ABridge,
  Events: () => Events3
});
import * as Common3 from "../../core/common/common.js";
import * as Host from "../../core/host/host.js";
import * as SDK from "../../core/sdk/sdk.js";

// ../../front_end/models/comment_manager/CommentManager.ts
var CommentManager_exports = {};
__export(CommentManager_exports, {
  CommentManager: () => CommentManager,
  CommentThread: () => CommentThread,
  Events: () => Events2
});
import * as Common2 from "../../core/common/common.js";

// ../../front_end/models/comment_manager/CommentThread.ts
var CommentThread_exports = {};
__export(CommentThread_exports, {
  CommentThread: () => CommentThread,
  Events: () => Events
});
import * as Common from "../../core/common/common.js";
var Events = /* @__PURE__ */ ((Events4) => {
  Events4["CHANGED"] = "Changed";
  return Events4;
})(Events || {});
var CommentThread = class _CommentThread extends Common.ObjectWrapper.ObjectWrapper {
  static #nextIndex = 1;
  static resetIndex() {
    _CommentThread.#nextIndex = 1;
  }
  id = crypto.randomUUID();
  anchor;
  #savedIndex;
  comments;
  status = "DRAFT";
  transmitted = false;
  changes;
  constructor(options) {
    super();
    this.anchor = options.anchor;
    this.comments = options.comments ?? [];
    this.changes = options.changes;
  }
  get index() {
    return this.#savedIndex ?? _CommentThread.#nextIndex;
  }
  save(text, author = "DEVELOPER") {
    let changed = false;
    if (text && text.trim().length > 0) {
      this.comments.push({
        author,
        text: text.trim(),
        timestamp: Date.now()
      });
      changed = true;
    }
    if (this.status === "DRAFT") {
      if (this.#savedIndex === void 0) {
        this.#savedIndex = _CommentThread.#nextIndex++;
      }
      this.status = "ACTIVE";
      changed = true;
    }
    if (changed) {
      this.dispatchEventToListeners("Changed" /* CHANGED */);
    }
  }
  resolve(replyText) {
    if (replyText && replyText.trim().length > 0) {
      this.comments.push({
        author: "AGENT",
        text: replyText.trim(),
        timestamp: Date.now()
      });
    }
    if (this.#savedIndex === void 0) {
      this.#savedIndex = _CommentThread.#nextIndex++;
    }
    this.status = "RESOLVED";
    this.dispatchEventToListeners("Changed" /* CHANGED */);
  }
};

// ../../front_end/models/comment_manager/CommentManager.ts
var Events2 = /* @__PURE__ */ ((Events4) => {
  Events4["COMMENT_THREADS_CHANGED"] = "CommentThreadsChanged";
  Events4["COMMENT_MODE_CHANGED"] = "CommentModeChanged";
  Events4["AGENT_ATTACHED_CHANGED"] = "AgentAttachedChanged";
  return Events4;
})(Events2 || {});
var CommentManager = class extends Common2.ObjectWrapper.ObjectWrapper {
  #commentThreads = /* @__PURE__ */ new Map();
  #commentMode = false;
  #agentAttached = false;
  constructor() {
    super();
    CommentThread.resetIndex();
  }
  #onThreadChanged() {
    this.dispatchEventToListeners("CommentThreadsChanged" /* COMMENT_THREADS_CHANGED */, this.getCommentThreads());
  }
  setAgentAttached(value) {
    if (this.#agentAttached === value) {
      return;
    }
    this.#agentAttached = value;
    if (!value) {
      this.setCommentMode(false);
    }
    this.dispatchEventToListeners("AgentAttachedChanged" /* AGENT_ATTACHED_CHANGED */, value);
  }
  isAgentAttached() {
    return this.#agentAttached;
  }
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
    const comments = text ? [{
      author,
      text,
      timestamp: Date.now()
    }] : [];
    const thread = new CommentThread({
      anchor,
      comments,
      changes
    });
    thread.addEventListener("Changed" /* CHANGED */, this.#onThreadChanged, this);
    this.#commentThreads.set(thread.id, thread);
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
      if (thread.status === "ACTIVE" && !thread.transmitted) {
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
    thread.removeEventListener("Changed" /* CHANGED */, this.#onThreadChanged, this);
    this.#commentThreads.delete(id);
    this.dispatchEventToListeners("CommentThreadsChanged" /* COMMENT_THREADS_CHANGED */, this.getCommentThreads());
  }
  clear() {
    this.setCommentMode(false);
    for (const thread of this.#commentThreads.values()) {
      thread.removeEventListener("Changed" /* CHANGED */, this.#onThreadChanged, this);
    }
    this.#commentThreads.clear();
    CommentThread.resetIndex();
    this.dispatchEventToListeners("CommentThreadsChanged" /* COMMENT_THREADS_CHANGED */, []);
  }
};

// ../../front_end/models/comment_manager/CD4ABridge.ts
var Events3 = /* @__PURE__ */ ((Events4) => {
  Events4["COMMENT_THREADS_CHANGED"] = "CommentThreadsChanged";
  return Events4;
})(Events3 || {});
var CD4ABridge = class extends Common3.ObjectWrapper.ObjectWrapper {
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
    Common3.EventTarget.removeEventListeners(this.#eventListeners);
  }
  #getDOMNode(nodeSignature) {
    if (!this.#targetManager) {
      return void 0;
    }
    const target = this.#targetManager.targetById(nodeSignature.targetId) ?? this.#targetManager.primaryPageTarget();
    const domModel = target?.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return void 0;
    }
    for (const node of domModel.idToDOMNode.values()) {
      if (node.backendNodeId() === nodeSignature.backendNodeId) {
        return node;
      }
    }
    return void 0;
  }
  #formatCommentText(thread) {
    const rawText = thread.comments[0]?.text ?? "";
    const details = [];
    if (thread.anchor.textSignature) {
      details.push(`- DevTools element: ${thread.anchor.textSignature}`);
    }
    if (thread.anchor.node) {
      const domNode = this.#getDOMNode(thread.anchor.node);
      const simpleSelector = domNode?.simpleSelector();
      if (simpleSelector) {
        details.push(`- DOM node selector: ${simpleSelector}`);
      }
    }
    if (thread.anchor.editor) {
      const editorInfo = thread.anchor.editor.filePath ? `${thread.anchor.editor.filePath}:${thread.anchor.editor.lineNumber}` : `line ${thread.anchor.editor.lineNumber}`;
      details.push(`- Editor: ${editorInfo}`);
    }
    if (details.length === 0) {
      return rawText;
    }
    return rawText ? `${rawText}

${details.join("\n")}` : details.join("\n");
  }
  getCommentThreads() {
    const threads = this.#commentManager.takeComments();
    return threads.map((thread) => {
      const threadPayload = {
        id: thread.id,
        text: this.#formatCommentText(thread)
      };
      if (thread.anchor.networkRequestId) {
        threadPayload.networkRequestId = thread.anchor.networkRequestId;
      }
      if (thread.anchor.node) {
        threadPayload.node = { ...thread.anchor.node };
      }
      return threadPayload;
    });
  }
  setAgentAttached(value) {
    this.#commentManager.setAgentAttached(value);
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
        await Common3.Revealer.reveal(request);
      }
    }
    if (target?.node && this.#targetManager) {
      const sdkTarget = this.#targetManager.targetById(target.node.targetId) ?? this.#targetManager.primaryPageTarget();
      const domModel = sdkTarget?.model(SDK.DOMModel.DOMModel);
      if (domModel) {
        const cdpNodeId = target.node.backendNodeId;
        const nodeMap = await domModel.pushNodesByBackendIdsToFrontend(/* @__PURE__ */ new Set([cdpNodeId]));
        const node = nodeMap?.get(cdpNodeId);
        if (node) {
          await Common3.Revealer.reveal(node);
        }
      }
    }
  }
};
export {
  CD4ABridge_exports as CD4ABridge,
  CommentManager_exports as CommentManager,
  CommentThread_exports as CommentThread
};
//# sourceMappingURL=comment_manager.js.map
