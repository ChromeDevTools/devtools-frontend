// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {CompilerScriptMapping} from './CompilerScriptMapping.js';
import {DebuggerLanguagePluginManager} from './DebuggerLanguagePlugins.js';
import {DefaultScriptMapping} from './DefaultScriptMapping.js';
import {IgnoreListManager} from './IgnoreListManager.js';
import {LiveLocation, LiveLocationPool, LiveLocationWithPool} from './LiveLocation.js';  // eslint-disable-line no-unused-vars
import {ResourceMapping} from './ResourceMapping.js';
import {ResourceScriptFile, ResourceScriptMapping} from './ResourceScriptMapping.js';  // eslint-disable-line no-unused-vars

/**
 * @type {!DebuggerWorkspaceBinding}
 */
let debuggerWorkspaceBindingInstance;

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.DebuggerModel.DebuggerModel>}
 */
export class DebuggerWorkspaceBinding {
  /**
   * @private
   * @param {!SDK.SDKModel.TargetManager} targetManager
   * @param {!Workspace.Workspace.WorkspaceImpl} workspace
   */
  constructor(targetManager, workspace) {
    this._workspace = workspace;

    /** @type {!Array<!DebuggerSourceMapping>} */
    this._sourceMappings = [];

    /** @type {!Map.<!SDK.DebuggerModel.DebuggerModel, !ModelData>} */
    this._debuggerModelToData = new Map();
    targetManager.addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this);
    targetManager.addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this._debuggerResumed, this);
    targetManager.observeModels(SDK.DebuggerModel.DebuggerModel, this);

    /** @type {!Set.<!Promise<?>>} */
    this._liveLocationPromises = new Set();

    this.pluginManager = Root.Runtime.experiments.isEnabled('wasmDWARFDebugging') ?
        new DebuggerLanguagePluginManager(targetManager, workspace, this) :
        null;
  }

  /**
   * @param {{forceNew: ?boolean, targetManager: ?SDK.SDKModel.TargetManager, workspace: ?Workspace.Workspace.WorkspaceImpl}} opts
   */
  static instance(opts = {forceNew: null, targetManager: null, workspace: null}) {
    const {forceNew, targetManager, workspace} = opts;
    if (!debuggerWorkspaceBindingInstance || forceNew) {
      if (!targetManager || !workspace) {
        throw new Error(`Unable to create DebuggerWorkspaceBinding: targetManager and workspace must be provided: ${
            new Error().stack}`);
      }

      debuggerWorkspaceBindingInstance = new DebuggerWorkspaceBinding(targetManager, workspace);
    }

    return debuggerWorkspaceBindingInstance;
  }

  /**
   * @param {!DebuggerSourceMapping} sourceMapping
   */
  addSourceMapping(sourceMapping) {
    this._sourceMappings.push(sourceMapping);
  }

  /**
   * @param {!SDK.DebuggerModel.StepMode} mode
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @return {!Promise<!Array<!{start:!SDK.DebuggerModel.Location, end:!SDK.DebuggerModel.Location}>>}
   */
  async _computeAutoStepRanges(mode, callFrame) {
    /**
     * @param {!SDK.DebuggerModel.Location} location
     * @param {!{start:!SDK.DebuggerModel.Location, end:!SDK.DebuggerModel.Location}} range
     * @return {boolean}
     */
    function contained(location, range) {
      const {start, end} = range;
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

    // TODO(crbug.com/1018234): Also take into account source maps here and remove the auto-stepping
    // logic in the front-end (which is currently still an experiment) completely.
    const pluginManager = this.pluginManager;
    if (pluginManager) {
      const rawLocation = callFrame.location();
      if (mode === SDK.DebuggerModel.StepMode.StepOut) {
        // Step out of inline function.
        return await pluginManager.getInlinedFunctionRanges(rawLocation);
      }
      /** @type {!Array<!{start:!SDK.DebuggerModel.Location, end:!SDK.DebuggerModel.Location}>} */
      let ranges = [];
      const uiLocation = await pluginManager.rawLocationToUILocation(rawLocation);
      if (uiLocation) {
        ranges = await pluginManager.uiLocationToRawLocationRanges(
                     uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber) ||
            [];
        // TODO(bmeurer): Remove the {rawLocation} from the {ranges}?
        ranges = ranges.filter(range => contained(rawLocation, range));
      }
      if (mode === SDK.DebuggerModel.StepMode.StepOver) {
        // Step over an inlined function.
        ranges = ranges.concat(await pluginManager.getInlinedCalleesRanges(rawLocation));
      }
      return ranges;
    }
    return [];
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    this._debuggerModelToData.set(debuggerModel, new ModelData(debuggerModel, this));
    debuggerModel.setComputeAutoStepRangesCallback(this._computeAutoStepRanges.bind(this));
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    debuggerModel.setComputeAutoStepRangesCallback(null);
    const modelData = this._debuggerModelToData.get(debuggerModel);
    if (modelData) {
      modelData._dispose();
      this._debuggerModelToData.delete(debuggerModel);
    }
  }

  /**
   * The promise returned by this function is resolved once all *currently*
   * pending LiveLocations are processed.
   *
   * @return {!Promise<?>}
   */
  async pendingLiveLocationChangesPromise() {
    await Promise.all(this._liveLocationPromises);
  }

  /**
   * @param {!Promise<?>} promise
   */
  _recordLiveLocationChange(promise) {
    promise.then(() => {
      this._liveLocationPromises.delete(promise);
    });
    this._liveLocationPromises.add(promise);
  }

  /**
   * @param {!SDK.Script.Script} script
   */
  async updateLocations(script) {
    const modelData = this._debuggerModelToData.get(script.debuggerModel);
    if (modelData) {
      const updatePromise = modelData._updateLocations(script);
      this._recordLiveLocationChange(updatePromise);
      await updatePromise;
    }
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {function(!LiveLocation): !Promise<?>} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<?Location>}
   */
  async createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const modelData = this._debuggerModelToData.get(rawLocation.debuggerModel);
    if (!modelData) {
      return null;
    }
    const liveLocationPromise = modelData._createLiveLocation(rawLocation, updateDelegate, locationPool);
    this._recordLiveLocationChange(liveLocationPromise);
    return liveLocationPromise;
  }

  /**
   * @param {!Array<!SDK.DebuggerModel.Location>} rawLocations
   * @param {function(!LiveLocation): !Promise<?>} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<!LiveLocation>}
   */
  async createStackTraceTopFrameLiveLocation(rawLocations, updateDelegate, locationPool) {
    console.assert(rawLocations.length > 0);
    const locationPromise =
        StackTraceTopFrameLocation.createStackTraceTopFrameLocation(rawLocations, this, updateDelegate, locationPool);
    this._recordLiveLocationChange(locationPromise);
    return locationPromise;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} location
   * @param {function(!LiveLocation): !Promise<?>} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<?Location>}
   */
  async createCallFrameLiveLocation(location, updateDelegate, locationPool) {
    const script = location.script();
    if (!script) {
      return null;
    }
    const debuggerModel = location.debuggerModel;
    const liveLocationPromise = this.createLiveLocation(location, updateDelegate, locationPool);
    this._recordLiveLocationChange(liveLocationPromise);
    const liveLocation = await liveLocationPromise;
    if (!liveLocation) {
      return null;
    }
    this._registerCallFrameLiveLocation(debuggerModel, liveLocation);
    return liveLocation;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Promise<?Workspace.UISourceCode.UILocation>}
   */
  async rawLocationToUILocation(rawLocation) {
    for (const sourceMapping of this._sourceMappings) {
      const uiLocation = sourceMapping.rawLocationToUILocation(rawLocation);
      if (uiLocation) {
        return uiLocation;
      }
    }
    if (this.pluginManager) {
      const uiLocation = await this.pluginManager.rawLocationToUILocation(rawLocation);
      if (uiLocation) {
        return uiLocation;
      }
    }
    const modelData = this._debuggerModelToData.get(rawLocation.debuggerModel);
    return modelData ? modelData._rawLocationToUILocation(rawLocation) : null;
  }

  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @param {string} url
   * @param {boolean} isContentScript
   */
  uiSourceCodeForSourceMapSourceURL(debuggerModel, url, isContentScript) {
    const modelData = this._debuggerModelToData.get(debuggerModel);
    if (!modelData) {
      return null;
    }
    return modelData._compilerMapping.uiSourceCodeForURL(url, isContentScript);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {!Promise<!Array<!SDK.DebuggerModel.Location>>}
   */
  async uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    for (const sourceMapping of this._sourceMappings) {
      const locations = sourceMapping.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
      if (locations.length) {
        return locations;
      }
    }
    // TODO(bmeurer): This is more complicated than it needs to be, because
    // only the pluginManager part below needs to be asynchronous and any
    // given uiSourceCode cannot be provided by both a plugin and another
    // mean of source mapping. Yet, there's currently a subtle timing issue
    // with http/tests/devtools/sources/debugger-ui/click-gutter-breakpoint.js
    // and so for now we leave the promises in here.
    const locationPromises = [];
    if (this.pluginManager) {
      locationPromises.push(this.pluginManager.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber)
                                .then(locations => locations || []));
    }
    for (const modelData of this._debuggerModelToData.values()) {
      locationPromises.push(
          Promise.resolve(modelData._uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber)));
    }
    return (await Promise.all(locationPromises)).flat();
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  uiLocationToRawLocationsForUnformattedJavaScript(uiSourceCode, lineNumber, columnNumber) {
    console.assert(uiSourceCode.contentType().isScript());
    const locations = [];
    for (const modelData of this._debuggerModelToData.values()) {
      locations.push(...modelData._uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber));
    }
    return locations;
  }

  /**
   * @param {!Workspace.UISourceCode.UILocation} uiLocation
   * @return {!Promise<!Workspace.UISourceCode.UILocation>}
   */
  async normalizeUILocation(uiLocation) {
    const rawLocations =
        await this.uiLocationToRawLocations(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber);
    for (const location of rawLocations) {
      const uiLocationCandidate = await this.rawLocationToUILocation(location);
      if (uiLocationCandidate) {
        return uiLocationCandidate;
      }
    }
    return uiLocation;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @return {?ResourceScriptFile}
   */
  scriptFile(uiSourceCode, debuggerModel) {
    const modelData = this._debuggerModelToData.get(debuggerModel);
    return modelData ? modelData._resourceMapping.scriptFile(uiSourceCode) : null;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {!Array<!SDK.Script.Script>}
   */
  scriptsForUISourceCode(uiSourceCode) {
    const scripts = new Set();
    if (this.pluginManager) {
      this.pluginManager.scriptsForUISourceCode(uiSourceCode).forEach(script => scripts.add(script));
    }
    for (const modelData of this._debuggerModelToData.values()) {
      const resourceScriptFile = modelData._resourceMapping.scriptFile(uiSourceCode);
      if (resourceScriptFile && resourceScriptFile._script) {
        scripts.add(resourceScriptFile._script);
      }
      modelData._compilerMapping.scriptsForUISourceCode(uiSourceCode).forEach(script => scripts.add(script));
    }
    return [...scripts];
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  supportsConditionalBreakpoints(uiSourceCode) {
    // DevTools traditionally supported (JavaScript) conditions
    // for breakpoints everywhere, so we keep that behavior...
    if (!this.pluginManager) {
      return true;
    }
    const scripts = this.pluginManager.scriptsForUISourceCode(uiSourceCode);
    return scripts.every(script => script.isJavaScript());
  }

  /**
   * @param {!SDK.Script.Script} script
   * @return {?SDK.SourceMap.SourceMap}
   */
  sourceMapForScript(script) {
    const modelData = this._debuggerModelToData.get(script.debuggerModel);
    if (!modelData) {
      return null;
    }
    return modelData._compilerMapping.sourceMapForScript(script);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _globalObjectCleared(event) {
    const debuggerModel = /** @type {!SDK.DebuggerModel.DebuggerModel} */ (event.data);
    this._reset(debuggerModel);
  }

  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  _reset(debuggerModel) {
    const modelData = this._debuggerModelToData.get(debuggerModel);
    if (!modelData) {
      return;
    }
    for (const location of modelData.callFrameLocations.values()) {
      this._removeLiveLocation(location);
    }
    modelData.callFrameLocations.clear();
  }

  /**
   * @param {!SDK.SDKModel.Target} target
   */
  _resetForTest(target) {
    const debuggerModel =
        /** @type {!SDK.DebuggerModel.DebuggerModel} */ (target.model(SDK.DebuggerModel.DebuggerModel));
    const modelData = this._debuggerModelToData.get(debuggerModel);
    if (modelData) {
      modelData._resourceMapping.resetForTest();
    }
  }

  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @param {!Location} location
   */
  _registerCallFrameLiveLocation(debuggerModel, location) {
    const modelData = this._debuggerModelToData.get(debuggerModel);
    if (modelData) {
      const locations = modelData.callFrameLocations;
      locations.add(location);
    }
  }

  /**
   * @param {!Location} location
   */
  _removeLiveLocation(location) {
    const modelData = this._debuggerModelToData.get(location._rawLocation.debuggerModel);
    if (modelData) {
      modelData._disposeLocation(location);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _debuggerResumed(event) {
    const debuggerModel = /** @type {!SDK.DebuggerModel.DebuggerModel} */ (event.data);
    this._reset(debuggerModel);
  }
}

class ModelData {
  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @param {!DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerModel, debuggerWorkspaceBinding) {
    this._debuggerModel = debuggerModel;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    /** @type {!Set.<!Location>} */
    this.callFrameLocations = new Set();

    const workspace = debuggerWorkspaceBinding._workspace;
    this._defaultMapping = new DefaultScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._resourceMapping = new ResourceScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._compilerMapping = new CompilerScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);

    /** @type {!Platform.MapUtilities.Multimap<string, !Location>} */
    this._locations = new Platform.MapUtilities.Multimap();

    debuggerModel.setBeforePausedCallback(this._beforePaused.bind(this));
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {function(!LiveLocation): !Promise<?>} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<!Location>}
   */
  async _createLiveLocation(rawLocation, updateDelegate, locationPool) {
    console.assert(rawLocation.scriptId !== '');
    const scriptId = rawLocation.scriptId;
    const location = new Location(scriptId, rawLocation, this._debuggerWorkspaceBinding, updateDelegate, locationPool);
    this._locations.set(scriptId, location);
    await location.update();
    return location;
  }

  /**
   * @param {!Location} location
   */
  _disposeLocation(location) {
    this._locations.delete(location._scriptId, location);
  }

  /**
   * @param {!SDK.Script.Script} script
   */
  async _updateLocations(script) {
    const promises = [];
    for (const location of this._locations.get(script.scriptId)) {
      promises.push(location.update());
    }
    await Promise.all(promises);
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  _rawLocationToUILocation(rawLocation) {
    let uiLocation = this._compilerMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._resourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || ResourceMapping.instance().jsLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._defaultMapping.rawLocationToUILocation(rawLocation);
    return /** @type {!Workspace.UISourceCode.UILocation} */ (uiLocation);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  _uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber = 0) {
    // TODO(crbug.com/1153123): Revisit the `columnNumber = 0` and also preserve `undefined` for source maps?
    let locations = this._compilerMapping.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
    locations = locations.length ?
        locations :
        this._resourceMapping.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
    locations = locations.length ?
        locations :
        ResourceMapping.instance().uiLocationToJSLocations(uiSourceCode, lineNumber, columnNumber);
    locations = locations.length ?
        locations :
        this._defaultMapping.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
    return locations;
  }

  /**
   * @param {!SDK.DebuggerModel.DebuggerPausedDetails} debuggerPausedDetails
   * @return {boolean}
   */
  _beforePaused(debuggerPausedDetails) {
    const callFrame = debuggerPausedDetails.callFrames[0];
    if (!callFrame) {
      return false;
    }
    if (!Root.Runtime.experiments.isEnabled('emptySourceMapAutoStepping')) {
      return true;
    }
    return Boolean(this._compilerMapping.mapsToSourceCode(callFrame.location()));
  }

  _dispose() {
    this._debuggerModel.setBeforePausedCallback(null);
    this._compilerMapping.dispose();
    this._resourceMapping.dispose();
    this._defaultMapping.dispose();
  }
}

export class Location extends LiveLocationWithPool {
  /**
   * @param {string} scriptId
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {!DebuggerWorkspaceBinding} binding
   * @param {function(!LiveLocation): !Promise<?>} updateDelegate
   * @param {!LiveLocationPool} locationPool
   */
  constructor(scriptId, rawLocation, binding, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this._scriptId = scriptId;
    this._rawLocation = rawLocation;
    this._binding = binding;
  }

  /**
   * @override
   * @return {!Promise<?Workspace.UISourceCode.UILocation>}
   */
  async uiLocation() {
    const debuggerModelLocation = this._rawLocation;
    return this._binding.rawLocationToUILocation(debuggerModelLocation);
  }

  /**
   * @override
   */
  dispose() {
    super.dispose();
    this._binding._removeLiveLocation(this);
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  async isIgnoreListed() {
    const uiLocation = await this.uiLocation();
    return uiLocation ? IgnoreListManager.instance().isIgnoreListedUISourceCode(uiLocation.uiSourceCode) : false;
  }
}

class StackTraceTopFrameLocation extends LiveLocationWithPool {
  /**
   * @param {function(!LiveLocation): !Promise<?>} updateDelegate
   * @param {!LiveLocationPool} locationPool
   */
  constructor(updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this._updateScheduled = true;
    /** @type {?LiveLocation} */
    this._current = null;
    /** @type {?Array<!LiveLocation>} */
    this._locations = null;
  }

  /**
   * @param {!Array<!SDK.DebuggerModel.Location>} rawLocations
   * @param {!DebuggerWorkspaceBinding} binding
   * @param {function(!LiveLocation): !Promise<?>} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<!StackTraceTopFrameLocation>}
   */
  static async createStackTraceTopFrameLocation(rawLocations, binding, updateDelegate, locationPool) {
    const location = new StackTraceTopFrameLocation(updateDelegate, locationPool);
    const locationsPromises = rawLocations.map(
        rawLocation => binding.createLiveLocation(rawLocation, location._scheduleUpdate.bind(location), locationPool));
    location._locations =
        /** @type {!Array<!Location>} */ ((await Promise.all(locationsPromises)).filter(l => Boolean(l)));
    await location._updateLocation();
    return location;
  }

  /**
   * @override
   * @return {!Promise<?Workspace.UISourceCode.UILocation>}
   */
  async uiLocation() {
    return this._current ? this._current.uiLocation() : null;
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  async isIgnoreListed() {
    return this._current ? this._current.isIgnoreListed() : false;
  }

  /**
   * @override
   */
  dispose() {
    super.dispose();
    if (this._locations) {
      for (const location of this._locations) {
        location.dispose();
      }
    }
    this._locations = null;
    this._current = null;
  }

  async _scheduleUpdate() {
    if (this._updateScheduled) {
      return;
    }
    this._updateScheduled = true;
    queueMicrotask(() => {
      this._updateLocation();
    });
  }

  async _updateLocation() {
    this._updateScheduled = false;
    if (!this._locations || this._locations.length === 0) {
      return;
    }

    this._current = this._locations[0];
    for (const location of this._locations) {
      if (!(await location.isIgnoreListed())) {
        this._current = location;
        break;
      }
    }
    this.update();
  }
}

/**
 * @interface
 */
export class DebuggerSourceMapping {
  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    throw new Error('Not yet implemented');
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    throw new Error('Not yet implemented');
  }
}
