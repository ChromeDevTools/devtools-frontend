// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 * @implements {SDK.SDKModelObserver<!SDK.DebuggerModel>}
 */
Bindings.DebuggerWorkspaceBinding = class extends Common.Object {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   */
  constructor(targetManager, workspace) {
    super();
    this._workspace = workspace;

    /** @type {!Map.<!SDK.DebuggerModel, !Bindings.DebuggerWorkspaceBinding.ModelData>} */
    this._debuggerModelToData = new Map();
    targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this);
    targetManager.addModelListener(
        SDK.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this._debuggerResumed, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
    targetManager.observeModels(SDK.DebuggerModel, this);
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
   * @param {!Common.Event} event
   */
  _uiSourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    var modelDatas = this._debuggerModelToData.valuesArray();
    for (var i = 0; i < modelDatas.length; ++i)
      modelDatas[i]._uiSourceCodeRemoved(uiSourceCode);
  }

  /**
   * @param {!Common.Event} event
   */
  _projectRemoved(event) {
    var project = /** @type {!Workspace.Project} */ (event.data);
    var modelDatas = this._debuggerModelToData.valuesArray();
    var uiSourceCodes = project.uiSourceCodes();
    for (var i = 0; i < modelDatas.length; ++i) {
      for (var j = 0; j < uiSourceCodes.length; ++j)
        modelDatas[i]._uiSourceCodeRemoved(uiSourceCodes[j]);
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
    var info = this._infoForScript(script);
    console.assert(info);
    return info._popSourceMapping();
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {?Bindings.DebuggerSourceMapping} sourceMapping
   */
  setSourceMapping(debuggerModel, uiSourceCode, sourceMapping) {
    var data = this._debuggerModelToData.get(debuggerModel);
    if (data)
      data._setSourceMapping(uiSourceCode, sourceMapping);
  }

  /**
   * @param {!SDK.Script} script
   */
  updateLocations(script) {
    var info = this._infoForScript(script);
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
    var info = this._infoForScript(rawLocation.script());
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
    var debuggerModel = location.debuggerModel;
    this._ensureInfoForScript(script);
    var liveLocation = this.createLiveLocation(location, updateDelegate, locationPool);
    this._registerCallFrameLiveLocation(debuggerModel, liveLocation);
    return liveLocation;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    var info = this._infoForScript(rawLocation.script());
    console.assert(info);
    return info._rawLocationToUILocation(rawLocation);
  }

  /**
   * @param {?SDK.DebuggerModel} debuggerModel
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  uiLocationToRawLocation(debuggerModel, uiSourceCode, lineNumber, columnNumber) {
    var modelData = debuggerModel ? this._debuggerModelToData.get(debuggerModel) : null;
    return modelData ? /** @type {?SDK.DebuggerModel.Location} */ (
                           modelData._uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber)) :
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
    var modelDatas = this._debuggerModelToData.valuesArray();
    for (var i = 0; i < modelDatas.length; ++i) {
      var rawLocation = modelDatas[i]._uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber);
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
      var rawLocation = this.uiLocationToRawLocation(
          SDK.DebuggerModel.fromTarget(target), uiLocation.uiSourceCode, uiLocation.lineNumber,
          uiLocation.columnNumber);
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
    var modelDatas = this._debuggerModelToData.valuesArray();
    for (var i = 0; i < modelDatas.length; ++i) {
      if (!modelDatas[i]._uiLineHasMapping(uiSourceCode, lineNumber))
        return false;
    }
    return true;
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
   * @return {?SDK.TextSourceMap}
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
   * @param {!SDK.Script} script
   * @return {!Bindings.DebuggerWorkspaceBinding.ScriptInfo}
   */
  _ensureInfoForScript(script) {
    var info = script[Bindings.DebuggerWorkspaceBinding._scriptInfoSymbol];
    if (!info) {
      info = new Bindings.DebuggerWorkspaceBinding.ScriptInfo(script);
      script[Bindings.DebuggerWorkspaceBinding._scriptInfoSymbol] = info;
    }
    return info;
  }

  /**
   * @param {?SDK.Script} script
   * @return {?Bindings.DebuggerWorkspaceBinding.ScriptInfo}
   */
  _infoForScript(script) {
    if (!script)
      return null;
    return script[Bindings.DebuggerWorkspaceBinding._scriptInfoSymbol] || null;
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
    var info = this._infoForScript(location._script);
    if (info)
      info._removeLocation(location);
  }

  /**
   * @param {!Common.Event} event
   */
  _debuggerResumed(event) {
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    this._reset(debuggerModel);
  }
};

Bindings.DebuggerWorkspaceBinding._scriptInfoSymbol = Symbol('scriptDataMap');
Bindings.DebuggerWorkspaceBinding._sourceMappingSymbol = Symbol('sourceMapping');

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
    this._compilerMapping = new Bindings.CompilerScriptMapping(
        debuggerModel, workspace, Bindings.NetworkProject.forTarget(this._debuggerModel.target()),
        debuggerWorkspaceBinding);

    debuggerModel.setBeforePausedCallback(this._beforePaused.bind(this));
    this._eventListeners = [
      debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this),
      debuggerModel.addEventListener(
          SDK.DebuggerModel.Events.FailedToParseScriptSource, this._parsedScriptSource, this),
      debuggerModel.addEventListener(
          SDK.DebuggerModel.Events.DiscardedAnonymousScriptSource, this._discardedScriptSource, this)
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
   * @param {!Common.Event} event
   */
  _discardedScriptSource(event) {
    var script = /** @type {!SDK.Script} */ (event.data);
    this._defaultMapping.removeScript(script);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {?Bindings.DebuggerSourceMapping} sourceMapping
   */
  _setSourceMapping(uiSourceCode, sourceMapping) {
    if (uiSourceCode[Bindings.DebuggerWorkspaceBinding._sourceMappingSymbol] === sourceMapping)
      return;

    if (sourceMapping)
      uiSourceCode[Bindings.DebuggerWorkspaceBinding._sourceMappingSymbol] = sourceMapping;
    else
      delete uiSourceCode[Bindings.DebuggerWorkspaceBinding._sourceMappingSymbol];

    this._debuggerWorkspaceBinding.dispatchEventToListeners(
        Bindings.DebuggerWorkspaceBinding.Events.SourceMappingChanged, {
          uiSourceCode: uiSourceCode,
          debuggerModel: this._debuggerModel,
          isIdentity: sourceMapping ? sourceMapping.isIdentity() : false
        });
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  _uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) {
    var sourceMapping = uiSourceCode[Bindings.DebuggerWorkspaceBinding._sourceMappingSymbol];
    return sourceMapping ? sourceMapping.uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) : null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @return {boolean}
   */
  _uiLineHasMapping(uiSourceCode, lineNumber) {
    var sourceMapping = uiSourceCode[Bindings.DebuggerWorkspaceBinding._sourceMappingSymbol];
    return sourceMapping ? sourceMapping.uiLineHasMapping(uiSourceCode, lineNumber) : true;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _uiSourceCodeRemoved(uiSourceCode) {
    delete uiSourceCode[Bindings.DebuggerWorkspaceBinding._sourceMappingSymbol];
  }

  _dispose() {
    this._debuggerModel.setBeforePausedCallback(null);
    Common.EventTarget.removeEventListeners(this._eventListeners);
    this._compilerMapping.dispose();
    this._resourceMapping.dispose();
    this._defaultMapping.dispose();
  }
};

/** @enum {symbol} */
Bindings.DebuggerWorkspaceBinding.Events = {
  SourceMappingChanged: Symbol('SourceMappingChanged'),
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
    // We create a lot of these, do not add arrays/collections/expensive data structures.
  }

  /**
   * @param {!Bindings.DebuggerSourceMapping} sourceMapping
   */
  _pushSourceMapping(sourceMapping) {
    if (this._sourceMapping) {
      if (!this._backupMappings) {
        /** @type {!Array.<!Bindings.DebuggerSourceMapping>} */
        this._backupMappings = [];
      }
      this._backupMappings.push(this._sourceMapping);
    }
    this._sourceMapping = sourceMapping;
    this._updateLocations();
  }

  /**
   * @return {!Bindings.DebuggerSourceMapping}
   */
  _popSourceMapping() {
    var sourceMapping = this._sourceMapping;
    this._sourceMapping = this._backupMappings ? this._backupMappings.pop() : undefined;
    this._updateLocations();
    return sourceMapping;
  }

  /**
   * @param {!Bindings.LiveLocation} location
   */
  _addLocation(location) {
    if (!this._locations) {
      /** @type {!Set<!Bindings.LiveLocation>} */
      this._locations = new Set();
    }
    this._locations.add(location);
    location.update();
  }

  /**
   * @param {!Bindings.LiveLocation} location
   */
  _removeLocation(location) {
    if (!this._locations)
      return;
    this._locations.delete(location);
  }

  _updateLocations() {
    if (!this._locations)
      return;
    for (var location of this._locations)
      location.update();
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {!Workspace.UILocation}
   */
  _rawLocationToUILocation(rawLocation) {
    var uiLocation = this._sourceMapping ? this._sourceMapping.rawLocationToUILocation(rawLocation) : null;
    if (!uiLocation && this._backupMappings) {
      for (var i = this._backupMappings.length - 1; !uiLocation && i >= 0; --i)
        uiLocation = this._backupMappings[i].rawLocationToUILocation(rawLocation);
    }
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
