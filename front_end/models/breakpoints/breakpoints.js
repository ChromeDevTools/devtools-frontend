var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/breakpoints/BreakpointManager.js
var BreakpointManager_exports = {};
__export(BreakpointManager_exports, {
  Breakpoint: () => Breakpoint,
  BreakpointLocation: () => BreakpointLocation,
  BreakpointManager: () => BreakpointManager,
  EMPTY_BREAKPOINT_CONDITION: () => EMPTY_BREAKPOINT_CONDITION,
  Events: () => Events,
  ModelBreakpoint: () => ModelBreakpoint,
  NEVER_PAUSE_HERE_CONDITION: () => NEVER_PAUSE_HERE_CONDITION
});
import * as Common from "./../../core/common/common.js";
import { assertNotNullOrUndefined } from "./../../core/platform/platform.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Bindings from "./../bindings/bindings.js";
import * as Formatter from "./../formatter/formatter.js";
import * as SourceMapScopes from "./../source_map_scopes/source_map_scopes.js";
import * as Workspace from "./../workspace/workspace.js";
var _a;
var breakpointManagerInstance;
var INITIAL_RESTORE_BREAKPOINT_COUNT = 100;
var BreakpointManager = class extends Common.ObjectWrapper.ObjectWrapper {
  storage = new Storage();
  #workspace;
  targetManager;
  debuggerWorkspaceBinding;
  // For each source code, we remember the list or breakpoints that refer to that UI source code as
  // their home UI source code. This is necessary to correctly remove the UI source code from
  // breakpoints upon receiving the UISourceCodeRemoved event.
  #breakpointsForHomeUISourceCode = /* @__PURE__ */ new Map();
  // Mapping of UI source codes to all the current breakpoint UI locations. For bound breakpoints,
  // this is all the locations where the breakpoints was bound. For the unbound breakpoints,
  // this is the default locations in the home UI source codes.
  #breakpointsForUISourceCode = /* @__PURE__ */ new Map();
  #breakpointByStorageId = /* @__PURE__ */ new Map();
  #updateBindingsCallbacks = [];
  constructor(targetManager, workspace, debuggerWorkspaceBinding, restoreInitialBreakpointCount) {
    super();
    this.#workspace = workspace;
    this.targetManager = targetManager;
    this.debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this.storage.mute();
    this.#setInitialBreakpoints(restoreInitialBreakpointCount ?? INITIAL_RESTORE_BREAKPOINT_COUNT);
    this.storage.unmute();
    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
    this.#workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemoved, this);
    this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemoved, this);
    this.targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);
  }
  #setInitialBreakpoints(restoreInitialBreakpointCount) {
    let breakpointsToSkip = this.storage.breakpoints.size - restoreInitialBreakpointCount;
    for (const storageState of this.storage.breakpoints.values()) {
      if (breakpointsToSkip > 0) {
        breakpointsToSkip--;
        continue;
      }
      const storageId = Storage.computeId(storageState);
      const breakpoint = new Breakpoint(
        this,
        null,
        storageState,
        "RESTORED"
        /* BreakpointOrigin.OTHER */
      );
      this.#breakpointByStorageId.set(storageId, breakpoint);
    }
  }
  static instance(opts = { forceNew: null, targetManager: null, workspace: null, debuggerWorkspaceBinding: null }) {
    const { forceNew, targetManager, workspace, debuggerWorkspaceBinding, restoreInitialBreakpointCount } = opts;
    if (!breakpointManagerInstance || forceNew) {
      if (!targetManager || !workspace || !debuggerWorkspaceBinding) {
        throw new Error(`Unable to create settings: targetManager, workspace, and debuggerWorkspaceBinding must be provided: ${new Error().stack}`);
      }
      breakpointManagerInstance = new _a(targetManager, workspace, debuggerWorkspaceBinding, restoreInitialBreakpointCount);
    }
    return breakpointManagerInstance;
  }
  modelAdded(debuggerModel) {
    if (Root.Runtime.experiments.isEnabled(
      "instrumentation-breakpoints"
      /* Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS */
    )) {
      debuggerModel.setSynchronizeBreakpointsCallback(this.restoreBreakpointsForScript.bind(this));
    }
  }
  modelRemoved(debuggerModel) {
    debuggerModel.setSynchronizeBreakpointsCallback(null);
  }
  addUpdateBindingsCallback(callback) {
    this.#updateBindingsCallbacks.push(callback);
  }
  async copyBreakpoints(fromSourceCode, toSourceCode) {
    const toSourceCodeIsRemoved = toSourceCode.project().uiSourceCodeForURL(toSourceCode.url()) !== toSourceCode || this.#workspace.project(toSourceCode.project().id()) !== toSourceCode.project();
    const breakpointItems = this.storage.breakpointItems(fromSourceCode.url(), fromSourceCode.contentType().name());
    for (const item of breakpointItems) {
      if (toSourceCodeIsRemoved) {
        this.storage.updateBreakpoint({ ...item, url: toSourceCode.url(), resourceTypeName: toSourceCode.contentType().name() });
      } else {
        await this.setBreakpoint(
          toSourceCode,
          item.lineNumber,
          item.columnNumber,
          item.condition,
          item.enabled,
          item.isLogpoint,
          "RESTORED"
          /* BreakpointOrigin.OTHER */
        );
      }
    }
  }
  // This method explicitly awaits the source map (if necessary) and the uiSourceCodes
  // required to set all breakpoints that are related to this script.
  async restoreBreakpointsForScript(script) {
    if (!Root.Runtime.experiments.isEnabled(
      "instrumentation-breakpoints"
      /* Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS */
    )) {
      return;
    }
    if (!script.sourceURL) {
      return;
    }
    const uiSourceCode = await this.getUISourceCodeWithUpdatedBreakpointInfo(script);
    if (this.#hasBreakpointsForUrl(script.sourceURL)) {
      await this.#restoreBreakpointsForUrl(uiSourceCode);
    }
    const debuggerModel = script.debuggerModel;
    const sourceMap = await debuggerModel.sourceMapManager().sourceMapForClientPromise(script);
    if (sourceMap) {
      for (const sourceURL of sourceMap.sourceURLs()) {
        if (this.#hasBreakpointsForUrl(sourceURL)) {
          const uiSourceCode2 = await this.debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURLPromise(debuggerModel, sourceURL, script.isContentScript());
          await this.#restoreBreakpointsForUrl(uiSourceCode2);
        }
      }
    }
    const { pluginManager } = this.debuggerWorkspaceBinding;
    const sourceUrls = await pluginManager.getSourcesForScript(script);
    if (Array.isArray(sourceUrls)) {
      for (const sourceURL of sourceUrls) {
        if (this.#hasBreakpointsForUrl(sourceURL)) {
          const uiSourceCode2 = await this.debuggerWorkspaceBinding.uiSourceCodeForDebuggerLanguagePluginSourceURLPromise(debuggerModel, sourceURL);
          assertNotNullOrUndefined(uiSourceCode2);
          await this.#restoreBreakpointsForUrl(uiSourceCode2);
        }
      }
    }
  }
  async getUISourceCodeWithUpdatedBreakpointInfo(script) {
    const uiSourceCode = this.debuggerWorkspaceBinding.uiSourceCodeForScript(script);
    assertNotNullOrUndefined(uiSourceCode);
    await this.#updateBindings(uiSourceCode);
    return uiSourceCode;
  }
  async #updateBindings(uiSourceCode) {
    if (this.#updateBindingsCallbacks.length > 0) {
      const promises = [];
      for (const callback of this.#updateBindingsCallbacks) {
        promises.push(callback(uiSourceCode));
      }
      await Promise.all(promises);
    }
  }
  async #restoreBreakpointsForUrl(uiSourceCode) {
    this.restoreBreakpoints(uiSourceCode);
    const breakpoints = this.#breakpointByStorageId.values();
    const affectedBreakpoints = Array.from(breakpoints).filter((x) => x.uiSourceCodes.has(uiSourceCode));
    await Promise.all(affectedBreakpoints.map((bp) => bp.updateBreakpoint()));
  }
  #hasBreakpointsForUrl(url) {
    const breakpointItems = this.storage.breakpointItems(url);
    return breakpointItems.length > 0;
  }
  static getScriptForInlineUiSourceCode(uiSourceCode) {
    const script = Bindings.DefaultScriptMapping.DefaultScriptMapping.scriptForUISourceCode(uiSourceCode);
    if (script && script.isInlineScript() && !script.hasSourceURL) {
      return script;
    }
    return null;
  }
  // For inline scripts, this function translates the line-column coordinates into the coordinates
  // of the embedding document. For other scripts, it just returns unchanged line-column.
  static breakpointLocationFromUiLocation(uiLocation) {
    const uiSourceCode = uiLocation.uiSourceCode;
    const script = _a.getScriptForInlineUiSourceCode(uiSourceCode);
    const { lineNumber, columnNumber } = script ? script.relativeLocationToRawLocation(uiLocation) : uiLocation;
    return { lineNumber, columnNumber };
  }
  // For inline scripts, this function translates the line-column coordinates of the embedding
  // document into the coordinates of the script. Other UI source code coordinated are not
  // affected.
  static uiLocationFromBreakpointLocation(uiSourceCode, lineNumber, columnNumber) {
    const script = _a.getScriptForInlineUiSourceCode(uiSourceCode);
    if (script) {
      ({ lineNumber, columnNumber } = script.rawLocationToRelativeLocation({ lineNumber, columnNumber }));
    }
    return uiSourceCode.uiLocation(lineNumber, columnNumber);
  }
  // Returns true for if the given (raw) position is within the script or if the script
  // is null. This is used to filter breakpoints if a script is known.
  static isValidPositionInScript(lineNumber, columnNumber, script) {
    if (!script) {
      return true;
    }
    if (lineNumber < script.lineOffset || lineNumber > script.endLine) {
      return false;
    }
    if (lineNumber === script.lineOffset && columnNumber && columnNumber < script.columnOffset) {
      return false;
    }
    if (lineNumber === script.endLine && (!columnNumber || columnNumber >= script.endColumn)) {
      return false;
    }
    return true;
  }
  restoreBreakpoints(uiSourceCode) {
    const script = _a.getScriptForInlineUiSourceCode(uiSourceCode);
    const url = script?.sourceURL ?? uiSourceCode.url();
    if (!url) {
      return;
    }
    const contentType = uiSourceCode.contentType();
    this.storage.mute();
    const breakpoints = this.storage.breakpointItems(url, contentType.name());
    for (const breakpoint of breakpoints) {
      const { lineNumber, columnNumber } = breakpoint;
      if (!_a.isValidPositionInScript(lineNumber, columnNumber, script)) {
        continue;
      }
      this.#setBreakpoint(
        uiSourceCode,
        lineNumber,
        columnNumber,
        breakpoint.condition,
        breakpoint.enabled,
        breakpoint.isLogpoint,
        "RESTORED"
        /* BreakpointOrigin.OTHER */
      );
    }
    this.storage.unmute();
  }
  uiSourceCodeAdded(event) {
    const uiSourceCode = event.data;
    this.restoreBreakpoints(uiSourceCode);
  }
  uiSourceCodeRemoved(event) {
    const uiSourceCode = event.data;
    this.removeUISourceCode(uiSourceCode);
  }
  projectRemoved(event) {
    const project = event.data;
    for (const uiSourceCode of project.uiSourceCodes()) {
      this.removeUISourceCode(uiSourceCode);
    }
  }
  removeUISourceCode(uiSourceCode) {
    const breakpoints = this.#getAllBreakpointsForUISourceCode(uiSourceCode);
    breakpoints.forEach((bp) => bp.removeUISourceCode(uiSourceCode));
  }
  async setBreakpoint(uiSourceCode, lineNumber, columnNumber, condition, enabled, isLogpoint, origin) {
    const compatibleUiSourceCodes = this.#workspace.findCompatibleUISourceCodes(uiSourceCode);
    let primaryBreakpoint;
    for (const compatibleUiSourceCode of compatibleUiSourceCodes) {
      const uiLocation = new Workspace.UISourceCode.UILocation(compatibleUiSourceCode, lineNumber, columnNumber);
      const normalizedLocation = await this.debuggerWorkspaceBinding.normalizeUILocation(uiLocation);
      const breakpointLocation = _a.breakpointLocationFromUiLocation(normalizedLocation);
      const breakpoint = this.#setBreakpoint(normalizedLocation.uiSourceCode, breakpointLocation.lineNumber, breakpointLocation.columnNumber, condition, enabled, isLogpoint, origin);
      if (uiSourceCode === compatibleUiSourceCode) {
        if (normalizedLocation.id() !== uiLocation.id()) {
          void Common.Revealer.reveal(normalizedLocation);
        }
        primaryBreakpoint = breakpoint;
      }
    }
    console.assert(primaryBreakpoint !== void 0, "The passed uiSourceCode is expected to be a valid uiSourceCode");
    return primaryBreakpoint;
  }
  #setBreakpoint(uiSourceCode, lineNumber, columnNumber, condition, enabled, isLogpoint, origin) {
    const url = _a.getScriptForInlineUiSourceCode(uiSourceCode)?.sourceURL ?? uiSourceCode.url();
    const resourceTypeName = uiSourceCode.contentType().name();
    const storageState = { url, resourceTypeName, lineNumber, columnNumber, condition, enabled, isLogpoint };
    const storageId = Storage.computeId(storageState);
    let breakpoint = this.#breakpointByStorageId.get(storageId);
    if (breakpoint) {
      breakpoint.updateState(storageState);
      breakpoint.addUISourceCode(uiSourceCode);
      void breakpoint.updateBreakpoint();
      return breakpoint;
    }
    breakpoint = new Breakpoint(this, uiSourceCode, storageState, origin);
    this.#breakpointByStorageId.set(storageId, breakpoint);
    return breakpoint;
  }
  findBreakpoint(uiLocation) {
    const breakpoints = this.#breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    return breakpoints ? breakpoints.get(uiLocation.id()) || null : null;
  }
  addHomeUISourceCode(uiSourceCode, breakpoint) {
    let breakpoints = this.#breakpointsForHomeUISourceCode.get(uiSourceCode);
    if (!breakpoints) {
      breakpoints = /* @__PURE__ */ new Set();
      this.#breakpointsForHomeUISourceCode.set(uiSourceCode, breakpoints);
    }
    breakpoints.add(breakpoint);
  }
  removeHomeUISourceCode(uiSourceCode, breakpoint) {
    const breakpoints = this.#breakpointsForHomeUISourceCode.get(uiSourceCode);
    if (!breakpoints) {
      return;
    }
    breakpoints.delete(breakpoint);
    if (breakpoints.size === 0) {
      this.#breakpointsForHomeUISourceCode.delete(uiSourceCode);
    }
  }
  async possibleBreakpoints(uiSourceCode, textRange) {
    const rawLocationRanges = await this.debuggerWorkspaceBinding.uiLocationRangeToRawLocationRanges(uiSourceCode, textRange);
    const breakLocationLists = await Promise.all(rawLocationRanges.map(({ start, end }) => start.debuggerModel.getPossibleBreakpoints(
      start,
      end,
      /* restrictToFunction */
      false
    )));
    const breakLocations = breakLocationLists.flat();
    const uiLocations = /* @__PURE__ */ new Map();
    await Promise.all(breakLocations.map(async (breakLocation) => {
      const uiLocation = await this.debuggerWorkspaceBinding.rawLocationToUILocation(breakLocation);
      if (uiLocation === null) {
        return;
      }
      if (uiLocation.uiSourceCode !== uiSourceCode) {
        return;
      }
      if (!textRange.containsLocation(uiLocation.lineNumber, uiLocation.columnNumber ?? 0)) {
        return;
      }
      uiLocations.set(uiLocation.id(), uiLocation);
    }));
    return [...uiLocations.values()];
  }
  breakpointLocationsForUISourceCode(uiSourceCode) {
    const breakpoints = this.#breakpointsForUISourceCode.get(uiSourceCode);
    return breakpoints ? Array.from(breakpoints.values()) : [];
  }
  #getAllBreakpointsForUISourceCode(uiSourceCode) {
    const uiBreakpoints = this.breakpointLocationsForUISourceCode(uiSourceCode).map((b) => b.breakpoint);
    return uiBreakpoints.concat(Array.from(this.#breakpointsForHomeUISourceCode.get(uiSourceCode) ?? []));
  }
  allBreakpointLocations() {
    const result = [];
    for (const breakpoints of this.#breakpointsForUISourceCode.values()) {
      result.push(...breakpoints.values());
    }
    return result;
  }
  removeBreakpoint(breakpoint, removeFromStorage) {
    const storageId = breakpoint.breakpointStorageId();
    if (removeFromStorage) {
      this.storage.removeBreakpoint(storageId);
    }
    this.#breakpointByStorageId.delete(storageId);
  }
  uiLocationAdded(breakpoint, uiLocation) {
    let breakpoints = this.#breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    if (!breakpoints) {
      breakpoints = /* @__PURE__ */ new Map();
      this.#breakpointsForUISourceCode.set(uiLocation.uiSourceCode, breakpoints);
    }
    const breakpointLocation = new BreakpointLocation(breakpoint, uiLocation);
    breakpoints.set(uiLocation.id(), breakpointLocation);
    this.dispatchEventToListeners(Events.BreakpointAdded, breakpointLocation);
  }
  uiLocationRemoved(uiLocation) {
    const breakpoints = this.#breakpointsForUISourceCode.get(uiLocation.uiSourceCode);
    if (!breakpoints) {
      return;
    }
    const breakpointLocation = breakpoints.get(uiLocation.id()) || null;
    if (!breakpointLocation) {
      return;
    }
    breakpoints.delete(uiLocation.id());
    if (breakpoints.size === 0) {
      this.#breakpointsForUISourceCode.delete(uiLocation.uiSourceCode);
    }
    this.dispatchEventToListeners(Events.BreakpointRemoved, breakpointLocation);
  }
  supportsConditionalBreakpoints(uiSourceCode) {
    return this.debuggerWorkspaceBinding.supportsConditionalBreakpoints(uiSourceCode);
  }
};
_a = BreakpointManager;
var Events;
(function(Events2) {
  Events2["BreakpointAdded"] = "breakpoint-added";
  Events2["BreakpointRemoved"] = "breakpoint-removed";
})(Events || (Events = {}));
var Breakpoint = class {
  breakpointManager;
  /** Bound locations */
  #uiLocations = /* @__PURE__ */ new Set();
  /** All known UISourceCodes with this url. This also includes UISourceCodes for the inline scripts embedded in a resource with this URL. */
  uiSourceCodes = /* @__PURE__ */ new Set();
  #storageState;
  #origin;
  isRemoved = false;
  /**
   * Fallback positions in case a target doesn't have a script where this breakpoint would fit.
   * The `ModelBreakpoint` sends this optimistically to a target in case a matching script is
   * loaded later.
   *
   * Since every `ModelBreakpoint` can read/write this variable, it's slightly arbitrary. In
   * general `lastResolvedState` contains the state of the last `ModelBreakpoint` that attempted
   * to update the breakpoint(s) in the backend.
   *
   * The state gets populated from the storage if/when we set all breakpoints eagerly
   * on debugger startup so that the backend sets the breakpoints as soon as possible
   * (crbug.com/1442232, under a flag).
   */
  #lastResolvedState = null;
  #modelBreakpoints = /* @__PURE__ */ new Map();
  constructor(breakpointManager, primaryUISourceCode, storageState, origin) {
    this.breakpointManager = breakpointManager;
    this.#origin = origin;
    this.updateState(storageState);
    if (primaryUISourceCode) {
      console.assert(primaryUISourceCode.contentType().name() === storageState.resourceTypeName);
      this.addUISourceCode(primaryUISourceCode);
    } else {
      this.#setLastResolvedStateFromStorage(storageState);
    }
    this.breakpointManager.targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);
  }
  #setLastResolvedStateFromStorage(storageState) {
    if (storageState.resolvedState) {
      this.#lastResolvedState = storageState.resolvedState.map((s) => ({ ...s, scriptHash: "" }));
    } else if (storageState.resourceTypeName === Common.ResourceType.resourceTypes.Script.name()) {
      this.#lastResolvedState = [{
        url: storageState.url,
        lineNumber: storageState.lineNumber,
        columnNumber: storageState.columnNumber,
        scriptHash: "",
        condition: this.backendCondition()
      }];
    }
  }
  getLastResolvedState() {
    return this.#lastResolvedState;
  }
  updateLastResolvedState(locations) {
    this.#lastResolvedState = locations;
    let locationsOrUndefined = void 0;
    if (locations) {
      locationsOrUndefined = locations.map((p) => ({ url: p.url, lineNumber: p.lineNumber, columnNumber: p.columnNumber, condition: p.condition }));
    }
    if (resolvedStateEqual(this.#storageState.resolvedState, locationsOrUndefined)) {
      return;
    }
    this.#storageState = { ...this.#storageState, resolvedState: locationsOrUndefined };
    this.breakpointManager.storage.updateBreakpoint(this.#storageState);
  }
  get origin() {
    return this.#origin;
  }
  async refreshInDebugger() {
    if (!this.isRemoved) {
      const modelBreakpoints = Array.from(this.#modelBreakpoints.values());
      await Promise.all(modelBreakpoints.map(async (modelBreakpoint) => {
        await modelBreakpoint.resetBreakpoint();
        return await this.#updateModel(modelBreakpoint);
      }));
    }
  }
  modelAdded(debuggerModel) {
    const debuggerWorkspaceBinding = this.breakpointManager.debuggerWorkspaceBinding;
    const modelBreakpoint = new ModelBreakpoint(debuggerModel, this, debuggerWorkspaceBinding);
    this.#modelBreakpoints.set(debuggerModel, modelBreakpoint);
    void this.#updateModel(modelBreakpoint);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerWasEnabled, this.#onDebuggerEnabled, this);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerWasDisabled, this.#onDebuggerDisabled, this);
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.ScriptSourceWasEdited, this.#onScriptWasEdited, this);
  }
  modelRemoved(debuggerModel) {
    const modelBreakpoint = this.#modelBreakpoints.get(debuggerModel);
    modelBreakpoint?.cleanUpAfterDebuggerIsGone();
    this.#modelBreakpoints.delete(debuggerModel);
    this.#removeDebuggerModelListeners(debuggerModel);
  }
  #removeDebuggerModelListeners(debuggerModel) {
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerWasEnabled, this.#onDebuggerEnabled, this);
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerWasDisabled, this.#onDebuggerDisabled, this);
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.ScriptSourceWasEdited, this.#onScriptWasEdited, this);
  }
  #onDebuggerEnabled(event) {
    const debuggerModel = event.data;
    const model = this.#modelBreakpoints.get(debuggerModel);
    if (model) {
      void this.#updateModel(model);
    }
  }
  #onDebuggerDisabled(event) {
    const debuggerModel = event.data;
    const model = this.#modelBreakpoints.get(debuggerModel);
    model?.cleanUpAfterDebuggerIsGone();
  }
  async #onScriptWasEdited(event) {
    const { source: debuggerModel, data: { script, status } } = event;
    if (status !== "Ok") {
      return;
    }
    console.assert(debuggerModel instanceof SDK.DebuggerModel.DebuggerModel);
    const model = this.#modelBreakpoints.get(debuggerModel);
    if (model?.wasSetIn(script.scriptId)) {
      await model.resetBreakpoint();
      void this.#updateModel(model);
    }
  }
  modelBreakpoint(debuggerModel) {
    return this.#modelBreakpoints.get(debuggerModel);
  }
  addUISourceCode(uiSourceCode) {
    if (!this.uiSourceCodes.has(uiSourceCode)) {
      this.uiSourceCodes.add(uiSourceCode);
      this.breakpointManager.addHomeUISourceCode(uiSourceCode, this);
      if (!this.bound()) {
        this.breakpointManager.uiLocationAdded(this, this.defaultUILocation(uiSourceCode));
      }
    }
  }
  clearUISourceCodes() {
    if (!this.bound()) {
      this.removeAllUnboundLocations();
    }
    for (const uiSourceCode of this.uiSourceCodes) {
      this.removeUISourceCode(uiSourceCode);
    }
  }
  removeUISourceCode(uiSourceCode) {
    if (this.uiSourceCodes.has(uiSourceCode)) {
      this.uiSourceCodes.delete(uiSourceCode);
      this.breakpointManager.removeHomeUISourceCode(uiSourceCode, this);
      if (!this.bound()) {
        this.breakpointManager.uiLocationRemoved(this.defaultUILocation(uiSourceCode));
      }
    }
    if (this.bound()) {
      for (const uiLocation of this.#uiLocations) {
        if (uiLocation.uiSourceCode === uiSourceCode) {
          this.#uiLocations.delete(uiLocation);
          this.breakpointManager.uiLocationRemoved(uiLocation);
        }
      }
      if (!this.bound() && !this.isRemoved) {
        this.addAllUnboundLocations();
      }
    }
  }
  url() {
    return this.#storageState.url;
  }
  lineNumber() {
    return this.#storageState.lineNumber;
  }
  columnNumber() {
    return this.#storageState.columnNumber;
  }
  uiLocationAdded(uiLocation) {
    if (this.isRemoved) {
      return;
    }
    if (!this.bound()) {
      this.removeAllUnboundLocations();
    }
    this.#uiLocations.add(uiLocation);
    this.breakpointManager.uiLocationAdded(this, uiLocation);
  }
  uiLocationRemoved(uiLocation) {
    if (this.#uiLocations.has(uiLocation)) {
      this.#uiLocations.delete(uiLocation);
      this.breakpointManager.uiLocationRemoved(uiLocation);
      if (!this.bound() && !this.isRemoved) {
        this.addAllUnboundLocations();
      }
    }
  }
  enabled() {
    return this.#storageState.enabled;
  }
  bound() {
    return this.#uiLocations.size !== 0;
  }
  setEnabled(enabled) {
    this.updateState({ ...this.#storageState, enabled });
  }
  /**
   * The breakpoint condition as entered by the user.
   */
  condition() {
    return this.#storageState.condition;
  }
  backendCondition(location) {
    const condition = this.condition();
    if (condition === "") {
      return "";
    }
    const addSourceUrl = (condition2) => {
      let sourceUrl = SDK.DebuggerModel.COND_BREAKPOINT_SOURCE_URL;
      if (this.isLogpoint()) {
        condition2 = `${LOGPOINT_PREFIX}${condition2}${LOGPOINT_SUFFIX}`;
        sourceUrl = SDK.DebuggerModel.LOGPOINT_SOURCE_URL;
      }
      return `${condition2}

//# sourceURL=${sourceUrl}`;
    };
    if (location) {
      return SourceMapScopes.NamesResolver.allVariablesAtPosition(location).then((nameMap) => Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(condition, nameMap)).catch(() => condition).then((subsitutedCondition) => addSourceUrl(subsitutedCondition), () => addSourceUrl(condition));
    }
    return addSourceUrl(condition);
  }
  setCondition(condition, isLogpoint) {
    this.updateState({ ...this.#storageState, condition, isLogpoint });
  }
  isLogpoint() {
    return this.#storageState.isLogpoint;
  }
  get storageState() {
    return this.#storageState;
  }
  updateState(newState) {
    if (this.#storageState && (this.#storageState.url !== newState.url || this.#storageState.lineNumber !== newState.lineNumber || this.#storageState.columnNumber !== newState.columnNumber)) {
      throw new Error("Invalid breakpoint state update");
    }
    if (this.#storageState?.enabled === newState.enabled && this.#storageState?.condition === newState.condition && this.#storageState?.isLogpoint === newState.isLogpoint) {
      return;
    }
    this.#storageState = newState;
    this.breakpointManager.storage.updateBreakpoint(this.#storageState);
    void this.updateBreakpoint();
  }
  async updateBreakpoint() {
    if (!this.bound()) {
      this.removeAllUnboundLocations();
      if (!this.isRemoved) {
        this.addAllUnboundLocations();
      }
    }
    return await this.#updateModels();
  }
  async remove(keepInStorage) {
    if (this.getIsRemoved()) {
      return;
    }
    this.isRemoved = true;
    const removeFromStorage = !keepInStorage;
    for (const debuggerModel of this.#modelBreakpoints.keys()) {
      this.#removeDebuggerModelListeners(debuggerModel);
    }
    await this.#updateModels();
    this.breakpointManager.removeBreakpoint(this, removeFromStorage);
    this.breakpointManager.targetManager.unobserveModels(SDK.DebuggerModel.DebuggerModel, this);
    this.clearUISourceCodes();
  }
  breakpointStorageId() {
    return Storage.computeId(this.#storageState);
  }
  defaultUILocation(uiSourceCode) {
    return BreakpointManager.uiLocationFromBreakpointLocation(uiSourceCode, this.#storageState.lineNumber, this.#storageState.columnNumber);
  }
  removeAllUnboundLocations() {
    for (const uiSourceCode of this.uiSourceCodes) {
      this.breakpointManager.uiLocationRemoved(this.defaultUILocation(uiSourceCode));
    }
  }
  addAllUnboundLocations() {
    for (const uiSourceCode of this.uiSourceCodes) {
      this.breakpointManager.uiLocationAdded(this, this.defaultUILocation(uiSourceCode));
    }
  }
  getUiSourceCodes() {
    return this.uiSourceCodes;
  }
  getIsRemoved() {
    return this.isRemoved;
  }
  async #updateModels() {
    await Promise.all(Array.from(this.#modelBreakpoints.values()).map((model) => this.#updateModel(model)));
  }
  async #updateModel(model) {
    const result = await model.scheduleUpdateInDebugger();
    if (result === "ERROR_BACKEND") {
      await this.remove(
        true
        /* keepInStorage */
      );
    } else if (result === "ERROR_BREAKPOINT_CLASH") {
      await this.remove(
        false
        /* keepInStorage */
      );
    }
  }
};
var ModelBreakpoint = class {
  #debuggerModel;
  #breakpoint;
  #debuggerWorkspaceBinding;
  #liveLocations = new Bindings.LiveLocation.LiveLocationPool();
  #uiLocations = /* @__PURE__ */ new Map();
  #updateMutex = new Common.Mutex.Mutex();
  #cancelCallback = false;
  #currentState = null;
  #breakpointIds = [];
  /**
   * We track all the script IDs this ModelBreakpoint was actually set in. This allows us
   * to properly reset this ModelBreakpoint after a script was live edited.
   */
  #resolvedScriptIds = /* @__PURE__ */ new Set();
  constructor(debuggerModel, breakpoint, debuggerWorkspaceBinding) {
    this.#debuggerModel = debuggerModel;
    this.#breakpoint = breakpoint;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
  }
  get currentState() {
    return this.#currentState;
  }
  resetLocations() {
    for (const uiLocation of this.#uiLocations.values()) {
      this.#breakpoint.uiLocationRemoved(uiLocation);
    }
    this.#uiLocations.clear();
    this.#liveLocations.disposeAll();
    this.#resolvedScriptIds.clear();
  }
  async scheduleUpdateInDebugger() {
    if (!this.#debuggerModel.debuggerEnabled()) {
      return "OK";
    }
    const release = await this.#updateMutex.acquire();
    let result = "PENDING";
    while (result === "PENDING") {
      result = await this.#updateInDebugger();
      if (this.#debuggerModel.debuggerEnabled() && !this.#debuggerModel.isReadyToPause()) {
        await this.#debuggerModel.once(SDK.DebuggerModel.Events.DebuggerIsReadyToPause);
        if (!this.#debuggerModel.debuggerEnabled()) {
          result = "OK";
          break;
        }
      }
    }
    release();
    return result;
  }
  scriptDiverged() {
    for (const uiSourceCode of this.#breakpoint.getUiSourceCodes()) {
      const scriptFile = this.#debuggerWorkspaceBinding.scriptFile(uiSourceCode, this.#debuggerModel);
      if (scriptFile?.hasDivergedFromVM()) {
        return true;
      }
    }
    return false;
  }
  async #updateInDebugger() {
    if (this.#debuggerModel.target().isDisposed()) {
      this.cleanUpAfterDebuggerIsGone();
      return "OK";
    }
    const lineNumber = this.#breakpoint.lineNumber();
    const columnNumber = this.#breakpoint.columnNumber();
    const condition = this.#breakpoint.backendCondition();
    let newState = null;
    if (!this.#breakpoint.getIsRemoved() && this.#breakpoint.enabled() && !this.scriptDiverged()) {
      let debuggerLocations = [];
      for (const uiSourceCode of this.#breakpoint.getUiSourceCodes()) {
        const { lineNumber: uiLineNumber, columnNumber: uiColumnNumber } = BreakpointManager.uiLocationFromBreakpointLocation(uiSourceCode, lineNumber, columnNumber);
        const locations2 = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().uiLocationToRawLocations(uiSourceCode, uiLineNumber, uiColumnNumber);
        debuggerLocations = locations2.filter((location) => location.debuggerModel === this.#debuggerModel);
        if (debuggerLocations.length) {
          break;
        }
      }
      if (debuggerLocations.length && debuggerLocations.every((loc) => loc.script())) {
        const positions = await Promise.all(debuggerLocations.map(async (loc) => {
          const script = loc.script();
          const condition2 = await this.#breakpoint.backendCondition(loc);
          return {
            url: script.sourceURL,
            scriptHash: script.hash,
            lineNumber: loc.lineNumber,
            columnNumber: loc.columnNumber,
            condition: condition2
          };
        }));
        newState = positions.slice(0);
      } else if (!Root.Runtime.experiments.isEnabled(
        "instrumentation-breakpoints"
        /* Root.Runtime.ExperimentName.INSTRUMENTATION_BREAKPOINTS */
      )) {
        const lastResolvedState = this.#breakpoint.getLastResolvedState();
        if (lastResolvedState) {
          newState = lastResolvedState.map((position) => ({ ...position, condition }));
        } else {
          const position = {
            url: this.#breakpoint.url(),
            scriptHash: "",
            lineNumber,
            columnNumber,
            condition
          };
          newState = [position];
        }
      }
    }
    const hasBackendState = this.#breakpointIds.length;
    if (hasBackendState && Breakpoint.State.subset(newState, this.#currentState)) {
      return "OK";
    }
    this.#breakpoint.updateLastResolvedState(newState);
    if (hasBackendState) {
      await this.resetBreakpoint();
      return "PENDING";
    }
    if (!newState) {
      return "OK";
    }
    const { breakpointIds, locations, serverError } = await this.#setBreakpointOnBackend(newState);
    const maybeRescheduleUpdate = serverError && this.#debuggerModel.debuggerEnabled() && !this.#debuggerModel.isReadyToPause();
    if (!breakpointIds.length && maybeRescheduleUpdate) {
      return "PENDING";
    }
    this.#currentState = newState;
    if (this.#cancelCallback) {
      this.#cancelCallback = false;
      return "OK";
    }
    if (!breakpointIds.length) {
      return "ERROR_BACKEND";
    }
    this.#breakpointIds = breakpointIds;
    this.#breakpointIds.forEach((breakpointId) => this.#debuggerModel.addBreakpointListener(breakpointId, this.breakpointResolved, this));
    const resolvedResults = await Promise.all(locations.map((location) => this.addResolvedLocation(location)));
    if (resolvedResults.includes(
      "ERROR"
      /* ResolveLocationResult.ERROR */
    )) {
      return "ERROR_BREAKPOINT_CLASH";
    }
    return "OK";
  }
  async #setBreakpointOnBackend(positions) {
    const results = await Promise.all(positions.map((pos) => {
      if (pos.url) {
        return this.#debuggerModel.setBreakpointByURL(pos.url, pos.lineNumber, pos.columnNumber, pos.condition);
      }
      return this.#debuggerModel.setBreakpointInAnonymousScript(pos.scriptHash, pos.lineNumber, pos.columnNumber, pos.condition);
    }));
    const breakpointIds = [];
    let locations = [];
    let serverError = false;
    for (const result of results) {
      if (result.breakpointId) {
        breakpointIds.push(result.breakpointId);
        locations = locations.concat(result.locations);
      } else {
        serverError = true;
      }
    }
    return { breakpointIds, locations, serverError };
  }
  async resetBreakpoint() {
    if (!this.#breakpointIds.length) {
      return;
    }
    this.resetLocations();
    await Promise.all(this.#breakpointIds.map((id) => this.#debuggerModel.removeBreakpoint(id)));
    this.didRemoveFromDebugger();
    this.#currentState = null;
  }
  didRemoveFromDebugger() {
    if (this.#cancelCallback) {
      this.#cancelCallback = false;
      return;
    }
    this.resetLocations();
    this.#breakpointIds.forEach((breakpointId) => this.#debuggerModel.removeBreakpointListener(breakpointId, this.breakpointResolved, this));
    this.#breakpointIds = [];
  }
  async breakpointResolved({ data: location }) {
    const result = await this.addResolvedLocation(location);
    if (result === "ERROR") {
      await this.#breakpoint.remove(
        false
        /* keepInStorage */
      );
    }
  }
  async locationUpdated(liveLocation) {
    const oldUILocation = this.#uiLocations.get(liveLocation);
    const uiLocation = await liveLocation.uiLocation();
    if (oldUILocation) {
      this.#breakpoint.uiLocationRemoved(oldUILocation);
    }
    if (uiLocation) {
      this.#uiLocations.set(liveLocation, uiLocation);
      this.#breakpoint.uiLocationAdded(uiLocation);
    } else {
      this.#uiLocations.delete(liveLocation);
    }
  }
  async addResolvedLocation(location) {
    this.#resolvedScriptIds.add(location.scriptId);
    const uiLocation = await this.#debuggerWorkspaceBinding.rawLocationToUILocation(location);
    if (!uiLocation) {
      return "OK";
    }
    const breakpointLocation = this.#breakpoint.breakpointManager.findBreakpoint(uiLocation);
    if (breakpointLocation && breakpointLocation.breakpoint !== this.#breakpoint) {
      return "ERROR";
    }
    await this.#debuggerWorkspaceBinding.createLiveLocation(location, this.locationUpdated.bind(this), this.#liveLocations);
    return "OK";
  }
  cleanUpAfterDebuggerIsGone() {
    this.#cancelCallback = true;
    this.resetLocations();
    this.#currentState = null;
    if (this.#breakpointIds.length) {
      this.didRemoveFromDebugger();
    }
  }
  /** @returns true, iff this `ModelBreakpoint` was set (at some point) in `scriptId` */
  wasSetIn(scriptId) {
    return this.#resolvedScriptIds.has(scriptId);
  }
};
(function(Breakpoint2) {
  let State;
  (function(State2) {
    function subset(stateA, stateB) {
      if (stateA === stateB) {
        return true;
      }
      if (!stateA || !stateB) {
        return false;
      }
      if (stateA.length === 0) {
        return false;
      }
      for (const positionA of stateA) {
        if (stateB.find((positionB) => positionA.url === positionB.url && positionA.scriptHash === positionB.scriptHash && positionA.lineNumber === positionB.lineNumber && positionA.columnNumber === positionB.columnNumber && positionA.condition === positionB.condition) === void 0) {
          return false;
        }
      }
      return true;
    }
    State2.subset = subset;
  })(State = Breakpoint2.State || (Breakpoint2.State = {}));
})(Breakpoint || (Breakpoint = {}));
var Storage = class _Storage {
  setting;
  breakpoints;
  #muted;
  constructor() {
    this.setting = Common.Settings.Settings.instance().createLocalSetting("breakpoints", []);
    this.breakpoints = /* @__PURE__ */ new Map();
    this.#muted = false;
    for (const breakpoint of this.setting.get()) {
      this.breakpoints.set(_Storage.computeId(breakpoint), breakpoint);
    }
  }
  mute() {
    this.#muted = true;
  }
  unmute() {
    this.#muted = false;
  }
  breakpointItems(url, resourceTypeName) {
    const breakpoints = [];
    for (const breakpoint of this.breakpoints.values()) {
      if (breakpoint.url !== url) {
        continue;
      }
      if (breakpoint.resourceTypeName !== resourceTypeName && resourceTypeName !== void 0) {
        continue;
      }
      breakpoints.push(breakpoint);
    }
    return breakpoints;
  }
  updateBreakpoint(storageState) {
    if (this.#muted) {
      return;
    }
    const storageId = _Storage.computeId(storageState);
    if (!storageId) {
      return;
    }
    this.breakpoints.delete(storageId);
    this.breakpoints.set(storageId, storageState);
    this.save();
  }
  removeBreakpoint(storageId) {
    if (this.#muted) {
      return;
    }
    this.breakpoints.delete(storageId);
    this.save();
  }
  save() {
    this.setting.set(Array.from(this.breakpoints.values()));
  }
  static computeId({ url, resourceTypeName, lineNumber, columnNumber }) {
    if (!url) {
      return "";
    }
    let id = `${url}:${resourceTypeName}:${lineNumber}`;
    if (columnNumber !== void 0) {
      id += `:${columnNumber}`;
    }
    return id;
  }
};
function resolvedStateEqual(lhs, rhs) {
  if (lhs === rhs) {
    return true;
  }
  if (!lhs || !rhs || lhs.length !== rhs.length) {
    return false;
  }
  for (let i = 0; i < lhs.length; i++) {
    const lhsLoc = lhs[i];
    const rhsLoc = rhs[i];
    if (lhsLoc.url !== rhsLoc.url || lhsLoc.lineNumber !== rhsLoc.lineNumber || lhsLoc.columnNumber !== rhsLoc.columnNumber || lhsLoc.condition !== rhsLoc.condition) {
      return false;
    }
  }
  return true;
}
var EMPTY_BREAKPOINT_CONDITION = "";
var NEVER_PAUSE_HERE_CONDITION = "false";
var BreakpointLocation = class {
  breakpoint;
  uiLocation;
  constructor(breakpoint, uiLocation) {
    this.breakpoint = breakpoint;
    this.uiLocation = uiLocation;
  }
};
var LOGPOINT_PREFIX = "/** DEVTOOLS_LOGPOINT */ console.log(";
var LOGPOINT_SUFFIX = ")";
export {
  BreakpointManager_exports as BreakpointManager
};
//# sourceMappingURL=breakpoints.js.map
