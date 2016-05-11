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
 * @param {!WebInspector.NetworkProject} networkProject
 * @param {!WebInspector.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
 */
WebInspector.CompilerScriptMapping = function(debuggerModel, workspace, networkMapping, networkProject, debuggerWorkspaceBinding)
{
    this._target = debuggerModel.target();
    this._debuggerModel = debuggerModel;
    this._workspace = workspace;
    this._workspace.addEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAddedToWorkspace, this);
    this._networkMapping = networkMapping;
    this._networkProject = networkProject;
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    /** @type {!Map<string, !Promise<?WebInspector.TextSourceMap>>} */
    this._sourceMapLoadingPromises = new Map();
    /** @type {!Map<string, !WebInspector.TextSourceMap>} */
    this._sourceMapForScriptId = new Map();
    /** @type {!Map.<!WebInspector.TextSourceMap, !WebInspector.Script>} */
    this._scriptForSourceMap = new Map();
    /** @type {!Map.<string, !WebInspector.TextSourceMap>} */
    this._sourceMapForURL = new Map();
    /** @type {!Map.<string, !WebInspector.UISourceCode>} */
    this._stubUISourceCodes = new Map();

    this._stubProjectID = "compiler-script-project";
    this._stubProject = new WebInspector.ContentProviderBasedProject(this._workspace, this._stubProjectID, WebInspector.projectTypes.Service, "");
    debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
}

WebInspector.CompilerScriptMapping.StubProjectID = "compiler-script-project";

WebInspector.CompilerScriptMapping._originSymbol = Symbol("origin");

/**
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @return {?string}
 */
WebInspector.CompilerScriptMapping.uiSourceCodeOrigin = function(uiSourceCode)
{
    return uiSourceCode[WebInspector.CompilerScriptMapping._originSymbol] || null;
}

