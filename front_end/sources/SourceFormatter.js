// Copyright 2017 The Chromium Authors. All rights reserved.
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
    var scripts = Sources.SourceFormatter._scriptsForUISourceCode(formatData.originalSourceCode);
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

Sources.SourceFormatter = class {
  constructor() {
    this._projectId = 'formatter:';
    this._project = new Bindings.ContentProviderBasedProject(
        Workspace.workspace, this._projectId, Workspace.projectTypes.Formatter, 'formatter',
        true /* isServiceProject */);

    /** @type {!Map<string, !Workspace.UISourceCode>} */
    this._formattedPaths = new Map();
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
      this.discardFormattedUISourceCode(formattedUISourceCode);
  }

  /**
   * @param {!Workspace.UISourceCode} formattedUISourceCode
   * @return {?Workspace.UISourceCode}
   */
  discardFormattedUISourceCode(formattedUISourceCode) {
    var formatData = Sources.SourceFormatData._for(formattedUISourceCode);
    if (!formatData)
      return null;

    delete formattedUISourceCode[Sources.SourceFormatData._formatDataSymbol];
    var scripts = Sources.SourceFormatter._scriptsForUISourceCode(formatData.originalSourceCode);
    for (var script of scripts) {
      delete script[Sources.SourceFormatData._formatDataSymbol];
      Bindings.debuggerWorkspaceBinding.popSourceMapping(script);
    }
    if (scripts[0])
      Bindings.debuggerWorkspaceBinding.setSourceMapping(scripts[0].debuggerModel, formattedUISourceCode, null);
    this._project.removeFile(formattedUISourceCode.url());
    this._formattedPaths.remove(formatData.originalPath());
    return formatData.originalSourceCode;
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
   * @return {boolean}
   */
  hasFormatted(uiSourceCode) {
    return this._formattedPaths.has(uiSourceCode.project().id() + ':' + uiSourceCode.url());
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Promise<!Sources.SourceFormatData>}
   */
  async format(uiSourceCode) {
    var formattedUISourceCode = this._formattedPaths.get(uiSourceCode.project().id() + ':' + uiSourceCode.url());
    if (formattedUISourceCode)
      return Sources.SourceFormatData._for(formattedUISourceCode);

    var content = await uiSourceCode.requestContent();
    var highlighterType = Bindings.NetworkProject.uiSourceCodeMimeType(uiSourceCode);
    var fulfillFormatPromise;
    var resultPromise = new Promise(fulfill => {
      fulfillFormatPromise = fulfill;
    });
    Sources.Formatter.format(uiSourceCode.contentType(), highlighterType, content || '', innerCallback.bind(this));
    return resultPromise;

    /**
     * @this Sources.SourceFormatter
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

      var scripts = Sources.SourceFormatter._scriptsForUISourceCode(uiSourceCode);
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

      fulfillFormatPromise(formatData);
    }
  }
};

Sources.sourceFormatter = new Sources.SourceFormatter();
