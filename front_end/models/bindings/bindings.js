var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/bindings/CompilerScriptMapping.js
var CompilerScriptMapping_exports = {};
__export(CompilerScriptMapping_exports, {
  CompilerScriptMapping: () => CompilerScriptMapping
});
import * as Common3 from "./../../core/common/common.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as SDK3 from "./../../core/sdk/sdk.js";

// gen/front_end/models/stack_trace/stack_trace_impl.js
import * as Common from "./../../core/common/common.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as StackTrace from "./../stack_trace/stack_trace.js";
var __defProp2 = Object.defineProperty;
var __export2 = (target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
};
var StackTraceImpl_exports = {};
__export2(StackTraceImpl_exports, {
  AsyncFragmentImpl: () => AsyncFragmentImpl,
  FragmentImpl: () => FragmentImpl,
  FrameImpl: () => FrameImpl,
  StackTraceImpl: () => StackTraceImpl
});
var StackTraceImpl = class extends Common.ObjectWrapper.ObjectWrapper {
  syncFragment;
  asyncFragments;
  constructor(syncFragment, asyncFragments) {
    super();
    this.syncFragment = syncFragment;
    this.asyncFragments = asyncFragments;
    syncFragment.stackTraces.add(this);
    this.asyncFragments.forEach((asyncFragment) => asyncFragment.fragment.stackTraces.add(this));
  }
};
var FragmentImpl = class _FragmentImpl {
  node;
  stackTraces = /* @__PURE__ */ new Set();
  /**
   * Fragments are deduplicated based on the node.
   *
   * In turn, each fragment can be part of multiple stack traces.
   */
  static getOrCreate(node) {
    if (!node.fragment) {
      node.fragment = new _FragmentImpl(node);
    }
    return node.fragment;
  }
  constructor(node) {
    this.node = node;
  }
  get frames() {
    const frames = [];
    for (const node of this.node.getCallStack()) {
      frames.push(...node.frames);
    }
    return frames;
  }
};
var AsyncFragmentImpl = class {
  description;
  fragment;
  constructor(description, fragment) {
    this.description = description;
    this.fragment = fragment;
  }
  get frames() {
    return this.fragment.frames;
  }
};
var FrameImpl = class {
  url;
  uiSourceCode;
  name;
  line;
  column;
  missingDebugInfo;
  constructor(url, uiSourceCode, name, line, column, missingDebugInfo) {
    this.url = url;
    this.uiSourceCode = uiSourceCode;
    this.name = name;
    this.line = line;
    this.column = column;
    this.missingDebugInfo = missingDebugInfo;
  }
};
var StackTraceModel_exports = {};
__export2(StackTraceModel_exports, {
  StackTraceModel: () => StackTraceModel
});
var Trie_exports = {};
__export2(Trie_exports, {
  FrameNode: () => FrameNode,
  Trie: () => Trie,
  compareRawFrames: () => compareRawFrames,
  isBuiltinFrame: () => isBuiltinFrame
});
function isBuiltinFrame(rawFrame) {
  return rawFrame.lineNumber === -1 && rawFrame.columnNumber === -1 && !Boolean(rawFrame.scriptId) && !Boolean(rawFrame.url);
}
var FrameNode = class {
  parent;
  children = [];
  rawFrame;
  frames = [];
  fragment;
  constructor(rawFrame, parent) {
    this.rawFrame = rawFrame;
    this.parent = parent;
  }
  /**
   * Produces the ancestor chain. Including `this` but excluding the `RootFrameNode`.
   */
  *getCallStack() {
    for (let node = this; node.parent; node = node.parent) {
      yield node;
    }
  }
};
var Trie = class {
  #root = { parent: null, children: [] };
  /**
   * Most sources produce stack traces in "top-to-bottom" order, so that is what this method expects.
   *
   * @returns The {@link FrameNode} corresponding to the top-most stack frame.
   */
  insert(frames) {
    if (frames.length === 0) {
      throw new Error("Trie.insert called with an empty frames array.");
    }
    let currentNode = this.#root;
    for (let i = frames.length - 1; i >= 0; --i) {
      currentNode = this.#insert(currentNode, frames[i]);
    }
    return currentNode;
  }
  /**
   * Inserts `rawFrame` into the children of the provided node if not already there.
   *
   * @returns the child node corresponding to `rawFrame`.
   */
  #insert(node, rawFrame) {
    let i = 0;
    for (; i < node.children.length; ++i) {
      const maybeChild = node.children[i];
      const child = maybeChild instanceof WeakRef ? maybeChild.deref() : maybeChild;
      if (!child) {
        continue;
      }
      const compareResult = compareRawFrames(child.rawFrame, rawFrame);
      if (compareResult === 0) {
        return child;
      }
      if (compareResult > 0) {
        break;
      }
    }
    const newNode = new FrameNode(rawFrame, node);
    if (node.parent) {
      node.children.splice(i, 0, newNode);
    } else {
      node.children.splice(i, 0, new WeakRef(newNode));
    }
    return newNode;
  }
  /**
   * Traverses the trie in pre-order.
   *
   * @param node Start at `node` or `null` to start with the children of the root.
   * @param visit Called on each node in the trie. Return `true` if the visitor should descend into child nodes of the provided node.
   */
  walk(node, visit) {
    const stack = node ? [node] : [...this.#root.children].map((ref) => ref.deref()).filter((node2) => Boolean(node2));
    for (let node2 = stack.pop(); node2; node2 = stack.pop()) {
      const visitChildren = visit(node2);
      if (visitChildren) {
        for (let i = node2.children.length - 1; i >= 0; --i) {
          stack.push(node2.children[i]);
        }
      }
    }
  }
};
function compareRawFrames(a, b) {
  const scriptIdCompare = (a.scriptId ?? "").localeCompare(b.scriptId ?? "");
  if (scriptIdCompare !== 0) {
    return scriptIdCompare;
  }
  const urlCompare = (a.url ?? "").localeCompare(b.url ?? "");
  if (urlCompare !== 0) {
    return urlCompare;
  }
  const nameCompare = (a.functionName ?? "").localeCompare(b.functionName ?? "");
  if (nameCompare !== 0) {
    return nameCompare;
  }
  if (a.lineNumber !== b.lineNumber) {
    return a.lineNumber - b.lineNumber;
  }
  return a.columnNumber - b.columnNumber;
}
var StackTraceModel = class _StackTraceModel extends SDK.SDKModel.SDKModel {
  #trie = new Trie();
  /** @returns the {@link StackTraceModel} for the target, or the model for the primaryPageTarget when passing null/undefined */
  static #modelForTarget(target) {
    const model = (target ?? SDK.TargetManager.TargetManager.instance().primaryPageTarget())?.model(_StackTraceModel);
    if (!model) {
      throw new Error("Unable to find StackTraceModel");
    }
    return model;
  }
  async createFromProtocolRuntime(stackTrace, rawFramesToUIFrames) {
    const translatePromises = [];
    const fragment = this.#createFragment(stackTrace.callFrames);
    translatePromises.push(this.#translateFragment(fragment, rawFramesToUIFrames));
    const asyncFragments = [];
    const debuggerModel = this.target().model(SDK.DebuggerModel.DebuggerModel);
    if (debuggerModel) {
      for await (const { stackTrace: asyncStackTrace, target } of debuggerModel.iterateAsyncParents(stackTrace)) {
        const model = _StackTraceModel.#modelForTarget(target);
        const asyncFragment = model.#createFragment(asyncStackTrace.callFrames);
        translatePromises.push(model.#translateFragment(asyncFragment, rawFramesToUIFrames));
        asyncFragments.push(new AsyncFragmentImpl(asyncStackTrace.description ?? "", asyncFragment));
      }
    }
    await Promise.all(translatePromises);
    return new StackTraceImpl(fragment, asyncFragments);
  }
  /** Trigger re-translation of all fragments with the provide script in their call stack */
  async scriptInfoChanged(script, translateRawFrames) {
    const translatePromises = [];
    let stackTracesToUpdate = /* @__PURE__ */ new Set();
    for (const fragment of this.#affectedFragments(script)) {
      if (fragment.node.children.length === 0) {
        translatePromises.push(this.#translateFragment(fragment, translateRawFrames));
      }
      stackTracesToUpdate = stackTracesToUpdate.union(fragment.stackTraces);
    }
    await Promise.all(translatePromises);
    for (const stackTrace of stackTracesToUpdate) {
      stackTrace.dispatchEventToListeners(
        "UPDATED"
        /* StackTrace.StackTrace.Events.UPDATED */
      );
    }
  }
  #createFragment(frames) {
    return FragmentImpl.getOrCreate(this.#trie.insert(frames));
  }
  async #translateFragment(fragment, rawFramesToUIFrames) {
    const rawFrames = fragment.node.getCallStack().map((node) => node.rawFrame).toArray();
    const uiFrames = await rawFramesToUIFrames(rawFrames, this.target());
    console.assert(rawFrames.length === uiFrames.length, "Broken rawFramesToUIFrames implementation");
    let i = 0;
    for (const node of fragment.node.getCallStack()) {
      node.frames = uiFrames[i++].map((frame) => new FrameImpl(frame.url, frame.uiSourceCode, frame.name, frame.line, frame.column, frame.missingDebugInfo));
    }
  }
  #affectedFragments(script) {
    const affectedBranches = /* @__PURE__ */ new Set();
    this.#trie.walk(null, (node) => {
      if (node.rawFrame.scriptId === script.scriptId || !node.rawFrame.scriptId && node.rawFrame.url === script.sourceURL) {
        affectedBranches.add(node);
        return false;
      }
      return true;
    });
    const fragments = /* @__PURE__ */ new Set();
    for (const branch of affectedBranches) {
      this.#trie.walk(branch, (node) => {
        if (node.fragment) {
          fragments.add(node.fragment);
        }
        return true;
      });
    }
    return fragments;
  }
};
SDK.SDKModel.SDKModel.register(StackTraceModel, { capabilities: 0, autostart: false });

// gen/front_end/models/bindings/CompilerScriptMapping.js
import * as TextUtils2 from "./../text_utils/text_utils.js";
import * as Workspace3 from "./../workspace/workspace.js";

// gen/front_end/models/bindings/ContentProviderBasedProject.js
var ContentProviderBasedProject_exports = {};
__export(ContentProviderBasedProject_exports, {
  ContentProviderBasedProject: () => ContentProviderBasedProject
});
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as TextUtils from "./../text_utils/text_utils.js";
import * as Workspace from "./../workspace/workspace.js";
var UIStrings = {
  /**
   * @description Error message that is displayed in the Sources panel when can't be loaded.
   */
  unknownErrorLoadingFile: "Unknown error loading file"
};
var str_ = i18n.i18n.registerUIStrings("models/bindings/ContentProviderBasedProject.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var ContentProviderBasedProject = class extends Workspace.Workspace.ProjectStore {
  #isServiceProject;
  #uiSourceCodeToData = /* @__PURE__ */ new WeakMap();
  constructor(workspace, id, type, displayName, isServiceProject) {
    super(workspace, id, type, displayName);
    this.#isServiceProject = isServiceProject;
    workspace.addProject(this);
  }
  async requestFileContent(uiSourceCode) {
    const { contentProvider } = this.#uiSourceCodeToData.get(uiSourceCode);
    try {
      return await contentProvider.requestContentData();
    } catch (err) {
      return {
        error: err ? String(err) : i18nString(UIStrings.unknownErrorLoadingFile)
      };
    }
  }
  isServiceProject() {
    return this.#isServiceProject;
  }
  async requestMetadata(uiSourceCode) {
    const { metadata } = this.#uiSourceCodeToData.get(uiSourceCode);
    return metadata;
  }
  canSetFileContent() {
    return false;
  }
  async setFileContent(_uiSourceCode, _newContent, _isBase64) {
  }
  fullDisplayName(uiSourceCode) {
    let parentPath = uiSourceCode.parentURL().replace(/^(?:https?|file)\:\/\//, "");
    try {
      parentPath = decodeURI(parentPath);
    } catch {
    }
    return parentPath + "/" + uiSourceCode.displayName(true);
  }
  mimeType(uiSourceCode) {
    const { mimeType } = this.#uiSourceCodeToData.get(uiSourceCode);
    return mimeType;
  }
  canRename() {
    return false;
  }
  rename(_uiSourceCode, _newName, callback) {
    callback(false);
  }
  excludeFolder(_path) {
  }
  canExcludeFolder(_path) {
    return false;
  }
  async createFile(_path, _name, _content, _isBase64) {
    return null;
  }
  canCreateFile() {
    return false;
  }
  deleteFile(_uiSourceCode) {
  }
  remove() {
  }
  searchInFileContent(uiSourceCode, query, caseSensitive, isRegex) {
    const { contentProvider } = this.#uiSourceCodeToData.get(uiSourceCode);
    return contentProvider.searchInContent(query, caseSensitive, isRegex);
  }
  async findFilesMatchingSearchRequest(searchConfig, filesMatchingFileQuery, progress) {
    const result = /* @__PURE__ */ new Map();
    progress.totalWork = filesMatchingFileQuery.length;
    await Promise.all(filesMatchingFileQuery.map(searchInContent.bind(this)));
    progress.done = true;
    return result;
    async function searchInContent(uiSourceCode) {
      let allMatchesFound = true;
      let matches = [];
      for (const query of searchConfig.queries().slice()) {
        const searchMatches = await this.searchInFileContent(uiSourceCode, query, !searchConfig.ignoreCase(), searchConfig.isRegex());
        if (!searchMatches.length) {
          allMatchesFound = false;
          break;
        }
        matches = Platform.ArrayUtilities.mergeOrdered(matches, searchMatches, TextUtils.ContentProvider.SearchMatch.comparator);
      }
      if (allMatchesFound) {
        result.set(uiSourceCode, matches);
      }
      ++progress.worked;
    }
  }
  indexContent(progress) {
    queueMicrotask(() => {
      progress.done = true;
    });
  }
  addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType) {
    this.#uiSourceCodeToData.set(uiSourceCode, { mimeType, metadata, contentProvider });
    this.addUISourceCode(uiSourceCode);
  }
  addContentProvider(url, contentProvider, mimeType) {
    const uiSourceCode = this.createUISourceCode(url, contentProvider.contentType());
    this.addUISourceCodeWithProvider(uiSourceCode, contentProvider, null, mimeType);
    return uiSourceCode;
  }
  reset() {
    this.removeProject();
    this.workspace().addProject(this);
  }
  dispose() {
    this.removeProject();
  }
};

// gen/front_end/models/bindings/NetworkProject.js
var NetworkProject_exports = {};
__export(NetworkProject_exports, {
  NetworkProject: () => NetworkProject,
  NetworkProjectManager: () => NetworkProjectManager
});
import * as Common2 from "./../../core/common/common.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
var uiSourceCodeToAttributionMap = /* @__PURE__ */ new WeakMap();
var projectToTargetMap = /* @__PURE__ */ new WeakMap();
var networkProjectManagerInstance;
var NetworkProjectManager = class _NetworkProjectManager extends Common2.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
  }
  static instance({ forceNew } = { forceNew: false }) {
    if (!networkProjectManagerInstance || forceNew) {
      networkProjectManagerInstance = new _NetworkProjectManager();
    }
    return networkProjectManagerInstance;
  }
};
var NetworkProject = class _NetworkProject {
  static resolveFrame(uiSourceCode, frameId) {
    const target = _NetworkProject.targetForUISourceCode(uiSourceCode);
    const resourceTreeModel = target?.model(SDK2.ResourceTreeModel.ResourceTreeModel);
    return resourceTreeModel ? resourceTreeModel.frameForId(frameId) : null;
  }
  static setInitialFrameAttribution(uiSourceCode, frameId) {
    if (!frameId) {
      return;
    }
    const frame = _NetworkProject.resolveFrame(uiSourceCode, frameId);
    if (!frame) {
      return;
    }
    const attribution = /* @__PURE__ */ new Map();
    attribution.set(frameId, { frame, count: 1 });
    uiSourceCodeToAttributionMap.set(uiSourceCode, attribution);
  }
  static cloneInitialFrameAttribution(fromUISourceCode, toUISourceCode) {
    const fromAttribution = uiSourceCodeToAttributionMap.get(fromUISourceCode);
    if (!fromAttribution) {
      return;
    }
    const toAttribution = /* @__PURE__ */ new Map();
    for (const frameId of fromAttribution.keys()) {
      const value = fromAttribution.get(frameId);
      if (typeof value !== "undefined") {
        toAttribution.set(frameId, { frame: value.frame, count: value.count });
      }
    }
    uiSourceCodeToAttributionMap.set(toUISourceCode, toAttribution);
  }
  static addFrameAttribution(uiSourceCode, frameId) {
    const frame = _NetworkProject.resolveFrame(uiSourceCode, frameId);
    if (!frame) {
      return;
    }
    const frameAttribution = uiSourceCodeToAttributionMap.get(uiSourceCode);
    if (!frameAttribution) {
      return;
    }
    const attributionInfo = frameAttribution.get(frameId) || { frame, count: 0 };
    attributionInfo.count += 1;
    frameAttribution.set(frameId, attributionInfo);
    if (attributionInfo.count !== 1) {
      return;
    }
    const data = { uiSourceCode, frame };
    NetworkProjectManager.instance().dispatchEventToListeners("FrameAttributionAdded", data);
  }
  static removeFrameAttribution(uiSourceCode, frameId) {
    const frameAttribution = uiSourceCodeToAttributionMap.get(uiSourceCode);
    if (!frameAttribution) {
      return;
    }
    const attributionInfo = frameAttribution.get(frameId);
    console.assert(Boolean(attributionInfo), "Failed to remove frame attribution for url: " + uiSourceCode.url());
    if (!attributionInfo) {
      return;
    }
    attributionInfo.count -= 1;
    if (attributionInfo.count > 0) {
      return;
    }
    frameAttribution.delete(frameId);
    const data = { uiSourceCode, frame: attributionInfo.frame };
    NetworkProjectManager.instance().dispatchEventToListeners("FrameAttributionRemoved", data);
  }
  static targetForUISourceCode(uiSourceCode) {
    return projectToTargetMap.get(uiSourceCode.project()) || null;
  }
  static setTargetForProject(project, target) {
    projectToTargetMap.set(project, target);
  }
  static getTargetForProject(project) {
    return projectToTargetMap.get(project) || null;
  }
  static framesForUISourceCode(uiSourceCode) {
    const target = _NetworkProject.targetForUISourceCode(uiSourceCode);
    const resourceTreeModel = target?.model(SDK2.ResourceTreeModel.ResourceTreeModel);
    const attribution = uiSourceCodeToAttributionMap.get(uiSourceCode);
    if (!resourceTreeModel || !attribution) {
      return [];
    }
    const frames = Array.from(attribution.keys()).map((frameId) => resourceTreeModel.frameForId(frameId));
    return frames.filter((frame) => !!frame);
  }
};

