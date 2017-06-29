// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 * @implements {SDK.SDKModelObserver<!SDK.DebuggerModel>}
 */
Bindings.DebuggerWorkspaceBinding = class {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   */
  constructor(targetManager, workspace) {
    this._workspace = workspace;

    /** @type {!Array<!Bindings.DebuggerSourceMapping>} */
    this._sourceMappings = [];

    /** @type {!Map.<!SDK.DebuggerModel, !Bindings.DebuggerWorkspaceBinding.ModelData>} */
    this._debuggerModelToData = new Map();
    targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this);
    targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this._debuggerResumed, this);
    targetManager.observeModels(SDK.DebuggerModel, this);
  }

  /**
   * @param {!Bindings.DebuggerSourceMapping} sourceMapping
   */
  addSourceMapping(sourceMapping) {
    this._sourceMappings.push(sourceMapping);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    this._debuggerModelToData.set(debuggerModel, new Bindings.DebuggerWorkspaceBinding.ModelData(debuggerModel, this));
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    var modelData = this._debuggerModelToData.get(debuggerModel);
    modelData._dispose();
    this._debuggerModelToData.remove(debuggerModel);
  }

  /**
   * @param {!SDK.Script} script
   */
  updateLocations(script) {
    var modelData = this._debuggerModelToData.get(script.debuggerModel);
    if (modelData)
      modelData._updateLocations(script);
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   * @return {!Bindings.DebuggerWorkspaceBinding.Location}
   */
  createLiveLocation(rawLocation, updateDelegate, locationPool) {
    var modelData = this._debuggerModelToData.get(rawLocation.script().debuggerModel);
    return modelData._createLiveLocation(rawLocation, updateDelegate, locationPool);
  }

  /**
   * @param {!Array<!SDK.DebuggerModel.Location>} rawLocations
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   * @return {!Bindings.LiveLocation}
   */
  createStackTraceTopFrameLiveLocation(rawLocations, updateDelegate, locationPool) {
    console.assert(rawLocations.length);
    var location = new Bindings.DebuggerWorkspaceBinding.StackTraceTopFrameLocation(
        rawLocations, this, updateDelegate, locationPool);
    location.update();
    return location;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} location
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   * @return {?Bindings.DebuggerWorkspaceBinding.Location}
   */
  createCallFrameLiveLocation(location, updateDelegate, locationPool) {
    var script = location.script();
    if (!script)
      return null;
    var debuggerModel = location.debuggerModel;
    var liveLocation = this.createLiveLocation(location, updateDelegate, locationPool);
    this._registerCallFrameLiveLocation(debuggerModel, liveLocation);
    return liveLocation;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    for (var i = 0; i < this._sourceMappings.length; ++i) {
      var uiLocation = this._sourceMappings[i].rawLocationToUILocation(rawLocation);
      if (uiLocation)
        return uiLocation;
    }
    var modelData = this._debuggerModelToData.get(rawLocation.debuggerModel);
    return modelData._rawLocationToUILocation(rawLocation);
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {string} url
   * @param {boolean} isContentScript
   */
  uiSourceCodeForSourceMapSourceURL(debuggerModel, url, isContentScript) {
    var modelData = this._debuggerModelToData.get(debuggerModel);
    if (!modelData)
      return null;
    return modelData._compilerMapping.uiSourceCodeForURL(url, isContentScript);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) {
    for (var i = 0; i < this._sourceMappings.length; ++i) {
      var rawLocation = this._sourceMappings[i].uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber);
      if (rawLocation)
        return rawLocation;
    }

    for (var modelData of this._debuggerModelToData.values()) {
      var rawLocation = modelData._uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber);
      if (rawLocation)
        return rawLocation;
    }
    return null;
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   * @return {!Workspace.UILocation}
   */
  normalizeUILocation(uiLocation) {
    var rawLocation =
        this.uiLocationToRawLocation(uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber);
    if (rawLocation)
      return this.rawLocationToUILocation(rawLocation) || uiLocation;
    return uiLocation;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!SDK.DebuggerModel} debuggerModel
   * @return {?Bindings.ResourceScriptFile}
   */
  scriptFile(uiSourceCode, debuggerModel) {
    var modelData = this._debuggerModelToData.get(debuggerModel);
    return modelData ? modelData._resourceMapping.scriptFile(uiSourceCode) : null;
  }

  /**
   * @param {!SDK.Script} script
   * @return {?SDK.SourceMap}
   */
  sourceMapForScript(script) {
    var modelData = this._debuggerModelToData.get(script.debuggerModel);
    if (!modelData)
      return null;
    return modelData._compilerMapping.sourceMapForScript(script);
  }

  /**
   * @param {!SDK.Script} script
   */
  maybeLoadSourceMap(script) {
    var modelData = this._debuggerModelToData.get(script.debuggerModel);
    if (!modelData)
      return;
    modelData._compilerMapping.maybeLoadSourceMap(script);
  }

  /**
   * @param {!Common.Event} event
   */
  _globalObjectCleared(event) {
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    this._reset(debuggerModel);
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  _reset(debuggerModel) {
    var modelData = this._debuggerModelToData.get(debuggerModel);
    modelData.callFrameLocations.valuesArray().forEach(location => this._removeLiveLocation(location));
    modelData.callFrameLocations.clear();
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Bindings.DebuggerWorkspaceBinding.Location} location
   */
  _registerCallFrameLiveLocation(debuggerModel, location) {
    var locations = this._debuggerModelToData.get(debuggerModel).callFrameLocations;
    locations.add(location);
  }

  /**
   * @param {!Bindings.DebuggerWorkspaceBinding.Location} location
   */
  _removeLiveLocation(location) {
    var modelData = this._debuggerModelToData.get(location._script.debuggerModel);
    if (modelData)
      modelData._disposeLocation(location);
  }

  /**
   * @param {!Common.Event} event
   */
  _debuggerResumed(event) {
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    this._reset(debuggerModel);
  }
};

/**
 * @unrestricted
 */
Bindings.DebuggerWorkspaceBinding.ModelData = class {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Bindings.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerModel, debuggerWorkspaceBinding) {
    this._debuggerModel = debuggerModel;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    /** @type {!Set.<!Bindings.DebuggerWorkspaceBinding.Location>} */
    this.callFrameLocations = new Set();

    var workspace = debuggerWorkspaceBinding._workspace;

    this._defaultMapping = new Bindings.DefaultScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._resourceMapping = new Bindings.ResourceScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._compilerMapping = new Bindings.CompilerScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);

    /** @type {!Multimap<!SDK.Script, !Bindings.DebuggerWorkspaceBinding.Location>} */
    this._locations = new Multimap();

    debuggerModel.setBeforePausedCallback(this._beforePaused.bind(this));
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   * @return {!Bindings.DebuggerWorkspaceBinding.Location}
   */
  _createLiveLocation(rawLocation, updateDelegate, locationPool) {
    var script = /** @type {!SDK.Script} */ (rawLocation.script());
    console.assert(script);
    var location = new Bindings.DebuggerWorkspaceBinding.Location(
        script, rawLocation, this._debuggerWorkspaceBinding, updateDelegate, locationPool);
    this._locations.set(script, location);
    location.update();
    return location;
  }

  /**
   * @param {!Bindings.DebuggerWorkspaceBinding.Location} location
   */
  _disposeLocation(location) {
    this._locations.delete(location._script, location);
  }

  /**
   * @param {!SDK.Script} script
   */
  _updateLocations(script) {
    for (var location of this._locations.get(script))
      location.update();
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UILocation}
   */
  _rawLocationToUILocation(rawLocation) {
    var uiLocation = null;
    uiLocation = uiLocation || this._compilerMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._resourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || Bindings.resourceMapping.jsLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._defaultMapping.rawLocationToUILocation(rawLocation);
    return /** @type {!Workspace.UILocation} */ (uiLocation);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  _uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) {
    var rawLocation = null;
    rawLocation = rawLocation || this._compilerMapping.uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber);
    rawLocation = rawLocation || this._resourceMapping.uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber);
    rawLocation =
        rawLocation || Bindings.resourceMapping.uiLocationToJSLocation(uiSourceCode, lineNumber, columnNumber);
    rawLocation = rawLocation || this._defaultMapping.uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber);
    return rawLocation;
  }

  /**
   * @param {!SDK.DebuggerPausedDetails} debuggerPausedDetails
   * @return {boolean}
   */
  _beforePaused(debuggerPausedDetails) {
    return !!this._compilerMapping.mapsToSourceCode(debuggerPausedDetails.callFrames[0].location());
  }

  _dispose() {
    this._debuggerModel.setBeforePausedCallback(null);
    this._compilerMapping.dispose();
    this._resourceMapping.dispose();
    this._defaultMapping.dispose();
  }
};

