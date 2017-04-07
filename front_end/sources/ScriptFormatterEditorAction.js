// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Bindings.DebuggerSourceMapping}
 */
Sources.FormatterScriptMapping = class {
  /**
   * @override
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    var script = rawLocation.script();
    var formatData = script && Sources.SourceFormatData._for(script);
    if (!formatData)
      return null;
    var lineNumber = rawLocation.lineNumber;
    var columnNumber = rawLocation.columnNumber || 0;
    var formattedLocation = formatData.mapping.originalToFormatted(lineNumber, columnNumber);
    return formatData.formattedSourceCode.uiLocation(formattedLocation[0], formattedLocation[1]);
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  uiLocationToRawLocation(uiSourceCode, lineNumber, columnNumber) {
    var formatData = Sources.SourceFormatData._for(uiSourceCode);
    if (!formatData)
      return null;
    var originalLocation = formatData.mapping.formattedToOriginal(lineNumber, columnNumber);
    var scripts = Sources.ScriptFormatterEditorAction._scriptsForUISourceCode(formatData.originalSourceCode);
    if (!scripts.length)
      return null;
    return scripts[0].debuggerModel.createRawLocation(scripts[0], originalLocation[0], originalLocation[1]);
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

Sources.SourceFormatData = class {
  /**
   * @param {!Workspace.UISourceCode} originalSourceCode
   * @param {!Workspace.UISourceCode} formattedSourceCode
   * @param {!Sources.FormatterSourceMapping} mapping
   */
  constructor(originalSourceCode, formattedSourceCode, mapping) {
    this.originalSourceCode = originalSourceCode;
    this.formattedSourceCode = formattedSourceCode;
    this.mapping = mapping;
  }

  originalPath() {
    return this.originalSourceCode.project().id() + ':' + this.originalSourceCode.url();
  }

  /**
   * @param {!Object} object
   * @return {?Sources.SourceFormatData}
   */
  static _for(object) {
    return object[Sources.SourceFormatData._formatDataSymbol];
  }
};

Sources.SourceFormatData._formatDataSymbol = Symbol('formatData');

/**
 * @implements {Sources.SourcesView.EditorAction}
 * @unrestricted
 */
Sources.ScriptFormatterEditorAction = class {
  constructor() {
    this._projectId = 'formatter:';
    this._project = new Bindings.ContentProviderBasedProject(
        Workspace.workspace, this._projectId, Workspace.projectTypes.Formatter, 'formatter',
        true /* isServiceProject */);

    /** @type {!Map<string, !Workspace.UISourceCode>} */
    this._formattedPaths = new Map();
    /** @type {!Set<string>} */
    this._pathsToFormatOnLoad = new Set();
    this._scriptMapping = new Sources.FormatterScriptMapping();
    Workspace.workspace.addEventListener(
        Workspace.Workspace.Events.UISourceCodeRemoved, this._onUISourceCodeRemoved, this);
  }

  /**
   * @param {!Common.Event} event
   */
  _onUISourceCodeRemoved(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    var formattedUISourceCode = this._formattedPaths.get(uiSourceCode.project().id() + ':' + uiSourceCode.url());
    if (formattedUISourceCode)
      this._discardFormattedUISourceCodeScript(formattedUISourceCode, false);
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
    this._discardFormattedUISourceCodeScript(uiSourceCode, true);
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
   * @param {boolean} userAction
   */
  _discardFormattedUISourceCodeScript(formattedUISourceCode, userAction) {
    var formatData = Sources.SourceFormatData._for(formattedUISourceCode);
    if (!formatData)
      return;

    var path = formatData.originalPath();
    this._formattedPaths.remove(path);
    delete formattedUISourceCode[Sources.SourceFormatData._formatDataSymbol];
    if (userAction)
      this._pathsToFormatOnLoad.delete(path);
    var scripts = Sources.ScriptFormatterEditorAction._scriptsForUISourceCode(formatData.originalSourceCode);
    for (var script of scripts) {
      delete script[Sources.SourceFormatData._formatDataSymbol];
      Bindings.debuggerWorkspaceBinding.popSourceMapping(script);
    }
    if (scripts[0])
      Bindings.debuggerWorkspaceBinding.setSourceMapping(scripts[0].debuggerModel, formattedUISourceCode, null);
    this._project.removeFile(formattedUISourceCode.url());
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Array<!SDK.Script>}
   */
  static _scriptsForUISourceCode(uiSourceCode) {
    if (uiSourceCode.contentType() === Common.resourceTypes.Document) {
      var target = Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);
      var debuggerModel = target && target.model(SDK.DebuggerModel);
      if (debuggerModel) {
        var scripts = debuggerModel.scriptsForSourceURL(uiSourceCode.url())
                          .filter(script => script.isInlineScript() && !script.hasSourceURL);
        return scripts;
      }
    }
    if (uiSourceCode.contentType().isScript()) {
      var rawLocation = Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(uiSourceCode, 0, 0);
      if (rawLocation)
        return [rawLocation.script()];
    }
    return [];
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  _formatUISourceCodeScript(uiSourceCode) {
    var formattedUISourceCode = this._formattedPaths.get(uiSourceCode.project().id() + ':' + uiSourceCode.url());
    if (formattedUISourceCode) {
      var formatData = Sources.SourceFormatData._for(formattedUISourceCode);
      if (formatData) {
        this._showIfNeeded(
            uiSourceCode, /** @type {!Workspace.UISourceCode} */ (formattedUISourceCode), formatData.mapping);
        return;
      }
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
      var formattedURL = uiSourceCode.url() + ':formatted';
      var contentProvider =
          Common.StaticContentProvider.fromString(formattedURL, uiSourceCode.contentType(), formattedContent);
      var formattedUISourceCode = this._project.addContentProvider(formattedURL, contentProvider);
      var formatData = new Sources.SourceFormatData(uiSourceCode, formattedUISourceCode, formatterMapping);
      formattedUISourceCode[Sources.SourceFormatData._formatDataSymbol] = formatData;

      var path = formatData.originalPath();
      this._formattedPaths.set(path, formattedUISourceCode);
      this._pathsToFormatOnLoad.add(path);

      var scripts = Sources.ScriptFormatterEditorAction._scriptsForUISourceCode(uiSourceCode);
      if (!scripts)
        return;
      for (var script of scripts) {
        script[Sources.SourceFormatData._formatDataSymbol] = formatData;
        Bindings.debuggerWorkspaceBinding.pushSourceMapping(script, this._scriptMapping);
      }

      Bindings.debuggerWorkspaceBinding.setSourceMapping(
          scripts[0].debuggerModel, formattedUISourceCode, this._scriptMapping);

      for (var decoration of uiSourceCode.allDecorations()) {
        var range = decoration.range();
        var startLocation = formatterMapping.originalToFormatted(range.startLine, range.startColumn);
        var endLocation = formatterMapping.originalToFormatted(range.endLine, range.endColumn);

        formattedUISourceCode.addDecoration(
            new TextUtils.TextRange(startLocation[0], startLocation[1], endLocation[0], endLocation[1]),
            /** @type {string} */ (decoration.type()), decoration.data());
      }

      this._showIfNeeded(uiSourceCode, formattedUISourceCode, formatterMapping);
    }
  }
};