// gen/front_end/models/bindings/CompilerScriptMapping.js
var CompilerScriptMapping = class {
  #sourceMapManager;
  #debuggerWorkspaceBinding;
  #stubUISourceCodes = /* @__PURE__ */ new Map();
  #stubProject;
  #eventListeners;
  #projects = /* @__PURE__ */ new Map();
  #sourceMapToProject = /* @__PURE__ */ new Map();
  #uiSourceCodeToSourceMaps = new Platform2.MapUtilities.Multimap();
  #debuggerModel;
  #ignoreListManager;
  constructor(debuggerModel, workspace, debuggerWorkspaceBinding) {
    this.#sourceMapManager = debuggerModel.sourceMapManager();
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#debuggerModel = debuggerModel;
    this.#ignoreListManager = debuggerWorkspaceBinding.ignoreListManager;
    this.#stubProject = new ContentProviderBasedProject(
      workspace,
      "jsSourceMaps:stub:" + debuggerModel.target().id(),
      Workspace3.Workspace.projectTypes.Service,
      "",
      true
      /* isServiceProject */
    );
    this.#eventListeners = [
      this.#sourceMapManager.addEventListener(SDK3.SourceMapManager.Events.SourceMapWillAttach, this.sourceMapWillAttach, this),
      this.#sourceMapManager.addEventListener(SDK3.SourceMapManager.Events.SourceMapFailedToAttach, this.sourceMapFailedToAttach, this),
      this.#sourceMapManager.addEventListener(SDK3.SourceMapManager.Events.SourceMapAttached, this.sourceMapAttached, this),
      this.#sourceMapManager.addEventListener(SDK3.SourceMapManager.Events.SourceMapDetached, this.sourceMapDetached, this)
    ];
  }
  setFunctionRanges(uiSourceCode, ranges) {
    for (const sourceMap of this.#uiSourceCodeToSourceMaps.get(uiSourceCode)) {
      sourceMap.augmentWithScopes(uiSourceCode.url(), ranges);
    }
  }
  addStubUISourceCode(script) {
    const stubUISourceCode = this.#stubProject.addContentProvider(Common3.ParsedURL.ParsedURL.concatenate(script.sourceURL, ":sourcemap"), TextUtils2.StaticContentProvider.StaticContentProvider.fromString(script.sourceURL, Common3.ResourceType.resourceTypes.Script, "\n\n\n\n\n// Please wait a bit.\n// Compiled script is not shown while source map is being loaded!"), "text/javascript");
    this.#stubUISourceCodes.set(script, stubUISourceCode);
  }
  removeStubUISourceCode(script) {
    const uiSourceCode = this.#stubUISourceCodes.get(script);
    this.#stubUISourceCodes.delete(script);
    if (uiSourceCode) {
      this.#stubProject.removeUISourceCode(uiSourceCode.url());
    }
  }
  getLocationRangesForSameSourceLocation(rawLocation) {
    const debuggerModel = rawLocation.debuggerModel;
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const sourceMap = this.#sourceMapManager.sourceMapForClient(script);
    if (!sourceMap) {
      return [];
    }
    const { lineNumber, columnNumber } = script.rawLocationToRelativeLocation(rawLocation);
    const entry = sourceMap.findEntry(lineNumber, columnNumber);
    if (!entry?.sourceURL) {
      return [];
    }
    const project = this.#sourceMapToProject.get(sourceMap);
    if (!project) {
      return [];
    }
    const uiSourceCode = project.uiSourceCodeForURL(entry.sourceURL);
    if (!uiSourceCode) {
      return [];
    }
    if (!this.#uiSourceCodeToSourceMaps.hasValue(uiSourceCode, sourceMap)) {
      return [];
    }
    const ranges = sourceMap.findReverseRanges(entry.sourceURL, entry.sourceLineNumber, entry.sourceColumnNumber);
    return ranges.map(({ startLine, startColumn, endLine, endColumn }) => {
      const start = script.relativeLocationToRawLocation({ lineNumber: startLine, columnNumber: startColumn });
      const end = script.relativeLocationToRawLocation({ lineNumber: endLine, columnNumber: endColumn });
      return {
        start: debuggerModel.createRawLocation(script, start.lineNumber, start.columnNumber),
        end: debuggerModel.createRawLocation(script, end.lineNumber, end.columnNumber)
      };
    });
  }
  uiSourceCodeForURL(url, isContentScript) {
    const projectType = isContentScript ? Workspace3.Workspace.projectTypes.ContentScripts : Workspace3.Workspace.projectTypes.Network;
    for (const project of this.#projects.values()) {
      if (project.type() !== projectType) {
        continue;
      }
      const uiSourceCode = project.uiSourceCodeForURL(url);
      if (uiSourceCode) {
        return uiSourceCode;
      }
    }
    return null;
  }
  /**
   * Resolves the source-mapped entity mapped from the given `rawLocation` if any. If the `rawLocation`
   * does not point into a script with a source map, `null` is returned from here, while if the source
   * map for the script is currently being loaded, a stub `UISourceCode` is returned meanwhile. Otherwise,
   * if the script has a source map entry for the position identified by the `rawLocation`, this method
   * will compute the location in the source-mapped file by a reverse lookup on the source map.
   *
   * If `rawLocation` points to a script with a source map managed by this `CompilerScriptMapping`, which
   * is stale (because it was overridden by a more recent mapping), `null` will be returned.
   *
   * @param rawLocation script location.
   * @returns the {@link Workspace.UISourceCode.UILocation} for the `rawLocation` if any.
   */
  rawLocationToUILocation(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const { lineNumber, columnNumber } = script.rawLocationToRelativeLocation(rawLocation);
    const stubUISourceCode = this.#stubUISourceCodes.get(script);
    if (stubUISourceCode) {
      return new Workspace3.UISourceCode.UILocation(stubUISourceCode, lineNumber, columnNumber);
    }
    const sourceMap = this.#sourceMapManager.sourceMapForClient(script);
    if (!sourceMap) {
      return null;
    }
    const project = this.#sourceMapToProject.get(sourceMap);
    if (!project) {
      return null;
    }
    const entry = sourceMap.findEntry(lineNumber, columnNumber, rawLocation.inlineFrameIndex);
    if (!entry?.sourceURL) {
      return null;
    }
    const uiSourceCode = project.uiSourceCodeForURL(entry.sourceURL);
    if (!uiSourceCode) {
      return null;
    }
    if (!this.#uiSourceCodeToSourceMaps.hasValue(uiSourceCode, sourceMap)) {
      return null;
    }
    return uiSourceCode.uiLocation(entry.sourceLineNumber, entry.sourceColumnNumber);
  }
  /**
   * Resolves a location within a source mapped entity managed by the `CompilerScriptMapping`
   * to its script locations. If the `uiSourceCode` does not belong to this mapping or if its
   * mapping is stale, an empty list will be returned.
   *
   * A single UI location can map to multiple different {@link SDK.DebuggerModel.RawLocation}s,
   * and these raw locations don't even need to belong to the same script (e.g. multiple bundles
   * can reference the same shared source file in case of code splitting, and locations within
   * this shared source file will then resolve to locations in all the bundles).
   *
   * @param uiSourceCode the source mapped entity.
   * @param lineNumber the line number in terms of the {@link uiSourceCode}.
   * @param columnNumber the column number in terms of the {@link uiSourceCode}.
   * @returns a list of raw locations that correspond to the UI location.
   */
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const locations = [];
    for (const sourceMap of this.#uiSourceCodeToSourceMaps.get(uiSourceCode)) {
      const entry = sourceMap.sourceLineMapping(uiSourceCode.url(), lineNumber, columnNumber);
      if (!entry) {
        continue;
      }
      const script = this.#sourceMapManager.clientForSourceMap(sourceMap);
      if (!script) {
        continue;
      }
      const location = script.relativeLocationToRawLocation(entry);
      locations.push(script.debuggerModel.createRawLocation(script, location.lineNumber, location.columnNumber));
    }
    return locations;
  }
  uiLocationRangeToRawLocationRanges(uiSourceCode, textRange) {
    if (!this.#uiSourceCodeToSourceMaps.has(uiSourceCode)) {
      return null;
    }
    const ranges = [];
    for (const sourceMap of this.#uiSourceCodeToSourceMaps.get(uiSourceCode)) {
      const script = this.#sourceMapManager.clientForSourceMap(sourceMap);
      if (!script) {
        continue;
      }
      for (const scriptTextRange of sourceMap.reverseMapTextRanges(uiSourceCode.url(), textRange)) {
        const startLocation = script.relativeLocationToRawLocation(scriptTextRange.start);
        const endLocation = script.relativeLocationToRawLocation(scriptTextRange.end);
        const start = script.debuggerModel.createRawLocation(script, startLocation.lineNumber, startLocation.columnNumber);
        const end = script.debuggerModel.createRawLocation(script, endLocation.lineNumber, endLocation.columnNumber);
        ranges.push({ start, end });
      }
    }
    return ranges;
  }
  translateRawFramesStep(rawFrames, translatedFrames) {
    const frame = rawFrames[0];
    if (Trie_exports.isBuiltinFrame(frame)) {
      return false;
    }
    const sourceMapWithScopeInfoForFrame = (rawFrame) => {
      const script2 = this.#debuggerModel.scriptForId(rawFrame.scriptId ?? "");
      if (!script2 || this.#stubUISourceCodes.has(script2)) {
        return null;
      }
      const sourceMap2 = script2.sourceMap();
      return sourceMap2?.hasScopeInfo() ? { sourceMap: sourceMap2, script: script2 } : null;
    };
    const sourceMapAndScript = sourceMapWithScopeInfoForFrame(frame);
    if (!sourceMapAndScript) {
      return false;
    }
    const { sourceMap, script } = sourceMapAndScript;
    const { lineNumber, columnNumber } = script.relativeLocationToRawLocation(frame);
    if (!sourceMap.isOutlinedFrame(lineNumber, columnNumber)) {
      const frames = sourceMap.translateCallSite(lineNumber, columnNumber);
      if (!frames.length) {
        return false;
      }
      rawFrames.shift();
      const result = [];
      translatedFrames.push(result);
      const project = this.#sourceMapToProject.get(sourceMap);
      for (const frame2 of frames) {
        const uiSourceCode = frame2.url ? project?.uiSourceCodeForURL(frame2.url) : void 0;
        result.push({
          ...frame2,
          url: uiSourceCode ? void 0 : frame2.url,
          uiSourceCode: uiSourceCode ?? void 0
        });
      }
      return true;
    }
    return false;
  }
  /**
   * Computes the set of line numbers which are source-mapped to a script within the
   * given {@link uiSourceCode}.
   *
   * @param uiSourceCode the source mapped entity.
   * @returns a set of source-mapped line numbers or `null` if the {@link uiSourceCode}
   *         is not provided by this {@link CompilerScriptMapping} instance.
   */
  getMappedLines(uiSourceCode) {
    if (!this.#uiSourceCodeToSourceMaps.has(uiSourceCode)) {
      return null;
    }
    const mappedLines = /* @__PURE__ */ new Set();
    for (const sourceMap of this.#uiSourceCodeToSourceMaps.get(uiSourceCode)) {
      for (const entry of sourceMap.mappings()) {
        if (entry.sourceURL !== uiSourceCode.url()) {
          continue;
        }
        mappedLines.add(entry.sourceLineNumber);
      }
    }
    return mappedLines;
  }
  /**
   * Invoked by the {@link SDK.SourceMapManager.SourceMapManager} whenever it starts loading the
   * source map for a given {@link SDK.Script.Script}. The `CompilerScriptMapping` will set up a
   * {@link Workspace.UISourceCode.UISourceCode} stub for the time that the source map is being
   * loaded to avoid showing the generated code when the DevTools front-end is stopped early (for
   * example on a breakpoint).
   *
   * @param event holds the {@link SDK.Script.Script} whose source map is being loaded.
   */
  sourceMapWillAttach(event) {
    const { client: script } = event.data;
    this.addStubUISourceCode(script);
    void this.#debuggerWorkspaceBinding.updateLocations(script);
    if (this.#ignoreListManager.isUserIgnoreListedURL(script.sourceURL, { isContentScript: script.isContentScript() })) {
      this.#sourceMapManager.cancelAttachSourceMap(script);
    }
  }
  /**
   * Invoked by the {@link SDK.SourceMapManager.SourceMapManager} after an attempt to load the
   * source map for a given {@link SDK.Script.Script} failed. The `CompilerScriptMapping` will
   * remove the {@link Workspace.UISourceCode.UISourceCode} stub, and from this time on won't
   * report any mappings for the `client` script.
   *
   * @param event holds the {@link SDK.Script.Script} whose source map failed to load.
   */
  sourceMapFailedToAttach(event) {
    const { client: script } = event.data;
    this.removeStubUISourceCode(script);
    void this.#debuggerWorkspaceBinding.updateLocations(script);
  }
  /**
   * Invoked by the {@link SDK.SourceMapManager.SourceMapManager} after an attempt to load the
   * source map for a given {@link SDK.Script.Script} succeeded. The `CompilerScriptMapping` will
   * now create {@link Workspace.UISourceCode.UISourceCode}s for all the sources mentioned in the
   * `sourceMap`.
   *
   * In case of a conflict this method creates a new {@link Workspace.UISourceCode.UISourceCode}
   * and copies over all the mappings from the other source maps that were registered for the
   * same URL and which are compatible (agree on the content and ignore-list hint for the given
   * URL). If they are considered incompatible, the original `UISourceCode` will simply be
   * removed and a new mapping will be established.
   *
   * @param event holds the {@link SDK.Script.Script} and its {@link SDK.SourceMap.SourceMap}.
   */
  sourceMapAttached(event) {
    const { client: script, sourceMap } = event.data;
    const scripts = /* @__PURE__ */ new Set([script]);
    this.removeStubUISourceCode(script);
    const target = script.target();
    const projectId = `jsSourceMaps:${script.isContentScript() ? "extensions" : ""}:${target.id()}`;
    let project = this.#projects.get(projectId);
    if (!project) {
      const projectType = script.isContentScript() ? Workspace3.Workspace.projectTypes.ContentScripts : Workspace3.Workspace.projectTypes.Network;
      project = new ContentProviderBasedProject(
        this.#stubProject.workspace(),
        projectId,
        projectType,
        /* displayName */
        "",
        /* isServiceProject */
        false
      );
      NetworkProject.setTargetForProject(project, target);
      this.#projects.set(projectId, project);
    }
    this.#sourceMapToProject.set(sourceMap, project);
    for (const url of sourceMap.sourceURLs()) {
      const contentType = Common3.ResourceType.resourceTypes.SourceMapScript;
      const uiSourceCode = project.createUISourceCode(url, contentType);
      if (sourceMap.hasIgnoreListHint(url)) {
        uiSourceCode.markKnownThirdParty();
      }
      const content = sourceMap.embeddedContentByURL(url);
      const contentProvider = content !== null ? TextUtils2.StaticContentProvider.StaticContentProvider.fromString(url, contentType, content) : new SDK3.CompilerSourceMappingContentProvider.CompilerSourceMappingContentProvider(url, contentType, script.createPageResourceLoadInitiator());
      let metadata = null;
      if (content !== null) {
        const encoder = new TextEncoder();
        metadata = new Workspace3.UISourceCode.UISourceCodeMetadata(null, encoder.encode(content).length);
      }
      const mimeType = Common3.ResourceType.ResourceType.mimeFromURL(url) ?? contentType.canonicalMimeType();
      this.#uiSourceCodeToSourceMaps.set(uiSourceCode, sourceMap);
      NetworkProject.setInitialFrameAttribution(uiSourceCode, script.frameId);
      const otherUISourceCode = project.uiSourceCodeForURL(url);
      if (otherUISourceCode !== null) {
        for (const otherSourceMap of this.#uiSourceCodeToSourceMaps.get(otherUISourceCode)) {
          this.#uiSourceCodeToSourceMaps.delete(otherUISourceCode, otherSourceMap);
          const otherScript = this.#sourceMapManager.clientForSourceMap(otherSourceMap);
          if (!otherScript) {
            continue;
          }
          NetworkProject.removeFrameAttribution(otherUISourceCode, otherScript.frameId);
          if (sourceMap.compatibleForURL(url, otherSourceMap)) {
            this.#uiSourceCodeToSourceMaps.set(uiSourceCode, otherSourceMap);
            NetworkProject.addFrameAttribution(uiSourceCode, otherScript.frameId);
          }
          scripts.add(otherScript);
        }
        project.removeUISourceCode(url);
      }
      project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType);
    }
    void Promise.all([...scripts].map((script2) => this.#debuggerWorkspaceBinding.updateLocations(script2))).then(() => this.sourceMapAttachedForTest(sourceMap));
  }
  /**
   * Invoked by the {@link SDK.SourceMapManager.SourceMapManager} when the source map for a given
   * {@link SDK.Script.Script} is removed, which could be either because the target is execution
   * context was destroyed, or the user manually asked to replace the source map for a given
   * script.
   *
   * @param event holds the {@link SDK.Script.Script} and {@link SDK.SourceMap.SourceMap} that
   *              should be detached.
   */
  sourceMapDetached(event) {
    const { client: script, sourceMap } = event.data;
    const project = this.#sourceMapToProject.get(sourceMap);
    if (!project) {
      return;
    }
    for (const uiSourceCode of project.uiSourceCodes()) {
      if (this.#uiSourceCodeToSourceMaps.delete(uiSourceCode, sourceMap)) {
        NetworkProject.removeFrameAttribution(uiSourceCode, script.frameId);
        if (!this.#uiSourceCodeToSourceMaps.has(uiSourceCode)) {
          project.removeUISourceCode(uiSourceCode.url());
        }
      }
    }
    this.#sourceMapToProject.delete(sourceMap);
    void this.#debuggerWorkspaceBinding.updateLocations(script);
  }
  scriptsForUISourceCode(uiSourceCode) {
    const scripts = [];
    for (const sourceMap of this.#uiSourceCodeToSourceMaps.get(uiSourceCode)) {
      const script = this.#sourceMapManager.clientForSourceMap(sourceMap);
      if (script) {
        scripts.push(script);
      }
    }
    return scripts;
  }
  sourceMapAttachedForTest(_sourceMap) {
  }
  dispose() {
    Common3.EventTarget.removeEventListeners(this.#eventListeners);
    for (const project of this.#projects.values()) {
      project.dispose();
    }
    this.#stubProject.dispose();
  }
};

// gen/front_end/models/bindings/CSSWorkspaceBinding.js
var CSSWorkspaceBinding_exports = {};
__export(CSSWorkspaceBinding_exports, {
  CSSWorkspaceBinding: () => CSSWorkspaceBinding,
  LiveLocation: () => LiveLocation,
  ModelInfo: () => ModelInfo
});
import * as Common7 from "./../../core/common/common.js";
import * as Platform4 from "./../../core/platform/platform.js";
import * as SDK7 from "./../../core/sdk/sdk.js";

// gen/front_end/models/bindings/LiveLocation.js
var LiveLocation_exports = {};
__export(LiveLocation_exports, {
  LiveLocationPool: () => LiveLocationPool,
  LiveLocationWithPool: () => LiveLocationWithPool
});
var LiveLocationWithPool = class {
  #updateDelegate;
  #locationPool;
  #updatePromise;
  constructor(updateDelegate, locationPool) {
    this.#updateDelegate = updateDelegate;
    this.#locationPool = locationPool;
    this.#locationPool.add(this);
    this.#updatePromise = null;
  }
  async update() {
    if (!this.#updateDelegate) {
      return;
    }
    if (this.#updatePromise) {
      await this.#updatePromise.then(() => this.update());
    } else {
      this.#updatePromise = this.#updateDelegate(this);
      await this.#updatePromise;
      this.#updatePromise = null;
    }
  }
  async uiLocation() {
    throw new Error("Not implemented");
  }
  dispose() {
    this.#locationPool.delete(this);
    this.#updateDelegate = null;
  }
  isDisposed() {
    return !this.#locationPool.has(this);
  }
};
var LiveLocationPool = class {
  #locations;
  constructor() {
    this.#locations = /* @__PURE__ */ new Set();
  }
  add(location) {
    this.#locations.add(location);
  }
  delete(location) {
    this.#locations.delete(location);
  }
  has(location) {
    return this.#locations.has(location);
  }
  disposeAll() {
    for (const location of this.#locations) {
      location.dispose();
    }
  }
};

// gen/front_end/models/bindings/SASSSourceMapping.js
var SASSSourceMapping_exports = {};
__export(SASSSourceMapping_exports, {
  SASSSourceMapping: () => SASSSourceMapping
});
import * as Common4 from "./../../core/common/common.js";
import * as SDK4 from "./../../core/sdk/sdk.js";
import * as TextUtils3 from "./../text_utils/text_utils.js";
import * as Workspace5 from "./../workspace/workspace.js";
var SASSSourceMapping = class {
  #sourceMapManager;
  #project;
  #eventListeners;
  #bindings;
  constructor(target, sourceMapManager, workspace) {
    this.#sourceMapManager = sourceMapManager;
    this.#project = new ContentProviderBasedProject(
      workspace,
      "cssSourceMaps:" + target.id(),
      Workspace5.Workspace.projectTypes.Network,
      "",
      false
      /* isServiceProject */
    );
    NetworkProject.setTargetForProject(this.#project, target);
    this.#bindings = /* @__PURE__ */ new Map();
    this.#eventListeners = [
      this.#sourceMapManager.addEventListener(SDK4.SourceMapManager.Events.SourceMapAttached, this.sourceMapAttached, this),
      this.#sourceMapManager.addEventListener(SDK4.SourceMapManager.Events.SourceMapDetached, this.sourceMapDetached, this)
    ];
  }
  sourceMapAttachedForTest(_sourceMap) {
  }
  async sourceMapAttached(event) {
    const header = event.data.client;
    const sourceMap = event.data.sourceMap;
    const project = this.#project;
    const bindings = this.#bindings;
    for (const sourceURL of sourceMap.sourceURLs()) {
      let binding = bindings.get(sourceURL);
      if (!binding) {
        binding = new Binding(project, sourceURL, header.createPageResourceLoadInitiator());
        bindings.set(sourceURL, binding);
      }
      binding.addSourceMap(sourceMap, header.frameId);
    }
    await CSSWorkspaceBinding.instance().updateLocations(header);
    this.sourceMapAttachedForTest(sourceMap);
  }
  async sourceMapDetached(event) {
    const header = event.data.client;
    const sourceMap = event.data.sourceMap;
    const bindings = this.#bindings;
    for (const sourceURL of sourceMap.sourceURLs()) {
      const binding = bindings.get(sourceURL);
      if (binding) {
        binding.removeSourceMap(sourceMap, header.frameId);
        if (!binding.getUiSourceCode()) {
          bindings.delete(sourceURL);
        }
      }
    }
    await CSSWorkspaceBinding.instance().updateLocations(header);
  }
  rawLocationToUILocation(rawLocation) {
    const header = rawLocation.header();
    if (!header) {
      return null;
    }
    const sourceMap = this.#sourceMapManager.sourceMapForClient(header);
    if (!sourceMap) {
      return null;
    }
    let { lineNumber, columnNumber } = rawLocation;
    if (sourceMap.mapsOrigin() && header.isInline) {
      lineNumber -= header.startLine;
      if (lineNumber === 0) {
        columnNumber -= header.startColumn;
      }
    }
    const entry = sourceMap.findEntry(lineNumber, columnNumber);
    if (!entry?.sourceURL) {
      return null;
    }
    const uiSourceCode = this.#project.uiSourceCodeForURL(entry.sourceURL);
    if (!uiSourceCode) {
      return null;
    }
    return uiSourceCode.uiLocation(entry.sourceLineNumber, entry.sourceColumnNumber);
  }
  uiLocationToRawLocations(uiLocation) {
    const { uiSourceCode, lineNumber, columnNumber = 0 } = uiLocation;
    const binding = uiSourceCodeToBinding.get(uiSourceCode);
    if (!binding) {
      return [];
    }
    const locations = [];
    for (const sourceMap of binding.getReferringSourceMaps()) {
      const entries = sourceMap.findReverseEntries(uiSourceCode.url(), lineNumber, columnNumber);
      const header = this.#sourceMapManager.clientForSourceMap(sourceMap);
      if (header) {
        locations.push(...entries.map((entry) => new SDK4.CSSModel.CSSLocation(header, entry.lineNumber, entry.columnNumber)));
      }
    }
    return locations;
  }
  static uiSourceOrigin(uiSourceCode) {
    const binding = uiSourceCodeToBinding.get(uiSourceCode);
    if (binding) {
      return binding.getReferringSourceMaps().map((sourceMap) => sourceMap.compiledURL());
    }
    return [];
  }
  dispose() {
    Common4.EventTarget.removeEventListeners(this.#eventListeners);
    this.#project.dispose();
  }
};
var uiSourceCodeToBinding = /* @__PURE__ */ new WeakMap();
var Binding = class {
  #project;
  #url;
  #initiator;
  referringSourceMaps;
  uiSourceCode;
  constructor(project, url, initiator) {
    this.#project = project;
    this.#url = url;
    this.#initiator = initiator;
    this.referringSourceMaps = [];
    this.uiSourceCode = null;
  }
  recreateUISourceCodeIfNeeded(frameId) {
    const sourceMap = this.referringSourceMaps[this.referringSourceMaps.length - 1];
    const contentType = Common4.ResourceType.resourceTypes.SourceMapStyleSheet;
    const embeddedContent = sourceMap.embeddedContentByURL(this.#url);
    const contentProvider = embeddedContent !== null ? TextUtils3.StaticContentProvider.StaticContentProvider.fromString(this.#url, contentType, embeddedContent) : new SDK4.CompilerSourceMappingContentProvider.CompilerSourceMappingContentProvider(this.#url, contentType, this.#initiator);
    const newUISourceCode = this.#project.createUISourceCode(this.#url, contentType);
    uiSourceCodeToBinding.set(newUISourceCode, this);
    const mimeType = Common4.ResourceType.ResourceType.mimeFromURL(this.#url) || contentType.canonicalMimeType();
    const metadata = typeof embeddedContent === "string" ? new Workspace5.UISourceCode.UISourceCodeMetadata(null, embeddedContent.length) : null;
    if (this.uiSourceCode) {
      NetworkProject.cloneInitialFrameAttribution(this.uiSourceCode, newUISourceCode);
      this.#project.removeUISourceCode(this.uiSourceCode.url());
    } else {
      NetworkProject.setInitialFrameAttribution(newUISourceCode, frameId);
    }
    this.uiSourceCode = newUISourceCode;
    this.#project.addUISourceCodeWithProvider(this.uiSourceCode, contentProvider, metadata, mimeType);
  }
  addSourceMap(sourceMap, frameId) {
    if (this.uiSourceCode) {
      NetworkProject.addFrameAttribution(this.uiSourceCode, frameId);
    }
    this.referringSourceMaps.push(sourceMap);
    this.recreateUISourceCodeIfNeeded(frameId);
  }
  removeSourceMap(sourceMap, frameId) {
    const uiSourceCode = this.uiSourceCode;
    NetworkProject.removeFrameAttribution(uiSourceCode, frameId);
    const lastIndex = this.referringSourceMaps.lastIndexOf(sourceMap);
    if (lastIndex !== -1) {
      this.referringSourceMaps.splice(lastIndex, 1);
    }
    if (!this.referringSourceMaps.length) {
      this.#project.removeUISourceCode(uiSourceCode.url());
      this.uiSourceCode = null;
    } else {
      this.recreateUISourceCodeIfNeeded(frameId);
    }
  }
  getReferringSourceMaps() {
    return this.referringSourceMaps;
  }
  getUiSourceCode() {
    return this.uiSourceCode;
  }
};

// gen/front_end/models/bindings/StylesSourceMapping.js
var StylesSourceMapping_exports = {};
__export(StylesSourceMapping_exports, {
  StyleFile: () => StyleFile,
  StylesSourceMapping: () => StylesSourceMapping
});
import * as Common6 from "./../../core/common/common.js";
import * as SDK6 from "./../../core/sdk/sdk.js";
import * as TextUtils4 from "./../text_utils/text_utils.js";
import * as Workspace9 from "./../workspace/workspace.js";

// gen/front_end/models/bindings/ResourceUtils.js
var ResourceUtils_exports = {};
__export(ResourceUtils_exports, {
  displayNameForURL: () => displayNameForURL,
  metadataForURL: () => metadataForURL,
  resourceForURL: () => resourceForURL,
  resourceMetadata: () => resourceMetadata
});
import * as Common5 from "./../../core/common/common.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as SDK5 from "./../../core/sdk/sdk.js";
import * as Workspace7 from "./../workspace/workspace.js";
function resourceForURL(url) {
  return SDK5.ResourceTreeModel.ResourceTreeModel.resourceForURL(url);
}
function displayNameForURL(url) {
  if (!url) {
    return "";
  }
  const uiSourceCode = Workspace7.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
  if (uiSourceCode) {
    return uiSourceCode.displayName();
  }
  const resource = resourceForURL(url);
  if (resource) {
    return resource.displayName;
  }
  const inspectedURL = SDK5.TargetManager.TargetManager.instance().inspectedURL();
  if (!inspectedURL) {
    return Platform3.StringUtilities.trimURL(url, "");
  }
  const parsedURL = Common5.ParsedURL.ParsedURL.fromString(inspectedURL);
  if (!parsedURL) {
    return url;
  }
  const lastPathComponent = parsedURL.lastPathComponent;
  const index = inspectedURL.indexOf(lastPathComponent);
  if (index !== -1 && index + lastPathComponent.length === inspectedURL.length) {
    const baseURL = inspectedURL.substring(0, index);
    if (url.startsWith(baseURL) && url.length > index) {
      return url.substring(index);
    }
  }
  const displayName = Platform3.StringUtilities.trimURL(url, parsedURL.host);
  return displayName === "/" ? parsedURL.host + "/" : displayName;
}
function metadataForURL(target, frameId, url) {
  const resourceTreeModel = target.model(SDK5.ResourceTreeModel.ResourceTreeModel);
  if (!resourceTreeModel) {
    return null;
  }
  const frame = resourceTreeModel.frameForId(frameId);
  if (!frame) {
    return null;
  }
  return resourceMetadata(frame.resourceForURL(url));
}
function resourceMetadata(resource) {
  if (!resource || typeof resource.contentSize() !== "number" && !resource.lastModified()) {
    return null;
  }
  return new Workspace7.UISourceCode.UISourceCodeMetadata(resource.lastModified(), resource.contentSize());
}

// gen/front_end/models/bindings/StylesSourceMapping.js
var uiSourceCodeToStyleMap = /* @__PURE__ */ new WeakMap();
var StylesSourceMapping = class {
  #cssModel;
  #project;
  #styleFiles = /* @__PURE__ */ new Map();
  #eventListeners;
  constructor(cssModel, workspace) {
    this.#cssModel = cssModel;
    const target = this.#cssModel.target();
    this.#project = new ContentProviderBasedProject(
      workspace,
      "css:" + target.id(),
      Workspace9.Workspace.projectTypes.Network,
      "",
      false
      /* isServiceProject */
    );
    NetworkProject.setTargetForProject(this.#project, target);
    this.#eventListeners = [
      this.#cssModel.addEventListener(SDK6.CSSModel.Events.StyleSheetAdded, this.styleSheetAdded, this),
      this.#cssModel.addEventListener(SDK6.CSSModel.Events.StyleSheetRemoved, this.styleSheetRemoved, this),
      this.#cssModel.addEventListener(SDK6.CSSModel.Events.StyleSheetChanged, this.styleSheetChanged, this)
    ];
  }
  addSourceMap(sourceUrl, sourceMapUrl) {
    this.#styleFiles.get(sourceUrl)?.addSourceMap(sourceUrl, sourceMapUrl);
  }
  rawLocationToUILocation(rawLocation) {
    const header = rawLocation.header();
    if (!header || !this.acceptsHeader(header)) {
      return null;
    }
    const styleFile = this.#styleFiles.get(header.resourceURL());
    if (!styleFile) {
      return null;
    }
    let lineNumber = rawLocation.lineNumber;
    let columnNumber = rawLocation.columnNumber;
    if (header.isInline && header.hasSourceURL) {
      lineNumber -= header.lineNumberInSource(0);
      const headerColumnNumber = header.columnNumberInSource(lineNumber, 0);
      if (typeof headerColumnNumber === "undefined") {
        columnNumber = headerColumnNumber;
      } else {
        columnNumber -= headerColumnNumber;
      }
    }
    return styleFile.getUiSourceCode().uiLocation(lineNumber, columnNumber);
  }
  uiLocationToRawLocations(uiLocation) {
    const styleFile = uiSourceCodeToStyleMap.get(uiLocation.uiSourceCode);
    if (!styleFile) {
      return [];
    }
    const rawLocations = [];
    for (const header of styleFile.getHeaders()) {
      let lineNumber = uiLocation.lineNumber;
      let columnNumber = uiLocation.columnNumber;
      if (header.isInline && header.hasSourceURL) {
        columnNumber = header.columnNumberInSource(lineNumber, uiLocation.columnNumber || 0);
        lineNumber = header.lineNumberInSource(lineNumber);
      }
      rawLocations.push(new SDK6.CSSModel.CSSLocation(header, lineNumber, columnNumber));
    }
    return rawLocations;
  }
  acceptsHeader(header) {
    if (header.isConstructedByNew()) {
      return false;
    }
    if (header.isInline && !header.hasSourceURL && header.origin !== "inspector") {
      return false;
    }
    if (!header.resourceURL()) {
      return false;
    }
    return true;
  }
  styleSheetAdded(event) {
    const header = event.data;
    if (!this.acceptsHeader(header)) {
      return;
    }
    const url = header.resourceURL();
    let styleFile = this.#styleFiles.get(url);
    if (!styleFile) {
      styleFile = new StyleFile(this.#cssModel, this.#project, header);
      this.#styleFiles.set(url, styleFile);
    } else {
      styleFile.addHeader(header);
    }
  }
  styleSheetRemoved(event) {
    const header = event.data;
    if (!this.acceptsHeader(header)) {
      return;
    }
    const url = header.resourceURL();
    const styleFile = this.#styleFiles.get(url);
    if (styleFile) {
      if (styleFile.getHeaders().size === 1) {
        styleFile.dispose();
        this.#styleFiles.delete(url);
      } else {
        styleFile.removeHeader(header);
      }
    }
  }
  styleSheetChanged(event) {
    const header = this.#cssModel.styleSheetHeaderForId(event.data.styleSheetId);
    if (!header || !this.acceptsHeader(header)) {
      return;
    }
    const styleFile = this.#styleFiles.get(header.resourceURL());
    if (styleFile) {
      styleFile.styleSheetChanged(header);
    }
  }
  dispose() {
    for (const styleFile of this.#styleFiles.values()) {
      styleFile.dispose();
    }
    this.#styleFiles.clear();
    Common6.EventTarget.removeEventListeners(this.#eventListeners);
    this.#project.removeProject();
  }
};
var StyleFile = class {
  #cssModel;
  #project;
  headers;
  uiSourceCode;
  #eventListeners;
  #throttler = new Common6.Throttler.Throttler(200);
  #terminated = false;
  #isAddingRevision;
  #isUpdatingHeaders;
  constructor(cssModel, project, header) {
    this.#cssModel = cssModel;
    this.#project = project;
    this.headers = /* @__PURE__ */ new Set([header]);
    const target = cssModel.target();
    const url = header.resourceURL();
    const metadata = metadataForURL(target, header.frameId, url);
    this.uiSourceCode = this.#project.createUISourceCode(url, header.contentType());
    uiSourceCodeToStyleMap.set(this.uiSourceCode, this);
    NetworkProject.setInitialFrameAttribution(this.uiSourceCode, header.frameId);
    this.#project.addUISourceCodeWithProvider(this.uiSourceCode, this, metadata, "text/css");
    this.#eventListeners = [
      this.uiSourceCode.addEventListener(Workspace9.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this),
      this.uiSourceCode.addEventListener(Workspace9.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this)
    ];
  }
  addHeader(header) {
    this.headers.add(header);
    NetworkProject.addFrameAttribution(this.uiSourceCode, header.frameId);
  }
  removeHeader(header) {
    this.headers.delete(header);
    NetworkProject.removeFrameAttribution(this.uiSourceCode, header.frameId);
  }
  styleSheetChanged(header) {
    console.assert(this.headers.has(header));
    if (this.#isUpdatingHeaders || !this.headers.has(header)) {
      return;
    }
    const mirrorContentBound = this.mirrorContent.bind(
      this,
      header,
      true
      /* majorChange */
    );
    void this.#throttler.schedule(
      mirrorContentBound,
      "Default"
      /* Common.Throttler.Scheduling.DEFAULT */
    );
  }
  workingCopyCommitted() {
    if (this.#isAddingRevision) {
      return;
    }
    const mirrorContentBound = this.mirrorContent.bind(
      this,
      this.uiSourceCode,
      true
      /* majorChange */
    );
    void this.#throttler.schedule(
      mirrorContentBound,
      "AsSoonAsPossible"
      /* Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE */
    );
  }
  workingCopyChanged() {
    if (this.#isAddingRevision) {
      return;
    }
    const mirrorContentBound = this.mirrorContent.bind(
      this,
      this.uiSourceCode,
      false
      /* majorChange */
    );
    void this.#throttler.schedule(
      mirrorContentBound,
      "Default"
      /* Common.Throttler.Scheduling.DEFAULT */
    );
  }
  async mirrorContent(fromProvider, majorChange) {
    if (this.#terminated) {
      this.styleFileSyncedForTest();
      return;
    }
    let newContent = null;
    if (fromProvider === this.uiSourceCode) {
      newContent = this.uiSourceCode.workingCopy();
    } else {
      newContent = TextUtils4.ContentData.ContentData.textOr(await fromProvider.requestContentData(), null);
    }
    if (newContent === null || this.#terminated) {
      this.styleFileSyncedForTest();
      return;
    }
    if (fromProvider !== this.uiSourceCode) {
      this.#isAddingRevision = true;
      this.uiSourceCode.setWorkingCopy(newContent);
      this.#isAddingRevision = false;
    }
    this.#isUpdatingHeaders = true;
    const promises = [];
    for (const header of this.headers) {
      if (header === fromProvider) {
        continue;
      }
      promises.push(this.#cssModel.setStyleSheetText(header.id, newContent, majorChange));
    }
    await Promise.all(promises);
    this.#isUpdatingHeaders = false;
    this.styleFileSyncedForTest();
  }
  styleFileSyncedForTest() {
  }
  dispose() {
    if (this.#terminated) {
      return;
    }
    this.#terminated = true;
    this.#project.removeUISourceCode(this.uiSourceCode.url());
    Common6.EventTarget.removeEventListeners(this.#eventListeners);
  }
  contentURL() {
    console.assert(this.headers.size > 0);
    return this.#firstHeader().originalContentProvider().contentURL();
  }
  contentType() {
    console.assert(this.headers.size > 0);
    return this.#firstHeader().originalContentProvider().contentType();
  }
  requestContentData() {
    console.assert(this.headers.size > 0);
    return this.#firstHeader().originalContentProvider().requestContentData();
  }
  searchInContent(query, caseSensitive, isRegex) {
    console.assert(this.headers.size > 0);
    return this.#firstHeader().originalContentProvider().searchInContent(query, caseSensitive, isRegex);
  }
  #firstHeader() {
    console.assert(this.headers.size > 0);
    return this.headers.values().next().value;
  }
  getHeaders() {
    return this.headers;
  }
  getUiSourceCode() {
    return this.uiSourceCode;
  }
  addSourceMap(sourceUrl, sourceMapUrl) {
    const sourceMapManager = this.#cssModel.sourceMapManager();
    this.headers.forEach((header) => {
      sourceMapManager.detachSourceMap(header);
      sourceMapManager.attachSourceMap(header, sourceUrl, sourceMapUrl);
    });
  }
};

// gen/front_end/models/bindings/CSSWorkspaceBinding.js
var cssWorkspaceBindingInstance;
var CSSWorkspaceBinding = class _CSSWorkspaceBinding {
  #resourceMapping;
  #modelToInfo;
  #liveLocationPromises;
  constructor(resourceMapping, targetManager) {
    this.#resourceMapping = resourceMapping;
    this.#modelToInfo = /* @__PURE__ */ new Map();
    targetManager.observeModels(SDK7.CSSModel.CSSModel, this);
    this.#liveLocationPromises = /* @__PURE__ */ new Set();
  }
  static instance(opts = { forceNew: null, resourceMapping: null, targetManager: null }) {
    const { forceNew, resourceMapping, targetManager } = opts;
    if (!cssWorkspaceBindingInstance || forceNew) {
      if (!resourceMapping || !targetManager) {
        throw new Error(`Unable to create CSSWorkspaceBinding: resourceMapping and targetManager must be provided: ${new Error().stack}`);
      }
      cssWorkspaceBindingInstance = new _CSSWorkspaceBinding(resourceMapping, targetManager);
    }
    return cssWorkspaceBindingInstance;
  }
  static removeInstance() {
    cssWorkspaceBindingInstance = void 0;
  }
  get modelToInfo() {
    return this.#modelToInfo;
  }
  getCSSModelInfo(cssModel) {
    return this.#modelToInfo.get(cssModel);
  }
  modelAdded(cssModel) {
    this.#modelToInfo.set(cssModel, new ModelInfo(cssModel, this.#resourceMapping));
  }
  modelRemoved(cssModel) {
    this.getCSSModelInfo(cssModel).dispose();
    this.#modelToInfo.delete(cssModel);
  }
  /**
   * The promise returned by this function is resolved once all *currently*
   * pending LiveLocations are processed.
   */
  async pendingLiveLocationChangesPromise() {
    await Promise.all(this.#liveLocationPromises);
  }
  recordLiveLocationChange(promise) {
    void promise.then(() => {
      this.#liveLocationPromises.delete(promise);
    });
    this.#liveLocationPromises.add(promise);
  }
  async updateLocations(header) {
    const updatePromise = this.getCSSModelInfo(header.cssModel()).updateLocations(header);
    this.recordLiveLocationChange(updatePromise);
    await updatePromise;
  }
  createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const locationPromise = this.getCSSModelInfo(rawLocation.cssModel()).createLiveLocation(rawLocation, updateDelegate, locationPool);
    this.recordLiveLocationChange(locationPromise);
    return locationPromise;
  }
  propertyRawLocation(cssProperty, forName) {
    const style = cssProperty.ownerStyle;
    if (!style || style.type !== SDK7.CSSStyleDeclaration.Type.Regular || !style.styleSheetId) {
      return null;
    }
    const header = style.cssModel().styleSheetHeaderForId(style.styleSheetId);
    if (!header) {
      return null;
    }
    const range = forName ? cssProperty.nameRange() : cssProperty.valueRange();
    if (!range) {
      return null;
    }
    const lineNumber = range.startLine;
    const columnNumber = range.startColumn;
    return new SDK7.CSSModel.CSSLocation(header, header.lineNumberInSource(lineNumber), header.columnNumberInSource(lineNumber, columnNumber));
  }
  propertyUILocation(cssProperty, forName) {
    const rawLocation = this.propertyRawLocation(cssProperty, forName);
    if (!rawLocation) {
      return null;
    }
    return this.rawLocationToUILocation(rawLocation);
  }
  rawLocationToUILocation(rawLocation) {
    return this.getCSSModelInfo(rawLocation.cssModel()).rawLocationToUILocation(rawLocation);
  }
  uiLocationToRawLocations(uiLocation) {
    const rawLocations = [];
    for (const modelInfo of this.#modelToInfo.values()) {
      rawLocations.push(...modelInfo.uiLocationToRawLocations(uiLocation));
    }
    return rawLocations;
  }
};
var ModelInfo = class {
  #eventListeners;
  #resourceMapping;
  #stylesSourceMapping;
  #sassSourceMapping;
  #locations;
  #unboundLocations;
  constructor(cssModel, resourceMapping) {
    this.#eventListeners = [
      cssModel.addEventListener(SDK7.CSSModel.Events.StyleSheetAdded, (event) => {
        void this.styleSheetAdded(event);
      }, this),
      cssModel.addEventListener(SDK7.CSSModel.Events.StyleSheetRemoved, (event) => {
        void this.styleSheetRemoved(event);
      }, this)
    ];
    this.#resourceMapping = resourceMapping;
    this.#stylesSourceMapping = new StylesSourceMapping(cssModel, resourceMapping.workspace);
    const sourceMapManager = cssModel.sourceMapManager();
    this.#sassSourceMapping = new SASSSourceMapping(cssModel.target(), sourceMapManager, resourceMapping.workspace);
    this.#locations = new Platform4.MapUtilities.Multimap();
    this.#unboundLocations = new Platform4.MapUtilities.Multimap();
  }
  get locations() {
    return this.#locations;
  }
  async createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const location = new LiveLocation(rawLocation, this, updateDelegate, locationPool);
    const header = rawLocation.header();
    if (header) {
      location.setHeader(header);
      this.#locations.set(header, location);
      await location.update();
    } else {
      this.#unboundLocations.set(rawLocation.url, location);
    }
    return location;
  }
  disposeLocation(location) {
    const header = location.header();
    if (header) {
      this.#locations.delete(header, location);
    } else {
      this.#unboundLocations.delete(location.url, location);
    }
  }
  updateLocations(header) {
    const promises = [];
    for (const location of this.#locations.get(header)) {
      promises.push(location.update());
    }
    return Promise.all(promises);
  }
  async styleSheetAdded(event) {
    const header = event.data;
    if (!header.sourceURL) {
      return;
    }
    const promises = [];
    for (const location of this.#unboundLocations.get(header.sourceURL)) {
      location.setHeader(header);
      this.#locations.set(header, location);
      promises.push(location.update());
    }
    await Promise.all(promises);
    this.#unboundLocations.deleteAll(header.sourceURL);
  }
  async styleSheetRemoved(event) {
    const header = event.data;
    const promises = [];
    for (const location of this.#locations.get(header)) {
      location.setHeader(header);
      this.#unboundLocations.set(location.url, location);
      promises.push(location.update());
    }
    await Promise.all(promises);
    this.#locations.deleteAll(header);
  }
  addSourceMap(sourceUrl, sourceMapUrl) {
    this.#stylesSourceMapping.addSourceMap(sourceUrl, sourceMapUrl);
  }
  rawLocationToUILocation(rawLocation) {
    let uiLocation = null;
    uiLocation = uiLocation || this.#sassSourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this.#stylesSourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this.#resourceMapping.cssLocationToUILocation(rawLocation);
    return uiLocation;
  }
  uiLocationToRawLocations(uiLocation) {
    let rawLocations = this.#sassSourceMapping.uiLocationToRawLocations(uiLocation);
    if (rawLocations.length) {
      return rawLocations;
    }
    rawLocations = this.#stylesSourceMapping.uiLocationToRawLocations(uiLocation);
    if (rawLocations.length) {
      return rawLocations;
    }
    return this.#resourceMapping.uiLocationToCSSLocations(uiLocation);
  }
  dispose() {
    Common7.EventTarget.removeEventListeners(this.#eventListeners);
    this.#stylesSourceMapping.dispose();
    this.#sassSourceMapping.dispose();
  }
};
var LiveLocation = class extends LiveLocationWithPool {
  url;
  #lineNumber;
  #columnNumber;
  #info;
  #header;
  constructor(rawLocation, info, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this.url = rawLocation.url;
    this.#lineNumber = rawLocation.lineNumber;
    this.#columnNumber = rawLocation.columnNumber;
    this.#info = info;
    this.#header = null;
  }
  header() {
    return this.#header;
  }
  setHeader(header) {
    this.#header = header;
  }
  async uiLocation() {
    if (!this.#header) {
      return null;
    }
    const rawLocation = new SDK7.CSSModel.CSSLocation(this.#header, this.#lineNumber, this.#columnNumber);
    return CSSWorkspaceBinding.instance().rawLocationToUILocation(rawLocation);
  }
  dispose() {
    super.dispose();
    this.#info.disposeLocation(this);
  }
};

// gen/front_end/models/bindings/DebuggerLanguagePlugins.js
var DebuggerLanguagePlugins_exports = {};
__export(DebuggerLanguagePlugins_exports, {
  DebuggerLanguagePluginManager: () => DebuggerLanguagePluginManager,
  ExtensionRemoteObject: () => ExtensionRemoteObject,
  SourceScope: () => SourceScope
});
import * as Common8 from "./../../core/common/common.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import { assertNotNullOrUndefined } from "./../../core/platform/platform.js";
import * as SDK8 from "./../../core/sdk/sdk.js";
import * as StackTrace2 from "./../stack_trace/stack_trace.js";
import * as TextUtils5 from "./../text_utils/text_utils.js";
import * as Workspace11 from "./../workspace/workspace.js";
var UIStrings2 = {
  /**
   * @description Error message that is displayed in the Console when language #plugins report errors
   * @example {File not found} PH1
   */
  errorInDebuggerLanguagePlugin: "Error in debugger language plugin: {PH1}",
  /**
   * @description Status message that is shown in the Console when debugging information is being
   *loaded. The 2nd and 3rd placeholders are URLs.
   * @example {C/C++ DevTools Support (DWARF)} PH1
   * @example {http://web.dev/file.wasm} PH2
   * @example {http://web.dev/file.wasm.debug.wasm} PH3
   */
  loadingDebugSymbolsForVia: "[{PH1}] Loading debug symbols for {PH2} (via {PH3})\u2026",
  /**
   * @description Status message that is shown in the Console when debugging information is being loaded
   * @example {C/C++ DevTools Support (DWARF)} PH1
   * @example {http://web.dev/file.wasm} PH2
   */
  loadingDebugSymbolsFor: "[{PH1}] Loading debug symbols for {PH2}\u2026",
  /**
   * @description Warning message that is displayed in the Console when debugging information was loaded, but no source files were found
   * @example {C/C++ DevTools Support (DWARF)} PH1
   * @example {http://web.dev/file.wasm} PH2
   */
  loadedDebugSymbolsForButDidnt: "[{PH1}] Loaded debug symbols for {PH2}, but didn't find any source files",
  /**
   * @description Status message that is shown in the Console when debugging information is successfully loaded
   * @example {C/C++ DevTools Support (DWARF)} PH1
   * @example {http://web.dev/file.wasm} PH2
   * @example {42} PH3
   */
  loadedDebugSymbolsForFound: "[{PH1}] Loaded debug symbols for {PH2}, found {PH3} source file(s)",
  /**
   * @description Error message that is displayed in the Console when debugging information cannot be loaded
   * @example {C/C++ DevTools Support (DWARF)} PH1
   * @example {http://web.dev/file.wasm} PH2
   * @example {File not found} PH3
   */
  failedToLoadDebugSymbolsFor: "[{PH1}] Failed to load debug symbols for {PH2} ({PH3})",
  /**
   * @description Error message that is displayed in UI debugging information cannot be found for a call frame
   * @example {main} PH1
   */
  failedToLoadDebugSymbolsForFunction: 'No debug information for function "{PH1}"',
  /**
   * @description Error message that is displayed in UI when a file needed for debugging information for a call frame is missing
   * @example {mainp.debug.wasm.dwp} PH1
   */
  debugSymbolsIncomplete: "The debug information for function {PH1} is incomplete"
};
var str_2 = i18n3.i18n.registerUIStrings("models/bindings/DebuggerLanguagePlugins.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
function rawModuleIdForScript(script) {
  return `${script.sourceURL}@${script.hash}`;
}
function getRawLocation(callFrame) {
  const { script } = callFrame;
  return {
    rawModuleId: rawModuleIdForScript(script),
    codeOffset: callFrame.location().columnNumber - (script.codeOffset() || 0),
    inlineFrameIndex: callFrame.inlineFrameIndex
  };
}
var FormattingError = class _FormattingError extends Error {
  exception;
  exceptionDetails;
  constructor(exception, exceptionDetails) {
    const { description } = exceptionDetails.exception || {};
    super(description || exceptionDetails.text);
    this.exception = exception;
    this.exceptionDetails = exceptionDetails;
  }
  static makeLocal(callFrame, message) {
    const exception = {
      type: "object",
      subtype: "error",
      description: message
    };
    const exceptionDetails = { text: "Uncaught", exceptionId: -1, columnNumber: 0, lineNumber: 0, exception };
    const errorObject = callFrame.debuggerModel.runtimeModel().createRemoteObject(exception);
    return new _FormattingError(errorObject, exceptionDetails);
  }
};
var NamespaceObject = class extends SDK8.RemoteObject.LocalJSONObject {
  get description() {
    return this.type;
  }
  get type() {
    return "namespace";
  }
};
async function getRemoteObject(callFrame, object) {
  if (!/^(local|global|operand)$/.test(object.valueClass)) {
    return {
      type: "undefined"
      /* Protocol.Runtime.RemoteObjectType.Undefined */
    };
  }
  const index = Number(object.index);
  const expression = `${object.valueClass}s[${index}]`;
  const response = await callFrame.debuggerModel.agent.invoke_evaluateOnCallFrame({
    callFrameId: callFrame.id,
    expression,
    silent: true,
    generatePreview: true,
    throwOnSideEffect: true
  });
  if (response.getError() || response.exceptionDetails) {
    return {
      type: "undefined"
      /* Protocol.Runtime.RemoteObjectType.Undefined */
    };
  }
  return response.result;
}
async function wrapRemoteObject(callFrame, object, plugin) {
  if (object.type === "reftype") {
    const obj = await getRemoteObject(callFrame, object);
    return callFrame.debuggerModel.runtimeModel().createRemoteObject(obj);
  }
  return new ExtensionRemoteObject(callFrame, object, plugin);
}
var SourceScopeRemoteObject = class extends SDK8.RemoteObject.RemoteObjectImpl {
  variables;
  #callFrame;
  #plugin;
  stopId;
  constructor(callFrame, stopId, plugin) {
    super(callFrame.debuggerModel.runtimeModel(), void 0, "object", void 0, null);
    this.variables = [];
    this.#callFrame = callFrame;
    this.#plugin = plugin;
    this.stopId = stopId;
  }
  async doGetProperties(_ownProperties, accessorPropertiesOnly, _generatePreview) {
    if (accessorPropertiesOnly) {
      return { properties: [], internalProperties: [] };
    }
    const properties = [];
    const namespaces = {};
    function makeProperty(name, obj) {
      return new SDK8.RemoteObject.RemoteObjectProperty(
        name,
        obj,
        /* enumerable=*/
        false,
        /* writable=*/
        false,
        /* isOwn=*/
        true,
        /* wasThrown=*/
        false
      );
    }
    for (const variable of this.variables) {
      let sourceVar;
      try {
        const evalResult = await this.#plugin.evaluate(variable.name, getRawLocation(this.#callFrame), this.stopId);
        sourceVar = evalResult ? await wrapRemoteObject(this.#callFrame, evalResult, this.#plugin) : new SDK8.RemoteObject.LocalJSONObject(void 0);
      } catch (e) {
        console.warn(e);
        sourceVar = new SDK8.RemoteObject.LocalJSONObject(void 0);
      }
      if (variable.nestedName && variable.nestedName.length > 1) {
        let parent = namespaces;
        for (let index = 0; index < variable.nestedName.length - 1; index++) {
          const nestedName = variable.nestedName[index];
          let child = parent[nestedName];
          if (!child) {
            child = new NamespaceObject({});
            parent[nestedName] = child;
          }
          parent = child.value;
        }
        const name = variable.nestedName[variable.nestedName.length - 1];
        parent[name] = sourceVar;
      } else {
        properties.push(makeProperty(variable.name, sourceVar));
      }
    }
    for (const namespace in namespaces) {
      properties.push(makeProperty(namespace, namespaces[namespace]));
    }
    return { properties, internalProperties: [] };
  }
};
var SourceScope = class {
  #callFrame;
  #type;
  #typeName;
  #icon;
  #object;
  constructor(callFrame, stopId, type, typeName, icon, plugin) {
    if (icon && new URL(icon).protocol !== "data:") {
      throw new Error("The icon must be a data:-URL");
    }
    this.#callFrame = callFrame;
    this.#type = type;
    this.#typeName = typeName;
    this.#icon = icon;
    this.#object = new SourceScopeRemoteObject(callFrame, stopId, plugin);
  }
  async getVariableValue(name) {
    for (let v = 0; v < this.#object.variables.length; ++v) {
      if (this.#object.variables[v].name !== name) {
        continue;
      }
      const properties = await this.#object.getAllProperties(false, false);
      if (!properties.properties) {
        continue;
      }
      const { value } = properties.properties[v];
      if (value) {
        return value;
      }
    }
    return null;
  }
  callFrame() {
    return this.#callFrame;
  }
  type() {
    return this.#type;
  }
  typeName() {
    return this.#typeName;
  }
  name() {
    return void 0;
  }
  range() {
    return null;
  }
  object() {
    return this.#object;
  }
  description() {
    return "";
  }
  icon() {
    return this.#icon;
  }
  extraProperties() {
    return [];
  }
};
var ExtensionRemoteObject = class extends SDK8.RemoteObject.RemoteObject {
  extensionObject;
  plugin;
  callFrame;
  constructor(callFrame, extensionObject, plugin) {
    super();
    this.extensionObject = extensionObject;
    this.plugin = plugin;
    this.callFrame = callFrame;
  }
  get linearMemoryAddress() {
    return this.extensionObject.linearMemoryAddress;
  }
  get linearMemorySize() {
    return this.extensionObject.linearMemorySize;
  }
  get objectId() {
    return this.extensionObject.objectId;
  }
  get type() {
    if (this.extensionObject.type === "array" || this.extensionObject.type === "null") {
      return "object";
    }
    return this.extensionObject.type;
  }
  get subtype() {
    if (this.extensionObject.type === "array" || this.extensionObject.type === "null") {
      return this.extensionObject.type;
    }
    return void 0;
  }
  get value() {
    return this.extensionObject.value;
  }
  unserializableValue() {
    return void 0;
  }
  get description() {
    return this.extensionObject.description;
  }
  set description(_description) {
  }
  get hasChildren() {
    return this.extensionObject.hasChildren;
  }
  get preview() {
    return void 0;
  }
  get className() {
    return this.extensionObject.className ?? null;
  }
  arrayLength() {
    return 0;
  }
  arrayBufferByteLength() {
    return 0;
  }
  getOwnProperties(_generatePreview, _nonIndexedPropertiesOnly) {
    return this.getAllProperties(false, _generatePreview, _nonIndexedPropertiesOnly);
  }
  async getAllProperties(_accessorPropertiesOnly, _generatePreview, _nonIndexedPropertiesOnly) {
    const { objectId } = this.extensionObject;
    if (objectId) {
      assertNotNullOrUndefined(this.plugin.getProperties);
      const extensionObjectProperties = await this.plugin.getProperties(objectId);
      const properties = await Promise.all(extensionObjectProperties.map(async (p) => new SDK8.RemoteObject.RemoteObjectProperty(p.name, await wrapRemoteObject(this.callFrame, p.value, this.plugin))));
      return { properties, internalProperties: null };
    }
    return { properties: null, internalProperties: null };
  }
  release() {
    const { objectId } = this.extensionObject;
    if (objectId) {
      assertNotNullOrUndefined(this.plugin.releaseObject);
      void this.plugin.releaseObject(objectId);
    }
  }
  debuggerModel() {
    return this.callFrame.debuggerModel;
  }
  runtimeModel() {
    return this.callFrame.debuggerModel.runtimeModel();
  }
  isLinearMemoryInspectable() {
    return this.extensionObject.linearMemoryAddress !== void 0;
  }
};
var DebuggerLanguagePluginManager = class {
  #workspace;
  #debuggerWorkspaceBinding;
  #plugins;
  #debuggerModelToData;
  #rawModuleHandles;
  callFrameByStopId = /* @__PURE__ */ new Map();
  stopIdByCallFrame = /* @__PURE__ */ new Map();
  nextStopId = 0n;
  constructor(targetManager, workspace, debuggerWorkspaceBinding) {
    this.#workspace = workspace;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#plugins = [];
    this.#debuggerModelToData = /* @__PURE__ */ new Map();
    targetManager.observeModels(SDK8.DebuggerModel.DebuggerModel, this);
    this.#rawModuleHandles = /* @__PURE__ */ new Map();
  }
  async evaluateOnCallFrame(callFrame, options) {
    const { script } = callFrame;
    const { expression, returnByValue, throwOnSideEffect } = options;
    const { plugin } = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }
    const location = getRawLocation(callFrame);
    const sourceLocations = await plugin.rawLocationToSourceLocation(location);
    if (sourceLocations.length === 0) {
      return null;
    }
    if (returnByValue) {
      return { error: "Cannot return by value" };
    }
    if (throwOnSideEffect) {
      return { error: "Cannot guarantee side-effect freedom" };
    }
    try {
      const object = await plugin.evaluate(expression, location, this.stopIdForCallFrame(callFrame));
      if (object) {
        return { object: await wrapRemoteObject(callFrame, object, plugin), exceptionDetails: void 0 };
      }
      return { object: new SDK8.RemoteObject.LocalJSONObject(void 0), exceptionDetails: void 0 };
    } catch (error) {
      if (error instanceof FormattingError) {
        const { exception: object2, exceptionDetails: exceptionDetails2 } = error;
        return { object: object2, exceptionDetails: exceptionDetails2 };
      }
      const { exception: object, exceptionDetails } = FormattingError.makeLocal(callFrame, error.message);
      return { object, exceptionDetails };
    }
  }
  stopIdForCallFrame(callFrame) {
    let stopId = this.stopIdByCallFrame.get(callFrame);
    if (stopId !== void 0) {
      return stopId;
    }
    stopId = this.nextStopId++;
    this.stopIdByCallFrame.set(callFrame, stopId);
    this.callFrameByStopId.set(stopId, callFrame);
    return stopId;
  }
  callFrameForStopId(stopId) {
    return this.callFrameByStopId.get(stopId);
  }
  expandCallFrames(callFrames) {
    return Promise.all(callFrames.map(async (callFrame) => {
      const functionInfo = await this.getFunctionInfo(callFrame.script, callFrame.location());
      if (functionInfo) {
        if ("frames" in functionInfo && functionInfo.frames.length) {
          return functionInfo.frames.map(({ name }, index) => callFrame.createVirtualCallFrame(index, name));
        }
        if ("missingSymbolFiles" in functionInfo && functionInfo.missingSymbolFiles.length) {
          const resources = functionInfo.missingSymbolFiles;
          const details = i18nString2(UIStrings2.debugSymbolsIncomplete, { PH1: callFrame.functionName });
          callFrame.missingDebugInfoDetails = { details, resources };
        } else {
          callFrame.missingDebugInfoDetails = {
            details: i18nString2(UIStrings2.failedToLoadDebugSymbolsForFunction, { PH1: callFrame.functionName }),
            resources: []
          };
        }
      }
      return callFrame;
    })).then((callFrames2) => callFrames2.flat());
  }
  modelAdded(debuggerModel) {
    this.#debuggerModelToData.set(debuggerModel, new ModelData(debuggerModel, this.#workspace));
    debuggerModel.addEventListener(SDK8.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this);
    debuggerModel.addEventListener(SDK8.DebuggerModel.Events.ParsedScriptSource, this.parsedScriptSource, this);
    debuggerModel.addEventListener(SDK8.DebuggerModel.Events.DebuggerResumed, this.debuggerResumed, this);
    debuggerModel.setEvaluateOnCallFrameCallback(this.evaluateOnCallFrame.bind(this));
    debuggerModel.setExpandCallFramesCallback(this.expandCallFrames.bind(this));
  }
  modelRemoved(debuggerModel) {
    debuggerModel.removeEventListener(SDK8.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this);
    debuggerModel.removeEventListener(SDK8.DebuggerModel.Events.ParsedScriptSource, this.parsedScriptSource, this);
    debuggerModel.removeEventListener(SDK8.DebuggerModel.Events.DebuggerResumed, this.debuggerResumed, this);
    debuggerModel.setEvaluateOnCallFrameCallback(null);
    debuggerModel.setExpandCallFramesCallback(null);
    const modelData = this.#debuggerModelToData.get(debuggerModel);
    if (modelData) {
      modelData.dispose();
      this.#debuggerModelToData.delete(debuggerModel);
    }
    this.#rawModuleHandles.forEach((rawModuleHandle, rawModuleId) => {
      const scripts = rawModuleHandle.scripts.filter((script) => script.debuggerModel !== debuggerModel);
      if (scripts.length === 0) {
        rawModuleHandle.plugin.removeRawModule(rawModuleId).catch((error) => {
          Common8.Console.Console.instance().error(
            i18nString2(UIStrings2.errorInDebuggerLanguagePlugin, { PH1: error.message }),
            /* show=*/
            false
          );
        });
        this.#rawModuleHandles.delete(rawModuleId);
      } else {
        rawModuleHandle.scripts = scripts;
      }
    });
  }
  globalObjectCleared(event) {
    const debuggerModel = event.data;
    this.modelRemoved(debuggerModel);
    this.modelAdded(debuggerModel);
  }
  addPlugin(plugin) {
    this.#plugins.push(plugin);
    for (const debuggerModel of this.#debuggerModelToData.keys()) {
      for (const script of debuggerModel.scripts()) {
        if (this.hasPluginForScript(script)) {
          continue;
        }
        this.parsedScriptSource({ data: script });
      }
    }
  }
  removePlugin(plugin) {
    this.#plugins = this.#plugins.filter((p) => p !== plugin);
    const scripts = /* @__PURE__ */ new Set();
    this.#rawModuleHandles.forEach((rawModuleHandle, rawModuleId) => {
      if (rawModuleHandle.plugin !== plugin) {
        return;
      }
      rawModuleHandle.scripts.forEach((script) => scripts.add(script));
      this.#rawModuleHandles.delete(rawModuleId);
    });
    for (const script of scripts) {
      const modelData = this.#debuggerModelToData.get(script.debuggerModel);
      modelData.removeScript(script);
      this.parsedScriptSource({ data: script });
    }
  }
  hasPluginForScript(script) {
    const rawModuleId = rawModuleIdForScript(script);
    const rawModuleHandle = this.#rawModuleHandles.get(rawModuleId);
    return rawModuleHandle?.scripts.includes(script) ?? false;
  }
  /**
   * Returns the responsible language #plugin and the raw module ID for a script.
   *
   * This ensures that the `addRawModule` call finishes first such that the
   * caller can immediately issue calls to the returned #plugin without the
   * risk of racing with the `addRawModule` call. The returned #plugin will be
   * set to undefined to indicate that there's no #plugin for the script.
   */
  async rawModuleIdAndPluginForScript(script) {
    const rawModuleId = rawModuleIdForScript(script);
    const rawModuleHandle = this.#rawModuleHandles.get(rawModuleId);
    if (rawModuleHandle) {
      await rawModuleHandle.addRawModulePromise;
      if (rawModuleHandle === this.#rawModuleHandles.get(rawModuleId)) {
        return { rawModuleId, plugin: rawModuleHandle.plugin };
      }
    }
    return { rawModuleId, plugin: null };
  }
  uiSourceCodeForURL(debuggerModel, url) {
    const modelData = this.#debuggerModelToData.get(debuggerModel);
    if (modelData) {
      return modelData.getProject().uiSourceCodeForURL(url);
    }
    return null;
  }
  async rawLocationToUILocation(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const { rawModuleId, plugin } = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }
    const pluginLocation = {
      rawModuleId,
      // RawLocation.#columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0),
      inlineFrameIndex: rawLocation.inlineFrameIndex
    };
    try {
      const sourceLocations = await plugin.rawLocationToSourceLocation(pluginLocation);
      for (const sourceLocation of sourceLocations) {
        const uiSourceCode = this.uiSourceCodeForURL(script.debuggerModel, sourceLocation.sourceFileURL);
        if (!uiSourceCode) {
          continue;
        }
        return uiSourceCode.uiLocation(sourceLocation.lineNumber, sourceLocation.columnNumber >= 0 ? sourceLocation.columnNumber : void 0);
      }
    } catch (error) {
      Common8.Console.Console.instance().error(
        i18nString2(UIStrings2.errorInDebuggerLanguagePlugin, { PH1: error.message }),
        /* show=*/
        false
      );
    }
    return null;
  }
  uiLocationToRawLocationRanges(uiSourceCode, lineNumber, columnNumber = -1) {
    const locationPromises = [];
    this.scriptsForUISourceCode(uiSourceCode).forEach((script) => {
      const rawModuleId = rawModuleIdForScript(script);
      const rawModuleHandle = this.#rawModuleHandles.get(rawModuleId);
      if (!rawModuleHandle) {
        return;
      }
      const { plugin } = rawModuleHandle;
      locationPromises.push(getLocations(rawModuleId, plugin, script));
    });
    if (locationPromises.length === 0) {
      return Promise.resolve(null);
    }
    return Promise.all(locationPromises).then((locations) => locations.flat()).catch((error) => {
      Common8.Console.Console.instance().error(
        i18nString2(UIStrings2.errorInDebuggerLanguagePlugin, { PH1: error.message }),
        /* show=*/
        false
      );
      return null;
    });
    async function getLocations(rawModuleId, plugin, script) {
      const pluginLocation = { rawModuleId, sourceFileURL: uiSourceCode.url(), lineNumber, columnNumber };
      const rawLocations = await plugin.sourceLocationToRawLocation(pluginLocation);
      if (!rawLocations) {
        return [];
      }
      return rawLocations.map((m) => ({
        start: new SDK8.DebuggerModel.Location(script.debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
        end: new SDK8.DebuggerModel.Location(script.debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0))
      }));
    }
  }
  async uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const locationRanges = await this.uiLocationToRawLocationRanges(uiSourceCode, lineNumber, columnNumber);
    if (!locationRanges) {
      return null;
    }
    return locationRanges.map(({ start }) => start);
  }
  async uiLocationRangeToRawLocationRanges(uiSourceCode, textRange) {
    const locationRangesPromises = [];
    for (let line = textRange.startLine; line <= textRange.endLine; ++line) {
      locationRangesPromises.push(this.uiLocationToRawLocationRanges(uiSourceCode, line));
    }
    const ranges = [];
    for (const locationRanges of await Promise.all(locationRangesPromises)) {
      if (locationRanges === null) {
        return null;
      }
      for (const range of locationRanges) {
        const [startLocation, endLocation] = await Promise.all([
          this.rawLocationToUILocation(range.start),
          this.rawLocationToUILocation(range.end)
        ]);
        if (startLocation === null || endLocation === null) {
          continue;
        }
        const overlap = textRange.intersection(new TextUtils5.TextRange.TextRange(startLocation.lineNumber, startLocation.columnNumber ?? 0, endLocation.lineNumber, endLocation.columnNumber ?? Infinity));
        if (!overlap.isEmpty()) {
          ranges.push(range);
        }
      }
    }
    return ranges;
  }
  async translateRawFramesStep(rawFrames, translatedFrames, target) {
    const frame = rawFrames[0];
    const script = target.model(SDK8.DebuggerModel.DebuggerModel)?.scriptForId(frame.scriptId ?? "");
    if (!script) {
      return false;
    }
    const functionInfo = await this.getFunctionInfo(script, frame);
    if (!functionInfo) {
      return false;
    }
    rawFrames.shift();
    if ("frames" in functionInfo && functionInfo.frames.length) {
      const framePromises = functionInfo.frames.map(async ({ name }, index) => {
        const rawLocation = new SDK8.DebuggerModel.Location(script.debuggerModel, script.scriptId, frame.lineNumber, frame.columnNumber, index);
        const uiLocation = await this.rawLocationToUILocation(rawLocation);
        return {
          uiSourceCode: uiLocation?.uiSourceCode,
          url: uiLocation ? void 0 : frame.url,
          name,
          line: uiLocation?.lineNumber ?? frame.lineNumber,
          column: uiLocation?.columnNumber ?? frame.columnNumber
        };
      });
      translatedFrames.push(await Promise.all(framePromises));
      return true;
    }
    const mappedFrame = {
      url: frame.url,
      name: frame.functionName,
      line: frame.lineNumber,
      column: frame.columnNumber
    };
    if ("missingSymbolFiles" in functionInfo && functionInfo.missingSymbolFiles.length) {
      translatedFrames.push([{
        ...mappedFrame,
        missingDebugInfo: {
          type: "PARTIAL_INFO",
          missingDebugFiles: functionInfo.missingSymbolFiles
        }
      }]);
    } else {
      translatedFrames.push([{
        ...mappedFrame,
        missingDebugInfo: {
          type: "NO_INFO"
        }
      }]);
    }
    return true;
  }
  scriptsForUISourceCode(uiSourceCode) {
    for (const modelData of this.#debuggerModelToData.values()) {
      const scripts = modelData.uiSourceCodeToScripts.get(uiSourceCode);
      if (scripts) {
        return scripts;
      }
    }
    return [];
  }
  setDebugInfoURL(script, externalURL) {
    if (this.hasPluginForScript(script)) {
      return;
    }
    script.debugSymbols = { type: "ExternalDWARF", externalURL };
    this.parsedScriptSource({ data: script });
    void script.debuggerModel.setDebugInfoURL(script, externalURL);
  }
  parsedScriptSource(event) {
    const script = event.data;
    if (!script.sourceURL) {
      return;
    }
    for (const plugin of this.#plugins) {
      if (!plugin.handleScript(script)) {
        continue;
      }
      const rawModuleId = rawModuleIdForScript(script);
      let rawModuleHandle = this.#rawModuleHandles.get(rawModuleId);
      if (!rawModuleHandle) {
        const sourceFileURLsPromise = (async () => {
          const console2 = Common8.Console.Console.instance();
          const url = script.sourceURL;
          const symbolsUrl = script.debugSymbols?.externalURL || "";
          if (symbolsUrl) {
            console2.log(i18nString2(UIStrings2.loadingDebugSymbolsForVia, { PH1: plugin.name, PH2: url, PH3: symbolsUrl }));
          } else {
            console2.log(i18nString2(UIStrings2.loadingDebugSymbolsFor, { PH1: plugin.name, PH2: url }));
          }
          try {
            const code = !symbolsUrl && Common8.ParsedURL.schemeIs(url, "wasm:") ? await script.getWasmBytecode() : void 0;
            const addModuleResult = await plugin.addRawModule(rawModuleId, symbolsUrl, { url, code });
            if (rawModuleHandle !== this.#rawModuleHandles.get(rawModuleId)) {
              return [];
            }
            if ("missingSymbolFiles" in addModuleResult) {
              const initiator = plugin.createPageResourceLoadInitiator();
              const missingSymbolFiles = addModuleResult.missingSymbolFiles.map((resource) => {
                const resourceUrl = resource;
                return { resourceUrl, initiator };
              });
              return { missingSymbolFiles };
            }
            const sourceFileURLs = addModuleResult;
            if (sourceFileURLs.length === 0) {
              console2.warn(i18nString2(UIStrings2.loadedDebugSymbolsForButDidnt, { PH1: plugin.name, PH2: url }));
            } else {
              console2.log(i18nString2(UIStrings2.loadedDebugSymbolsForFound, { PH1: plugin.name, PH2: url, PH3: sourceFileURLs.length }));
            }
            return sourceFileURLs;
          } catch (error) {
            console2.error(
              i18nString2(UIStrings2.failedToLoadDebugSymbolsFor, { PH1: plugin.name, PH2: url, PH3: error.message }),
              /* show=*/
              false
            );
            this.#rawModuleHandles.delete(rawModuleId);
            return [];
          }
        })();
        rawModuleHandle = { rawModuleId, plugin, scripts: [script], addRawModulePromise: sourceFileURLsPromise };
        this.#rawModuleHandles.set(rawModuleId, rawModuleHandle);
      } else {
        rawModuleHandle.scripts.push(script);
      }
      void rawModuleHandle.addRawModulePromise.then((sourceFileURLs) => {
        if (!("missingSymbolFiles" in sourceFileURLs)) {
          if (script.debuggerModel.scriptForId(script.scriptId) === script) {
            const modelData = this.#debuggerModelToData.get(script.debuggerModel);
            if (modelData) {
              modelData.addSourceFiles(script, sourceFileURLs);
              void this.#debuggerWorkspaceBinding.updateLocations(script);
            }
          }
        }
      });
      return;
    }
  }
  debuggerResumed(event) {
    const resumedFrames = Array.from(this.callFrameByStopId.values()).filter((callFrame) => callFrame.debuggerModel === event.data);
    for (const callFrame of resumedFrames) {
      const stopId = this.stopIdByCallFrame.get(callFrame);
      assertNotNullOrUndefined(stopId);
      this.stopIdByCallFrame.delete(callFrame);
      this.callFrameByStopId.delete(stopId);
    }
  }
  getSourcesForScript(script) {
    const rawModuleId = rawModuleIdForScript(script);
    const rawModuleHandle = this.#rawModuleHandles.get(rawModuleId);
    if (rawModuleHandle) {
      return rawModuleHandle.addRawModulePromise;
    }
    return Promise.resolve(void 0);
  }
  async resolveScopeChain(callFrame) {
    const script = callFrame.script;
    const { rawModuleId, plugin } = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }
    const location = {
      rawModuleId,
      codeOffset: callFrame.location().columnNumber - (script.codeOffset() || 0),
      inlineFrameIndex: callFrame.inlineFrameIndex
    };
    const stopId = this.stopIdForCallFrame(callFrame);
    try {
      const sourceMapping = await plugin.rawLocationToSourceLocation(location);
      if (sourceMapping.length === 0) {
        return null;
      }
      const scopes = /* @__PURE__ */ new Map();
      const variables = await plugin.listVariablesInScope(location);
      for (const variable of variables || []) {
        let scope = scopes.get(variable.scope);
        if (!scope) {
          const { type, typeName, icon } = await plugin.getScopeInfo(variable.scope);
          scope = new SourceScope(callFrame, stopId, type, typeName, icon, plugin);
          scopes.set(variable.scope, scope);
        }
        scope.object().variables.push(variable);
      }
      return Array.from(scopes.values());
    } catch (error) {
      Common8.Console.Console.instance().error(
        i18nString2(UIStrings2.errorInDebuggerLanguagePlugin, { PH1: error.message }),
        /* show=*/
        false
      );
      return null;
    }
  }
  async getFunctionInfo(script, location) {
    const { rawModuleId, plugin } = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return null;
    }
    const rawLocation = {
      rawModuleId,
      codeOffset: location.columnNumber - (script.codeOffset() || 0),
      inlineFrameIndex: 0
    };
    try {
      const functionInfo = await plugin.getFunctionInfo(rawLocation);
      if ("missingSymbolFiles" in functionInfo) {
        const initiator = plugin.createPageResourceLoadInitiator();
        const missingSymbolFiles = functionInfo.missingSymbolFiles.map((resource) => {
          const resourceUrl = resource;
          return { resourceUrl, initiator };
        });
        return { missingSymbolFiles, ..."frames" in functionInfo && { frames: functionInfo.frames } };
      }
      return functionInfo;
    } catch (error) {
      Common8.Console.Console.instance().warn(i18nString2(UIStrings2.errorInDebuggerLanguagePlugin, { PH1: error.message }));
      return { frames: [] };
    }
  }
  async getInlinedFunctionRanges(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const { rawModuleId, plugin } = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return [];
    }
    const pluginLocation = {
      rawModuleId,
      // RawLocation.#columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0)
    };
    try {
      const locations = await plugin.getInlinedFunctionRanges(pluginLocation);
      return locations.map((m) => ({
        start: new SDK8.DebuggerModel.Location(script.debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
        end: new SDK8.DebuggerModel.Location(script.debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0))
      }));
    } catch (error) {
      Common8.Console.Console.instance().warn(i18nString2(UIStrings2.errorInDebuggerLanguagePlugin, { PH1: error.message }));
      return [];
    }
  }
  async getInlinedCalleesRanges(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return [];
    }
    const { rawModuleId, plugin } = await this.rawModuleIdAndPluginForScript(script);
    if (!plugin) {
      return [];
    }
    const pluginLocation = {
      rawModuleId,
      // RawLocation.#columnNumber is the byte offset in the full raw wasm module. Plugins expect the offset in the code
      // section, so subtract the offset of the code section in the module here.
      codeOffset: rawLocation.columnNumber - (script.codeOffset() || 0)
    };
    try {
      const locations = await plugin.getInlinedCalleesRanges(pluginLocation);
      return locations.map((m) => ({
        start: new SDK8.DebuggerModel.Location(script.debuggerModel, script.scriptId, 0, Number(m.startOffset) + (script.codeOffset() || 0)),
        end: new SDK8.DebuggerModel.Location(script.debuggerModel, script.scriptId, 0, Number(m.endOffset) + (script.codeOffset() || 0))
      }));
    } catch (error) {
      Common8.Console.Console.instance().warn(i18nString2(UIStrings2.errorInDebuggerLanguagePlugin, { PH1: error.message }));
      return [];
    }
  }
  async getMappedLines(uiSourceCode) {
    const rawModuleIds = await Promise.all(this.scriptsForUISourceCode(uiSourceCode).map((s) => this.rawModuleIdAndPluginForScript(s)));
    let mappedLines = null;
    for (const { rawModuleId, plugin } of rawModuleIds) {
      if (!plugin) {
        continue;
      }
      const lines = await plugin.getMappedLines(rawModuleId, uiSourceCode.url());
      if (lines === void 0) {
        continue;
      }
      if (mappedLines === null) {
        mappedLines = new Set(lines);
      } else {
        lines.forEach((l) => mappedLines.add(l));
      }
    }
    return mappedLines;
  }
};
var ModelData = class {
  project;
  uiSourceCodeToScripts;
  constructor(debuggerModel, workspace) {
    this.project = new ContentProviderBasedProject(
      workspace,
      "language_plugins::" + debuggerModel.target().id(),
      Workspace11.Workspace.projectTypes.Network,
      "",
      false
      /* isServiceProject */
    );
    NetworkProject.setTargetForProject(this.project, debuggerModel.target());
    this.uiSourceCodeToScripts = /* @__PURE__ */ new Map();
  }
  addSourceFiles(script, urls) {
    const initiator = script.createPageResourceLoadInitiator();
    for (const url of urls) {
      let uiSourceCode = this.project.uiSourceCodeForURL(url);
      if (!uiSourceCode) {
        uiSourceCode = this.project.createUISourceCode(url, Common8.ResourceType.resourceTypes.SourceMapScript);
        NetworkProject.setInitialFrameAttribution(uiSourceCode, script.frameId);
        this.uiSourceCodeToScripts.set(uiSourceCode, [script]);
        const contentProvider = new SDK8.CompilerSourceMappingContentProvider.CompilerSourceMappingContentProvider(url, Common8.ResourceType.resourceTypes.SourceMapScript, initiator);
        const mimeType = Common8.ResourceType.ResourceType.mimeFromURL(url) || "text/javascript";
        this.project.addUISourceCodeWithProvider(uiSourceCode, contentProvider, null, mimeType);
      } else {
        const scripts = this.uiSourceCodeToScripts.get(uiSourceCode);
        if (!scripts.includes(script)) {
          scripts.push(script);
        }
      }
    }
  }
  removeScript(script) {
    this.uiSourceCodeToScripts.forEach((scripts, uiSourceCode) => {
      scripts = scripts.filter((s) => s !== script);
      if (scripts.length === 0) {
        this.uiSourceCodeToScripts.delete(uiSourceCode);
        this.project.removeUISourceCode(uiSourceCode.url());
      } else {
        this.uiSourceCodeToScripts.set(uiSourceCode, scripts);
      }
    });
  }
  dispose() {
    this.project.dispose();
  }
  getProject() {
    return this.project;
  }
};

