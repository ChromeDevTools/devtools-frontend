// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
 * @param {!WebInspector.NetworkMapping} networkMapping
 */
WebInspector.BlackboxManager = function(debuggerWorkspaceBinding, networkMapping)
{
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;
    this._networkMapping = networkMapping;

    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this);
    WebInspector.moduleSetting("skipStackFramesPattern").addChangeListener(this._patternChanged.bind(this));
    WebInspector.moduleSetting("skipContentScripts").addChangeListener(this._patternChanged.bind(this));

    /** @type {!Map<string, !Array<!DebuggerAgent.ScriptPosition>>} */
    this._scriptIdToPositions = new Map();
    /** @type {!Map<string, boolean>} */
    this._isBlackboxedURLCache = new Map();
}

WebInspector.BlackboxManager.prototype = {

    /**
     * @param {function(!WebInspector.Event)} listener
     * @param {!Object=} thisObject
     */
    addChangeListener: function(listener, thisObject)
    {
        WebInspector.moduleSetting("skipStackFramesPattern").addChangeListener(listener, thisObject);
    },

    /**
     * @param {function(!WebInspector.Event)} listener
     * @param {!Object=} thisObject
     */
    removeChangeListener: function(listener, thisObject)
    {
        WebInspector.moduleSetting("skipStackFramesPattern").removeChangeListener(listener, thisObject);
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} location
     * @return {boolean}
     */
    isBlackboxedRawLocation: function(location)
    {
        if (!this._scriptIdToPositions.has(location.scriptId))
            return false;
        var positions = this._scriptIdToPositions.get(location.scriptId);
        var index = positions.lowerBound(location, comparator);
        return !!(index % 2);

        /**
         * @param {!WebInspector.DebuggerModel.Location} a
         * @param {!DebuggerAgent.ScriptPosition} b
         * @return {number}
         */
        function comparator(a, b)
        {
            if (a.lineNumber !== b.line)
                return a.lineNumber - b.line;
            return a.columnNumber - b.column;
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {boolean}
     */
    isBlackboxedUISourceCode: function(uiSourceCode)
    {
        var projectType = uiSourceCode.project().type();
        var isContentScript = projectType === WebInspector.projectTypes.ContentScripts;
        if (isContentScript && WebInspector.moduleSetting("skipContentScripts").get())
            return true;
        var networkURL = this._networkMapping.networkURL(uiSourceCode);
        var url = projectType === WebInspector.projectTypes.Formatter ? uiSourceCode.url() : networkURL;
        return this.isBlackboxedURL(url);
    },

    /**
     * @param {string} url
     * @return {boolean}
     */
    isBlackboxedURL: function(url)
    {
        if (this._isBlackboxedURLCache.has(url))
            return !!this._isBlackboxedURLCache.get(url);
        var regex = WebInspector.moduleSetting("skipStackFramesPattern").asRegExp();
        var isBlackboxed = regex && regex.test(url);
        this._isBlackboxedURLCache.set(url, isBlackboxed);
        return isBlackboxed;
    },

    /**
     * @param {!WebInspector.Script} script
     * @param {?WebInspector.SourceMap} sourceMap
     * @return {!Promise<undefined>}
     */
    sourceMapLoaded: function(script, sourceMap)
    {
        if (!sourceMap)
            return Promise.resolve();
        if (!this._scriptIdToPositions.has(script.scriptId))
            return Promise.resolve();

        var mappings = sourceMap.mappings().slice();
        mappings.sort(mappingComparator);

        var previousScriptState = this._scriptIdToPositions.get(script.scriptId);
        if (!mappings.length) {
            if (previousScriptState.length > 0)
                return this._setScriptState(script, []).then(this._sourceMapLoadedForTest);
        }

        var currentBlackboxed = false;
        var isBlackboxed = false;
        var positions = [];
        // If content in script file begin is not mapped and one or more ranges are blackboxed then blackbox it.
        if (mappings[0].lineNumber !== 0 || mappings[0].columnNumber !== 0) {
            positions.push({ line: 0, column: 0});
            currentBlackboxed = true;
        }
        for (var mapping of mappings) {
            if (currentBlackboxed !== this.isBlackboxedURL(mapping.sourceURL)) {
                positions.push({ line: mapping.lineNumber, column: mapping.columnNumber });
                currentBlackboxed = !currentBlackboxed;
            }
            isBlackboxed = currentBlackboxed || isBlackboxed;
        }
        return this._setScriptState(script, !isBlackboxed ? [] : positions).then(this._sourceMapLoadedForTest);
        /**
         * @param {!WebInspector.SourceMap.Entry} a
         * @param {!WebInspector.SourceMap.Entry} b
         * @return {number}
         */
        function mappingComparator(a, b)
        {
            if (a.lineNumber !== b.lineNumber)
                return a.lineNumber - b.lineNumber;
            return a.columnNumber - b.columnNumber;
        }
    },

    _sourceMapLoadedForTest: function()
    {
        // This method is sniffed in tests.
    },

    /**
     * @param {string} url
     * @return {boolean}
     */
    canBlackboxURL: function(url)
    {
        return !!this._urlToRegExpString(url);
    },

    /**
     * @param {string} url
     */
    blackboxURL: function(url)
    {
        var regexPatterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
        var regexValue = this._urlToRegExpString(url);
        if (!regexValue)
            return;
        var found = false;
        for (var i = 0; i < regexPatterns.length; ++i) {
            var item = regexPatterns[i];
            if (item.pattern === regexValue) {
                item.disabled = false;
                found = true;
                break;
            }
        }
        if (!found)
            regexPatterns.push({ pattern: regexValue });
        WebInspector.moduleSetting("skipStackFramesPattern").setAsArray(regexPatterns);
    },

    /**
     * @param {string} url
     * @param {boolean} isContentScript
     */
    unblackbox: function(url, isContentScript)
    {
        if (isContentScript)
            WebInspector.moduleSetting("skipContentScripts").set(false);

        var regexPatterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
        var regexValue = WebInspector.blackboxManager._urlToRegExpString(url);
        if (!regexValue)
            return;
        regexPatterns = regexPatterns.filter(function(item) {
            return item.pattern !== regexValue;
        });
        for (var i = 0; i < regexPatterns.length; ++i) {
            var item = regexPatterns[i];
            if (item.disabled)
                continue;
            try {
                var regex = new RegExp(item.pattern);
                if (regex.test(url))
                    item.disabled = true;
            } catch (e) {
            }
        }
        WebInspector.moduleSetting("skipStackFramesPattern").setAsArray(regexPatterns);
    },

    _patternChanged: function()
    {
        this._isBlackboxedURLCache.clear();

        var promises = [];
        for (var debuggerModel of WebInspector.DebuggerModel.instances()) {
            for (var scriptId in debuggerModel.scripts) {
                var script = debuggerModel.scripts[scriptId];
                promises.push(this._addScript(script)
                                  .then(loadSourceMap.bind(this, script)));
            }
        }
        Promise.all(promises).then(this._patternChangeFinishedForTests);

        /**
         * @param {!WebInspector.Script} script
         * @return {!Promise<undefined>}
         * @this {WebInspector.BlackboxManager}
         */
        function loadSourceMap(script)
        {
            return this.sourceMapLoaded(script, this._debuggerWorkspaceBinding.sourceMapForScript(script));
        }
    },

    _patternChangeFinishedForTests: function()
    {
        // This method is sniffed in tests.
    },

    _globalObjectCleared: function()
    {
        this._scriptIdToPositions.clear();
        this._isBlackboxedURLCache.clear();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _parsedScriptSource: function(event)
    {
        var script = /** @type {!WebInspector.Script} */ (event.data);
        this._addScript(script);
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {!Promise<undefined>}
     */
    _addScript: function(script)
    {
        var blackboxed = this._isBlackboxedScript(script);
        return this._setScriptState(script, blackboxed ? [ { line: 0, column: 0 } ] : []);
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {boolean}
     */
    _isBlackboxedScript: function(script)
    {
        if (script.isContentScript() && WebInspector.moduleSetting("skipContentScripts").get())
            return true;
        return this.isBlackboxedURL(script.sourceURL);
    },

    /**
     * @param {!WebInspector.Script} script
     * @param {!Array<!DebuggerAgent.ScriptPosition>} positions
     * @return {!Promise<undefined>}
     */
    _setScriptState: function(script, positions)
    {
        if (this._scriptIdToPositions.has(script.scriptId)) {
            var hasChanged = false;
            var previousScriptState = this._scriptIdToPositions.get(script.scriptId);
            hasChanged = previousScriptState.length !== positions.length;
            for (var i = 0; !hasChanged && i < positions.length; ++i)
                hasChanged = positions[i].line !== previousScriptState[i].line || positions[i].column !== previousScriptState[i].column;
            if (!hasChanged)
                return Promise.resolve();
        } else {
            if (positions.length === 0)
                return Promise.resolve().then(updateState.bind(this, false));
        }

        return script.setBlackboxedRanges(positions).then(updateState.bind(this));

        /**
         * @param {boolean} success
         * @this {WebInspector.BlackboxManager}
         */
        function updateState(success)
        {
            if (success)
                this._scriptIdToPositions.set(script.scriptId, positions);
            else if (!this._scriptIdToPositions.has(script.scriptId))
                this._scriptIdToPositions.set(script.scriptId, []);
        }
    },

    /**
     * @param {string} url
     * @return {string}
     */
    _urlToRegExpString: function(url)
    {
        var parsedURL = new WebInspector.ParsedURL(url);
        if (parsedURL.isAboutBlank() || parsedURL.isDataURL())
            return "";
        if (!parsedURL.isValid)
            return "^" + url.escapeForRegExp() + "$";
        var name = parsedURL.lastPathComponent;
        if (name)
            name = "/" + name;
        else if (parsedURL.folderPathComponents)
            name = parsedURL.folderPathComponents + "/";
        if (!name)
            name = parsedURL.host;
        if (!name)
            return "";
        var scheme = parsedURL.scheme;
        var prefix = "";
        if (scheme && scheme !== "http" && scheme !== "https") {
            prefix = "^" + scheme + "://";
            if (scheme === "chrome-extension")
                prefix += parsedURL.host + "\\b";
            prefix += ".*";
        }
        return prefix + name.escapeForRegExp() + (url.endsWith(name) ? "$" : "\\b");
    }
}

/** @type {!WebInspector.BlackboxManager} */
WebInspector.blackboxManager;
