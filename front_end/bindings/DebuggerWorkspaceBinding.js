// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {BlackboxManager} from './BlackboxManager.js';
import {CompilerScriptMapping} from './CompilerScriptMapping.js';
import {DebuggerLanguagePluginManager} from './DebuggerLanguagePlugins.js';
import {DefaultScriptMapping} from './DefaultScriptMapping.js';
import {CXXDWARFLanguagePlugin} from './language_plugins/CXXDWARFLanguagePlugin.js';
import {LiveLocation, LiveLocationPool, LiveLocationWithPool} from './LiveLocation.js';  // eslint-disable-line no-unused-vars
import {ResourceMapping} from './ResourceMapping.js';
import {ResourceScriptFile, ResourceScriptMapping} from './ResourceScriptMapping.js';  // eslint-disable-line no-unused-vars

/**
 * @type {!DebuggerWorkspaceBinding}
 */
let debuggerWorkspaceBindingInstance;

/**
 * @unrestricted
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

    /** @type {!Set.<!Promise>} */
    this._liveLocationPromises = new Set();
  }

  /**
   * @param {{forceNew: ?boolean, targetManager: ?SDK.SDKModel.TargetManager, workspace: ?Workspace.Workspace.WorkspaceImpl}} opts
   */
  static instance(opts = {forceNew: null, targetManager: null, workspace: null}) {
    const {forceNew, targetManager, workspace} = opts;
    if (!debuggerWorkspaceBindingInstance || forceNew) {
      if (!targetManager || !workspace) {
        throw new Error(
            `Unable to create settings: targetManager and workspace must be provided: ${new Error().stack}`);
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
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    this._debuggerModelToData.set(debuggerModel, new ModelData(debuggerModel, this));
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    const modelData = this._debuggerModelToData.get(debuggerModel);
    modelData._dispose();
    this._debuggerModelToData.delete(debuggerModel);
  }

  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @return {?DebuggerLanguagePluginManager}
   */
  getLanguagePluginManager(debuggerModel) {
    const modelData = this._debuggerModelToData.get(debuggerModel);
    if (!modelData) {
      return null;
    }
    return modelData.pluginManager;
  }

  /**
   * The promise returned by this function is resolved once all *currently*
   * pending LiveLocations are processed.
   *
   * @return {!Promise}
   */
  pendingLiveLocationChangesPromise() {
    return Promise.all(this._liveLocationPromises);
  }

  /**
   * @param {!Promise} promise
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
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<!Location>}
   */
  createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const modelData = this._debuggerModelToData.get(rawLocation.script().debuggerModel);
    const liveLocationPromise = modelData._createLiveLocation(rawLocation, updateDelegate, locationPool);
    this._recordLiveLocationChange(liveLocationPromise);
    return liveLocationPromise;
  }

  /**
   * @param {!Array<!SDK.DebuggerModel.Location>} rawLocations
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<!Bindings.LiveLocation>}
   */
  async createStackTraceTopFrameLiveLocation(rawLocations, updateDelegate, locationPool) {
    console.assert(rawLocations.length);
    const locationPromise =
        StackTraceTopFrameLocation.createStackTraceTopFrameLocation(rawLocations, this, updateDelegate, locationPool);
    this._recordLiveLocationChange(locationPromise);
    return locationPromise;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} location
   * @param {function(!LiveLocation)} updateDelegate
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
   * @param {number} columnNumber
   * @return {!Promise<!Array<!SDK.DebuggerModel.Location>>}
   */
  async uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    for (const sourceMapping of this._sourceMappings) {
      const locations = sourceMapping.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
      if (locations.length) {
        return locations;
      }
    }

    const locationsPromises = [];
    for (const modelData of this._debuggerModelToData.values()) {
      locationsPromises.push(modelData._uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber));
    }
    return (await Promise.all(locationsPromises)).flat();
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
      locations.push(...modelData._uiLocationToRawLocationsExcludeAsync(uiSourceCode, lineNumber, columnNumber));
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
    modelData._resourceMapping.resetForTest();
  }

  /**
   * @param {!SDK.DebuggerModel.DebuggerModel} debuggerModel
   * @param {!Location} location
   */
  _registerCallFrameLiveLocation(debuggerModel, location) {
    const locations = this._debuggerModelToData.get(debuggerModel).callFrameLocations;
    locations.add(location);
  }

  /**
   * @param {!Location} location
   */
  _removeLiveLocation(location) {
    const modelData = this._debuggerModelToData.get(location._script.debuggerModel);
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

/**
 * @unrestricted
 */
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

    if (Root.Runtime.experiments.isEnabled('wasmDWARFDebugging')) {
      this._pluginManager = new DebuggerLanguagePluginManager(debuggerModel, workspace, debuggerWorkspaceBinding);
      this._pluginManager.addPlugin(new CXXDWARFLanguagePlugin());
    }


    this._defaultMapping = new DefaultScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._resourceMapping = new ResourceScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._compilerMapping = new CompilerScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);

    /** @type {!Platform.Multimap<!SDK.Script.Script, !Location>} */
    this._locations = new Platform.Multimap();

    debuggerModel.setBeforePausedCallback(this._beforePaused.bind(this));
  }

  /**
   * return {?DebuggerLanguagePluginManager}
   */
  get pluginManager() {
    return this._pluginManager || null;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<!Location>}
   */
  async _createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const script = /** @type {!SDK.Script.Script} */ (rawLocation.script());
    console.assert(script);
    const location = new Location(script, rawLocation, this._debuggerWorkspaceBinding, updateDelegate, locationPool);
    this._locations.set(script, location);
    await location.update();
    return location;
  }

  /**
   * @param {!Location} location
   */
  _disposeLocation(location) {
    this._locations.delete(location._script, location);
  }

  /**
   * @param {!SDK.Script.Script} script
   */
  async _updateLocations(script) {
    const promises = [];
    for (const location of this._locations.get(script)) {
      promises.push(location.update());
    }
    return Promise.all(promises);
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Promise<?Workspace.UISourceCode.UILocation>}
   */
  async _rawLocationToUILocation(rawLocation) {
    let uiLocation = null;
    if (Root.Runtime.experiments.isEnabled('wasmDWARFDebugging')) {
      uiLocation = await this._pluginManager.rawLocationToUILocation(rawLocation);
    }
    uiLocation = uiLocation || this._compilerMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._resourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || ResourceMapping.instance().jsLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._defaultMapping.rawLocationToUILocation(rawLocation);
    return /** @type {!Workspace.UISourceCode.UILocation} */ (uiLocation);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Promise<!Array<!SDK.DebuggerModel.Location>>}
   */
  async _uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    let rawLocations = null;
    if (Root.Runtime.experiments.isEnabled('wasmDWARFDebugging')) {
      rawLocations = await this._pluginManager.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
    }
    rawLocations = rawLocations || this._uiLocationToRawLocationsExcludeAsync(uiSourceCode, lineNumber, columnNumber);
    return rawLocations;
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  _uiLocationToRawLocationsExcludeAsync(uiSourceCode, lineNumber, columnNumber) {
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
    if (callFrame.script.sourceMapURL !== SDK.SourceMap.WasmSourceMap.FAKE_URL &&
        !Root.Runtime.experiments.isEnabled('emptySourceMapAutoStepping')) {
      return true;
    }
    return !!this._compilerMapping.mapsToSourceCode(callFrame.location());
  }

  _dispose() {
    this._debuggerModel.setBeforePausedCallback(null);
    this._compilerMapping.dispose();
    this._resourceMapping.dispose();
    this._defaultMapping.dispose();
  }
}

