// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {CompilerScriptMapping} from './CompilerScriptMapping.js';
import {DebuggerLanguagePluginManager} from './DebuggerLanguagePlugins.js';
import {DefaultScriptMapping} from './DefaultScriptMapping.js';
import {CXXDWARFLanguagePlugin} from './language_plugins/CXXDWARFLanguagePlugin.js';
import {LiveLocation, LiveLocationPool, LiveLocationWithPool} from './LiveLocation.js';  // eslint-disable-line no-unused-vars
import {ResourceScriptFile, ResourceScriptMapping} from './ResourceScriptMapping.js';  // eslint-disable-line no-unused-vars


/**
 * @unrestricted
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.DebuggerModel.DebuggerModel>}
 */
export class DebuggerWorkspaceBinding {
  /**
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
    this._debuggerModelToData.remove(debuggerModel);
  }

  /**
   * @param {!SDK.Script.Script} script
   */
  updateLocations(script) {
    const modelData = this._debuggerModelToData.get(script.debuggerModel);
    if (modelData) {
      modelData._updateLocations(script);
    }
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Location}
   */
  createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const modelData = this._debuggerModelToData.get(rawLocation.script().debuggerModel);
    return modelData._createLiveLocation(rawLocation, updateDelegate, locationPool);
  }

  /**
   * @param {!Array<!SDK.DebuggerModel.Location>} rawLocations
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Bindings.LiveLocation}
   */
  createStackTraceTopFrameLiveLocation(rawLocations, updateDelegate, locationPool) {
    console.assert(rawLocations.length);
    const location = new StackTraceTopFrameLocation(rawLocations, this, updateDelegate, locationPool);
    location.update();
    return location;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} location
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {?Location}
   */
  createCallFrameLiveLocation(location, updateDelegate, locationPool) {
    const script = location.script();
    if (!script) {
      return null;
    }
    const debuggerModel = location.debuggerModel;
    const liveLocation = this.createLiveLocation(location, updateDelegate, locationPool);
    this._registerCallFrameLiveLocation(debuggerModel, liveLocation);
    return liveLocation;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    for (let i = 0; i < this._sourceMappings.length; ++i) {
      const uiLocation = this._sourceMappings[i].rawLocationToUILocation(rawLocation);
      if (uiLocation) {
        return uiLocation;
      }
    }
    const modelData = this._debuggerModelToData.get(rawLocation.debuggerModel);
    return modelData._rawLocationToUILocation(rawLocation);
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
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    let locations = [];
    for (let i = 0; i < this._sourceMappings.length && !locations.length; ++i) {
      locations = this._sourceMappings[i].uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
    }
    if (locations.length) {
      return locations;
    }
    for (const modelData of this._debuggerModelToData.values()) {
      locations.push(...modelData._uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber));
    }
    return locations;
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
   * @return {!Workspace.UISourceCode.UILocation}
   */
  normalizeUILocation(uiLocation) {
    const rawLocations =
        this.uiLocationToRawLocations(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber);
    for (const location of rawLocations) {
      const uiLocationCandidate = this.rawLocationToUILocation(location);
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
   * @param {!Common.Event} event
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
    modelData.callFrameLocations.valuesArray().forEach(location => this._removeLiveLocation(location));
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
   * @param {!Common.Event} event
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
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!Location}
   */
  _createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const script = /** @type {!SDK.Script.Script} */ (rawLocation.script());
    console.assert(script);
    const location = new Location(script, rawLocation, this._debuggerWorkspaceBinding, updateDelegate, locationPool);
    this._locations.set(script, location);
    location.update();
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
  _updateLocations(script) {
    for (const location of this._locations.get(script)) {
      location.update();
    }
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UISourceCode.UILocation}
   */
  _rawLocationToUILocation(rawLocation) {
    let uiLocation = null;
    if (Root.Runtime.experiments.isEnabled('wasmDWARFDebugging')) {
      uiLocation = this._pluginManager.rawLocationToUILocation(rawLocation);
    }
    uiLocation = uiLocation || this._compilerMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._resourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || self.Bindings.resourceMapping.jsLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._defaultMapping.rawLocationToUILocation(rawLocation);
    return /** @type {!Workspace.UISourceCode.UILocation} */ (uiLocation);
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array<!SDK.DebuggerModel.Location>}
   */
  _uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    // TODO(szuend): Make this function async and delegate to the language component in
    //               addition to {_uiLocationToRawLocationsExcludeAsync}.
    let rawLocations = null;
    if (Root.Runtime.experiments.isEnabled('wasmDWARFDebugging')) {
      rawLocations = this._pluginManager.uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber);
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
        self.Bindings.resourceMapping.uiLocationToJSLocations(uiSourceCode, lineNumber, columnNumber);
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
   * @return {?Workspace.UISourceCode.UILocation}
   */
  uiLocation() {
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
   * @return {boolean}
   */
  isBlackboxed() {
    const uiLocation = this.uiLocation();
    return uiLocation ? self.Bindings.blackboxManager.isBlackboxedUISourceCode(uiLocation.uiSourceCode) : false;
  }
}

class StackTraceTopFrameLocation extends LiveLocationWithPool {
  /**
   * @param {!Array<!SDK.DebuggerModel.Location>} rawLocations
   * @param {!DebuggerWorkspaceBinding} binding
   * @param {function(!LiveLocation)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   */
  constructor(rawLocations, binding, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this._updateScheduled = true;
    this._current = null;
    this._locations = rawLocations.map(
        location => binding.createLiveLocation(location, this._scheduleUpdate.bind(this), locationPool));
    this._updateLocation();
  }

  /**
   * @override
   * @return {?Workspace.UISourceCode.UILocation}
   */
  uiLocation() {
    return this._current.uiLocation();
  }

  /**
   * @override
   * @return {boolean}
   */
  isBlackboxed() {
    return this._current.isBlackboxed();
  }

  /**
   * @override
   */
  dispose() {
    super.dispose();
    for (const location of this._locations) {
      location.dispose();
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

  _updateLocation() {
    this._updateScheduled = false;
    if (!this._locations) {
      return;
    }
    this._current = this._locations.find(location => !location.isBlackboxed()) || this._locations[0];
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
