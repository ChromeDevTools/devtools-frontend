// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {Bindings.DebuggerSourceMapping}
 * @unrestricted
 */
Sources.FormatterScriptMapping = class {
  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Sources.ScriptFormatterEditorAction} editorAction
   */
  constructor(debuggerModel, editorAction) {
    this._debuggerModel = debuggerModel;
    this._editorAction = editorAction;
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    var debuggerModelLocation = /** @type {!SDK.DebuggerModel.Location} */ (rawLocation);
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
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) {
    var formatData = this._editorAction._formatData.get(uiSourceCode);
    if (!formatData)
      return null;
    var originalLocation = formatData.mapping.formattedToOriginal(lineNumber, columnNumber);
    for (var i = 0; i < formatData.scripts.length; ++i) {
      if (formatData.scripts[i].debuggerModel === this._debuggerModel)
        return this._debuggerModel.createRawLocation(formatData.scripts[i], originalLocation[0], originalLocation[1]);
    }
    return null;
  }

  /**
   * @override
   * @return {boolean}
   */
  isIdentity() {
    return false;
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @return {boolean}
   */
  uiLineHasMapping(uiSourceCode, lineNumber) {
    return true;
  }
};

/**
 * @unrestricted
 */
Sources.FormatterScriptMapping.FormatData = class {
  /**
   * @param {string} projectId
   * @param {string} path
   * @param {!Sources.FormatterSourceMapping} mapping
   * @param {!Array.<!SDK.Script>} scripts
   */
  constructor(projectId, path, mapping, scripts) {
    this.projectId = projectId;
    this.path = path;
    this.mapping = mapping;
    this.scripts = scripts;
  }
};

/**
 * @implements {Sources.SourcesView.EditorAction}
 * @implements {SDK.SDKModelObserver<!SDK.DebuggerModel>}
 * @unrestricted
 */
