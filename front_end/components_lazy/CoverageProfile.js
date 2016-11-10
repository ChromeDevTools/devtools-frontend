// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.CoverageProfile = class {
  constructor() {
    this._updateTimer = null;
    this.reset();
  }

  /**
   * @return {!WebInspector.CoverageProfile}
   */
  static instance() {
    if (!WebInspector.CoverageProfile._instance)
      WebInspector.CoverageProfile._instance = new WebInspector.CoverageProfile();

    return WebInspector.CoverageProfile._instance;
  }

  /**
   * @param {string} url
   * @param {!Protocol.CSS.SourceRange} range
   */
  appendUnusedRule(url, range) {
    if (!url)
      return;

    var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(url);
    if (!uiSourceCode)
      return;

    for (var line = range.startLine; line <= range.endLine; ++line)
      uiSourceCode.addLineDecoration(line, WebInspector.CoverageProfile.LineDecorator.type, range.startColumn);
  }

  reset() {
    WebInspector.workspace.uiSourceCodes().forEach(
        uiSourceCode => uiSourceCode.removeAllLineDecorations(WebInspector.CoverageProfile.LineDecorator.type));
  }
};

/**
 * @implements {WebInspector.UISourceCodeFrame.LineDecorator}
 */
WebInspector.CoverageProfile.LineDecorator = class {
  /**
   * @override
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {!WebInspector.CodeMirrorTextEditor} textEditor
   */
  decorate(uiSourceCode, textEditor) {
    var gutterType = 'CodeMirror-gutter-coverage';

    var decorations = uiSourceCode.lineDecorations(WebInspector.CoverageProfile.LineDecorator.type);
    textEditor.uninstallGutter(gutterType);
    if (!decorations)
      return;

    textEditor.installGutter(gutterType, false);

    for (var decoration of decorations.values()) {
      var element = createElementWithClass('div', 'text-editor-line-marker-coverage');
      textEditor.setGutterDecoration(decoration.line(), gutterType, element);
    }
  }
};

WebInspector.CoverageProfile.LineDecorator.type = 'coverage';