WebInspector.CompilerScriptMapping.prototype = {
    /**
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @return {boolean}
     */
    mapsToSourceCode: function(rawLocation) {
        var sourceMap = this._sourceMapForScriptId.get(rawLocation.scriptId);
        if (!sourceMap) {
            return true;
        }
        return !!sourceMap.findEntry(rawLocation.lineNumber, rawLocation.columnNumber);
    },

    /**
     * @override
     * @param {!WebInspector.DebuggerModel.Location} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        var debuggerModelLocation = /** @type {!WebInspector.DebuggerModel.Location} */ (rawLocation);

        var stubUISourceCode = this._stubUISourceCodes.get(debuggerModelLocation.scriptId);
        if (stubUISourceCode)
            return new WebInspector.UILocation(stubUISourceCode, rawLocation.lineNumber, rawLocation.columnNumber);

        var sourceMap = this._sourceMapForScriptId.get(debuggerModelLocation.scriptId);
        if (!sourceMap)
            return null;
        var lineNumber = debuggerModelLocation.lineNumber;
        var columnNumber = debuggerModelLocation.columnNumber || 0;
        var entry = sourceMap.findEntry(lineNumber, columnNumber);
        if (!entry || !entry.sourceURL)
            return null;
        var uiSourceCode = this._networkMapping.uiSourceCodeForScriptURL(/** @type {string} */ (entry.sourceURL), rawLocation.script());
        if (!uiSourceCode)
            return null;
        return uiSourceCode.uiLocation(/** @type {number} */ (entry.sourceLineNumber), /** @type {number} */ (entry.sourceColumnNumber));
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
        if (uiSourceCode.project().type() === WebInspector.projectTypes.Service)
            return null;
        var networkURL = this._networkMapping.networkURL(uiSourceCode);
        if (!networkURL)
            return null;
        var sourceMap = this._sourceMapForURL.get(networkURL);
        if (!sourceMap)
            return null;
        var script = /** @type {!WebInspector.Script} */ (this._scriptForSourceMap.get(sourceMap));
        console.assert(script);
        var entry = sourceMap.firstSourceLineMapping(networkURL, lineNumber);
        if (!entry)
            return null;
        return this._debuggerModel.createRawLocation(script, entry.lineNumber, entry.columnNumber);
    },

    /**
     * @param {!WebInspector.Script} script
     */
    addScript: function(script)
    {
        if (!script.sourceMapURL) {
            script.addEventListener(WebInspector.Script.Events.SourceMapURLAdded, this._sourceMapURLAdded.bind(this));
            return;
        }

        this._processScript(script);
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {?WebInspector.TextSourceMap}
     */
    sourceMapForScript: function(script)
    {
        return this._sourceMapForScriptId.get(script.scriptId) || null;
    },

    /**
     * @param {!WebInspector.Script} script
     */
    maybeLoadSourceMap: function(script)
    {
        if (!script.sourceMapURL)
            return;
        if (this._sourceMapLoadingPromises.has(script.sourceMapURL))
            return;
        if (this._sourceMapForScriptId.has(script.scriptId))
            return;
        this._processScript(script);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _sourceMapURLAdded: function(event)
    {
        var script = /** @type {!WebInspector.Script} */ (event.target);
        if (!script.sourceMapURL)
            return;
        this._processScript(script);
    },

    /**
     * @param {!WebInspector.Script} script
     */
    _processScript: function(script)
    {
        if (WebInspector.blackboxManager.isBlackboxedURL(script.sourceURL, script.isContentScript()))
            return;
        // Create stub UISourceCode for the time source mapping is being loaded.
        var stubUISourceCode = this._stubProject.addContentProvider(script.sourceURL, new WebInspector.StaticContentProvider(script.sourceURL, WebInspector.resourceTypes.Script, Promise.resolve("\n\n\n\n\n// Please wait a bit.\n// Compiled script is not shown while source map is being loaded!")));
        this._stubUISourceCodes.set(script.scriptId, stubUISourceCode);

        this._debuggerWorkspaceBinding.pushSourceMapping(script, this);
        this._loadSourceMapForScript(script).then(this._sourceMapLoaded.bind(this, script, stubUISourceCode.url()));
    },

    /**
     * @param {!WebInspector.Script} script
     * @param {string} uiSourceCodePath
     * @param {?WebInspector.TextSourceMap} sourceMap
     */
    _sourceMapLoaded: function(script, uiSourceCodePath, sourceMap)
    {
        WebInspector.blackboxManager.sourceMapLoaded(script, sourceMap);

        this._stubUISourceCodes.delete(script.scriptId);
        this._stubProject.removeFile(uiSourceCodePath);

        if (!sourceMap) {
            this._debuggerWorkspaceBinding.updateLocations(script);
            return;
        }

        if (this._scriptForSourceMap.get(sourceMap)) {
            this._sourceMapForScriptId.set(script.scriptId, sourceMap);
            this._debuggerWorkspaceBinding.updateLocations(script);
            return;
        }

        this._sourceMapForScriptId.set(script.scriptId, sourceMap);
        this._scriptForSourceMap.set(sourceMap, script);

        // Report sources.
        var sourceURLs = sourceMap.sourceURLs();
        var missingSources = [];
        for (var i = 0; i < sourceURLs.length; ++i) {
            var sourceURL = sourceURLs[i];
            if (this._sourceMapForURL.get(sourceURL))
                continue;
            this._sourceMapForURL.set(sourceURL, sourceMap);
            var uiSourceCode = this._networkMapping.uiSourceCodeForScriptURL(sourceURL, script);
            if (!uiSourceCode && !this._networkMapping.hasMappingForNetworkURL(sourceURL)) {
                var contentProvider = sourceMap.sourceContentProvider(sourceURL, WebInspector.resourceTypes.SourceMapScript);
                uiSourceCode = this._networkProject.addFile(contentProvider, WebInspector.ResourceTreeFrame.fromScript(script), script.isContentScript());
                uiSourceCode[WebInspector.CompilerScriptMapping._originSymbol] = script.sourceURL;
            }
            if (uiSourceCode) {
                this._bindUISourceCode(uiSourceCode);
            } else {
                if (missingSources.length < 3)
                    missingSources.push(sourceURL);
                else if (missingSources.peekLast() !== "\u2026")
                    missingSources.push("\u2026");
            }
        }
        if (missingSources.length) {
            WebInspector.console.warn(
                WebInspector.UIString("Source map %s points to the files missing from the workspace: [%s]",
                                      sourceMap.url(), missingSources.join(", ")));
        }

        this._debuggerWorkspaceBinding.updateLocations(script);
    },

    /**
     * @override
     * @return {boolean}
     */
    isIdentity: function()
    {
        return false;
    },

    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {number} lineNumber
     * @return {boolean}
     */
    uiLineHasMapping: function(uiSourceCode, lineNumber)
    {
        var networkURL = this._networkMapping.networkURL(uiSourceCode);
        if (!networkURL)
            return true;
        var sourceMap = this._sourceMapForURL.get(networkURL);
        if (!sourceMap)
            return true;
        return !!sourceMap.firstSourceLineMapping(networkURL, lineNumber);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _bindUISourceCode: function(uiSourceCode)
    {
        this._debuggerWorkspaceBinding.setSourceMapping(this._target, uiSourceCode, this);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _unbindUISourceCode: function(uiSourceCode)
    {
        this._debuggerWorkspaceBinding.setSourceMapping(this._target, uiSourceCode, null);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _uiSourceCodeAddedToWorkspace: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        var networkURL = this._networkMapping.networkURL(uiSourceCode);
        if (!networkURL || !this._sourceMapForURL.get(networkURL))
            return;
        this._bindUISourceCode(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {!Promise<?WebInspector.TextSourceMap>}
     */
    _loadSourceMapForScript: function(script)
    {
        // script.sourceURL can be a random string, but is generally an absolute path -> complete it to inspected page url for
        // relative links.
        var scriptURL = WebInspector.ParsedURL.completeURL(this._target.resourceTreeModel.inspectedPageURL(), script.sourceURL);
        if (!scriptURL)
            return Promise.resolve(/** @type {?WebInspector.TextSourceMap} */(null));

        console.assert(script.sourceMapURL);
        var scriptSourceMapURL = /** @type {string} */ (script.sourceMapURL);

        var sourceMapURL = WebInspector.ParsedURL.completeURL(scriptURL, scriptSourceMapURL);
        if (!sourceMapURL)
            return Promise.resolve(/** @type {?WebInspector.TextSourceMap} */(null));

        var loadingPromise = this._sourceMapLoadingPromises.get(sourceMapURL);
        if (!loadingPromise) {
            loadingPromise = WebInspector.TextSourceMap.load(sourceMapURL, scriptURL).then(sourceMapLoaded.bind(this, sourceMapURL));
            this._sourceMapLoadingPromises.set(sourceMapURL, loadingPromise);
        }
        return loadingPromise;

        /**
         * @param {string} url
         * @param {?WebInspector.TextSourceMap} sourceMap
         * @this {WebInspector.CompilerScriptMapping}
         */
        function sourceMapLoaded(url, sourceMap)
        {
            if (!sourceMap) {
                this._sourceMapLoadingPromises.delete(url);
                return null;
            }

            return sourceMap;
        }
    },

    _debuggerReset: function()
    {
        /**
         * @param {!WebInspector.TextSourceMap} sourceMap
         * @this {WebInspector.CompilerScriptMapping}
         */
        function unbindSourceMapSources(sourceMap)
        {
            var script = this._scriptForSourceMap.get(sourceMap);
            if (!script)
                return;
            var sourceURLs = sourceMap.sourceURLs();
            for (var i = 0; i < sourceURLs.length; ++i) {
                var uiSourceCode = this._networkMapping.uiSourceCodeForScriptURL(sourceURLs[i], script);
                if (uiSourceCode)
                    this._unbindUISourceCode(uiSourceCode);
            }
        }

        this._sourceMapForURL.valuesArray().forEach(unbindSourceMapSources.bind(this));

        this._sourceMapLoadingPromises.clear();
        this._sourceMapForScriptId.clear()
        this._scriptForSourceMap.clear();
        this._sourceMapForURL.clear();
    },

    dispose: function()
    {
        this._workspace.removeEventListener(WebInspector.Workspace.Events.UISourceCodeAdded, this._uiSourceCodeAddedToWorkspace, this);
    }
}
