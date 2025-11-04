var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/workspace_diff/WorkspaceDiff.js
var WorkspaceDiff_exports = {};
__export(WorkspaceDiff_exports, {
  UISourceCodeDiff: () => UISourceCodeDiff,
  WorkspaceDiffImpl: () => WorkspaceDiffImpl,
  workspaceDiff: () => workspaceDiff
});
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as Diff from "./../../third_party/diff/diff.js";
import * as FormatterModule from "./../formatter/formatter.js";
import * as Persistence from "./../persistence/persistence.js";
import * as TextUtils from "./../text_utils/text_utils.js";
import * as Workspace from "./../workspace/workspace.js";
var WorkspaceDiffImpl = class extends Common.ObjectWrapper.ObjectWrapper {
  #persistence = Persistence.Persistence.PersistenceImpl.instance();
  #diffs = /* @__PURE__ */ new WeakMap();
  /** used in web tests */
  loadingUISourceCodes = /* @__PURE__ */ new Map();
  #modified = /* @__PURE__ */ new Set();
  constructor(workspace) {
    super();
    workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyChanged, this.#uiSourceCodeChanged, this);
    workspace.addEventListener(Workspace.Workspace.Events.WorkingCopyCommitted, this.#uiSourceCodeChanged, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#projectRemoved, this);
    workspace.uiSourceCodes().forEach(this.#updateModifiedState.bind(this));
  }
  requestDiff(uiSourceCode) {
    return this.#uiSourceCodeDiff(uiSourceCode).requestDiff();
  }
  subscribeToDiffChange(uiSourceCode, callback, thisObj) {
    this.#uiSourceCodeDiff(uiSourceCode).addEventListener("DiffChanged", callback, thisObj);
  }
  unsubscribeFromDiffChange(uiSourceCode, callback, thisObj) {
    this.#uiSourceCodeDiff(uiSourceCode).removeEventListener("DiffChanged", callback, thisObj);
  }
  modifiedUISourceCodes() {
    return Array.from(this.#modified);
  }
  #uiSourceCodeDiff(uiSourceCode) {
    let diff = this.#diffs.get(uiSourceCode);
    if (!diff) {
      diff = new UISourceCodeDiff(uiSourceCode);
      this.#diffs.set(uiSourceCode, diff);
    }
    return diff;
  }
  #uiSourceCodeChanged(event) {
    const uiSourceCode = event.data.uiSourceCode;
    void this.#updateModifiedState(uiSourceCode);
  }
  #uiSourceCodeAdded(event) {
    const uiSourceCode = event.data;
    void this.#updateModifiedState(uiSourceCode);
  }
  #uiSourceCodeRemoved(event) {
    const uiSourceCode = event.data;
    this.#removeUISourceCode(uiSourceCode);
  }
  #projectRemoved(event) {
    const project = event.data;
    for (const uiSourceCode of project.uiSourceCodes()) {
      this.#removeUISourceCode(uiSourceCode);
    }
  }
  #removeUISourceCode(uiSourceCode) {
    this.loadingUISourceCodes.delete(uiSourceCode);
    const uiSourceCodeDiff = this.#diffs.get(uiSourceCode);
    if (uiSourceCodeDiff) {
      uiSourceCodeDiff.dispose = true;
    }
    this.#markAsUnmodified(uiSourceCode);
  }
  #markAsUnmodified(uiSourceCode) {
    this.uiSourceCodeProcessedForTest();
    if (this.#modified.delete(uiSourceCode)) {
      this.dispatchEventToListeners("ModifiedStatusChanged", { uiSourceCode, isModified: false });
    }
  }
  #markAsModified(uiSourceCode) {
    this.uiSourceCodeProcessedForTest();
    if (this.#modified.has(uiSourceCode)) {
      return;
    }
    this.#modified.add(uiSourceCode);
    this.dispatchEventToListeners("ModifiedStatusChanged", { uiSourceCode, isModified: true });
  }
  uiSourceCodeProcessedForTest() {
  }
  #shouldTrack(uiSourceCode) {
    switch (uiSourceCode.project().type()) {
      case Workspace.Workspace.projectTypes.Network:
        return this.#persistence.binding(uiSourceCode) === null;
      case Workspace.Workspace.projectTypes.FileSystem:
        return true;
      default:
        return false;
    }
  }
  async #updateModifiedState(uiSourceCode) {
    this.loadingUISourceCodes.delete(uiSourceCode);
    if (!this.#shouldTrack(uiSourceCode)) {
      this.#markAsUnmodified(uiSourceCode);
      return;
    }
    if (uiSourceCode.isDirty()) {
      this.#markAsModified(uiSourceCode);
      return;
    }
    if (!uiSourceCode.hasCommits()) {
      this.#markAsUnmodified(uiSourceCode);
      return;
    }
    const contentsPromise = Promise.all([
      this.requestOriginalContentForUISourceCode(uiSourceCode),
      uiSourceCode.requestContentData().then((contentDataOrError) => TextUtils.ContentData.ContentData.textOr(contentDataOrError, null))
    ]);
    this.loadingUISourceCodes.set(uiSourceCode, contentsPromise);
    const contents = await contentsPromise;
    if (this.loadingUISourceCodes.get(uiSourceCode) !== contentsPromise) {
      return;
    }
    this.loadingUISourceCodes.delete(uiSourceCode);
    if (contents[0] !== null && contents[1] !== null && contents[0] !== contents[1]) {
      this.#markAsModified(uiSourceCode);
    } else {
      this.#markAsUnmodified(uiSourceCode);
    }
  }
  requestOriginalContentForUISourceCode(uiSourceCode) {
    return this.#uiSourceCodeDiff(uiSourceCode).originalContent();
  }
  revertToOriginal(uiSourceCode) {
    function callback(content) {
      if (typeof content !== "string") {
        return;
      }
      uiSourceCode.addRevision(content);
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.RevisionApplied);
    return this.requestOriginalContentForUISourceCode(uiSourceCode).then(callback);
  }
};
var UISourceCodeDiff = class extends Common.ObjectWrapper.ObjectWrapper {
  #uiSourceCode;
  #requestDiffPromise = null;
  #pendingChanges = null;
  dispose = false;
  constructor(uiSourceCode) {
    super();
    this.#uiSourceCode = uiSourceCode;
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.#uiSourceCodeChanged, this);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.#uiSourceCodeChanged, this);
  }
  #uiSourceCodeChanged() {
    if (this.#pendingChanges) {
      clearTimeout(this.#pendingChanges);
      this.#pendingChanges = null;
    }
    this.#requestDiffPromise = null;
    const content = this.#uiSourceCode.content();
    const delay = !content || content.length < 65536 ? 0 : 200;
    this.#pendingChanges = window.setTimeout(emitDiffChanged.bind(this), delay);
    function emitDiffChanged() {
      if (this.dispose) {
        return;
      }
      this.dispatchEventToListeners(
        "DiffChanged"
        /* UISourceCodeDiffEvents.DIFF_CHANGED */
      );
      this.#pendingChanges = null;
    }
  }
  requestDiff() {
    if (!this.#requestDiffPromise) {
      this.#requestDiffPromise = this.#requestDiff();
    }
    return this.#requestDiffPromise;
  }
  async originalContent() {
    const originalNetworkContent = Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().originalContentForUISourceCode(this.#uiSourceCode);
    if (originalNetworkContent) {
      return await originalNetworkContent;
    }
    const content = await this.#uiSourceCode.project().requestFileContent(this.#uiSourceCode);
    if (TextUtils.ContentData.ContentData.isError(content)) {
      return content.error;
    }
    return content.asDeferedContent().content;
  }
  async #requestDiff() {
    if (this.dispose) {
      return null;
    }
    let baseline = await this.originalContent();
    if (baseline === null) {
      return null;
    }
    if (baseline.length > 1024 * 1024) {
      return null;
    }
    if (this.dispose) {
      return null;
    }
    let current = this.#uiSourceCode.workingCopy();
    if (!current && !this.#uiSourceCode.contentLoaded()) {
      const contentDataOrError = await this.#uiSourceCode.requestContentData();
      if (TextUtils.ContentData.ContentData.isError(contentDataOrError)) {
        return null;
      }
      current = contentDataOrError.text;
    }
    if (current.length > 1024 * 1024) {
      return null;
    }
    if (this.dispose) {
      return null;
    }
    baseline = (await FormatterModule.ScriptFormatter.format(this.#uiSourceCode.contentType(), this.#uiSourceCode.mimeType(), baseline)).formattedContent;
    const formatCurrentResult = await FormatterModule.ScriptFormatter.format(this.#uiSourceCode.contentType(), this.#uiSourceCode.mimeType(), current);
    current = formatCurrentResult.formattedContent;
    const formattedCurrentMapping = formatCurrentResult.formattedMapping;
    const reNewline = /\r\n?|\n/;
    const diff = Diff.Diff.DiffWrapper.lineDiff(baseline.split(reNewline), current.split(reNewline));
    return {
      diff,
      formattedCurrentMapping
    };
  }
};
var workspaceDiffImplInstance = null;
function workspaceDiff({ forceNew } = {}) {
  if (!workspaceDiffImplInstance || forceNew) {
    workspaceDiffImplInstance = new WorkspaceDiffImpl(Workspace.Workspace.WorkspaceImpl.instance());
  }
  return workspaceDiffImplInstance;
}
export {
  WorkspaceDiff_exports as WorkspaceDiff
};
//# sourceMappingURL=workspace_diff.js.map
