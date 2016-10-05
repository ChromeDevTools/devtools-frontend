/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @implements {WebInspector.DebuggerSourceMapping}
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.NetworkMapping} networkMapping
 * @param {!WebInspector.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
 */
WebInspector.ResourceScriptMapping = function(debuggerModel, workspace, networkMapping, debuggerWorkspaceBinding)
{
    this._target = debuggerModel.target();
    this._debuggerModel = debuggerModel;
    this._networkMapping = networkMapping;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    /** @type {!Set<!WebInspector.UISourceCode>} */
    this._boundUISourceCodes = new Set();

    /** @type {!Map.<!WebInspector.UISourceCode, !WebInspector.ResourceScriptFile>} */
    this._uiSourceCodeToScriptFile = new Map();

    this._eventListeners = [
        debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this),
        workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAdded, this),
        workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeRemoved, this._uiSourceCodeRemoved, this)
    ];
};

WebInspector.ResourceScriptMapping.prototype = {
    /**
     * @override
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var debuggerModelLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (rawLocation);
        var script = debuggerModelLocation.script();
        if (!script)
            return null;
        var uiSourceCode = this._workspaceUISourceCodeForScript(script);
        if (!uiSourceCode)
            return null;
        var scriptFile = this.scriptFile(uiSourceCode);
        if (scriptFile && ((scriptFile.hasDivergedFromVM() && !scriptFile.isMergingToVM()) || scriptFile.isDivergingFromVM()))
            return null;
        var lineNumber = debuggerModelLocation.lineNumber - (script.isInlineScriptWithSourceURL() ? script.lineOffset : 0);
        var columnNumber = debuggerModelLocation.columnNumber || 0;
        if (script.isInlineScriptWithSourceURL() && !lineNumber && columnNumber)
            columnNumber -= script.columnOffset;
        return uiSourceCode.uiLocation(lineNumber, columnNumber);
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @param {number} columnNumber
     * @return {?WebInspector.DebuggerModel.Location}
     */
    uiLocationToRawLocation: function(uiSourceCode, lineNumber, columnNumber)
    {
        var scripts = this._scriptsForUISourceCode(uiSourceCode);
        console.assert(scripts.length);
        var script = scripts[scripts.length - 1];
        if (script.isInlineScriptWithSourceURL())
            return this._debuggerModel.createRawLocation(script, lineNumber + script.lineOffset, lineNumber ? columnNumber : columnNumber + script.columnOffset);
        return this._debuggerModel.createRawLocation(script, lineNumber, columnNumber);
    },

    /**
     * @param {!WebInspector.Script} script
     */
    addScript: function(script)
    {
        if (script.isAnonymousScript())
            return;
        this._debuggerWorkspaceBinding.pushSourceMapping(script, this);

        var uiSourceCode = this._workspaceUISourceCodeForScript(script);
        if (!uiSourceCode)
            return;

        this._bindUISourceCodeToScripts(uiSourceCode, [script]);
    },

    /**
     * @override
     * @return {boolean}
     */
    isIdentity: function()
    {
        return true;
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @return {boolean}
     */
    uiLineHasMapping: function(uiSourceCode, lineNumber)
    {
        return true;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {?WebInspector.ResourceScriptFile}
     */
    scriptFile: function(uiSourceCode)
    {
        return this._uiSourceCodeToScriptFile.get(uiSourceCode) || null;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {?WebInspector.ResourceScriptFile} scriptFile
     */
    _setScriptFile: function(uiSourceCode, scriptFile)
    {
        if (scriptFile)
            this._uiSourceCodeToScriptFile.set(uiSourceCode, scriptFile);
        else
            this._uiSourceCodeToScriptFile.remove(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAdded: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        if (uiSourceCode.isFromServiceProject())
            return;
        var scripts = this._scriptsForUISourceCode(uiSourceCode);
        if (!scripts.length)
            return;

        this._bindUISourceCodeToScripts(uiSourceCode, scripts);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeRemoved: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        if (uiSourceCode.isFromServiceProject() || !this._boundUISourceCodes.has(uiSourceCode))
            return;

        this._unbindUISourceCode(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _updateLocations: function(uiSourceCode)
    {
        var scripts = this._scriptsForUISourceCode(uiSourceCode);
        if (!scripts.length)
            return;
        for (var i = 0; i < scripts.length; ++i)
            this._debuggerWorkspaceBinding.updateLocations(scripts[i]);
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {?WebInspector.UISourceCode}
     */
    _workspaceUISourceCodeForScript: function(script)
    {
        if (script.isAnonymousScript())
            return null;
        return this._networkMapping.uiSourceCodeForScriptURL(script.sourceURL, script);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!Array.<!WebInspector.Script>}
     */
    _scriptsForUISourceCode: function(uiSourceCode)
    {
        var target = WebInspector.NetworkProject.targetForUISourceCode(uiSourceCode);
        if (target !== this._debuggerModel.target())
            return [];
        return this._debuggerModel.scriptsForSourceURL(uiSourceCode.url());
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {!Array.<!WebInspector.Script>} scripts
     */
    _bindUISourceCodeToScripts: function(uiSourceCode, scripts)
    {
        console.assert(scripts.length);
        // Due to different listeners order, a script file could be created just before uiSourceCode
        // for the corresponding script was created. Check that we don't create scriptFile twice.
        var boundScriptFile = this.scriptFile(uiSourceCode);
        if (boundScriptFile && boundScriptFile._hasScripts(scripts))
            return;

        var scriptFile = new WebInspector.ResourceScriptFile(this, uiSourceCode, scripts);
        this._setScriptFile(uiSourceCode, scriptFile);
        for (var i = 0; i < scripts.length; ++i)
            this._debuggerWorkspaceBinding.updateLocations(scripts[i]);
        this._debuggerWorkspaceBinding.setSourceMapping(this._target, uiSourceCode, this);
        this._boundUISourceCodes.add(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _unbindUISourceCode: function(uiSourceCode)
    {
        var scriptFile = this.scriptFile(uiSourceCode);
        if (scriptFile) {
            scriptFile.dispose();
            this._setScriptFile(uiSourceCode, null);
        }
        this._debuggerWorkspaceBinding.setSourceMapping(this._target, uiSourceCode, null);
        this._boundUISourceCodes.delete(uiSourceCode);
    },

    _debuggerReset: function()
    {
        for (var uiSourceCode of this._boundUISourceCodes.valuesArray())
            this._unbindUISourceCode(uiSourceCode);
        this._boundUISourceCodes.clear();
        console.assert(!this._uiSourceCodeToScriptFile.size);
    },

    dispose: function()
    {
        WebInspector.EventTarget.removeEventListeners(this._eventListeners);
        this._debuggerReset();
    }
};

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @param {!WebInspector.ResourceScriptMapping} resourceScriptMapping
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {!Array.<!WebInspector.Script>} scripts
 */
WebInspector.ResourceScriptFile = function(resourceScriptMapping, uiSourceCode, scripts)
{
    console.assert(scripts.length);

    this._resourceScriptMapping = resourceScriptMapping;
    this._uiSourceCode = uiSourceCode;

    if (this._uiSourceCode.contentType().isScript())
        this._script = scripts[scripts.length - 1];

    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
    this._uiSourceCode.addEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
};

/** @enum {symbol} */
WebInspector.ResourceScriptFile.Events = {
    DidMergeToVM: Symbol("DidMergeToVM"),
    DidDivergeFromVM: Symbol("DidDivergeFromVM"),
};

WebInspector.ResourceScriptFile.prototype = {
    /**
     * @param {!Array.<!WebInspector.Script>} scripts
     * @return {boolean}
     */
    _hasScripts: function(scripts)
    {
        return this._script && this._script === scripts[0];
    },

    /**
     * @return {boolean}
     */
    _isDiverged: function()
    {
        if (this._uiSourceCode.isDirty())
            return true;
        if (!this._script)
            return false;
        if (typeof this._scriptSource === "undefined")
            return false;
        var workingCopy = this._uiSourceCode.workingCopy();

        // Match ignoring sourceURL.
        if (!workingCopy.startsWith(this._scriptSource.trimRight()))
            return true;
        var suffix = this._uiSourceCode.workingCopy().substr(this._scriptSource.length);
        return !!suffix.length && !suffix.match(WebInspector.Script.sourceURLRegex);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _workingCopyChanged: function(event)
    {
        this._update();
    },

    _workingCopyCommitted: function(event)
    {
        if (this._uiSourceCode.project().type() === WebInspector.projectTypes.Snippets)
            return;
        if (!this._script)
            return;
        var debuggerModel = this._resourceScriptMapping._debuggerModel;
        var source = this._uiSourceCode.workingCopy();
        debuggerModel.setScriptSource(this._script.scriptId, source, scriptSourceWasSet.bind(this));

        /**
         * @param {?string} error
         * @param {!RuntimeAgent.ExceptionDetails=} exceptionDetails
         * @this {WebInspector.ResourceScriptFile}
         */
        function scriptSourceWasSet(error, exceptionDetails)
        {
            if (!error && !exceptionDetails)
                this._scriptSource = source;
            this._update();

            if (!error && !exceptionDetails)
                return;
            if (!exceptionDetails) {
                WebInspector.console.addMessage(WebInspector.UIString("LiveEdit failed: %s", error), WebInspector.Console.MessageLevel.Warning);
                return;
            }
            var messageText = WebInspector.UIString("LiveEdit compile failed: %s", exceptionDetails.text);
            this._uiSourceCode.addLineMessage(WebInspector.UISourceCode.Message.Level.Error, messageText, exceptionDetails.lineNumber, exceptionDetails.columnNumber);
        }
    },

    _update: function()
    {
        if (this._isDiverged() && !this._hasDivergedFromVM)
            this._divergeFromVM();
        else if (!this._isDiverged() && this._hasDivergedFromVM)
            this._mergeToVM();
    },

    _divergeFromVM: function()
    {
        this._isDivergingFromVM = true;
        this._resourceScriptMapping._updateLocations(this._uiSourceCode);
        delete this._isDivergingFromVM;
        this._hasDivergedFromVM = true;
        this.dispatchEventToListeners(WebInspector.ResourceScriptFile.Events.DidDivergeFromVM, this._uiSourceCode);
    },

    _mergeToVM: function()
    {
        delete this._hasDivergedFromVM;
        this._isMergingToVM = true;
        this._resourceScriptMapping._updateLocations(this._uiSourceCode);
        delete this._isMergingToVM;
        this.dispatchEventToListeners(WebInspector.ResourceScriptFile.Events.DidMergeToVM, this._uiSourceCode);
    },

    /**
     * @return {boolean}
     */
    hasDivergedFromVM: function()
    {
        return this._hasDivergedFromVM;
    },

    /**
     * @return {boolean}
     */
    isDivergingFromVM: function()
    {
        return this._isDivergingFromVM;
    },

    /**
     * @return {boolean}
     */
    isMergingToVM: function()
    {
        return this._isMergingToVM;
    },

    checkMapping: function()
    {
        if (!this._script || typeof this._scriptSource !== "undefined") {
            this._mappingCheckedForTest();
            return;
        }
        this._script.requestContent().then(callback.bind(this));

        /**
         * @param {?string} source
         * @this {WebInspector.ResourceScriptFile}
         */
        function callback(source)
        {
            this._scriptSource = source;
            this._update();
            this._mappingCheckedForTest();
        }
    },

    _mappingCheckedForTest: function() { },

    /**
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        if (!this._script)
            return null;
        return this._script.target();
    },

    dispose: function()
    {
        this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyChanged, this._workingCopyChanged, this);
        this._uiSourceCode.removeEventListener(WebInspector.UISourceCode.Events.WorkingCopyCommitted, this._workingCopyCommitted, this);
    },

    /**
     * @param {string} sourceMapURL
     */
    addSourceMapURL: function(sourceMapURL)
    {
        if (!this._script)
            return;
        this._script.addSourceMapURL(sourceMapURL);
    },

    /**
     * @return {boolean}
     */
    hasSourceMapURL: function()
    {
        return this._script && !!this._script.sourceMapURL;
    },

    __proto__: WebInspector.Object.prototype
};
