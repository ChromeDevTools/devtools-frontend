// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.DebuggerWorkspaceBinding} debuggerWorkspaceBinding
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.BlackboxManager = function(debuggerWorkspaceBinding)
{
    this._debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this);
    WebInspector.targetManager.addModelListener(WebInspector.DebuggerModel, WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this);
    WebInspector.moduleSetting("skipStackFramesPattern").addChangeListener(this._patternChanged.bind(this));
    WebInspector.moduleSetting("skipContentScripts").addChangeListener(this._patternChanged.bind(this));

    /** @type {!Map<!WebInspector.DebuggerModel, !Map<string, !Array<!DebuggerAgent.ScriptPosition>>>} */
    this._debuggerModelData = new Map();
    /** @type {!Map<string, boolean>} */
    this._isBlackboxedURLCache = new Map();

    WebInspector.targetManager.observeTargets(this);
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
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
        if (debuggerModel)
            this._setBlackboxPatterns(debuggerModel);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
    },

    /**
     * @param {!WebInspector.DebuggerModel} debuggerModel
     * @return {!Promise<boolean>}
     */
    _setBlackboxPatterns: function(debuggerModel)
    {
        var regexPatterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
        var patterns = /** @type {!Array<string>} */([]);
        for (var item of regexPatterns) {
            if (!item.disabled && item.pattern)
                patterns.push(item.pattern);
        }
        return debuggerModel.setBlackboxPatterns(patterns);
    },

    /**
     * @param {!WebInspector.DebuggerModel.Location} location
     * @return {boolean}
     */
    isBlackboxedRawLocation: function(location)
    {
        var script = location.script();
        if (!script)
            return false;
        var positions = this._scriptPositions(script);
        if (!positions)
            return this._isBlackboxedScript(script);
        var index = positions.lowerBound(location, comparator);
        return !!(index % 2);

        /**
         * @param {!WebInspector.DebuggerModel.Location} a
         * @param {!DebuggerAgent.ScriptPosition} b
         * @return {number}
         */
        function comparator(a, b)
        {
            if (a.lineNumber !== b.lineNumber)
                return a.lineNumber - b.lineNumber;
            return a.columnNumber - b.columnNumber;
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
        var url = this._uiSourceCodeURL(uiSourceCode);
        return url ? this.isBlackboxedURL(url) : false;
    },

    /**
     * @param {string} url
     * @param {boolean=} isContentScript
     * @return {boolean}
     */
    isBlackboxedURL: function(url, isContentScript)
    {
        if (this._isBlackboxedURLCache.has(url))
            return !!this._isBlackboxedURLCache.get(url);
        if (isContentScript && WebInspector.moduleSetting("skipContentScripts").get())
            return true;
        var regex = WebInspector.moduleSetting("skipStackFramesPattern").asRegExp();
        var isBlackboxed = regex && regex.test(url);
        this._isBlackboxedURLCache.set(url, isBlackboxed);
        return isBlackboxed;
    },

    /**
     * @param {!WebInspector.Script} script
     * @param {?WebInspector.TextSourceMap} sourceMap
     * @return {!Promise<undefined>}
     */
    sourceMapLoaded: function(script, sourceMap)
    {
        if (!sourceMap)
            return Promise.resolve();
        var previousScriptState = this._scriptPositions(script);
        if (!previousScriptState)
            return Promise.resolve();

        var mappings = sourceMap.mappings().slice();
        mappings.sort(mappingComparator);

        if (!mappings.length) {
            if (previousScriptState.length > 0)
                return this._setScriptState(script, []);
            return Promise.resolve();
        }

        var currentBlackboxed = false;
        var isBlackboxed = false;
        var positions = [];
        // If content in script file begin is not mapped and one or more ranges are blackboxed then blackbox it.
        if (mappings[0].lineNumber !== 0 || mappings[0].columnNumber !== 0) {
            positions.push({ lineNumber: 0, columnNumber: 0});
            currentBlackboxed = true;
        }
        for (var mapping of mappings) {
            if (mapping.sourceURL && currentBlackboxed !== this.isBlackboxedURL(mapping.sourceURL)) {
                positions.push({ lineNumber: mapping.lineNumber, columnNumber: mapping.columnNumber });
                currentBlackboxed = !currentBlackboxed;
            }
            isBlackboxed = currentBlackboxed || isBlackboxed;
        }
        return this._setScriptState(script, !isBlackboxed ? [] : positions);
        /**
         * @param {!WebInspector.SourceMapEntry} a
         * @param {!WebInspector.SourceMapEntry} b
         * @return {number}
         */
        function mappingComparator(a, b)
        {
            if (a.lineNumber !== b.lineNumber)
                return a.lineNumber - b.lineNumber;
            return a.columnNumber - b.columnNumber;
        }
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {?string}
     */
    _uiSourceCodeURL: function(uiSourceCode)
    {
        return uiSourceCode.project().type() === WebInspector.projectTypes.Debugger ? null : uiSourceCode.url();
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {boolean}
     */
    canBlackboxUISourceCode: function(uiSourceCode)
    {
        var url = this._uiSourceCodeURL(uiSourceCode);
        return url ? !!this._urlToRegExpString(url) : false;
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    blackboxUISourceCode: function(uiSourceCode)
    {
        var url = this._uiSourceCodeURL(uiSourceCode);
        if (url)
            this._blackboxURL(url);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    unblackboxUISourceCode: function(uiSourceCode)
    {
        var url = this._uiSourceCodeURL(uiSourceCode);
        if (url)
            this._unblackboxURL(url);
    },

    blackboxContentScripts: function()
    {
        WebInspector.moduleSetting("skipContentScripts").set(true);
    },

    unblackboxContentScripts: function()
    {
        WebInspector.moduleSetting("skipContentScripts").set(false);
    },

    /**
     * @param {string} url
     */
    _blackboxURL: function(url)
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
     */
    _unblackboxURL: function(url)
    {
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
            promises.push(this._setBlackboxPatterns.bind(this, debuggerModel));
            for (var scriptId in debuggerModel.scripts) {
                var script = debuggerModel.scripts[scriptId];
                promises.push(this._addScript(script)
                                  .then(loadSourceMap.bind(this, script)));
            }
        }
        Promise.all(promises).then(this._patternChangeFinishedForTests.bind(this));

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

    /**
     * @param {!WebInspector.Event} event
     */
    _globalObjectCleared: function(event)
    {
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (event.target);
        this._debuggerModelData.delete(debuggerModel);
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
        return this._setScriptState(script, blackboxed ? [ { lineNumber: 0, columnNumber: 0 } ] : []);
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {boolean}
     */
    _isBlackboxedScript: function(script)
    {
        return this.isBlackboxedURL(script.sourceURL, script.isContentScript());
    },

    /**
     * @param {!WebInspector.Script} script
     * @return {?Array<!DebuggerAgent.ScriptPosition>}
     */
    _scriptPositions: function(script)
    {
        if (this._debuggerModelData.has(script.debuggerModel))
            return this._debuggerModelData.get(script.debuggerModel).get(script.scriptId) || null;
        return null;
    },

    /**
     * @param {!WebInspector.Script} script
     * @param {!Array<!DebuggerAgent.ScriptPosition>} positions
     */
    _setScriptPositions: function(script, positions)
    {
        var debuggerModel = script.debuggerModel;
        if (!this._debuggerModelData.has(debuggerModel))
            this._debuggerModelData.set(debuggerModel, new Map());
        this._debuggerModelData.get(debuggerModel).set(script.scriptId, positions);
    },

    /**
     * @param {!WebInspector.Script} script
     * @param {!Array<!DebuggerAgent.ScriptPosition>} positions
     * @return {!Promise<undefined>}
     */
    _setScriptState: function(script, positions)
    {
        var previousScriptState = this._scriptPositions(script);
        if (previousScriptState) {
            var hasChanged = false;
            hasChanged = previousScriptState.length !== positions.length;
            for (var i = 0; !hasChanged && i < positions.length; ++i)
                hasChanged = positions[i].lineNumber !== previousScriptState[i].lineNumber || positions[i].columnNumber !== previousScriptState[i].columnNumber;
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
            if (success) {
                this._setScriptPositions(script, positions);
                this._debuggerWorkspaceBinding.updateLocations(script);
                var isBlackboxed = positions.length !== 0;
                if (!isBlackboxed && script.sourceMapURL)
                    this._debuggerWorkspaceBinding.maybeLoadSourceMap(script);
            } else {
                var hasPositions = !!this._scriptPositions(script);
                if (!hasPositions)
                    this._setScriptPositions(script, []);
            }
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
