// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.DebuggerSourceMapping}
 * @param {!WebInspector.DebuggerModel} debuggerModel
 * @param {!WebInspector.ScriptFormatterEditorAction} editorAction
 */
WebInspector.FormatterScriptMapping = function(debuggerModel, editorAction)
{
    this._debuggerModel = debuggerModel;
    this._editorAction = editorAction;
};

WebInspector.FormatterScriptMapping.prototype = {
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
        var uiSourceCode = this._editorAction._uiSourceCodes.get(script);
        if (!uiSourceCode)
            return null;

        var formatData = this._editorAction._formatData.get(uiSourceCode);
        if (!formatData)
            return null;
        var mapping = formatData.mapping;
        var lineNumber = debuggerModelLocation.lineNumber;
        var columnNumber = debuggerModelLocation.columnNumber || 0;
        var formattedLocation = mapping.originalToFormatted(lineNumber, columnNumber);
        return uiSourceCode.uiLocation(formattedLocation[0], formattedLocation[1]);
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
        var formatData = this._editorAction._formatData.get(uiSourceCode);
        if (!formatData)
            return null;
        var originalLocation = formatData.mapping.formattedToOriginal(lineNumber, columnNumber);
        for (var i = 0; i < formatData.scripts.length; ++i) {
            if (formatData.scripts[i].debuggerModel === this._debuggerModel)
                return this._debuggerModel.createRawLocation(formatData.scripts[i], originalLocation[0], originalLocation[1]);
        }
        return null;
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
        return true;
    }
};

/**
 * @constructor
 * @param {string} projectId
 * @param {string} path
 * @param {!WebInspector.FormatterSourceMapping} mapping
 * @param {!Array.<!WebInspector.Script>} scripts
 */
WebInspector.FormatterScriptMapping.FormatData = function(projectId, path, mapping, scripts)
{
    this.projectId = projectId;
    this.path = path;
    this.mapping = mapping;
    this.scripts = scripts;
};

/**
 * @constructor
 * @implements {WebInspector.SourcesView.EditorAction}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.ScriptFormatterEditorAction = function()
{
    this._projectId = "formatter:";
    this._project = new WebInspector.ContentProviderBasedProject(WebInspector.workspace, this._projectId, WebInspector.projectTypes.Formatter, "formatter");

    /** @type {!Map.<!WebInspector.Script, !WebInspector.UISourceCode>} */
    this._uiSourceCodes = new Map();
    /** @type {!Map.<string, string>} */
    this._formattedPaths = new Map();
    /** @type {!Map.<!WebInspector.UISourceCode, !WebInspector.FormatterScriptMapping.FormatData>} */
    this._formatData = new Map();

    /** @type {!Set.<string>} */
    this._pathsToFormatOnLoad = new Set();

    /** @type {!Map.<!WebInspector.Target, !WebInspector.FormatterScriptMapping>} */
    this._scriptMappingByTarget = new Map();
    this._workspace = WebInspector.workspace;
    WebInspector.targetManager.observeTargets(this);
};