// gen/front_end/models/bindings/DebuggerWorkspaceBinding.js
var DebuggerWorkspaceBinding_exports = {};
__export(DebuggerWorkspaceBinding_exports, {
  DebuggerWorkspaceBinding: () => DebuggerWorkspaceBinding,
  Location: () => Location
});
import * as Common11 from "./../../core/common/common.js";
import * as Platform6 from "./../../core/platform/platform.js";
import * as SDK11 from "./../../core/sdk/sdk.js";
import * as Workspace17 from "./../workspace/workspace.js";

// gen/front_end/models/bindings/DefaultScriptMapping.js
var DefaultScriptMapping_exports = {};
__export(DefaultScriptMapping_exports, {
  DefaultScriptMapping: () => DefaultScriptMapping
});
import * as Common9 from "./../../core/common/common.js";
import * as SDK9 from "./../../core/sdk/sdk.js";
import * as Workspace13 from "./../workspace/workspace.js";
var DefaultScriptMapping = class _DefaultScriptMapping {
  #debuggerWorkspaceBinding;
  #project;
  #eventListeners;
  #uiSourceCodeToScript;
  #scriptToUISourceCode;
  constructor(debuggerModel, workspace, debuggerWorkspaceBinding) {
    defaultScriptMappings.add(this);
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#project = new ContentProviderBasedProject(
      workspace,
      "debugger:" + debuggerModel.target().id(),
      Workspace13.Workspace.projectTypes.Debugger,
      "",
      true
      /* isServiceProject */
    );
    this.#eventListeners = [
      debuggerModel.addEventListener(SDK9.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this),
      debuggerModel.addEventListener(SDK9.DebuggerModel.Events.ParsedScriptSource, this.parsedScriptSource, this),
      debuggerModel.addEventListener(SDK9.DebuggerModel.Events.DiscardedAnonymousScriptSource, this.discardedScriptSource, this)
    ];
    this.#uiSourceCodeToScript = /* @__PURE__ */ new Map();
    this.#scriptToUISourceCode = /* @__PURE__ */ new Map();
  }
  static createV8ScriptURL(script) {
    const name = Common9.ParsedURL.ParsedURL.extractName(script.sourceURL);
    const url = "debugger:///VM" + script.scriptId + (name ? " " + name : "");
    return url;
  }
  static scriptForUISourceCode(uiSourceCode) {
    for (const defaultScriptMapping of defaultScriptMappings) {
      const script = defaultScriptMapping.#uiSourceCodeToScript.get(uiSourceCode);
      if (script !== void 0) {
        return script;
      }
    }
    return null;
  }
  uiSourceCodeForScript(script) {
    return this.#scriptToUISourceCode.get(script) ?? null;
  }
  rawLocationToUILocation(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const uiSourceCode = this.#scriptToUISourceCode.get(script);
    if (!uiSourceCode) {
      return null;
    }
    const { lineNumber, columnNumber } = script.rawLocationToRelativeLocation(rawLocation);
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const script = this.#uiSourceCodeToScript.get(uiSourceCode);
    if (!script) {
      return [];
    }
    ({ lineNumber, columnNumber } = script.relativeLocationToRawLocation({ lineNumber, columnNumber }));
    return [script.debuggerModel.createRawLocation(script, lineNumber, columnNumber ?? 0)];
  }
  uiLocationRangeToRawLocationRanges(uiSourceCode, { startLine, startColumn, endLine, endColumn }) {
    const script = this.#uiSourceCodeToScript.get(uiSourceCode);
    if (!script) {
      return [];
    }
    ({ lineNumber: startLine, columnNumber: startColumn } = script.relativeLocationToRawLocation({ lineNumber: startLine, columnNumber: startColumn }));
    ({ lineNumber: endLine, columnNumber: endColumn } = script.relativeLocationToRawLocation({ lineNumber: endLine, columnNumber: endColumn }));
    const start = script.debuggerModel.createRawLocation(script, startLine, startColumn);
    const end = script.debuggerModel.createRawLocation(script, endLine, endColumn);
    return [{ start, end }];
  }
  parsedScriptSource(event) {
    const script = event.data;
    const url = _DefaultScriptMapping.createV8ScriptURL(script);
    const uiSourceCode = this.#project.createUISourceCode(url, Common9.ResourceType.resourceTypes.Script);
    if (script.isBreakpointCondition) {
      uiSourceCode.markAsUnconditionallyIgnoreListed();
    }
    this.#uiSourceCodeToScript.set(uiSourceCode, script);
    this.#scriptToUISourceCode.set(script, uiSourceCode);
    this.#project.addUISourceCodeWithProvider(uiSourceCode, script, null, "text/javascript");
    void this.#debuggerWorkspaceBinding.updateLocations(script);
  }
  discardedScriptSource(event) {
    const script = event.data;
    const uiSourceCode = this.#scriptToUISourceCode.get(script);
    if (uiSourceCode === void 0) {
      return;
    }
    this.#scriptToUISourceCode.delete(script);
    this.#uiSourceCodeToScript.delete(uiSourceCode);
    this.#project.removeUISourceCode(uiSourceCode.url());
  }
  globalObjectCleared() {
    this.#scriptToUISourceCode.clear();
    this.#uiSourceCodeToScript.clear();
    this.#project.reset();
  }
  dispose() {
    defaultScriptMappings.delete(this);
    Common9.EventTarget.removeEventListeners(this.#eventListeners);
    this.globalObjectCleared();
    this.#project.dispose();
  }
};
var defaultScriptMappings = /* @__PURE__ */ new Set();

