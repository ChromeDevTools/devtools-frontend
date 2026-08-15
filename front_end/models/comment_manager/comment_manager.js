var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/comment_manager/CommentManager.js
var CommentManager_exports = {};
__export(CommentManager_exports, {
  CommentManager: () => CommentManager
});
import * as Common from "./../../core/common/common.js";
var CommentManager = class extends Common.ObjectWrapper.ObjectWrapper {
  #commentThreads = /* @__PURE__ */ new Map();
  #commentMode = false;
  #nextId = 1;
  setCommentMode(active) {
    if (this.#commentMode === active) {
      return;
    }
    this.#commentMode = active;
    this.dispatchEventToListeners("CommentModeChanged", active);
  }
  isCommentMode() {
    return this.#commentMode;
  }
  createCommentThread(anchor, text, author = "DEVELOPER", changes) {
    const id = `comment-${this.#nextId++}`;
    const thread = {
      id,
      anchor,
      comments: [{
        author,
        text,
        timestamp: Date.now()
      }],
      status: "ACTIVE",
      changes
    };
    this.#commentThreads.set(id, thread);
    this.dispatchEventToListeners("CommentThreadsChanged", this.getCommentThreads());
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
    this.dispatchEventToListeners("CommentThreadsChanged", this.getCommentThreads());
  }
  clear() {
    this.setCommentMode(false);
    this.#commentThreads.clear();
    this.dispatchEventToListeners("CommentThreadsChanged", []);
  }
};
export {
  CommentManager_exports as CommentManager
};
//# sourceMappingURL=comment_manager.js.map