WebInspector.ScriptFormatterEditorAction.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
        if (!debuggerModel)
            return;
        this._scriptMappingByTarget.set(target, new WebInspector.FormatterScriptMapping(debuggerModel, this));
        debuggerModel.addEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
        if (!debuggerModel)
            return;
        this._scriptMappingByTarget.remove(target);
        this._cleanForTarget(target);
        debuggerModel.removeEventListener(WebInspector.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _editorSelected: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data);
        this._updateButton(uiSourceCode);

        var path = uiSourceCode.project().id() + ":" + uiSourceCode.url();
        if (this._isFormatableScript(uiSourceCode) && this._pathsToFormatOnLoad.has(path) && !this._formattedPaths.get(path))
            this._formatUISourceCodeScript(uiSourceCode);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _editorClosed: function(event)
    {
        var uiSourceCode = /** @type {!WebInspector.UISourceCode} */ (event.data.uiSourceCode);
        var wasSelected = /** @type {boolean} */ (event.data.wasSelected);

        if (wasSelected)
            this._updateButton(null);
        this._discardFormattedUISourceCodeScript(uiSourceCode);
    },

    /**
     * @param {?WebInspector.UISourceCode} uiSourceCode
     */
    _updateButton: function(uiSourceCode)
    {
        this._button.element.classList.toggle("hidden", !this._isFormatableScript(uiSourceCode));
    },

    /**
     * @override
     * @param {!WebInspector.SourcesView} sourcesView
     * @return {!WebInspector.ToolbarButton}
     */
    button: function(sourcesView)
    {
        if (this._button)
            return this._button;

        this._sourcesView = sourcesView;
        this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorSelected, this._editorSelected.bind(this));
        this._sourcesView.addEventListener(WebInspector.SourcesView.Events.EditorClosed, this._editorClosed.bind(this));

        this._button = new WebInspector.ToolbarButton(WebInspector.UIString("Pretty print"), "format-toolbar-item");
        this._button.addEventListener("click", this._toggleFormatScriptSource, this);
        this._updateButton(sourcesView.currentUISourceCode());

        return this._button;
    },

    /**
     * @param {?WebInspector.UISourceCode} uiSourceCode
     * @return {boolean}
     */
    _isFormatableScript: function(uiSourceCode)
    {
        if (!uiSourceCode)
            return false;
        if (WebInspector.persistence.binding(uiSourceCode))
            return false;
        var supportedProjectTypes = [WebInspector.projectTypes.Network, WebInspector.projectTypes.Debugger, WebInspector.projectTypes.ContentScripts];
        if (supportedProjectTypes.indexOf(uiSourceCode.project().type()) === -1)
            return false;
        return uiSourceCode.contentType().hasScripts();
    },

    _toggleFormatScriptSource: function()
    {
        var uiSourceCode = this._sourcesView.currentUISourceCode();
        if (this._isFormatableScript(uiSourceCode))
            this._formatUISourceCodeScript(uiSourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {!WebInspector.UISourceCode} formattedUISourceCode
     * @param {!WebInspector.FormatterSourceMapping} mapping
     * @private
     */
    _showIfNeeded: function(uiSourceCode, formattedUISourceCode, mapping)
    {
        if (uiSourceCode !== this._sourcesView.currentUISourceCode())
            return;
        var sourceFrame = this._sourcesView.viewForFile(uiSourceCode);
        var start = [0, 0];
        if (sourceFrame) {
            var selection = sourceFrame.selection();
            start = mapping.originalToFormatted(selection.startLine, selection.startColumn);
        }
        this._sourcesView.showSourceLocation(formattedUISourceCode, start[0], start[1]);
        this._updateButton(formattedUISourceCode);
    },

    /**
     * @param {!WebInspector.UISourceCode} formattedUISourceCode
     */
    _discardFormattedUISourceCodeScript: function(formattedUISourceCode)
    {
        var formatData = this._formatData.get(formattedUISourceCode);
        if (!formatData)
            return;

        this._formatData.remove(formattedUISourceCode);
        var path = formatData.projectId + ":" + formatData.path;
        this._formattedPaths.remove(path);
        this._pathsToFormatOnLoad.delete(path);
        for (var i = 0; i < formatData.scripts.length; ++i) {
            this._uiSourceCodes.remove(formatData.scripts[i]);
            WebInspector.debuggerWorkspaceBinding.popSourceMapping(formatData.scripts[i]);
        }
        this._project.removeFile(formattedUISourceCode.url());
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _cleanForTarget: function(target)
    {
        var uiSourceCodes = this._formatData.keysArray();
        for (var i = 0; i < uiSourceCodes.length; ++i) {
            WebInspector.debuggerWorkspaceBinding.setSourceMapping(target, uiSourceCodes[i], null);
            var formatData = this._formatData.get(uiSourceCodes[i]);
            var scripts = [];
            for (var j = 0; j < formatData.scripts.length; ++j) {
                if (formatData.scripts[j].target() === target)
                    this._uiSourceCodes.remove(formatData.scripts[j]);
                else
                    scripts.push(formatData.scripts[j]);
            }

            if (scripts.length)
                formatData.scripts = scripts;
            else {
                this._formattedPaths.remove(formatData.projectId + ":" + formatData.path);
                this._formatData.remove(uiSourceCodes[i]);
                this._project.removeFile(uiSourceCodes[i].url());
            }
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _debuggerReset: function(event)
    {
        var debuggerModel = /** @type {!WebInspector.DebuggerModel} */ (event.target);
        this._cleanForTarget(debuggerModel.target());
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @return {!Array.<!WebInspector.Script>}
     */
    _scriptsForUISourceCode: function(uiSourceCode)
    {
        /**
         * @param {!WebInspector.Script} script
         * @return {boolean}
         */
        function isInlineScript(script)
        {
            return script.isInlineScript() && !script.hasSourceURL;
        }

        if (uiSourceCode.contentType() === WebInspector.resourceTypes.Document) {
            var scripts = [];
            var debuggerModels = WebInspector.DebuggerModel.instances();
            for (var i = 0; i < debuggerModels.length; ++i)
                scripts.pushAll(debuggerModels[i].scriptsForSourceURL(uiSourceCode.url()));
            return scripts.filter(isInlineScript);
        }
        if (uiSourceCode.contentType().isScript()) {
            var rawLocations = WebInspector.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, 0, 0);
            return rawLocations.map(function(rawLocation) { return rawLocation.script(); });
        }
        return [];
    },

    /**
     * @param {!WebInspector.UISourceCode} uiSourceCode
     */
    _formatUISourceCodeScript: function(uiSourceCode)
    {
        var formattedPath = this._formattedPaths.get(uiSourceCode.project().id() + ":" + uiSourceCode.url());
        if (formattedPath) {
            var uiSourceCodePath = formattedPath;
            var formattedUISourceCode = this._workspace.uiSourceCode(this._projectId, uiSourceCodePath);
            var formatData = formattedUISourceCode ? this._formatData.get(formattedUISourceCode) : null;
            if (formatData)
                this._showIfNeeded(uiSourceCode, /** @type {!WebInspector.UISourceCode} */ (formattedUISourceCode), formatData.mapping);
            return;
        }

        uiSourceCode.requestContent().then(contentLoaded.bind(this));

        /**
         * @this {WebInspector.ScriptFormatterEditorAction}
         * @param {?string} content
         */
        function contentLoaded(content)
        {
            var highlighterType = WebInspector.NetworkProject.uiSourceCodeMimeType(uiSourceCode);
            WebInspector.Formatter.format(uiSourceCode.contentType(), highlighterType, content || "", innerCallback.bind(this));
        }

        /**
         * @this {WebInspector.ScriptFormatterEditorAction}
         * @param {string} formattedContent
         * @param {!WebInspector.FormatterSourceMapping} formatterMapping
         */
        function innerCallback(formattedContent, formatterMapping)
        {
            var scripts = this._scriptsForUISourceCode(uiSourceCode);
            var formattedURL = uiSourceCode.url() + ":formatted";
            var contentProvider = WebInspector.StaticContentProvider.fromString(formattedURL, uiSourceCode.contentType(), formattedContent);
            var formattedUISourceCode = this._project.addContentProvider(formattedURL, contentProvider);
            var formattedPath = formattedUISourceCode.url();
            var formatData = new WebInspector.FormatterScriptMapping.FormatData(uiSourceCode.project().id(), uiSourceCode.url(), formatterMapping, scripts);
            this._formatData.set(formattedUISourceCode, formatData);
            var path = uiSourceCode.project().id() + ":" + uiSourceCode.url();
            this._formattedPaths.set(path, formattedPath);
            this._pathsToFormatOnLoad.add(path);
            for (var i = 0; i < scripts.length; ++i) {
                this._uiSourceCodes.set(scripts[i], formattedUISourceCode);
                var scriptMapping = /** @type {!WebInspector.FormatterScriptMapping} */(this._scriptMappingByTarget.get(scripts[i].target()));
                WebInspector.debuggerWorkspaceBinding.pushSourceMapping(scripts[i], scriptMapping);
            }

            var targets = WebInspector.targetManager.targets();
            for (var i = 0; i < targets.length; ++i) {
                var scriptMapping = /** @type {!WebInspector.FormatterScriptMapping} */(this._scriptMappingByTarget.get(targets[i]));
                WebInspector.debuggerWorkspaceBinding.setSourceMapping(targets[i], formattedUISourceCode, scriptMapping);
            }
            this._showIfNeeded(uiSourceCode, formattedUISourceCode, formatterMapping);
        }
    }
};
