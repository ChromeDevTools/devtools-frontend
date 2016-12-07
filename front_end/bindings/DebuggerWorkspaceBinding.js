// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Bindings.DebuggerWorkspaceBinding = class {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   */
  constructor(targetManager, workspace) {
    this._workspace = workspace;

    // FIXME: Migrate from _targetToData to _debuggerModelToData.
    /** @type {!Map.<!SDK.Target, !Bindings.DebuggerWorkspaceBinding.TargetData>} */
    this._targetToData = new Map();
    targetManager.observeTargets(this);

    targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this);
    targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this._debuggerResumed, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    var debuggerModel = SDK.DebuggerModel.fromTarget(target);
    if (debuggerModel)
      this._targetToData.set(target, new Bindings.DebuggerWorkspaceBinding.TargetData(debuggerModel, this));
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    if (!SDK.DebuggerModel.fromTarget(target))
      return;
    var targetData = this._targetToData.get(target);
    targetData._dispose();
    this._targetToData.remove(target);
  }

  /**
   * @param {!Common.Event} event
   */
  _uiSourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    var targetDatas = this._targetToData.valuesArray();
    for (var i = 0; i < targetDatas.length; ++i)
      targetDatas[i]._uiSourceCodeRemoved(uiSourceCode);
  }

  /**
   * @param {!Common.Event} event
   */
  _projectRemoved(event) {
    var project = /** @type {!Workspace.Project} */ (event.data);
    var targetDatas = this._targetToData.valuesArray();
    var uiSourceCodes = project.uiSourceCodes();
    for (var i = 0; i < targetDatas.length; ++i) {
      for (var j = 0; j < uiSourceCodes.length; ++j)
        targetDatas[i]._uiSourceCodeRemoved(uiSourceCodes[j]);
    }
  }

  /**
   * @param {!SDK.Script} script
   * @param {!Bindings.DebuggerSourceMapping} sourceMapping
   */
  pushSourceMapping(script, sourceMapping) {
    var info = this._ensureInfoForScript(script);
    info._pushSourceMapping(sourceMapping);
  }

  /**
   * @param {!SDK.Script} script
   * @return {!Bindings.DebuggerSourceMapping}
   */
  popSourceMapping(script) {
    var info = this._infoForScript(script.target(), script.scriptId);
    console.assert(info);
    return info._popSourceMapping();
  }

  /**
   * @param {!SDK.Target} target
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {?Bindings.DebuggerSourceMapping} sourceMapping
   */
  setSourceMapping(target, uiSourceCode, sourceMapping) {
    var data = this._targetToData.get(target);
    if (data)
      data._setSourceMapping(uiSourceCode, sourceMapping);
  }

  /**
   * @param {!SDK.Script} script
   */
  updateLocations(script) {
    var info = this._infoForScript(script.target(), script.scriptId);
    if (info)
      info._updateLocations();
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   * @return {!Bindings.DebuggerWorkspaceBinding.Location}
   */
  createLiveLocation(rawLocation, updateDelegate, locationPool) {
    var info = this._infoForScript(rawLocation.target(), rawLocation.scriptId);
    console.assert(info);
    var location =
        new Bindings.DebuggerWorkspaceBinding.Location(info._script, rawLocation, this, updateDelegate, locationPool);
    info._addLocation(location);
    return location;
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
    var target = location.target();
    this._ensureInfoForScript(script);
    var liveLocation = this.createLiveLocation(location, updateDelegate, locationPool);
    this._registerCallFrameLiveLocation(target, liveLocation);
    return liveLocation;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    var info = this._infoForScript(rawLocation.target(), rawLocation.scriptId);
    console.assert(info);
    return info._rawLocationToUILocation(rawLocation);
  }

  /**
   * @param {!SDK.Target} target
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  uiLocationToRawLocation(target, uiSourceCode, lineNumber, columnNumber) {
    var targetData = this._targetToData.get(target);
    return targetData ? /** @type {?SDK.DebuggerModel.Location} */ (
                            targetData._uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber)) :
                        null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Array.<!SDK.DebuggerModel.Location>}
   */
  uiLocationToRawLocations(uiSourceCode, lineNumber, columnNumber) {
    var result = [];
    var targetDatas = this._targetToData.valuesArray();
    for (var i = 0; i < targetDatas.length; ++i) {
      var rawLocation = targetDatas[i]._uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber);
      if (rawLocation)
        result.push(rawLocation);
    }
    return result;
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   * @return {!Workspace.UILocation}
   */
  normalizeUILocation(uiLocation) {
    var target = Bindings.NetworkProject.targetForUISourceCode(uiLocation.uiSourceCode);
    if (target) {
      var rawLocation =
          this.uiLocationToRawLocation(target, uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber);
      if (rawLocation)
        return this.rawLocationToUILocation(rawLocation);
    }
    return uiLocation;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @return {boolean}
   */
  uiLineHasMapping(uiSourceCode, lineNumber) {
    var targetDatas = this._targetToData.valuesArray();
    for (var i = 0; i < targetDatas.length; ++i) {
      if (!targetDatas[i]._uiLineHasMapping(uiSourceCode, lineNumber))
        return false;
    }
    return true;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!SDK.Target} target
   * @return {?Bindings.ResourceScriptFile}
   */
  scriptFile(uiSourceCode, target) {
    var targetData = this._targetToData.get(target);
    return targetData ? targetData._resourceMapping.scriptFile(uiSourceCode) : null;
  }

  /**
   * @param {!SDK.Script} script
   * @return {?SDK.TextSourceMap}
   */
  sourceMapForScript(script) {
    var targetData = this._targetToData.get(script.target());
    if (!targetData)
      return null;
    return targetData._compilerMapping.sourceMapForScript(script);
  }

  /**
   * @param {!SDK.Script} script
   */
  maybeLoadSourceMap(script) {
    var targetData = this._targetToData.get(script.target());
    if (!targetData)
      return;
    targetData._compilerMapping.maybeLoadSourceMap(script);
  }

  /**
   * @param {!Common.Event} event
   */
  _globalObjectCleared(event) {
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.target);
    this._reset(debuggerModel.target());
  }

  /**
   * @param {!SDK.Target} target
   */
  _reset(target) {
    var targetData = this._targetToData.get(target);
    targetData.callFrameLocations.valuesArray().forEach((location) => this._removeLiveLocation(location));
    targetData.callFrameLocations.clear();
  }

  /**
   * @param {!SDK.Script} script
   * @return {!Bindings.DebuggerWorkspaceBinding.ScriptInfo}
   */
  _ensureInfoForScript(script) {
    var scriptDataMap = this._targetToData.get(script.target()).scriptDataMap;
    var info = scriptDataMap.get(script.scriptId);
    if (!info) {
      info = new Bindings.DebuggerWorkspaceBinding.ScriptInfo(script);
      scriptDataMap.set(script.scriptId, info);
    }
    return info;
  }

  /**
   * @param {!SDK.Target} target
   * @param {string} scriptId
   * @return {?Bindings.DebuggerWorkspaceBinding.ScriptInfo}
   */
  _infoForScript(target, scriptId) {
    var data = this._targetToData.get(target);
    if (!data)
      return null;
    return data.scriptDataMap.get(scriptId) || null;
  }

  /**
   * @param {!SDK.Target} target
   * @param {!Bindings.DebuggerWorkspaceBinding.Location} location
   */
  _registerCallFrameLiveLocation(target, location) {
    var locations = this._targetToData.get(target).callFrameLocations;
    locations.add(location);
  }

  /**
   * @param {!Bindings.DebuggerWorkspaceBinding.Location} location
   */
  _removeLiveLocation(location) {
    var info = this._infoForScript(location._script.target(), location._script.scriptId);
    if (info)
      info._removeLocation(location);
  }

  /**
   * @param {!Common.Event} event
   */
  _debuggerResumed(event) {
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.target);
    this._reset(debuggerModel.target());
  }
};

