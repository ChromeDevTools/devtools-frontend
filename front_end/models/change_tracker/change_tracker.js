var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/change_tracker/ChangeTracker.ts
var ChangeTracker_exports = {};
__export(ChangeTracker_exports, {
  ChangeTracker: () => ChangeTracker,
  MAX_RECORDS: () => MAX_RECORDS
});
import * as Root from "../../core/root/root.js";
var MAX_RECORDS = 1e3;
var ChangeTracker = class {
  #records = /* @__PURE__ */ new Map();
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
      timestamp: Date.now()
    };
    while (this.#records.size >= this.#maxRecords) {
      this.#evictOldestRecord();
    }
    const thread = this.#commentManager.createCommentThread(anchor, void 0, void 0, [record]);
    this.#records.set(thread.id, record);
    this.#lastRecord = record;
    return record;
  }
  #evictOldestRecord() {
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
    this.#lastRecord = void 0;
  }
};
export {
  ChangeTracker_exports as ChangeTracker
};
//# sourceMappingURL=change_tracker.js.map
