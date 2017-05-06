// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {!{
 *    id: string,
 *    contentProvider: !Common.ContentProvider,
 *    line: number,
 *    column: number
 * }}
 */
Coverage.RawLocation;

Coverage.CoverageDecorationManager = class {
  /**
   * @param {!Coverage.CoverageModel} coverageModel
   */
  constructor(coverageModel) {
    this._coverageModel = coverageModel;
    /** @type {!Map<!Common.ContentProvider, ?TextUtils.Text>} */
    this._textByProvider = new Map();
    /** @type {!Multimap<!Common.ContentProvider, !Workspace.UISourceCode>} */
    this._uiSourceCodeByContentProvider = new Multimap();

    for (var uiSourceCode of Workspace.workspace.uiSourceCodes())
      uiSourceCode.addLineDecoration(0, Coverage.CoverageDecorationManager._decoratorType, this);
    Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this._onUISourceCodeAdded, this);
  }

  dispose() {
    for (var uiSourceCode of Workspace.workspace.uiSourceCodes())
      uiSourceCode.removeDecorationsForType(Coverage.CoverageDecorationManager._decoratorType);
    Workspace.workspace.removeEventListener(
        Workspace.Workspace.Events.UISourceCodeAdded, this._onUISourceCodeAdded, this);
  }

  /**
   * @param {!Array<!Coverage.CoverageInfo>} updatedEntries
   */
  update(updatedEntries) {
    for (var entry of updatedEntries) {
      for (var uiSourceCode of this._uiSourceCodeByContentProvider.get(entry.contentProvider())) {
        uiSourceCode.removeDecorationsForType(Coverage.CoverageDecorationManager._decoratorType);
        uiSourceCode.addLineDecoration(0, Coverage.CoverageDecorationManager._decoratorType, this);
      }
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Promise<!Array<boolean>>}
   */
  async usageByLine(uiSourceCode) {
    var result = [];
    var sourceText = new TextUtils.Text(uiSourceCode.content() || '');
    await this._updateTexts(uiSourceCode, sourceText);
    var lineEndings = sourceText.lineEndings();
    for (var line = 0; line < sourceText.lineCount(); ++line) {
      var lineLength = lineEndings[line] - (line ? lineEndings[line - 1] : 0) - 1;
      if (!lineLength) {
        result.push(false);
        continue;
      }
      var startLocations = this._rawLocationsForSourceLocation(uiSourceCode, line, 0);
      var endLocations = this._rawLocationsForSourceLocation(uiSourceCode, line, lineLength);
      var used = false;
      for (var startIndex = 0, endIndex = 0; startIndex < startLocations.length; ++startIndex) {
        var start = startLocations[startIndex];
        while (endIndex < endLocations.length &&
               Coverage.CoverageDecorationManager._compareLocations(start, endLocations[endIndex]) >= 0)
          ++endIndex;
        if (endIndex >= endLocations.length || endLocations[endIndex].id !== start.id)
          continue;
        var end = endLocations[endIndex++];
        var text = this._textByProvider.get(end.contentProvider);
        if (!text)
          continue;
        var textValue = text.value();
        var startOffset = text.offsetFromPosition(start.line, start.column);
        var endOffset = text.offsetFromPosition(end.line, end.column);
        while (startOffset <= endOffset && /\s/.test(textValue[startOffset]))
          ++startOffset;
        while (startOffset <= endOffset && /\s/.test(textValue[endOffset]))
          --endOffset;
        used =
            startOffset <= endOffset && this._coverageModel.usageForRange(end.contentProvider, startOffset, endOffset);
        if (used)
          break;
      }
      result.push(used);
    }
    return result;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextUtils.Text} text
   * @return {!Promise}
   */
  _updateTexts(uiSourceCode, text) {
    var promises = [];
    for (var line = 0; line < text.lineCount(); ++line) {
      for (var entry of this._rawLocationsForSourceLocation(uiSourceCode, line, 0)) {
        if (this._textByProvider.has(entry.contentProvider))
          continue;
        this._textByProvider.set(entry.contentProvider, null);
        this._uiSourceCodeByContentProvider.set(entry.contentProvider, uiSourceCode);
        promises.push(this._updateTextForProvider(entry.contentProvider));
      }
    }
    return Promise.all(promises);
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @return {!Promise}
   */
  async _updateTextForProvider(contentProvider) {
    var content = await contentProvider.requestContent();
    this._textByProvider.set(contentProvider, new TextUtils.Text(content));
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} line
   * @param {number} column
   * @return {!Array<!Coverage.RawLocation>}
   */
  _rawLocationsForSourceLocation(uiSourceCode, line, column) {
    var result = [];
    var contentType = uiSourceCode.contentType();
    if (contentType.hasScripts()) {
      var location = Bindings.debuggerWorkspaceBinding.uiLocationToRawLocation(uiSourceCode, line, column);
      if (location && location.script()) {
        result.push({
          id: `js:${location.scriptId}`,
          contentProvider: location.script(),
          line: location.lineNumber,
          column: location.columnNumber
        });
      }
    }
    if (contentType.isStyleSheet() || contentType.isDocument()) {
      var rawStyleLocations =
          Bindings.cssWorkspaceBinding.uiLocationToRawLocations(new Workspace.UILocation(uiSourceCode, line, column));
      for (var location of rawStyleLocations) {
        if (!location.header())
          continue;
        result.push({
          id: `css:${location.styleSheetId}`,
          contentProvider: location.header(),
          line: location.lineNumber,
          column: location.columnNumber
        });
      }
    }
    result.sort(Coverage.CoverageDecorationManager._compareLocations);
    return result;
  }

  /**
   * @param {!Coverage.RawLocation} a
   * @param {!Coverage.RawLocation} b
   */
  static _compareLocations(a, b) {
    return a.id.localeCompare(b.id) || a.line - b.line || a.column - b.column;
  }

  /**
   * @param {!Common.Event} event
   */
  _onUISourceCodeAdded(event) {
    var uiSourceCode = /** @type !Workspace.UISourceCode */ (event.data);
    uiSourceCode.addLineDecoration(0, Coverage.CoverageDecorationManager._decoratorType, this);
  }
};

Coverage.CoverageDecorationManager._decoratorType = 'coverage';

/**
 * @implements {SourceFrame.UISourceCodeFrame.LineDecorator}
 */
Coverage.CoverageView.LineDecorator = class {
  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   */
  decorate(uiSourceCode, textEditor) {
    var decorations = uiSourceCode.decorationsForType(Coverage.CoverageDecorationManager._decoratorType);
    if (!decorations.size) {
      textEditor.uninstallGutter(Coverage.CoverageView.LineDecorator._gutterType);
      return;
    }
    var decorationManager =
        /** @type {!Coverage.CoverageDecorationManager} */ (decorations.values().next().value.data());
    decorationManager.usageByLine(uiSourceCode).then(lineUsage => {
      textEditor.operation(() => this._innerDecorate(textEditor, lineUsage));
    });
  }

  /**
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   * @param {!Array<boolean>} lineUsage
   */
  _innerDecorate(textEditor, lineUsage) {
    var gutterType = Coverage.CoverageView.LineDecorator._gutterType;
    textEditor.uninstallGutter(gutterType);
    textEditor.installGutter(gutterType, false);
    for (var line = 0; line < lineUsage.length; ++line) {
      var className = lineUsage[line] ? 'text-editor-coverage-used-marker' : 'text-editor-coverage-unused-marker';
      textEditor.setGutterDecoration(line, gutterType, createElementWithClass('div', className));
    }
  }
};

Coverage.CoverageView.LineDecorator._gutterType = 'CodeMirror-gutter-coverage';