/**
 * @unrestricted
 */
Bindings.DebuggerWorkspaceBinding.TargetData = class {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Bindings.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
   */
  constructor(debuggerModel, debuggerWorkspaceBinding) {
    this._debuggerModel = debuggerModel;

    /** @type {!Map.<string, !Bindings.DebuggerWorkspaceBinding.ScriptInfo>} */
    this.scriptDataMap = new Map();

    /** @type {!Set.<!Bindings.DebuggerWorkspaceBinding.Location>} */
    this.callFrameLocations = new Set();

    var workspace = debuggerWorkspaceBinding._workspace;

    this._defaultMapping = new Bindings.DefaultScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._resourceMapping = new Bindings.ResourceScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._compilerMapping = new Bindings.CompilerScriptMapping(
        debuggerModel, workspace, Bindings.NetworkProject.forTarget(this._debuggerModel.target()),
        debuggerWorkspaceBinding);

    /** @type {!Map.<!Workspace.UISourceCode, !Bindings.DebuggerSourceMapping>} */
    this._uiSourceCodeToSourceMapping = new Map();

    debuggerModel.setBeforePausedCallback(this._beforePaused.bind(this));
    this._eventListeners = [
      debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this),
      debuggerModel.addEventListener(SDK.DebuggerModel.Events.FailedToParseScriptSource, this._parsedScriptSource, this)
    ];
  }

  /**
   * @param {!SDK.DebuggerPausedDetails} debuggerPausedDetails
   * @return {boolean}
   */
  _beforePaused(debuggerPausedDetails) {
    return !!this._compilerMapping.mapsToSourceCode(debuggerPausedDetails.callFrames[0].location());
  }

  /**
   * @param {!Common.Event} event
   */
  _parsedScriptSource(event) {
    var script = /** @type {!SDK.Script} */ (event.data);
    this._defaultMapping.addScript(script);
    this._resourceMapping.addScript(script);

    if (Common.moduleSetting('jsSourceMapsEnabled').get())
      this._compilerMapping.addScript(script);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {?Bindings.DebuggerSourceMapping} sourceMapping
   */
  _setSourceMapping(uiSourceCode, sourceMapping) {
    if (this._uiSourceCodeToSourceMapping.get(uiSourceCode) === sourceMapping)
      return;

    if (sourceMapping)
      this._uiSourceCodeToSourceMapping.set(uiSourceCode, sourceMapping);
    else
      this._uiSourceCodeToSourceMapping.remove(uiSourceCode);

    uiSourceCode.dispatchEventToListeners(
        Workspace.UISourceCode.Events.SourceMappingChanged,
        {target: this._debuggerModel.target(), isIdentity: sourceMapping ? sourceMapping.isIdentity() : false});
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  _uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) {
    var sourceMapping = this._uiSourceCodeToSourceMapping.get(uiSourceCode);
    return sourceMapping ? sourceMapping.uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) : null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @return {boolean}
   */
  _uiLineHasMapping(uiSourceCode, lineNumber) {
    var sourceMapping = this._uiSourceCodeToSourceMapping.get(uiSourceCode);
    return sourceMapping ? sourceMapping.uiLineHasMapping(uiSourceCode, lineNumber) : true;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _uiSourceCodeRemoved(uiSourceCode) {
    this._uiSourceCodeToSourceMapping.remove(uiSourceCode);
  }

  _dispose() {
    this._debuggerModel.setBeforePausedCallback(null);
    Common.EventTarget.removeEventListeners(this._eventListeners);
    this._compilerMapping.dispose();
    this._resourceMapping.dispose();
    this._defaultMapping.dispose();
    this._uiSourceCodeToSourceMapping.clear();
  }
};

/**
 * @unrestricted
 */
Bindings.DebuggerWorkspaceBinding.ScriptInfo = class {
  /**
   * @param {!SDK.Script} script
   */
  constructor(script) {
    this._script = script;

    /** @type {!Array.<!Bindings.DebuggerSourceMapping>} */
    this._sourceMappings = [];

    /** @type {!Set<!Bindings.LiveLocation>} */
    this._locations = new Set();
  }

  /**
   * @param {!Bindings.DebuggerSourceMapping} sourceMapping
   */
  _pushSourceMapping(sourceMapping) {
    this._sourceMappings.push(sourceMapping);
    this._updateLocations();
  }

  /**
   * @return {!Bindings.DebuggerSourceMapping}
   */
  _popSourceMapping() {
    var sourceMapping = this._sourceMappings.pop();
    this._updateLocations();
    return sourceMapping;
  }

  /**
   * @param {!Bindings.LiveLocation} location
   */
  _addLocation(location) {
    this._locations.add(location);
    location.update();
  }

  /**
   * @param {!Bindings.LiveLocation} location
   */
  _removeLocation(location) {
    this._locations.delete(location);
  }

  _updateLocations() {
    for (var location of this._locations)
      location.update();
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Workspace.UILocation}
   */
  _rawLocationToUILocation(rawLocation) {
    var uiLocation;
    for (var i = this._sourceMappings.length - 1; !uiLocation && i >= 0; --i)
      uiLocation = this._sourceMappings[i].rawLocationToUILocation(rawLocation);
    console.assert(uiLocation, 'Script raw location cannot be mapped to any UI location.');
    return /** @type {!Workspace.UILocation} */ (uiLocation);
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
   * @return {!Workspace.UILocation}
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
   * @return {!Workspace.UILocation}
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

  /**
   * @return {boolean}
   */
  isIdentity() {},

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @return {boolean}
   */
  uiLineHasMapping(uiSourceCode, lineNumber) {}
};

/**
 * @type {!Bindings.DebuggerWorkspaceBinding}
 */
Bindings.debuggerWorkspaceBinding;