Sources.ScriptFormatterEditorAction = class {
  constructor() {
    this._projectId = 'formatter:';
    this._project = new Bindings.ContentProviderBasedProject(
        Workspace.workspace, this._projectId, Workspace.projectTypes.Formatter, 'formatter',
        true /* isServiceProject */);

    /** @type {!Map.<!SDK.Script, !Workspace.UISourceCode>} */
    this._uiSourceCodes = new Map();
    /** @type {!Map.<string, string>} */
    this._formattedPaths = new Map();
    /** @type {!Map.<!Workspace.UISourceCode, !Sources.FormatterScriptMapping.FormatData>} */
    this._formatData = new Map();

    /** @type {!Set.<string>} */
    this._pathsToFormatOnLoad = new Set();

    /** @type {!Map.<!SDK.DebuggerModel, !Sources.FormatterScriptMapping>} */
    this._scriptMappingByDebuggerModel = new Map();
    this._workspace = Workspace.workspace;
    SDK.targetManager.observeModels(SDK.DebuggerModel, this);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelAdded(debuggerModel) {
    this._scriptMappingByDebuggerModel.set(debuggerModel, new Sources.FormatterScriptMapping(debuggerModel, this));
    debuggerModel.addEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
  }

  /**
   * @override
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  modelRemoved(debuggerModel) {
    this._scriptMappingByDebuggerModel.remove(debuggerModel);
    this._cleanForModel(debuggerModel);
    debuggerModel.removeEventListener(SDK.DebuggerModel.Events.GlobalObjectCleared, this._debuggerReset, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _editorSelected(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._updateButton(uiSourceCode);

    var path = uiSourceCode.project().id() + ':' + uiSourceCode.url();
    if (this._isFormatableScript(uiSourceCode) && this._pathsToFormatOnLoad.has(path) &&
        !this._formattedPaths.get(path))
      this._formatUISourceCodeScript(uiSourceCode);
  }

  /**
   * @param {!Common.Event} event
   */
  _editorClosed(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data.uiSourceCode);
    var wasSelected = /** @type {boolean} */ (event.data.wasSelected);

    if (wasSelected)
      this._updateButton(null);
    this._discardFormattedUISourceCodeScript(uiSourceCode);
  }

  /**
   * @param {?Workspace.UISourceCode} uiSourceCode
   */
  _updateButton(uiSourceCode) {
    this._button.element.classList.toggle('hidden', !this._isFormatableScript(uiSourceCode));
  }

  /**
   * @override
   * @param {!Sources.SourcesView} sourcesView
   * @return {!UI.ToolbarButton}
   */
  button(sourcesView) {
    if (this._button)
      return this._button;

    this._sourcesView = sourcesView;
    this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorSelected, this._editorSelected.bind(this));
    this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorClosed, this._editorClosed.bind(this));

    this._button = new UI.ToolbarButton(Common.UIString('Pretty print'), 'largeicon-pretty-print');
    this._button.addEventListener(UI.ToolbarButton.Events.Click, this._toggleFormatScriptSource, this);
    this._updateButton(sourcesView.currentUISourceCode());

    return this._button;
  }

  /**
   * @param {?Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  _isFormatableScript(uiSourceCode) {
    if (!uiSourceCode)
      return false;
    if (uiSourceCode.project().canSetFileContent())
      return false;
    if (uiSourceCode.project().type() === Workspace.projectTypes.Formatter)
      return false;
    if (Persistence.persistence.binding(uiSourceCode))
      return false;
    return uiSourceCode.contentType().hasScripts();
  }

  /**
   * @param {!Common.Event} event
   */
  _toggleFormatScriptSource(event) {
    var uiSourceCode = this._sourcesView.currentUISourceCode();
    if (this._isFormatableScript(uiSourceCode))
      this._formatUISourceCodeScript(uiSourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Workspace.UISourceCode} formattedUISourceCode
   * @param {!Sources.FormatterSourceMapping} mapping
   * @private
   */
  _showIfNeeded(uiSourceCode, formattedUISourceCode, mapping) {
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
  }

  /**
   * @param {!Workspace.UISourceCode} formattedUISourceCode
   */
  _discardFormattedUISourceCodeScript(formattedUISourceCode) {
    var formatData = this._formatData.get(formattedUISourceCode);
    if (!formatData)
      return;

    this._formatData.remove(formattedUISourceCode);
    var path = formatData.projectId + ':' + formatData.path;
    this._formattedPaths.remove(path);
    this._pathsToFormatOnLoad.delete(path);
    for (var i = 0; i < formatData.scripts.length; ++i) {
      this._uiSourceCodes.remove(formatData.scripts[i]);
      Bindings.debuggerWorkspaceBinding.popSourceMapping(formatData.scripts[i]);
    }
    this._project.removeFile(formattedUISourceCode.url());
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   */
  _cleanForModel(debuggerModel) {
    var uiSourceCodes = this._formatData.keysArray();
    for (var i = 0; i < uiSourceCodes.length; ++i) {
      Bindings.debuggerWorkspaceBinding.setSourceMapping(debuggerModel, uiSourceCodes[i], null);
      var formatData = this._formatData.get(uiSourceCodes[i]);
      var scripts = [];
      for (var j = 0; j < formatData.scripts.length; ++j) {
        if (formatData.scripts[j].debuggerModel === debuggerModel)
          this._uiSourceCodes.remove(formatData.scripts[j]);
        else
          scripts.push(formatData.scripts[j]);
      }

      if (scripts.length) {
        formatData.scripts = scripts;
      } else {
        this._formattedPaths.remove(formatData.projectId + ':' + formatData.path);
        this._formatData.remove(uiSourceCodes[i]);
        this._project.removeFile(uiSourceCodes[i].url());
      }
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _debuggerReset(event) {
    var debuggerModel = /** @type {!SDK.DebuggerModel} */ (event.data);
    this._cleanForModel(debuggerModel);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Array.<!SDK.Script>}
   */
  _scriptsForUISourceCode(uiSourceCode) {
    /**
     * @param {!SDK.Script} script
     * @return {boolean}
     */
    function isInlineScript(script) {
      return script.isInlineScript() && !script.hasSourceURL;
    }

    if (uiSourceCode.contentType() === Common.resourceTypes.Document) {
      var scripts = [];
      var debuggerModels = SDK.targetManager.models(SDK.DebuggerModel);
      for (var i = 0; i < debuggerModels.length; ++i)
        scripts.pushAll(debuggerModels[i].scriptsForSourceURL(uiSourceCode.url()));
      return scripts.filter(isInlineScript);
    }
    if (uiSourceCode.contentType().isScript()) {
      var rawLocations = Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode, 0, 0);
      return rawLocations.map(function(rawLocation) {
        return rawLocation.script();
      });
    }
    return [];
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _formatUISourceCodeScript(uiSourceCode) {
    var formattedPath = this._formattedPaths.get(uiSourceCode.project().id() + ':' + uiSourceCode.url());
    if (formattedPath) {
      var uiSourceCodePath = formattedPath;
      var formattedUISourceCode = this._workspace.uiSourceCode(this._projectId, uiSourceCodePath);
      var formatData = formattedUISourceCode ? this._formatData.get(formattedUISourceCode) : null;
      if (formatData) {
        this._showIfNeeded(
            uiSourceCode, /** @type {!Workspace.UISourceCode} */ (formattedUISourceCode), formatData.mapping);
      }
      return;
    }

    uiSourceCode.requestContent().then(contentLoaded.bind(this));

    /**
     * @this {Sources.ScriptFormatterEditorAction}
     * @param {?string} content
     */
    function contentLoaded(content) {
      var highlighterType = Bindings.NetworkProject.uiSourceCodeMimeType(uiSourceCode);
      Sources.Formatter.format(uiSourceCode.contentType(), highlighterType, content || '', innerCallback.bind(this));
    }

    /**
     * @this {Sources.ScriptFormatterEditorAction}
     * @param {string} formattedContent
     * @param {!Sources.FormatterSourceMapping} formatterMapping
     */
    function innerCallback(formattedContent, formatterMapping) {
      var scripts = this._scriptsForUISourceCode(uiSourceCode);
      var formattedURL = uiSourceCode.url() + ':formatted';
      var contentProvider =
          Common.StaticContentProvider.fromString(formattedURL, uiSourceCode.contentType(), formattedContent);
      var formattedUISourceCode = this._project.addContentProvider(formattedURL, contentProvider);
      var formattedPath = formattedUISourceCode.url();
      var formatData = new Sources.FormatterScriptMapping.FormatData(
          uiSourceCode.project().id(), uiSourceCode.url(), formatterMapping, scripts);
      this._formatData.set(formattedUISourceCode, formatData);
      var path = uiSourceCode.project().id() + ':' + uiSourceCode.url();
      this._formattedPaths.set(path, formattedPath);
      this._pathsToFormatOnLoad.add(path);
      for (var i = 0; i < scripts.length; ++i) {
        this._uiSourceCodes.set(scripts[i], formattedUISourceCode);
        var scriptMapping =
            /** @type {!Sources.FormatterScriptMapping} */ (
                this._scriptMappingByDebuggerModel.get(scripts[i].debuggerModel));
        Bindings.debuggerWorkspaceBinding.pushSourceMapping(scripts[i], scriptMapping);
      }

      var debuggerModels = SDK.targetManager.models(SDK.DebuggerModel);
      for (var i = 0; i < debuggerModels.length; ++i) {
        var scriptMapping =
            /** @type {!Sources.FormatterScriptMapping} */ (this._scriptMappingByDebuggerModel.get(debuggerModels[i]));
        Bindings.debuggerWorkspaceBinding.setSourceMapping(debuggerModels[i], formattedUISourceCode, scriptMapping);
      }

      for (var decoration of uiSourceCode.allDecorations()) {
        var range = decoration.range();
        var startLocation = formatterMapping.originalToFormatted(range.startLine, range.startColumn);
        var endLocation = formatterMapping.originalToFormatted(range.endLine, range.endColumn);

        formattedUISourceCode.addDecoration(
            new Common.TextRange(startLocation[0], startLocation[1], endLocation[0], endLocation[1]),
            /** @type {string} */ (decoration.type()), decoration.data());
      }

      this._showIfNeeded(uiSourceCode, formattedUISourceCode, formatterMapping);
    }
  }
};
