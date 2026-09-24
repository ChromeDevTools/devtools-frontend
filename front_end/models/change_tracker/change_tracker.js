var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/models/change_tracker/ChangeTracker.ts
var ChangeTracker_exports = {};
__export(ChangeTracker_exports, {
  ChangeTracker: () => ChangeTracker
});
import * as Root from "../../core/root/root.js";
var ChangeTracker = class {
  #commentManager;
  constructor(commentManager) {
    this.#commentManager = commentManager;
  }
  get isTracking() {
    return Boolean(Root.Runtime.hostConfig.devToolsComments?.enabled) && this.#commentManager.isAgentAttached();
  }
  trackChange(description, anchor) {
    if (!this.isTracking) {
      return;
    }
    const thread = this.#commentManager.createCommentThread(anchor, description, "DEVELOPER", true);
    thread.save();
  }
};
export {
  ChangeTracker_exports as ChangeTracker
};
//# sourceMappingURL=change_tracker.js.map