// gen/front_end/models/bindings/ResourceScriptMapping.js
var ResourceScriptMapping_exports = {};
__export(ResourceScriptMapping_exports, {
  ResourceScriptFile: () => ResourceScriptFile,
  ResourceScriptMapping: () => ResourceScriptMapping
});
import * as Common10 from "./../../core/common/common.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Platform5 from "./../../core/platform/platform.js";
import * as Root from "./../../core/root/root.js";
import * as SDK10 from "./../../core/sdk/sdk.js";
import * as TextUtils6 from "./../text_utils/text_utils.js";
import * as Workspace15 from "./../workspace/workspace.js";
var UIStrings3 = {
  /**
   * @description Error text displayed in the console when editing a live script fails. LiveEdit is
   *the name of the feature for editing code that is already running.
   * @example {warning} PH1
   */
  liveEditFailed: "`LiveEdit` failed: {PH1}",
  /**
   * @description Error text displayed in the console when compiling a live-edited script fails. LiveEdit is
   *the name of the feature for editing code that is already running.
   * @example {connection lost} PH1
   */
  liveEditCompileFailed: "`LiveEdit` compile failed: {PH1}"
};
var str_3 = i18n5.i18n.registerUIStrings("models/bindings/ResourceScriptMapping.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var ResourceScriptMapping = class {
  debuggerModel;
  #workspace;
  debuggerWorkspaceBinding;
  #uiSourceCodeToScriptFile;
  #projects;
  #scriptToUISourceCode;
  #eventListeners;
  constructor(debuggerModel, workspace, debuggerWorkspaceBinding) {
    this.debuggerModel = debuggerModel;
    this.#workspace = workspace;
    this.debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.#uiSourceCodeToScriptFile = /* @__PURE__ */ new Map();
    this.#projects = /* @__PURE__ */ new Map();
    this.#scriptToUISourceCode = /* @__PURE__ */ new Map();
    const runtimeModel = debuggerModel.runtimeModel();
    this.#eventListeners = [
      this.debuggerModel.addEventListener(SDK10.DebuggerModel.Events.ParsedScriptSource, (event) => this.addScript(event.data), this),
      this.debuggerModel.addEventListener(SDK10.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this),
      runtimeModel.addEventListener(SDK10.RuntimeModel.Events.ExecutionContextDestroyed, this.executionContextDestroyed, this),
      runtimeModel.target().targetManager().addEventListener("InspectedURLChanged", this.inspectedURLChanged, this)
    ];
  }
  project(script) {
    const prefix = script.isContentScript() ? "js:extensions:" : "js::";
    const projectId = prefix + this.debuggerModel.target().id() + ":" + script.frameId;
    let project = this.#projects.get(projectId);
    if (!project) {
      const projectType = script.isContentScript() ? Workspace15.Workspace.projectTypes.ContentScripts : Workspace15.Workspace.projectTypes.Network;
      project = new ContentProviderBasedProject(
        this.#workspace,
        projectId,
        projectType,
        "",
        false
        /* isServiceProject */
      );
      NetworkProject.setTargetForProject(project, this.debuggerModel.target());
      this.#projects.set(projectId, project);
    }
    return project;
  }
  uiSourceCodeForScript(script) {
    return this.#scriptToUISourceCode.get(script) ?? null;
  }
  rawLocationToUILocation(rawLocation) {
    const script = rawLocation.script();
    if (!script) {
      return null;
    }
    const uiSourceCode = this.#scriptToUISourceCode.get(script);
    if (!uiSourceCode) {
      return null;
    }
    const scriptFile = this.#uiSourceCodeToScriptFile.get(uiSourceCode);
    if (!scriptFile) {
      return null;
    }
    if (scriptFile.hasDivergedFromVM() && !scriptFile.isMergingToVM() || scriptFile.isDivergingFromVM()) {
      return null;
    }
    if (scriptFile.script !== script) {
      return null;
    }
    const { lineNumber, columnNumber = 0 } = rawLocation;
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const scriptFile = this.#uiSourceCodeToScriptFile.get(uiSourceCode);
    if (!scriptFile) {
      return [];
    }
    const { script } = scriptFile;
    if (!script) {
      return [];
    }
    return [this.debuggerModel.createRawLocation(script, lineNumber, columnNumber)];
  }
  uiLocationRangeToRawLocationRanges(uiSourceCode, { startLine, startColumn, endLine, endColumn }) {
    const scriptFile = this.#uiSourceCodeToScriptFile.get(uiSourceCode);
    if (!scriptFile) {
      return null;
    }
    const { script } = scriptFile;
    if (!script) {
      return null;
    }
    const start = this.debuggerModel.createRawLocation(script, startLine, startColumn);
    const end = this.debuggerModel.createRawLocation(script, endLine, endColumn);
    return [{ start, end }];
  }
  inspectedURLChanged(event) {
    for (let target = this.debuggerModel.target(); target !== event.data; target = target.parentTarget()) {
      if (target === null) {
        return;
      }
    }
    for (const script of Array.from(this.#scriptToUISourceCode.keys())) {
      this.removeScripts([script]);
      this.addScript(script);
    }
  }
  addScript(script) {
    if (script.isLiveEdit() || script.isBreakpointCondition) {
      return;
    }
    let url = script.sourceURL;
    if (!url) {
      return;
    }
    if (script.hasSourceURL) {
      url = SDK10.SourceMapManager.SourceMapManager.resolveRelativeSourceURL(script.debuggerModel.target(), url);
    } else {
      if (script.isInlineScript()) {
        return;
      }
      if (script.isContentScript()) {
        const parsedURL = new Common10.ParsedURL.ParsedURL(url);
        if (!parsedURL.isValid) {
          return;
        }
      }
    }
    const project = this.project(script);
    const oldUISourceCode = project.uiSourceCodeForURL(url);
    if (oldUISourceCode) {
      const oldScriptFile = this.#uiSourceCodeToScriptFile.get(oldUISourceCode);
      if (oldScriptFile?.script) {
        this.removeScripts([oldScriptFile.script]);
      }
    }
    const originalContentProvider = script.originalContentProvider();
    const uiSourceCode = project.createUISourceCode(url, originalContentProvider.contentType());
    NetworkProject.setInitialFrameAttribution(uiSourceCode, script.frameId);
    const metadata = metadataForURL(this.debuggerModel.target(), script.frameId, url);
    const scriptFile = new ResourceScriptFile(this, uiSourceCode, script);
    this.#uiSourceCodeToScriptFile.set(uiSourceCode, scriptFile);
    this.#scriptToUISourceCode.set(script, uiSourceCode);
    const mimeType = script.isWasm() ? "application/wasm" : "text/javascript";
    project.addUISourceCodeWithProvider(uiSourceCode, originalContentProvider, metadata, mimeType);
    void this.debuggerWorkspaceBinding.updateLocations(script);
  }
  scriptFile(uiSourceCode) {
    return this.#uiSourceCodeToScriptFile.get(uiSourceCode) || null;
  }
  removeScripts(scripts) {
    const uiSourceCodesByProject = new Platform5.MapUtilities.Multimap();
    for (const script of scripts) {
      const uiSourceCode = this.#scriptToUISourceCode.get(script);
      if (!uiSourceCode) {
        continue;
      }
      const scriptFile = this.#uiSourceCodeToScriptFile.get(uiSourceCode);
      if (scriptFile) {
        scriptFile.dispose();
      }
      this.#uiSourceCodeToScriptFile.delete(uiSourceCode);
      this.#scriptToUISourceCode.delete(script);
      uiSourceCodesByProject.set(uiSourceCode.project(), uiSourceCode);
      void this.debuggerWorkspaceBinding.updateLocations(script);
    }
    for (const project of uiSourceCodesByProject.keysArray()) {
      const uiSourceCodes = uiSourceCodesByProject.get(project);
      let allInProjectRemoved = true;
      for (const projectSourceCode of project.uiSourceCodes()) {
        if (!uiSourceCodes.has(projectSourceCode)) {
          allInProjectRemoved = false;
          break;
        }
      }
      if (allInProjectRemoved) {
        this.#projects.delete(project.id());
        project.removeProject();
      } else {
        uiSourceCodes.forEach((c) => project.removeUISourceCode(c.url()));
      }
    }
  }
  executionContextDestroyed(event) {
    const executionContext = event.data;
    this.removeScripts(this.debuggerModel.scriptsForExecutionContext(executionContext));
  }
  globalObjectCleared() {
    const scripts = Array.from(this.#scriptToUISourceCode.keys());
    this.removeScripts(scripts);
  }
  resetForTest() {
    this.globalObjectCleared();
  }
  dispose() {
    Common10.EventTarget.removeEventListeners(this.#eventListeners);
    this.globalObjectCleared();
  }
};
var ResourceScriptFile = class extends Common10.ObjectWrapper.ObjectWrapper {
  #resourceScriptMapping;
  uiSourceCode;
  script;
  #scriptSource;
  #isDivergingFromVM;
  #hasDivergedFromVM;
  #isMergingToVM;
  #updateMutex = new Common10.Mutex.Mutex();
  constructor(resourceScriptMapping, uiSourceCode, script) {
    super();
    this.#resourceScriptMapping = resourceScriptMapping;
    this.uiSourceCode = uiSourceCode;
    this.script = this.uiSourceCode.contentType().isScript() ? script : null;
    this.uiSourceCode.addEventListener(Workspace15.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.uiSourceCode.addEventListener(Workspace15.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
  }
  isDiverged() {
    if (this.uiSourceCode.isDirty()) {
      return true;
    }
    if (!this.script) {
      return false;
    }
    if (typeof this.#scriptSource === "undefined" || this.#scriptSource === null) {
      return false;
    }
    const workingCopy = this.uiSourceCode.workingCopy();
    if (!workingCopy) {
      return false;
    }
    if (!workingCopy.startsWith(this.#scriptSource.trimEnd())) {
      return true;
    }
    const suffix = this.uiSourceCode.workingCopy().substr(this.#scriptSource.length);
    return Boolean(suffix.length) && !suffix.match(SDK10.Script.sourceURLRegex);
  }
  workingCopyChanged() {
    void this.update();
  }
  workingCopyCommitted() {
    if (Root.Runtime.hostConfig.devToolsLiveEdit?.enabled === false) {
      return;
    }
    if (this.uiSourceCode.project().canSetFileContent()) {
      return;
    }
    if (!this.script) {
      return;
    }
    const source = this.uiSourceCode.workingCopy();
    void this.script.editSource(source).then(({ status, exceptionDetails }) => {
      void this.scriptSourceWasSet(source, status, exceptionDetails);
    });
  }
  async scriptSourceWasSet(source, status, exceptionDetails) {
    if (status === "Ok") {
      this.#scriptSource = source;
    }
    await this.update();
    if (status === "Ok") {
      return;
    }
    if (!exceptionDetails) {
      Common10.Console.Console.instance().addMessage(
        i18nString3(UIStrings3.liveEditFailed, { PH1: getErrorText(status) }),
        "warning"
        /* Common.Console.MessageLevel.WARNING */
      );
      return;
    }
    const messageText = i18nString3(UIStrings3.liveEditCompileFailed, { PH1: exceptionDetails.text });
    this.uiSourceCode.addLineMessage("Error", messageText, exceptionDetails.lineNumber, exceptionDetails.columnNumber);
    function getErrorText(status2) {
      switch (status2) {
        case "BlockedByActiveFunction":
          return "Functions that are on the stack (currently being executed) can not be edited";
        case "BlockedByActiveGenerator":
          return "Async functions/generators that are active can not be edited";
        case "BlockedByTopLevelEsModuleChange":
          return "The top-level of ES modules can not be edited";
        case "CompileError":
        case "Ok":
          throw new Error("Compile errors and Ok status must not be reported on the console");
      }
    }
  }
  async update() {
    const release = await this.#updateMutex.acquire();
    const diverged = this.isDiverged();
    if (diverged && !this.#hasDivergedFromVM) {
      await this.divergeFromVM();
    } else if (!diverged && this.#hasDivergedFromVM) {
      await this.mergeToVM();
    }
    release();
  }
  async divergeFromVM() {
    if (this.script) {
      this.#isDivergingFromVM = true;
      await this.#resourceScriptMapping.debuggerWorkspaceBinding.updateLocations(this.script);
      this.#isDivergingFromVM = void 0;
      this.#hasDivergedFromVM = true;
      this.dispatchEventToListeners(
        "DidDivergeFromVM"
        /* ResourceScriptFile.Events.DID_DIVERGE_FROM_VM */
      );
    }
  }
  async mergeToVM() {
    if (this.script) {
      this.#hasDivergedFromVM = void 0;
      this.#isMergingToVM = true;
      await this.#resourceScriptMapping.debuggerWorkspaceBinding.updateLocations(this.script);
      this.#isMergingToVM = void 0;
      this.dispatchEventToListeners(
        "DidMergeToVM"
        /* ResourceScriptFile.Events.DID_MERGE_TO_VM */
      );
    }
  }
  hasDivergedFromVM() {
    return Boolean(this.#hasDivergedFromVM);
  }
  isDivergingFromVM() {
    return Boolean(this.#isDivergingFromVM);
  }
  isMergingToVM() {
    return Boolean(this.#isMergingToVM);
  }
  checkMapping() {
    if (!this.script || typeof this.#scriptSource !== "undefined") {
      this.mappingCheckedForTest();
      return;
    }
    void this.script.requestContentData().then((content) => {
      this.#scriptSource = TextUtils6.ContentData.ContentData.textOr(content, null);
      void this.update().then(() => this.mappingCheckedForTest());
    });
  }
  mappingCheckedForTest() {
  }
  dispose() {
    this.uiSourceCode.removeEventListener(Workspace15.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.uiSourceCode.removeEventListener(Workspace15.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
  }
  addSourceMapURL(sourceMapURL) {
    if (!this.script) {
      return;
    }
    this.script.debuggerModel.setSourceMapURL(this.script, sourceMapURL);
  }
  addDebugInfoURL(debugInfoURL) {
    if (!this.script) {
      return;
    }
    const { pluginManager } = DebuggerWorkspaceBinding.instance();
    pluginManager.setDebugInfoURL(this.script, debugInfoURL);
  }
  hasSourceMapURL() {
    return Boolean(this.script?.sourceMapURL);
  }
  async missingSymbolFiles() {
    if (!this.script) {
      return null;
    }
    const { pluginManager } = this.#resourceScriptMapping.debuggerWorkspaceBinding;
    const sources = await pluginManager.getSourcesForScript(this.script);
    return sources && "missingSymbolFiles" in sources ? sources.missingSymbolFiles : null;
  }
};

// gen/front_end/models/bindings/DebuggerWorkspaceBinding.js
var debuggerWorkspaceBindingInstance;
var DebuggerWorkspaceBinding = class _DebuggerWorkspaceBinding {
  resourceMapping;
  #debuggerModelToData;
  #liveLocationPromises;
  pluginManager;
  ignoreListManager;
  constructor(resourceMapping, targetManager, ignoreListManager) {
    this.resourceMapping = resourceMapping;
    this.ignoreListManager = ignoreListManager;
    this.#debuggerModelToData = /* @__PURE__ */ new Map();
    targetManager.addModelListener(SDK11.DebuggerModel.DebuggerModel, SDK11.DebuggerModel.Events.GlobalObjectCleared, this.globalObjectCleared, this);
    targetManager.addModelListener(SDK11.DebuggerModel.DebuggerModel, SDK11.DebuggerModel.Events.DebuggerResumed, this.debuggerResumed, this);
    targetManager.observeModels(SDK11.DebuggerModel.DebuggerModel, this);
    this.ignoreListManager.addEventListener("IGNORED_SCRIPT_RANGES_UPDATED", (event) => this.updateLocations(event.data));
    this.#liveLocationPromises = /* @__PURE__ */ new Set();
    this.pluginManager = new DebuggerLanguagePluginManager(targetManager, resourceMapping.workspace, this);
  }
  setFunctionRanges(uiSourceCode, ranges) {
    for (const modelData of this.#debuggerModelToData.values()) {
      modelData.compilerMapping.setFunctionRanges(uiSourceCode, ranges);
    }
  }
  static instance(opts = { forceNew: null, resourceMapping: null, targetManager: null, ignoreListManager: null }) {
    const { forceNew, resourceMapping, targetManager, ignoreListManager } = opts;
    if (!debuggerWorkspaceBindingInstance || forceNew) {
      if (!resourceMapping || !targetManager || !ignoreListManager) {
        throw new Error(`Unable to create DebuggerWorkspaceBinding: resourceMapping, targetManager and IgnoreLIstManager must be provided: ${new Error().stack}`);
      }
      debuggerWorkspaceBindingInstance = new _DebuggerWorkspaceBinding(resourceMapping, targetManager, ignoreListManager);
    }
    return debuggerWorkspaceBindingInstance;
  }
  static removeInstance() {
    debuggerWorkspaceBindingInstance = void 0;
  }
  async computeAutoStepRanges(mode, callFrame) {
    function contained(location, range) {
      const { start, end } = range;
      if (start.scriptId !== location.scriptId) {
        return false;
      }
      if (location.lineNumber < start.lineNumber || location.lineNumber > end.lineNumber) {
        return false;
      }
      if (location.lineNumber === start.lineNumber && location.columnNumber < start.columnNumber) {
        return false;
      }
      if (location.lineNumber === end.lineNumber && location.columnNumber >= end.columnNumber) {
        return false;
      }
      return true;
    }
    const rawLocation = callFrame.location();
    if (!rawLocation) {
      return [];
    }
    const pluginManager = this.pluginManager;
    let ranges = [];
    if (mode === "StepOut") {
      return await pluginManager.getInlinedFunctionRanges(rawLocation);
    }
    const uiLocation = await pluginManager.rawLocationToUILocation(rawLocation);
    if (uiLocation) {
      ranges = await pluginManager.uiLocationToRawLocationRanges(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber) || [];
      ranges = ranges.filter((range) => contained(rawLocation, range));
      if (mode === "StepOver") {
        ranges = ranges.concat(await pluginManager.getInlinedCalleesRanges(rawLocation));
      }
      return ranges;
    }
    const compilerMapping = this.#debuggerModelToData.get(rawLocation.debuggerModel)?.compilerMapping;
    if (!compilerMapping) {
      return [];
    }
    ranges = compilerMapping.getLocationRangesForSameSourceLocation(rawLocation);
    ranges = ranges.filter((range) => contained(rawLocation, range));
    return ranges;
  }
  modelAdded(debuggerModel) {
    debuggerModel.setBeforePausedCallback(this.shouldPause.bind(this));
    this.#debuggerModelToData.set(debuggerModel, new ModelData2(debuggerModel, this));
    debuggerModel.setComputeAutoStepRangesCallback(this.computeAutoStepRanges.bind(this));
  }
  modelRemoved(debuggerModel) {
    debuggerModel.setComputeAutoStepRangesCallback(null);
    const modelData = this.#debuggerModelToData.get(debuggerModel);
    if (modelData) {
      modelData.dispose();
      this.#debuggerModelToData.delete(debuggerModel);
    }
  }
  /**
   * The promise returned by this function is resolved once all *currently*
   * pending LiveLocations are processed.
   */
  async pendingLiveLocationChangesPromise() {
    await Promise.all(this.#liveLocationPromises);
  }
  recordLiveLocationChange(promise) {
    void promise.then(() => {
      this.#liveLocationPromises.delete(promise);
    });
    this.#liveLocationPromises.add(promise);
  }
  async updateLocations(script) {
    const updatePromises = [script.target().model(StackTraceModel_exports.StackTraceModel)?.scriptInfoChanged(script, this.#translateRawFrames.bind(this))];
    const modelData = this.#debuggerModelToData.get(script.debuggerModel);
    if (modelData) {
      const updatePromise = modelData.updateLocations(script);
      this.recordLiveLocationChange(updatePromise);
      updatePromises.push(updatePromise);
    }
    await Promise.all(updatePromises);
  }
  async createStackTraceFromProtocolRuntime(stackTrace, target) {
    const model = target.model(StackTraceModel_exports.StackTraceModel);
    return await model.createFromProtocolRuntime(stackTrace, this.#translateRawFrames.bind(this));
  }
  async createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const modelData = this.#debuggerModelToData.get(rawLocation.debuggerModel);
    if (!modelData) {
      return null;
    }
    const liveLocationPromise = modelData.createLiveLocation(rawLocation, updateDelegate, locationPool);
    this.recordLiveLocationChange(liveLocationPromise);
    return await liveLocationPromise;
  }
  async createStackTraceTopFrameLiveLocation(rawLocations, updateDelegate, locationPool) {
    console.assert(rawLocations.length > 0);
    const locationPromise = StackTraceTopFrameLocation.createStackTraceTopFrameLocation(rawLocations, this, updateDelegate, locationPool);
    this.recordLiveLocationChange(locationPromise);
    return await locationPromise;
  }
  async createCallFrameLiveLocation(location, updateDelegate, locationPool) {
    const script = location.script();
    if (!script) {
      return null;
    }
    const debuggerModel = location.debuggerModel;
    const liveLocationPromise = this.createLiveLocation(location, updateDelegate, locationPool);
    this.recordLiveLocationChange(liveLocationPromise);
    const liveLocation = await liveLocationPromise;
    if (!liveLocation) {
      return null;
    }
    this.registerCallFrameLiveLocation(debuggerModel, liveLocation);
    return liveLocation;
  }
  async rawLocationToUILocation(rawLocation) {
    const uiLocation = await this.pluginManager.rawLocationToUILocation(rawLocation);
    if (uiLocation) {
      return uiLocation;
    }
    const modelData = this.#debuggerModelToData.get(rawLocation.debuggerModel);
    return modelData ? modelData.rawLocationToUILocation(rawLocation) : null;
  }
  uiSourceCodeForSourceMapSourceURL(debuggerModel, url, isContentScript) {
    const modelData = this.#debuggerModelToData.get(debuggerModel);
    if (!modelData) {
      return null;
    }
    return modelData.compilerMapping.uiSourceCodeForURL(url, isContentScript);
  }
  async uiSourceCodeForSourceMapSourceURLPromise(debuggerModel, url, isContentScript) {
    const uiSourceCode = this.uiSourceCodeForSourceMapSourceURL(debuggerModel, url, isContentScript);
    return await (uiSourceCode || this.waitForUISourceCodeAdded(url, debuggerModel.target()));
  }
  async uiSourceCodeForDebuggerLanguagePluginSourceURLPromise(debuggerModel, url) {
    const uiSourceCode = this.pluginManager.uiSourceCodeForURL(debuggerModel, url);
    return await (uiSourceCode || this.waitForUISourceCodeAdded(url, debuggerModel.target()));
  }
  uiSourceCodeForScript(script) {
    const modelData = this.#debuggerModelToData.get(script.debuggerModel);
    if (!modelData) {
      return null;
    }
    return modelData.uiSourceCodeForScript(script);
  }
  waitForUISourceCodeAdded(url, target) {
    return new Promise((resolve) => {
      const workspace = Workspace17.Workspace.WorkspaceImpl.instance();
      const descriptor = workspace.addEventListener(Workspace17.Workspace.Events.UISourceCodeAdded, (event) => {
        const uiSourceCode = event.data;
        if (uiSourceCode.url() === url && NetworkProject.targetForUISourceCode(uiSourceCode) === target) {
          workspace.removeEventListener(Workspace17.Workspace.Events.UISourceCodeAdded, descriptor.listener);
          resolve(uiSourceCode);
        }
      });
    });
  }
  async uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    const locations = await this.pluginManager.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
    if (locations) {
      return locations;
    }
    for (const modelData of this.#debuggerModelToData.values()) {
      const locations2 = modelData.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
      if (locations2.length) {
        return locations2;
      }
    }
    return [];
  }
  /**
   * Computes all the raw location ranges that intersect with the {@link textRange} in the given
   * {@link uiSourceCode}. The reverse mappings of the returned ranges must not be fully contained
   * with the {@link textRange} and it's the responsibility of the caller to appropriately filter or
   * clamp if desired.
   *
   * It's important to note that for a contiguous range in the {@link uiSourceCode} there can be a
   * variety of non-contiguous raw location ranges that intersect with the {@link textRange}. A
   * simple example is that of an HTML document with multiple inline `<script>`s in the same line,
   * so just asking for the raw locations in this single line will return a set of location ranges
   * in different scripts.
   *
   * This method returns an empty array if this {@link uiSourceCode} is not provided by any of the
   * mappings for this instance.
   *
   * @param uiSourceCode the {@link UISourceCode} to which the {@link textRange} belongs.
   * @param textRange the text range in terms of the UI.
   * @returns the list of raw location ranges that intersect with the text range or `[]` if
   *          the {@link uiSourceCode} does not belong to this instance.
   */
  async uiLocationRangeToRawLocationRanges(uiSourceCode, textRange) {
    const ranges = await this.pluginManager.uiLocationRangeToRawLocationRanges(uiSourceCode, textRange);
    if (ranges) {
      return ranges;
    }
    for (const modelData of this.#debuggerModelToData.values()) {
      const ranges2 = modelData.uiLocationRangeToRawLocationRanges(uiSourceCode, textRange);
      if (ranges2) {
        return ranges2;
      }
    }
    return [];
  }
  async normalizeUILocation(uiLocation) {
    const rawLocations = await this.uiLocationToRawLocations(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber);
    for (const location of rawLocations) {
      const uiLocationCandidate = await this.rawLocationToUILocation(location);
      if (uiLocationCandidate) {
        return uiLocationCandidate;
      }
    }
    return uiLocation;
  }
  /**
   * Computes the set of lines in the {@link uiSourceCode} that map to scripts by either looking at
   * the debug info (if any) or checking for inline scripts within documents. If this set cannot be
   * computed or all the lines in the {@link uiSourceCode} correspond to lines in a script, `null`
   * is returned here.
   *
   * @param uiSourceCode the source entity.
   * @returns a set of known mapped lines for {@link uiSourceCode} or `null` if it's impossible to
   *          determine the set or the {@link uiSourceCode} does not map to or include any scripts.
   */
  async getMappedLines(uiSourceCode) {
    for (const modelData of this.#debuggerModelToData.values()) {
      const mappedLines = modelData.getMappedLines(uiSourceCode);
      if (mappedLines !== null) {
        return mappedLines;
      }
    }
    return await this.pluginManager.getMappedLines(uiSourceCode);
  }
  scriptFile(uiSourceCode, debuggerModel) {
    const modelData = this.#debuggerModelToData.get(debuggerModel);
    return modelData ? modelData.getResourceScriptMapping().scriptFile(uiSourceCode) : null;
  }
  scriptsForUISourceCode(uiSourceCode) {
    const scripts = /* @__PURE__ */ new Set();
    this.pluginManager.scriptsForUISourceCode(uiSourceCode).forEach((script) => scripts.add(script));
    for (const modelData of this.#debuggerModelToData.values()) {
      const resourceScriptFile = modelData.getResourceScriptMapping().scriptFile(uiSourceCode);
      if (resourceScriptFile?.script) {
        scripts.add(resourceScriptFile.script);
      }
      modelData.compilerMapping.scriptsForUISourceCode(uiSourceCode).forEach((script) => scripts.add(script));
    }
    return [...scripts];
  }
  supportsConditionalBreakpoints(uiSourceCode) {
    const scripts = this.pluginManager.scriptsForUISourceCode(uiSourceCode);
    return scripts.every((script) => script.isJavaScript());
  }
  globalObjectCleared(event) {
    this.reset(event.data);
  }
  reset(debuggerModel) {
    const modelData = this.#debuggerModelToData.get(debuggerModel);
    if (!modelData) {
      return;
    }
    for (const location of modelData.callFrameLocations.values()) {
      this.removeLiveLocation(location);
    }
    modelData.callFrameLocations.clear();
  }
  resetForTest(target) {
    const debuggerModel = target.model(SDK11.DebuggerModel.DebuggerModel);
    const modelData = this.#debuggerModelToData.get(debuggerModel);
    if (modelData) {
      modelData.getResourceScriptMapping().resetForTest();
    }
  }
  registerCallFrameLiveLocation(debuggerModel, location) {
    const modelData = this.#debuggerModelToData.get(debuggerModel);
    if (modelData) {
      const locations = modelData.callFrameLocations;
      locations.add(location);
    }
  }
  removeLiveLocation(location) {
    const modelData = this.#debuggerModelToData.get(location.rawLocation.debuggerModel);
    if (modelData) {
      modelData.disposeLocation(location);
    }
  }
  debuggerResumed(event) {
    this.reset(event.data);
  }
  async shouldPause(debuggerPausedDetails, autoSteppingContext) {
    const { callFrames: [frame] } = debuggerPausedDetails;
    if (!frame) {
      return false;
    }
    const functionLocation = frame.functionLocation();
    if (!autoSteppingContext || debuggerPausedDetails.reason !== "step" || !functionLocation || !frame.script.isWasm() || !Common11.Settings.moduleSetting("wasm-auto-stepping").get() || !this.pluginManager.hasPluginForScript(frame.script)) {
      return true;
    }
    const uiLocation = await this.pluginManager.rawLocationToUILocation(frame.location());
    if (uiLocation) {
      return true;
    }
    return autoSteppingContext.script() !== functionLocation.script() || autoSteppingContext.columnNumber !== functionLocation.columnNumber || autoSteppingContext.lineNumber !== functionLocation.lineNumber;
  }
  async #translateRawFrames(frames, target) {
    const rawFrames = frames.slice(0);
    const translatedFrames = [];
    while (rawFrames.length) {
      await this.#translateRawFramesStep(rawFrames, translatedFrames, target);
    }
    return translatedFrames;
  }
  async #translateRawFramesStep(rawFrames, translatedFrames, target) {
    if (await this.pluginManager.translateRawFramesStep(rawFrames, translatedFrames, target)) {
      return;
    }
    const modelData = this.#debuggerModelToData.get(target.model(SDK11.DebuggerModel.DebuggerModel));
    if (modelData) {
      modelData.translateRawFramesStep(rawFrames, translatedFrames);
      return;
    }
    const frame = rawFrames.shift();
    const { url, lineNumber, columnNumber, functionName } = frame;
    translatedFrames.push([{ url, line: lineNumber, column: columnNumber, name: functionName }]);
  }
};
var ModelData2 = class {
  #debuggerModel;
  #debuggerWorkspaceBinding;
  callFrameLocations;
  #defaultMapping;
  #resourceMapping;
  #resourceScriptMapping;
  compilerMapping;
  #locations;
  constructor(debuggerModel, debuggerWorkspaceBinding) {
    this.#debuggerModel = debuggerModel;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.callFrameLocations = /* @__PURE__ */ new Set();
    const { workspace } = debuggerWorkspaceBinding.resourceMapping;
    this.#defaultMapping = new DefaultScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this.#resourceMapping = debuggerWorkspaceBinding.resourceMapping;
    this.#resourceScriptMapping = new ResourceScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this.compilerMapping = new CompilerScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this.#locations = new Platform6.MapUtilities.Multimap();
  }
  async createLiveLocation(rawLocation, updateDelegate, locationPool) {
    console.assert(rawLocation.scriptId !== "");
    const scriptId = rawLocation.scriptId;
    const location = new Location(scriptId, rawLocation, this.#debuggerWorkspaceBinding, updateDelegate, locationPool);
    this.#locations.set(scriptId, location);
    await location.update();
    return location;
  }
  disposeLocation(location) {
    this.#locations.delete(location.scriptId, location);
  }
  async updateLocations(script) {
    const promises = [];
    for (const location of this.#locations.get(script.scriptId)) {
      promises.push(location.update());
    }
    await Promise.all(promises);
  }
  rawLocationToUILocation(rawLocation) {
    let uiLocation = this.compilerMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this.#resourceScriptMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this.#resourceMapping.jsLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this.#defaultMapping.rawLocationToUILocation(rawLocation);
    return uiLocation;
  }
  uiSourceCodeForScript(script) {
    let uiSourceCode = null;
    uiSourceCode = uiSourceCode || this.#resourceScriptMapping.uiSourceCodeForScript(script);
    uiSourceCode = uiSourceCode || this.#resourceMapping.uiSourceCodeForScript(script);
    uiSourceCode = uiSourceCode || this.#defaultMapping.uiSourceCodeForScript(script);
    return uiSourceCode;
  }
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber = 0) {
    let locations = this.compilerMapping.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
    locations = locations.length ? locations : this.#resourceScriptMapping.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
    locations = locations.length ? locations : this.#resourceMapping.uiLocationToJSLocations(uiSourceCode, lineNumber, columnNumber);
    locations = locations.length ? locations : this.#defaultMapping.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
    return locations;
  }
  uiLocationRangeToRawLocationRanges(uiSourceCode, textRange) {
    let ranges = this.compilerMapping.uiLocationRangeToRawLocationRanges(uiSourceCode, textRange);
    ranges ??= this.#resourceScriptMapping.uiLocationRangeToRawLocationRanges(uiSourceCode, textRange);
    ranges ??= this.#resourceMapping.uiLocationRangeToJSLocationRanges(uiSourceCode, textRange);
    ranges ??= this.#defaultMapping.uiLocationRangeToRawLocationRanges(uiSourceCode, textRange);
    return ranges;
  }
  translateRawFramesStep(rawFrames, translatedFrames) {
    if (!this.compilerMapping.translateRawFramesStep(rawFrames, translatedFrames)) {
      this.#defaultTranslateRawFramesStep(rawFrames, translatedFrames);
    }
  }
  /** The default implementation translates one frame at a time and only translates the location, but not the function name. */
  #defaultTranslateRawFramesStep(rawFrames, translatedFrames) {
    const frame = rawFrames.shift();
    const { scriptId, url, lineNumber, columnNumber, functionName } = frame;
    const rawLocation = scriptId ? this.#debuggerModel.createRawLocationByScriptId(scriptId, lineNumber, columnNumber) : url ? this.#debuggerModel.createRawLocationByURL(url, lineNumber, columnNumber) : null;
    if (rawLocation) {
      const uiLocation = this.rawLocationToUILocation(rawLocation);
      if (uiLocation) {
        translatedFrames.push([{
          uiSourceCode: uiLocation.uiSourceCode,
          name: functionName,
          line: uiLocation.lineNumber,
          column: uiLocation.columnNumber ?? -1
        }]);
        return;
      }
    }
    translatedFrames.push([{ url, line: lineNumber, column: columnNumber, name: functionName }]);
  }
  getMappedLines(uiSourceCode) {
    const mappedLines = this.compilerMapping.getMappedLines(uiSourceCode);
    return mappedLines;
  }
  dispose() {
    this.#debuggerModel.setBeforePausedCallback(null);
    this.compilerMapping.dispose();
    this.#resourceScriptMapping.dispose();
    this.#defaultMapping.dispose();
  }
  getResourceScriptMapping() {
    return this.#resourceScriptMapping;
  }
};
var Location = class extends LiveLocationWithPool {
  scriptId;
  rawLocation;
  #binding;
  constructor(scriptId, rawLocation, binding, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this.scriptId = scriptId;
    this.rawLocation = rawLocation;
    this.#binding = binding;
  }
  async uiLocation() {
    const debuggerModelLocation = this.rawLocation;
    return await this.#binding.rawLocationToUILocation(debuggerModelLocation);
  }
  dispose() {
    super.dispose();
    this.#binding.removeLiveLocation(this);
  }
};
var StackTraceTopFrameLocation = class _StackTraceTopFrameLocation extends LiveLocationWithPool {
  #updateScheduled;
  #current;
  #locations;
  constructor(updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this.#updateScheduled = true;
    this.#current = null;
    this.#locations = null;
  }
  static async createStackTraceTopFrameLocation(rawLocations, binding, updateDelegate, locationPool) {
    const location = new _StackTraceTopFrameLocation(updateDelegate, locationPool);
    const locationsPromises = rawLocations.map((rawLocation) => binding.createLiveLocation(rawLocation, location.scheduleUpdate.bind(location), locationPool));
    location.#locations = (await Promise.all(locationsPromises)).filter((l) => !!l);
    await location.updateLocation();
    return location;
  }
  async uiLocation() {
    return this.#current ? await this.#current.uiLocation() : null;
  }
  dispose() {
    super.dispose();
    if (this.#locations) {
      for (const location of this.#locations) {
        location.dispose();
      }
    }
    this.#locations = null;
    this.#current = null;
  }
  async scheduleUpdate() {
    if (this.#updateScheduled) {
      return;
    }
    this.#updateScheduled = true;
    queueMicrotask(() => {
      void this.updateLocation();
    });
  }
  async updateLocation() {
    this.#updateScheduled = false;
    if (!this.#locations || this.#locations.length === 0) {
      return;
    }
    this.#current = this.#locations[0];
    for (const location of this.#locations) {
      const uiLocation = await location.uiLocation();
      if (!uiLocation?.isIgnoreListed()) {
        this.#current = location;
        break;
      }
    }
    void this.update();
  }
};

// gen/front_end/models/bindings/FileUtils.js
var FileUtils_exports = {};
__export(FileUtils_exports, {
  ChunkedFileReader: () => ChunkedFileReader,
  FileOutputStream: () => FileOutputStream
});
import * as Common12 from "./../../core/common/common.js";
import * as TextUtils7 from "./../text_utils/text_utils.js";
import * as Workspace19 from "./../workspace/workspace.js";
var ChunkedFileReader = class {
  #file;
  #fileSize;
  #loadedSize;
  #streamReader;
  #chunkSize;
  #chunkTransferredCallback;
  #decoder;
  #isCanceled;
  #error;
  #transferFinished;
  #output;
  #reader;
  constructor(file, chunkSize, chunkTransferredCallback) {
    this.#file = file;
    this.#fileSize = file.size;
    this.#loadedSize = 0;
    this.#chunkSize = chunkSize ? chunkSize : Number.MAX_VALUE;
    this.#chunkTransferredCallback = chunkTransferredCallback;
    this.#decoder = new TextDecoder();
    this.#isCanceled = false;
    this.#error = null;
    this.#streamReader = null;
  }
  async read(output) {
    if (this.#chunkTransferredCallback) {
      this.#chunkTransferredCallback(this);
    }
    if (this.#file?.type.endsWith("gzip")) {
      const fileStream = this.#file.stream();
      const stream = Common12.Gzip.decompressStream(fileStream);
      this.#streamReader = stream.getReader();
    } else {
      this.#reader = new FileReader();
      this.#reader.onload = this.onChunkLoaded.bind(this);
      this.#reader.onerror = this.onError.bind(this);
    }
    this.#output = output;
    void this.loadChunk();
    return await new Promise((resolve) => {
      this.#transferFinished = resolve;
    });
  }
  cancel() {
    this.#isCanceled = true;
  }
  loadedSize() {
    return this.#loadedSize;
  }
  fileSize() {
    return this.#fileSize;
  }
  fileName() {
    if (!this.#file) {
      return "";
    }
    return this.#file.name;
  }
  error() {
    return this.#error;
  }
  onChunkLoaded(event) {
    if (this.#isCanceled) {
      return;
    }
    const eventTarget = event.target;
    if (eventTarget.readyState !== FileReader.DONE) {
      return;
    }
    if (!this.#reader) {
      return;
    }
    const buffer = this.#reader.result;
    this.#loadedSize += buffer.byteLength;
    const endOfFile = this.#loadedSize === this.#fileSize;
    void this.decodeChunkBuffer(buffer, endOfFile);
  }
  async decodeChunkBuffer(buffer, endOfFile) {
    if (!this.#output) {
      return;
    }
    const decodedString = this.#decoder.decode(buffer, { stream: !endOfFile });
    await this.#output.write(decodedString, endOfFile);
    if (this.#isCanceled) {
      return;
    }
    if (this.#chunkTransferredCallback) {
      this.#chunkTransferredCallback(this);
    }
    if (endOfFile) {
      void this.finishRead();
      return;
    }
    void this.loadChunk();
  }
  async finishRead() {
    if (!this.#output) {
      return;
    }
    this.#file = null;
    this.#reader = null;
    await this.#output.close();
    this.#transferFinished(!this.#error);
  }
  async loadChunk() {
    if (!this.#output || !this.#file) {
      return;
    }
    if (this.#streamReader) {
      const { value, done } = await this.#streamReader.read();
      if (done || !value) {
        await this.#output.write("", true);
        return await this.finishRead();
      }
      void this.decodeChunkBuffer(value.buffer, false);
    }
    if (this.#reader) {
      const chunkStart = this.#loadedSize;
      const chunkEnd = Math.min(this.#fileSize, chunkStart + this.#chunkSize);
      const nextPart = this.#file.slice(chunkStart, chunkEnd);
      this.#reader.readAsArrayBuffer(nextPart);
    }
  }
  onError(event) {
    const eventTarget = event.target;
    this.#error = eventTarget.error;
    this.#transferFinished(false);
  }
};
var FileOutputStream = class {
  #writeCallbacks;
  #fileName;
  #closed;
  constructor() {
    this.#writeCallbacks = [];
  }
  async open(fileName) {
    this.#closed = false;
    this.#writeCallbacks = [];
    this.#fileName = fileName;
    const saveResponse = await Workspace19.FileManager.FileManager.instance().save(
      this.#fileName,
      TextUtils7.ContentData.EMPTY_TEXT_CONTENT_DATA,
      /* forceSaveAs=*/
      true
    );
    if (saveResponse) {
      Workspace19.FileManager.FileManager.instance().addEventListener("AppendedToURL", this.onAppendDone, this);
    }
    return Boolean(saveResponse);
  }
  write(data) {
    return new Promise((resolve) => {
      this.#writeCallbacks.push(resolve);
      Workspace19.FileManager.FileManager.instance().append(this.#fileName, data);
    });
  }
  async close() {
    this.#closed = true;
    if (this.#writeCallbacks.length) {
      return;
    }
    Workspace19.FileManager.FileManager.instance().removeEventListener("AppendedToURL", this.onAppendDone, this);
    Workspace19.FileManager.FileManager.instance().close(this.#fileName);
  }
  onAppendDone(event) {
    if (event.data !== this.#fileName) {
      return;
    }
    const writeCallback = this.#writeCallbacks.shift();
    if (writeCallback) {
      writeCallback();
    }
    if (this.#writeCallbacks.length) {
      return;
    }
    if (!this.#closed) {
      return;
    }
    Workspace19.FileManager.FileManager.instance().removeEventListener("AppendedToURL", this.onAppendDone, this);
    Workspace19.FileManager.FileManager.instance().close(this.#fileName);
  }
};

// gen/front_end/models/bindings/PresentationConsoleMessageHelper.js
var PresentationConsoleMessageHelper_exports = {};
__export(PresentationConsoleMessageHelper_exports, {
  PresentationConsoleMessageManager: () => PresentationConsoleMessageManager,
  PresentationSourceFrameMessage: () => PresentationSourceFrameMessage,
  PresentationSourceFrameMessageHelper: () => PresentationSourceFrameMessageHelper,
  PresentationSourceFrameMessageManager: () => PresentationSourceFrameMessageManager
});
import * as SDK12 from "./../../core/sdk/sdk.js";
import * as TextUtils8 from "./../text_utils/text_utils.js";
import * as Workspace20 from "./../workspace/workspace.js";
var PresentationSourceFrameMessageManager = class {
  #targetToMessageHelperMap = /* @__PURE__ */ new WeakMap();
  constructor() {
    SDK12.TargetManager.TargetManager.instance().observeModels(SDK12.DebuggerModel.DebuggerModel, this);
    SDK12.TargetManager.TargetManager.instance().observeModels(SDK12.CSSModel.CSSModel, this);
  }
  modelAdded(model) {
    const target = model.target();
    const helper = this.#targetToMessageHelperMap.get(target) ?? new PresentationSourceFrameMessageHelper();
    if (model instanceof SDK12.DebuggerModel.DebuggerModel) {
      helper.setDebuggerModel(model);
    } else {
      helper.setCSSModel(model);
    }
    this.#targetToMessageHelperMap.set(target, helper);
  }
  modelRemoved(model) {
    const target = model.target();
    const helper = this.#targetToMessageHelperMap.get(target);
    helper?.clear();
  }
  addMessage(message, source, target) {
    const helper = this.#targetToMessageHelperMap.get(target);
    void helper?.addMessage(message, source);
  }
  clear() {
    for (const target of SDK12.TargetManager.TargetManager.instance().targets()) {
      const helper = this.#targetToMessageHelperMap.get(target);
      helper?.clear();
    }
  }
};
var PresentationConsoleMessageManager = class {
  #sourceFrameMessageManager = new PresentationSourceFrameMessageManager();
  constructor() {
    SDK12.TargetManager.TargetManager.instance().addModelListener(SDK12.ConsoleModel.ConsoleModel, SDK12.ConsoleModel.Events.MessageAdded, (event) => this.consoleMessageAdded(event.data));
    SDK12.ConsoleModel.ConsoleModel.allMessagesUnordered().forEach(this.consoleMessageAdded, this);
    SDK12.TargetManager.TargetManager.instance().addModelListener(SDK12.ConsoleModel.ConsoleModel, SDK12.ConsoleModel.Events.ConsoleCleared, () => this.#sourceFrameMessageManager.clear());
  }
  consoleMessageAdded(consoleMessage) {
    const runtimeModel = consoleMessage.runtimeModel();
    if (!consoleMessage.isErrorOrWarning() || !consoleMessage.runtimeModel() || consoleMessage.source === "violation" || !runtimeModel) {
      return;
    }
    const level = consoleMessage.level === "error" ? "Error" : "Warning";
    this.#sourceFrameMessageManager.addMessage(new Workspace20.UISourceCode.Message(level, consoleMessage.messageText), consoleMessage, runtimeModel.target());
  }
};
var PresentationSourceFrameMessageHelper = class {
  #debuggerModel;
  #cssModel;
  #presentationMessages = /* @__PURE__ */ new Map();
  #locationPool;
  constructor() {
    this.#locationPool = new LiveLocationPool();
    Workspace20.Workspace.WorkspaceImpl.instance().addEventListener(Workspace20.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAdded.bind(this));
  }
  setDebuggerModel(debuggerModel) {
    if (this.#debuggerModel) {
      throw new Error("Cannot set DebuggerModel twice");
    }
    this.#debuggerModel = debuggerModel;
    debuggerModel.addEventListener(SDK12.DebuggerModel.Events.ParsedScriptSource, (event) => {
      queueMicrotask(() => {
        this.#parsedScriptSource(event);
      });
    });
    debuggerModel.addEventListener(SDK12.DebuggerModel.Events.GlobalObjectCleared, this.#debuggerReset, this);
  }
  setCSSModel(cssModel) {
    if (this.#cssModel) {
      throw new Error("Cannot set CSSModel twice");
    }
    this.#cssModel = cssModel;
    cssModel.addEventListener(SDK12.CSSModel.Events.StyleSheetAdded, (event) => queueMicrotask(() => this.#styleSheetAdded(event)));
  }
  async addMessage(message, source) {
    const presentation = new PresentationSourceFrameMessage(message, this.#locationPool);
    const location = this.#rawLocation(source) ?? this.#cssLocation(source) ?? this.#uiLocation(source);
    if (location) {
      await presentation.updateLocationSource(location);
    }
    if (source.url) {
      let messages = this.#presentationMessages.get(source.url);
      if (!messages) {
        messages = [];
        this.#presentationMessages.set(source.url, messages);
      }
      messages.push({ source, presentation });
    }
  }
  #uiLocation(source) {
    if (!source.url) {
      return null;
    }
    const uiSourceCode = Workspace20.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(source.url);
    if (!uiSourceCode) {
      return null;
    }
    return new Workspace20.UISourceCode.UILocation(uiSourceCode, source.line, source.column);
  }
  #cssLocation(source) {
    if (!this.#cssModel || !source.url) {
      return null;
    }
    const locations = this.#cssModel.createRawLocationsByURL(source.url, source.line, source.column);
    return locations[0] ?? null;
  }
  #rawLocation(source) {
    if (!this.#debuggerModel) {
      return null;
    }
    if (source.scriptId) {
      return this.#debuggerModel.createRawLocationByScriptId(source.scriptId, source.line, source.column);
    }
    const callFrame = source.stackTrace?.callFrames ? source.stackTrace.callFrames[0] : null;
    if (callFrame) {
      return this.#debuggerModel.createRawLocationByScriptId(callFrame.scriptId, callFrame.lineNumber, callFrame.columnNumber);
    }
    if (source.url) {
      return this.#debuggerModel.createRawLocationByURL(source.url, source.line, source.column);
    }
    return null;
  }
  #parsedScriptSource(event) {
    const script = event.data;
    const messages = this.#presentationMessages.get(script.sourceURL);
    const promises = [];
    for (const { presentation, source } of messages ?? []) {
      const rawLocation = this.#rawLocation(source);
      if (rawLocation && script.scriptId === rawLocation.scriptId) {
        promises.push(presentation.updateLocationSource(rawLocation));
      }
    }
    void Promise.all(promises).then(this.parsedScriptSourceForTest.bind(this));
  }
  parsedScriptSourceForTest() {
  }
  #uiSourceCodeAdded(event) {
    const uiSourceCode = event.data;
    const messages = this.#presentationMessages.get(uiSourceCode.url());
    const promises = [];
    for (const { presentation, source } of messages ?? []) {
      promises.push(presentation.updateLocationSource(new Workspace20.UISourceCode.UILocation(uiSourceCode, source.line, source.column)));
    }
    void Promise.all(promises).then(this.uiSourceCodeAddedForTest.bind(this));
  }
  uiSourceCodeAddedForTest() {
  }
  #styleSheetAdded(event) {
    const header = event.data;
    const messages = this.#presentationMessages.get(header.sourceURL);
    const promises = [];
    for (const { source, presentation } of messages ?? []) {
      if (header.containsLocation(source.line, source.column)) {
        promises.push(presentation.updateLocationSource(new SDK12.CSSModel.CSSLocation(header, source.line, source.column)));
      }
    }
    void Promise.all(promises).then(this.styleSheetAddedForTest.bind(this));
  }
  styleSheetAddedForTest() {
  }
  clear() {
    this.#debuggerReset();
  }
  #debuggerReset() {
    const presentations = Array.from(this.#presentationMessages.values()).flat();
    for (const { presentation } of presentations) {
      presentation.dispose();
    }
    this.#presentationMessages.clear();
    this.#locationPool.disposeAll();
  }
};
var FrozenLiveLocation = class extends LiveLocationWithPool {
  #uiLocation;
  constructor(uiLocation, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this.#uiLocation = uiLocation;
  }
  async uiLocation() {
    return this.#uiLocation;
  }
};
var PresentationSourceFrameMessage = class {
  #uiSourceCode;
  #liveLocation;
  #locationPool;
  #message;
  constructor(message, locationPool) {
    this.#message = message;
    this.#locationPool = locationPool;
  }
  async updateLocationSource(source) {
    if (source instanceof SDK12.DebuggerModel.Location) {
      await DebuggerWorkspaceBinding.instance().createLiveLocation(source, this.#updateLocation.bind(this), this.#locationPool);
    } else if (source instanceof SDK12.CSSModel.CSSLocation) {
      await CSSWorkspaceBinding.instance().createLiveLocation(source, this.#updateLocation.bind(this), this.#locationPool);
    } else if (source instanceof Workspace20.UISourceCode.UILocation) {
      if (!this.#liveLocation) {
        this.#liveLocation = new FrozenLiveLocation(source, this.#updateLocation.bind(this), this.#locationPool);
        await this.#liveLocation.update();
      }
    }
  }
  async #updateLocation(liveLocation) {
    if (this.#uiSourceCode) {
      this.#uiSourceCode.removeMessage(this.#message);
    }
    if (liveLocation !== this.#liveLocation) {
      this.#uiSourceCode?.removeMessage(this.#message);
      this.#liveLocation?.dispose();
      this.#liveLocation = liveLocation;
    }
    const uiLocation = await liveLocation.uiLocation();
    if (!uiLocation) {
      return;
    }
    this.#message.range = TextUtils8.TextRange.TextRange.createFromLocation(uiLocation.lineNumber, uiLocation.columnNumber || 0);
    this.#uiSourceCode = uiLocation.uiSourceCode;
    this.#uiSourceCode.addMessage(this.#message);
  }
  dispose() {
    this.#uiSourceCode?.removeMessage(this.#message);
    this.#liveLocation?.dispose();
  }
};

// gen/front_end/models/bindings/ResourceMapping.js
var ResourceMapping_exports = {};
__export(ResourceMapping_exports, {
  ResourceMapping: () => ResourceMapping
});
import * as Common13 from "./../../core/common/common.js";
import * as SDK13 from "./../../core/sdk/sdk.js";
import * as TextUtils9 from "./../text_utils/text_utils.js";
import * as Workspace22 from "./../workspace/workspace.js";
var styleSheetRangeMap = /* @__PURE__ */ new WeakMap();
var scriptRangeMap = /* @__PURE__ */ new WeakMap();
var boundUISourceCodes = /* @__PURE__ */ new WeakSet();
function computeScriptRange(script) {
  return new TextUtils9.TextRange.TextRange(script.lineOffset, script.columnOffset, script.endLine, script.endColumn);
}
function computeStyleSheetRange(header) {
  return new TextUtils9.TextRange.TextRange(header.startLine, header.startColumn, header.endLine, header.endColumn);
}
var ResourceMapping = class {
  workspace;
  #modelToInfo = /* @__PURE__ */ new Map();
  constructor(targetManager, workspace) {
    this.workspace = workspace;
    targetManager.observeModels(SDK13.ResourceTreeModel.ResourceTreeModel, this);
  }
  modelAdded(resourceTreeModel) {
    const info = new ModelInfo2(this.workspace, resourceTreeModel);
    this.#modelToInfo.set(resourceTreeModel, info);
  }
  modelRemoved(resourceTreeModel) {
    const info = this.#modelToInfo.get(resourceTreeModel);
    if (info) {
      info.dispose();
      this.#modelToInfo.delete(resourceTreeModel);
    }
  }
  infoForTarget(target) {
    const resourceTreeModel = target.model(SDK13.ResourceTreeModel.ResourceTreeModel);
    return resourceTreeModel ? this.#modelToInfo.get(resourceTreeModel) || null : null;
  }
  uiSourceCodeForScript(script) {
    const info = this.infoForTarget(script.debuggerModel.target());
    if (!info) {
      return null;
    }
    const project = info.getProject();
    const uiSourceCode = project.uiSourceCodeForURL(script.sourceURL);
    return uiSourceCode;
  }
  cssLocationToUILocation(cssLocation) {
    const header = cssLocation.header();
    if (!header) {
      return null;
    }
    const info = this.infoForTarget(cssLocation.cssModel().target());
    if (!info) {
      return null;
    }
    const uiSourceCode = info.getProject().uiSourceCodeForURL(cssLocation.url);
    if (!uiSourceCode) {
      return null;
    }
    const offset = styleSheetRangeMap.get(header) ?? computeStyleSheetRange(header);
    const lineNumber = cssLocation.lineNumber + offset.startLine - header.startLine;
    let columnNumber = cssLocation.columnNumber;
    if (cssLocation.lineNumber === header.startLine) {
      columnNumber += offset.startColumn - header.startColumn;
    }
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }
  jsLocationToUILocation(jsLocation) {
    const script = jsLocation.script();
    if (!script) {
      return null;
    }
    const info = this.infoForTarget(jsLocation.debuggerModel.target());
    if (!info) {
      return null;
    }
    const embedderName = script.embedderName();
    if (!embedderName) {
      return null;
    }
    const uiSourceCode = info.getProject().uiSourceCodeForURL(embedderName);
    if (!uiSourceCode) {
      return null;
    }
    const { startLine, startColumn } = scriptRangeMap.get(script) ?? computeScriptRange(script);
    let { lineNumber, columnNumber } = jsLocation;
    if (lineNumber === script.lineOffset) {
      columnNumber += startColumn - script.columnOffset;
    }
    lineNumber += startLine - script.lineOffset;
    if (script.hasSourceURL) {
      if (lineNumber === 0) {
        columnNumber += script.columnOffset;
      }
      lineNumber += script.lineOffset;
    }
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }
  uiLocationToJSLocations(uiSourceCode, lineNumber, columnNumber) {
    if (!boundUISourceCodes.has(uiSourceCode)) {
      return [];
    }
    const target = NetworkProject.targetForUISourceCode(uiSourceCode);
    if (!target) {
      return [];
    }
    const debuggerModel = target.model(SDK13.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return [];
    }
    const locations = [];
    for (const script of debuggerModel.scripts()) {
      if (script.embedderName() !== uiSourceCode.url()) {
        continue;
      }
      const range = scriptRangeMap.get(script) ?? computeScriptRange(script);
      if (!range.containsLocation(lineNumber, columnNumber)) {
        continue;
      }
      let scriptLineNumber = lineNumber;
      let scriptColumnNumber = columnNumber;
      if (script.hasSourceURL) {
        scriptLineNumber -= range.startLine;
        if (scriptLineNumber === 0) {
          scriptColumnNumber -= range.startColumn;
        }
      }
      locations.push(debuggerModel.createRawLocation(script, scriptLineNumber, scriptColumnNumber));
    }
    return locations;
  }
  uiLocationRangeToJSLocationRanges(uiSourceCode, textRange) {
    if (!boundUISourceCodes.has(uiSourceCode)) {
      return null;
    }
    const target = NetworkProject.targetForUISourceCode(uiSourceCode);
    if (!target) {
      return null;
    }
    const debuggerModel = target.model(SDK13.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return null;
    }
    const ranges = [];
    for (const script of debuggerModel.scripts()) {
      if (script.embedderName() !== uiSourceCode.url()) {
        continue;
      }
      const scriptTextRange = scriptRangeMap.get(script) ?? computeScriptRange(script);
      const range = scriptTextRange.intersection(textRange);
      if (range.isEmpty()) {
        continue;
      }
      let { startLine, startColumn, endLine, endColumn } = range;
      if (script.hasSourceURL) {
        startLine -= range.startLine;
        if (startLine === 0) {
          startColumn -= range.startColumn;
        }
        endLine -= range.startLine;
        if (endLine === 0) {
          endColumn -= range.startColumn;
        }
      }
      const start = debuggerModel.createRawLocation(script, startLine, startColumn);
      const end = debuggerModel.createRawLocation(script, endLine, endColumn);
      ranges.push({ start, end });
    }
    return ranges;
  }
  getMappedLines(uiSourceCode) {
    if (!boundUISourceCodes.has(uiSourceCode)) {
      return null;
    }
    const target = NetworkProject.targetForUISourceCode(uiSourceCode);
    if (!target) {
      return null;
    }
    const debuggerModel = target.model(SDK13.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return null;
    }
    const mappedLines = /* @__PURE__ */ new Set();
    for (const script of debuggerModel.scripts()) {
      if (script.embedderName() !== uiSourceCode.url()) {
        continue;
      }
      const { startLine, endLine } = scriptRangeMap.get(script) ?? computeScriptRange(script);
      for (let line = startLine; line <= endLine; ++line) {
        mappedLines.add(line);
      }
    }
    return mappedLines;
  }
  uiLocationToCSSLocations(uiLocation) {
    if (!boundUISourceCodes.has(uiLocation.uiSourceCode)) {
      return [];
    }
    const target = NetworkProject.targetForUISourceCode(uiLocation.uiSourceCode);
    if (!target) {
      return [];
    }
    const cssModel = target.model(SDK13.CSSModel.CSSModel);
    if (!cssModel) {
      return [];
    }
    return cssModel.createRawLocationsByURL(uiLocation.uiSourceCode.url(), uiLocation.lineNumber, uiLocation.columnNumber);
  }
  resetForTest(target) {
    const resourceTreeModel = target.model(SDK13.ResourceTreeModel.ResourceTreeModel);
    const info = resourceTreeModel ? this.#modelToInfo.get(resourceTreeModel) : null;
    if (info) {
      info.resetForTest();
    }
  }
};
var ModelInfo2 = class {
  project;
  #bindings = /* @__PURE__ */ new Map();
  #cssModel;
  #eventListeners;
  constructor(workspace, resourceTreeModel) {
    const target = resourceTreeModel.target();
    this.project = new ContentProviderBasedProject(
      workspace,
      "resources:" + target.id(),
      Workspace22.Workspace.projectTypes.Network,
      "",
      false
      /* isServiceProject */
    );
    NetworkProject.setTargetForProject(this.project, target);
    const cssModel = target.model(SDK13.CSSModel.CSSModel);
    console.assert(Boolean(cssModel));
    this.#cssModel = cssModel;
    for (const frame of resourceTreeModel.frames()) {
      for (const resource of frame.getResourcesMap().values()) {
        this.addResource(resource);
      }
    }
    this.#eventListeners = [
      resourceTreeModel.addEventListener(SDK13.ResourceTreeModel.Events.ResourceAdded, this.resourceAdded, this),
      resourceTreeModel.addEventListener(SDK13.ResourceTreeModel.Events.FrameWillNavigate, this.frameWillNavigate, this),
      resourceTreeModel.addEventListener(SDK13.ResourceTreeModel.Events.FrameDetached, this.frameDetached, this),
      this.#cssModel.addEventListener(SDK13.CSSModel.Events.StyleSheetChanged, (event) => {
        void this.styleSheetChanged(event);
      }, this)
    ];
  }
  async styleSheetChanged(event) {
    const header = this.#cssModel.styleSheetHeaderForId(event.data.styleSheetId);
    if (!header || !header.isInline || header.isInline && header.isMutable) {
      return;
    }
    const binding = this.#bindings.get(header.resourceURL());
    if (!binding) {
      return;
    }
    await binding.styleSheetChanged(header, event.data.edit || null);
  }
  acceptsResource(resource) {
    const resourceType = resource.resourceType();
    if (resourceType !== Common13.ResourceType.resourceTypes.Image && resourceType !== Common13.ResourceType.resourceTypes.Font && resourceType !== Common13.ResourceType.resourceTypes.Document && resourceType !== Common13.ResourceType.resourceTypes.Manifest && resourceType !== Common13.ResourceType.resourceTypes.Fetch && resourceType !== Common13.ResourceType.resourceTypes.XHR) {
      return false;
    }
    if (resourceType === Common13.ResourceType.resourceTypes.Image && resource.mimeType && !resource.mimeType.startsWith("image")) {
      return false;
    }
    if (resourceType === Common13.ResourceType.resourceTypes.Font && resource.mimeType && !resource.mimeType.includes("font")) {
      return false;
    }
    if ((resourceType === Common13.ResourceType.resourceTypes.Image || resourceType === Common13.ResourceType.resourceTypes.Font) && Common13.ParsedURL.schemeIs(resource.contentURL(), "data:")) {
      return false;
    }
    return true;
  }
  resourceAdded(event) {
    this.addResource(event.data);
  }
  addResource(resource) {
    if (!this.acceptsResource(resource)) {
      return;
    }
    let binding = this.#bindings.get(resource.url);
    if (!binding) {
      binding = new Binding2(this.project, resource);
      this.#bindings.set(resource.url, binding);
    } else {
      binding.addResource(resource);
    }
  }
  removeFrameResources(frame) {
    for (const resource of frame.resources()) {
      if (!this.acceptsResource(resource)) {
        continue;
      }
      const binding = this.#bindings.get(resource.url);
      if (!binding) {
        continue;
      }
      if (binding.resources.size === 1) {
        binding.dispose();
        this.#bindings.delete(resource.url);
      } else {
        binding.removeResource(resource);
      }
    }
  }
  frameWillNavigate(event) {
    this.removeFrameResources(event.data);
  }
  frameDetached(event) {
    this.removeFrameResources(event.data.frame);
  }
  resetForTest() {
    for (const binding of this.#bindings.values()) {
      binding.dispose();
    }
    this.#bindings.clear();
  }
  dispose() {
    Common13.EventTarget.removeEventListeners(this.#eventListeners);
    for (const binding of this.#bindings.values()) {
      binding.dispose();
    }
    this.#bindings.clear();
    this.project.removeProject();
  }
  getProject() {
    return this.project;
  }
};
var Binding2 = class {
  resources;
  #project;
  #uiSourceCode;
  #edits = [];
  constructor(project, resource) {
    this.resources = /* @__PURE__ */ new Set([resource]);
    this.#project = project;
    this.#uiSourceCode = this.#project.createUISourceCode(resource.url, resource.contentType());
    boundUISourceCodes.add(this.#uiSourceCode);
    if (resource.frameId) {
      NetworkProject.setInitialFrameAttribution(this.#uiSourceCode, resource.frameId);
    }
    this.#project.addUISourceCodeWithProvider(this.#uiSourceCode, this, resourceMetadata(resource), resource.mimeType);
    void Promise.all([
      ...this.inlineScripts().map((script) => DebuggerWorkspaceBinding.instance().updateLocations(script)),
      ...this.inlineStyles().map((style) => CSSWorkspaceBinding.instance().updateLocations(style))
    ]);
  }
  inlineStyles() {
    const target = NetworkProject.targetForUISourceCode(this.#uiSourceCode);
    const stylesheets = [];
    if (!target) {
      return stylesheets;
    }
    const cssModel = target.model(SDK13.CSSModel.CSSModel);
    if (cssModel) {
      for (const headerId of cssModel.getStyleSheetIdsForURL(this.#uiSourceCode.url())) {
        const header = cssModel.styleSheetHeaderForId(headerId);
        if (header) {
          stylesheets.push(header);
        }
      }
    }
    return stylesheets;
  }
  inlineScripts() {
    const target = NetworkProject.targetForUISourceCode(this.#uiSourceCode);
    if (!target) {
      return [];
    }
    const debuggerModel = target.model(SDK13.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return [];
    }
    return debuggerModel.scripts().filter((script) => script.embedderName() === this.#uiSourceCode.url());
  }
  async styleSheetChanged(stylesheet, edit) {
    this.#edits.push({ stylesheet, edit });
    if (this.#edits.length > 1) {
      return;
    }
    const content = await this.#uiSourceCode.requestContentData();
    if (!TextUtils9.ContentData.ContentData.isError(content)) {
      await this.innerStyleSheetChanged(content.text);
    }
    this.#edits = [];
  }
  async innerStyleSheetChanged(content) {
    const scripts = this.inlineScripts();
    const styles = this.inlineStyles();
    let text = new TextUtils9.Text.Text(content);
    for (const data of this.#edits) {
      const edit = data.edit;
      if (!edit) {
        continue;
      }
      const stylesheet = data.stylesheet;
      const startLocation = styleSheetRangeMap.get(stylesheet) ?? computeStyleSheetRange(stylesheet);
      const oldRange = edit.oldRange.relativeFrom(startLocation.startLine, startLocation.startColumn);
      const newRange = edit.newRange.relativeFrom(startLocation.startLine, startLocation.startColumn);
      text = new TextUtils9.Text.Text(text.replaceRange(oldRange, edit.newText));
      const updatePromises = [];
      for (const script of scripts) {
        const range = scriptRangeMap.get(script) ?? computeScriptRange(script);
        if (!range.follows(oldRange)) {
          continue;
        }
        scriptRangeMap.set(script, range.rebaseAfterTextEdit(oldRange, newRange));
        updatePromises.push(DebuggerWorkspaceBinding.instance().updateLocations(script));
      }
      for (const style of styles) {
        const range = styleSheetRangeMap.get(style) ?? computeStyleSheetRange(style);
        if (!range.follows(oldRange)) {
          continue;
        }
        styleSheetRangeMap.set(style, range.rebaseAfterTextEdit(oldRange, newRange));
        updatePromises.push(CSSWorkspaceBinding.instance().updateLocations(style));
      }
      await Promise.all(updatePromises);
    }
    this.#uiSourceCode.addRevision(text.value());
  }
  addResource(resource) {
    this.resources.add(resource);
    if (resource.frameId) {
      NetworkProject.addFrameAttribution(this.#uiSourceCode, resource.frameId);
    }
  }
  removeResource(resource) {
    this.resources.delete(resource);
    if (resource.frameId) {
      NetworkProject.removeFrameAttribution(this.#uiSourceCode, resource.frameId);
    }
  }
  dispose() {
    this.#project.removeUISourceCode(this.#uiSourceCode.url());
    void Promise.all([
      ...this.inlineScripts().map((script) => DebuggerWorkspaceBinding.instance().updateLocations(script)),
      ...this.inlineStyles().map((style) => CSSWorkspaceBinding.instance().updateLocations(style))
    ]);
  }
  firstResource() {
    console.assert(this.resources.size > 0);
    return this.resources.values().next().value;
  }
  contentURL() {
    return this.firstResource().contentURL();
  }
  contentType() {
    return this.firstResource().contentType();
  }
  requestContentData() {
    return this.firstResource().requestContentData();
  }
  searchInContent(query, caseSensitive, isRegex) {
    return this.firstResource().searchInContent(query, caseSensitive, isRegex);
  }
};

// gen/front_end/models/bindings/TempFile.js
var TempFile_exports = {};
__export(TempFile_exports, {
  TempFile: () => TempFile
});
import * as Common14 from "./../../core/common/common.js";
var TempFile = class {
  #lastBlob;
  constructor() {
    this.#lastBlob = null;
  }
  write(pieces) {
    if (this.#lastBlob) {
      pieces.unshift(this.#lastBlob);
    }
    this.#lastBlob = new Blob(pieces, { type: "text/plain" });
  }
  read() {
    return this.readRange();
  }
  size() {
    return this.#lastBlob ? this.#lastBlob.size : 0;
  }
  async readRange(startOffset, endOffset) {
    if (!this.#lastBlob) {
      Common14.Console.Console.instance().error("Attempt to read a temp file that was never written");
      return "";
    }
    const blob = typeof startOffset === "number" || typeof endOffset === "number" ? this.#lastBlob.slice(startOffset, endOffset) : this.#lastBlob;
    const reader = new FileReader();
    try {
      await new Promise((resolve, reject) => {
        reader.onloadend = resolve;
        reader.onerror = reject;
        reader.readAsText(blob);
      });
    } catch (error) {
      Common14.Console.Console.instance().error("Failed to read from temp file: " + error.message);
    }
    return reader.result;
  }
  async copyToOutputStream(outputStream, progress) {
    if (!this.#lastBlob) {
      void outputStream.close();
      return null;
    }
    const reader = new ChunkedFileReader(this.#lastBlob, 10 * 1e3 * 1e3, progress);
    return await reader.read(outputStream).then((success) => success ? null : reader.error());
  }
  remove() {
    this.#lastBlob = null;
  }
};
export {
  CSSWorkspaceBinding_exports as CSSWorkspaceBinding,
  CompilerScriptMapping_exports as CompilerScriptMapping,
  ContentProviderBasedProject_exports as ContentProviderBasedProject,
  DebuggerLanguagePlugins_exports as DebuggerLanguagePlugins,
  DebuggerWorkspaceBinding_exports as DebuggerWorkspaceBinding,
  DefaultScriptMapping_exports as DefaultScriptMapping,
  FileUtils_exports as FileUtils,
  LiveLocation_exports as LiveLocation,
  NetworkProject_exports as NetworkProject,
  PresentationConsoleMessageHelper_exports as PresentationConsoleMessageHelper,
  ResourceMapping_exports as ResourceMapping,
  ResourceScriptMapping_exports as ResourceScriptMapping,
  ResourceUtils_exports as ResourceUtils,
  SASSSourceMapping_exports as SASSSourceMapping,
  StylesSourceMapping_exports as StylesSourceMapping,
  TempFile_exports as TempFile
};
//# sourceMappingURL=bindings.js.map