/**
 * @unrestricted
 */
class Location extends LiveLocationWithPool {
  /**
   * @param {!SDK.Script.Script} script
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {!DebuggerWorkspaceBinding} binding
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   */
  constructor(script, rawLocation, binding, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this._script = script;
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
  async isBlackboxed() {
    const uiLocation = await this.uiLocation();
    return uiLocation ? BlackboxManager.instance().isBlackboxedUISourceCode(uiLocation.uiSourceCode) : false;
  }
}

class StackTraceTopFrameLocation extends LiveLocationWithPool {
  /**
   * @param {function(!LiveLocation)} updateDelegate
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
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Promise<!StackTraceTopFrameLocation>}
   */
  static async createStackTraceTopFrameLocation(rawLocations, binding, updateDelegate, locationPool) {
    const location = new StackTraceTopFrameLocation(updateDelegate, locationPool);
    const locationsPromises = rawLocations.map(
        rawLocation => binding.createLiveLocation(rawLocation, location._scheduleUpdate.bind(location), locationPool));
    location._locations = await Promise.all(locationsPromises);
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
  async isBlackboxed() {
    return this._current ? this._current.isBlackboxed() : false;
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

  _scheduleUpdate() {
    if (this._updateScheduled) {
      return;
    }
    this._updateScheduled = true;
    setImmediate(this._updateLocation.bind(this));
  }

  async _updateLocation() {
    this._updateScheduled = false;
    if (!this._locations || this._locations.length === 0) {
      return;
    }

    this._current = this._locations[0];
    for (const location of this._locations) {
      if (!(await location.isBlackboxed())) {
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
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
  }
}