/**
 * @unrestricted
 */
Bindings.DebuggerWorkspaceBinding.Location = class extends Bindings.LiveLocationWithPool {
  /**
   * @param {!SDK.Script} script
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {!Bindings.DebuggerWorkspaceBinding} binding
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   */
  constructor(script, rawLocation, binding, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this._script = script;
    this._rawLocation = rawLocation;
    this._binding = binding;
  }

  /**
   * @override
   * @return {?Workspace.UILocation}
   */
  uiLocation() {
    var debuggerModelLocation = this._rawLocation;
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
    return Bindings.blackboxManager.isBlackboxedRawLocation(this._rawLocation);
  }
};

/**
 * @unrestricted
 */
Bindings.DebuggerWorkspaceBinding.StackTraceTopFrameLocation = class extends Bindings.LiveLocationWithPool {
  /**
   * @param {!Array<!SDK.DebuggerModel.Location>} rawLocations
   * @param {!Bindings.DebuggerWorkspaceBinding} binding
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   */
  constructor(rawLocations, binding, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);

    this._updateScheduled = true;
    /** @type {!Set<!Bindings.LiveLocation>} */
    this._locations = new Set();
    for (var location of rawLocations)
      this._locations.add(binding.createLiveLocation(location, this._scheduleUpdate.bind(this), locationPool));
    this._updateLocation();
  }

  /**
   * @override
   * @return {?Workspace.UILocation}
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
    for (var location of this._locations)
      location.dispose();
  }

  _scheduleUpdate() {
    if (!this._updateScheduled) {
      this._updateScheduled = true;
      setImmediate(this._updateLocation.bind(this));
    }
  }

  _updateLocation() {
    this._updateScheduled = false;
    this._current = this._locations.values().next().value;
    for (var current of this._locations) {
      if (!current.isBlackboxed()) {
        this._current = current;
        break;
      }
    }
    this.update();
  }
};

/**
 * @interface
 */
Bindings.DebuggerSourceMapping = function() {};

Bindings.DebuggerSourceMapping.prototype = {
  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {},

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) {},
};

/**
 * @type {!Bindings.DebuggerWorkspaceBinding}
 */
Bindings.debuggerWorkspaceBinding;
