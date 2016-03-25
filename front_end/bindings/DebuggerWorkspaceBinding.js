// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 * @param {!WebInspector.TargetManager} targetManager
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.NetworkMapping} networkMapping
 */
WebInspector.DebuggerWorkspaceBinding = function(targetManager, workspace, networkMapping)
{
    this._workspace = workspace;
    this._networkMapping = networkMapping;

    // FIXME: Migrate from _targetToData to _debuggerModelToData.
    /** @type {!Map.<!WebInspector.Target, !WebInspector.DebuggerWorkspaceBinding.TargetData>} */
    this._targetToData = new Map();
    targetManager.observeTargets(this);

    targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this);
    targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.BeforeDebuggerPaused, this._beforeDebuggerPaused, this);
    targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.DebuggerResumed, this._debuggerResumed, this);
    workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this);
    workspace.addEventListener(WebInspector.Workspace.Events.ProjectRemoved, this._projectRemoved, this);
}

WebInspector.DebuggerWorkspaceBinding.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
        if (debuggerModel)
            this._targetToData.set(target, new WebInspector.DebuggerWorkspaceBinding.TargetData(debuggerModel, this));
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (!WebInspector.DebuggerModel.fromTarget(target))
            return;
        var targetData = this._targetToData.get(target);
        targetData._dispose();
        this._targetToData.remove(target);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeRemoved: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        var targetDatas = this._targetToData.valuesArray();
        for (var i = 0; i < targetDatas.length; ++i)
            targetDatas[i]._uiSourceCodeRemoved(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _projectRemoved: function(event)
    {
        var project = /** @type {!WebInspector.Project} */ (event.data);
        var targetDatas = this._targetToData.valuesArray();
        var uiSourceCodes = project.uiSourceCodes();
        for (var i = 0; i < targetDatas.length; ++i) {
            for (var j = 0; j < uiSourceCodes.length; ++j)
                targetDatas[i]._uiSourceCodeRemoved(uiSourceCodes[j]);
        }
    },

    /**
     * @param {!WebInspector.Script} script
     * @param {!WebInspector.DebuggerSourceMapping} sourceMapping
     */
    pushSourceMapping: function(script, sourceMapping)
    {
        var info = this._ensureInfoForScript(script);
        info._pushSourceMapping(sourceMapping);
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {!WebInspector.DebuggerSourceMapping}
     */
    popSourceMapping: function(script)
    {
        var info = this._infoForScript(script.target(), script.scriptId);
        console.assert(info);
        return info._popSourceMapping();
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {?WebInspector.DebuggerSourceMapping} sourceMapping
     */
    setSourceMapping: function(target, uiSourceCode, sourceMapping)
    {
        var data = this._targetToData.get(target);
        if (data)
            data._setSourceMapping(uiSourceCode, sourceMapping);
    },

    /**
     * @param {!WebInspector.Script} script
     */
    updateLocations: function(script)
    {
        var info = this._infoForScript(script.target(), script.scriptId);
        if (info)
            info._updateLocations();
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @param {function(!WebInspector.LiveLocation)} updateDelegate
     * @param {!WebInspector.LiveLocationPool} locationPool
     * @return {!WebInspector.DebuggerWorkspaceBinding.Location}
     */
    createLiveLocation: function(rawLocation, updateDelegate, locationPool)
    {
        var info = this._infoForScript(rawLocation.target(), rawLocation.scriptId);
        console.assert(info);
        var location = new WebInspector.DebuggerWorkspaceBinding.Location(info._script, rawLocation, this, updateDelegate, locationPool);
        info._addLocation(location);
        return location;
    },

    /**
     * @param {!Array<!WebInspector.DebuggerModel.Location>} rawLocations
     * @param {function(!WebInspector.LiveLocation)} updateDelegate
     * @param {!WebInspector.LiveLocationPool} locationPool
     * @return {!WebInspector.LiveLocation}
     */
    createStackTraceTopFrameLiveLocation: function(rawLocations, updateDelegate, locationPool)
    {
        console.assert(rawLocations.length);
        var location = new WebInspector.DebuggerWorkspaceBinding.StackTraceTopFrameLocation(rawLocations, this, updateDelegate, locationPool);
        location.update();
        return location;
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} location
     * @param {function(!WebInspector.LiveLocation)} updateDelegate
     * @param {!WebInspector.LiveLocationPool} locationPool
     * @return {!WebInspector.DebuggerWorkspaceBinding.Location}
     */
    createCallFrameLiveLocation: function(location, updateDelegate, locationPool)
    {
        var target = location.target();
        this._ensureInfoForScript(location.script());
        var liveLocation = this.createLiveLocation(location, updateDelegate, locationPool);
        this._registerCallFrameLiveLocation(target, liveLocation);
        return liveLocation;
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @return {!WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var info = this._infoForScript(rawLocation.target(), rawLocation.scriptId);
        console.assert(info);
        return info._rawLocationToUILocation(rawLocation);
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
    uiLocationToRawLocation: function(target, uiSourceCode, lineNumber, columnNumber)
    {
        var targetData = this._targetToData.get(target);
        return targetData ? /** @type {?WebInspector.DebuggerModel.Location} */ (targetData._uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber)) : null;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {!Array.<!WebInspector.DebuggerModel.Location>}
     */
    uiLocationToRawLocations: function(uiSourceCode, lineNumber, columnNumber)
    {
        var result = [];
        var targetDatas = this._targetToData.valuesArray();
        for (var i = 0; i < targetDatas.length; ++i) {
            var rawLocation = targetDatas[i]._uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber);
            if (rawLocation)
                result.push(rawLocation);
        }
        return result;
    },

    /**
     * @param {!WebInspector.UILocation} uiLocation
     * @return {!WebInspector.UILocation}
     */
    normalizeUILocation: function(uiLocation)
    {
        var target = WebInspector.NetworkProject.targetForUISourceCode(uiLocation.uiSourceCode);
        if (target) {
            var rawLocation = this.uiLocationToRawLocation(target, uiLocation.uiSourceCode, uiLocation.lineNumber, uiLocation.columnNumber);
            if (rawLocation)
                return this.rawLocationToUILocation(rawLocation);
        }
        return uiLocation;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @return {boolean}
     */
    uiLineHasMapping: function(uiSourceCode, lineNumber)
    {
        var targetDatas = this._targetToData.valuesArray();
        for (var i = 0; i < targetDatas.length; ++i) {
            if (!targetDatas[i]._uiLineHasMapping(uiSourceCode, lineNumber))
                return false;
        }
        return true;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {!WebInspector.Target} target
     * @return {?WebInspector.ResourceScriptFile}
     */
    scriptFile: function(uiSourceCode, target)
    {
        var targetData = this._targetToData.get(target);
        return targetData ? targetData._resourceMapping.scriptFile(uiSourceCode) : null;
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {?WebInspector.TextSourceMap}
     */
    sourceMapForScript: function(script)
    {
        var targetData = this._targetToData.get(script.target());
        if (!targetData)
            return null;
        return targetData._compilerMapping.sourceMapForScript(script);
    },

    /**
     * @param {!WebInspector.Script} script
     */
    maybeLoadSourceMap: function(script)
    {
        var targetData = this._targetToData.get(script.target());
        if (!targetData)
            return;
        targetData._compilerMapping.maybeLoadSourceMap(script);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _globalObjectCleared: function(event)
    {
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (event.target);
        this._reset(debuggerModel.target());
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _reset: function(target)
    {
        var targetData = this._targetToData.get(target);
        targetData.callFrameLocations.valuesArray().forEach((location) => this._removeLiveLocation(location));
        targetData.callFrameLocations.clear();
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {!WebInspector.DebuggerWorkspaceBinding.ScriptInfo}
     */
    _ensureInfoForScript: function(script)
    {
        var scriptDataMap = this._targetToData.get(script.target()).scriptDataMap;
        var info = scriptDataMap.get(script.scriptId);
        if (!info) {
            info = new WebInspector.DebuggerWorkspaceBinding.ScriptInfo(script);
            scriptDataMap.set(script.scriptId, info);
        }
        return info;
    },


    /**
     * @param {!WebInspector.Target} target
     * @param {string} scriptId
     * @return {?WebInspector.DebuggerWorkspaceBinding.ScriptInfo}
     */
    _infoForScript: function(target, scriptId)
    {
        var data = this._targetToData.get(target);
        if (!data)
            return null;
        return data.scriptDataMap.get(scriptId) || null;
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {!WebInspector.DebuggerWorkspaceBinding.Location} location
     */
    _registerCallFrameLiveLocation: function(target, location)
    {
        var locations = this._targetToData.get(target).callFrameLocations;
        locations.add(location);
    },

    /**
     * @param {!WebInspector.DebuggerWorkspaceBinding.Location} location
     */
    _removeLiveLocation: function(location)
    {
        var info = this._infoForScript(location._script.target(), location._script.scriptId);
        if (info)
            info._removeLocation(location);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _debuggerResumed: function(event)
    {
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (event.target);
        this._reset(debuggerModel.target());
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _beforeDebuggerPaused: function(event)
    {
        var rawLocation = event.data.callFrames[0].location();
        var targetData = this._targetToData.get(rawLocation.target());
        if (!targetData._compilerMapping.mapsToSourceCode(rawLocation)) {
            event.stopPropagation();
            event.preventDefault();
        }
    }
}

/**
 * @constructor
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!WebInspector.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
 */
WebInspector.DebuggerWorkspaceBinding.TargetData = function(debuggerModel, debuggerWorkspaceBinding)
{
    this._target = debuggerModel.target();

    /** @type {!Map.<string, !WebInspector.DebuggerWorkspaceBinding.ScriptInfo>} */
    this.scriptDataMap = new Map();

    /** @type {!Set.<!WebInspector.DebuggerWorkspaceBinding.Location>} */
    this.callFrameLocations = new Set();

    var workspace = debuggerWorkspaceBinding._workspace;
    var networkMapping = debuggerWorkspaceBinding._networkMapping;

    this._defaultMapping = new WebInspector.DefaultScriptMapping(debuggerModel, workspace, debuggerWorkspaceBinding);
    this._resourceMapping = new WebInspector.ResourceScriptMapping(debuggerModel, workspace, networkMapping, debuggerWorkspaceBinding);
    this._compilerMapping = new WebInspector.CompilerScriptMapping(debuggerModel, workspace, networkMapping, WebInspector.NetworkProject.forTarget(this._target), debuggerWorkspaceBinding);

    /** @type {!Map.<!WebInspector.UISourceCode, !WebInspector.DebuggerSourceMapping>} */
    this._uiSourceCodeToSourceMapping = new Map();

    debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this);
    debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.FailedToParseScriptSource, this._parsedScriptSource, this);
}

WebInspector.DebuggerWorkspaceBinding.TargetData.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _parsedScriptSource: function(event)
    {
        var script = /** @type {!WebInspector.Script} */ (event.data);
        this._defaultMapping.addScript(script);
        this._resourceMapping.addScript(script);

        if (WebInspector.moduleSetting("jsSourceMapsEnabled").get())
            this._compilerMapping.addScript(script);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {?WebInspector.DebuggerSourceMapping} sourceMapping
     */
    _setSourceMapping: function(uiSourceCode, sourceMapping)
    {
        if (this._uiSourceCodeToSourceMapping.get(uiSourceCode) === sourceMapping)
            return;

        if (sourceMapping)
            this._uiSourceCodeToSourceMapping.set(uiSourceCode, sourceMapping);
        else
            this._uiSourceCodeToSourceMapping.remove(uiSourceCode);

        uiSourceCode.dispatchEventToListeners(WebInspector.UISourceCode.Events.SourceMappingChanged, {target: this._target, isIdentity: sourceMapping ? sourceMapping.isIdentity() : false});
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
    _uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber)
    {
        var sourceMapping = this._uiSourceCodeToSourceMapping.get(uiSourceCode);
        return sourceMapping ? sourceMapping.uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) : null;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @return {boolean}
     */
    _uiLineHasMapping: function(uiSourceCode, lineNumber)
    {
        var sourceMapping = this._uiSourceCodeToSourceMapping.get(uiSourceCode);
        return sourceMapping ? sourceMapping.uiLineHasMapping(uiSourceCode, lineNumber) : true;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _uiSourceCodeRemoved: function(uiSourceCode)
    {
        this._uiSourceCodeToSourceMapping.remove(uiSourceCode);
    },

    _dispose: function()
    {
        this._compilerMapping.dispose();
        this._resourceMapping.dispose();
        this._defaultMapping.dispose();
        this._uiSourceCodeToSourceMapping.clear();
    }
}

/**
 * @constructor
 * @param {!WebInspector.Script} script
 */
WebInspector.DebuggerWorkspaceBinding.ScriptInfo = function(script)
{
    this._script = script;

    /** @type {!Array.<!WebInspector.DebuggerSourceMapping>} */
    this._sourceMappings = [];

    /** @type {!Set<!WebInspector.LiveLocation>} */
    this._locations = new Set();
}

WebInspector.DebuggerWorkspaceBinding.ScriptInfo.prototype = {
    /**
     * @param {!WebInspector.DebuggerSourceMapping} sourceMapping
     */
    _pushSourceMapping: function(sourceMapping)
    {
        this._sourceMappings.push(sourceMapping);
        this._updateLocations();
    },

    /**
     * @return {!WebInspector.DebuggerSourceMapping}
     */
    _popSourceMapping: function()
    {
        var sourceMapping = this._sourceMappings.pop();
        this._updateLocations();
        return sourceMapping;
    },

    /**
     * @param {!WebInspector.LiveLocation} location
     */
    _addLocation: function(location)
    {
        this._locations.add(location);
        location.update();
    },

    /**
     * @param {!WebInspector.LiveLocation} location
     */
    _removeLocation: function(location)
    {
        this._locations.delete(location);
    },

    _updateLocations: function()
    {
        for (var location of this._locations)
            location.update();
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @return {!WebInspector.UILocation}
     */
    _rawLocationToUILocation: function(rawLocation)
    {
        var uiLocation;
        for (var i = this._sourceMappings.length - 1; !uiLocation && i >= 0; --i)
            uiLocation = this._sourceMappings[i].rawLocationToUILocation(rawLocation);
        console.assert(uiLocation, "Script raw location cannot be mapped to any UI location.");
        return /** @type {!WebInspector.UILocation} */ (uiLocation);
    }
}


/**
 * @constructor
 * @extends {WebInspector.LiveLocationWithPool}
 * @param {!WebInspector.Script} script
 * @param {!WebInspector.DebuggerModel.Location} rawLocation
 * @param {!WebInspector.DebuggerWorkspaceBinding} binding
 * @param {function(!WebInspector.LiveLocation)} updateDelegate
 * @param {!WebInspector.LiveLocationPool} locationPool
 */
WebInspector.DebuggerWorkspaceBinding.Location = function(script, rawLocation, binding, updateDelegate, locationPool)
{
    WebInspector.LiveLocationWithPool.call(this, updateDelegate, locationPool);
    this._script = script;
    this._rawLocation = rawLocation;
    this._binding = binding;
}

WebInspector.DebuggerWorkspaceBinding.Location.prototype = {
    /**
     * @override
     * @return {!WebInspector.UILocation}
     */
    uiLocation: function()
    {
        var debuggerModelLocation = this._rawLocation;
        return this._binding.rawLocationToUILocation(debuggerModelLocation);
    },

    /**
     * @override
     */
    dispose: function()
    {
        WebInspector.LiveLocationWithPool.prototype.dispose.call(this);
        this._binding._removeLiveLocation(this);
    },

    /**
     * @override
     * @return {boolean}
     */
    isBlackboxed: function()
    {
        return WebInspector.blackboxManager.isBlackboxedRawLocation(this._rawLocation);
    },

    __proto__: WebInspector.LiveLocationWithPool.prototype
}

/**
 * @constructor
 * @extends {WebInspector.LiveLocationWithPool}
 * @param {!Array<!WebInspector.DebuggerModel.Location>} rawLocations
 * @param {!WebInspector.DebuggerWorkspaceBinding} binding
 * @param {function(!WebInspector.LiveLocation)} updateDelegate
 * @param {!WebInspector.LiveLocationPool} locationPool
 */
WebInspector.DebuggerWorkspaceBinding.StackTraceTopFrameLocation = function(rawLocations, binding, updateDelegate, locationPool)
{
    WebInspector.LiveLocationWithPool.call(this, updateDelegate, locationPool);

    this._updateScheduled = true;
    /** @type {!Set<!WebInspector.LiveLocation>} */
    this._locations = new Set();
    for (var location of rawLocations)
        this._locations.add(binding.createCallFrameLiveLocation(location, this._scheduleUpdate.bind(this), locationPool));
    this._updateLocation();
}

WebInspector.DebuggerWorkspaceBinding.StackTraceTopFrameLocation.prototype = {
    /**
     * @override
     * @return {!WebInspector.UILocation}
     */
    uiLocation: function()
    {
        return this._current.uiLocation();
    },

    /**
     * @override
     * @return {boolean}
     */
    isBlackboxed: function()
    {
        return this._current.isBlackboxed();
    },

    /**
     * @override
     */
    dispose: function()
    {
        WebInspector.LiveLocationWithPool.prototype.dispose.call(this);
        for (var location of this._locations)
            location.dispose();
    },

    _scheduleUpdate: function()
    {
        if (!this._updateScheduled) {
            this._updateScheduled = true;
            setImmediate(this._updateLocation.bind(this));
        }
    },

    _updateLocation: function()
    {
        this._updateScheduled = false;
        this._current = this._locations.values().next().value;
        for (var current of this._locations) {
            if (!current.isBlackboxed()) {
                this._current = current;
                break;
            }
        }
        this.update();
    },

    __proto__: WebInspector.LiveLocationWithPool.prototype
}

/**
 * @interface
 */
WebInspector.DebuggerSourceMapping = function()
{
}

WebInspector.DebuggerSourceMapping.prototype = {
    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation) { },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
    uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber) { },

    /**
     * @return {boolean}
     */
    isIdentity: function() { },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @return {boolean}
     */
    uiLineHasMapping: function(uiSourceCode, lineNumber) { }
}

/**
 * @type {!WebInspector.DebuggerWorkspaceBinding}
 */
WebInspector.debuggerWorkspaceBinding;
