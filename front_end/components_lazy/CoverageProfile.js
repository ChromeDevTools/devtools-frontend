// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Components.CoverageProfile = class {
  constructor() {
    this._updateTimer = null;
    this.reset();
  }

  /**
   * @return {!Components.CoverageProfile}
   */
  static instance() {
    if (!Components.CoverageProfile._instance)
      Components.CoverageProfile._instance = new Components.CoverageProfile();

    return Components.CoverageProfile._instance;
  }

  /**
   * @param {string} url
   * @param {!Protocol.CSS.SourceRange} range
   */
  appendUnusedRule(url, range) {
    if (!url)
      return;

    var uiSourceCode = Workspace.workspace.uiSourceCodeForURL(url);
    if (!uiSourceCode)
      return;

    for (var line = range.startLine; line <= range.endLine; ++line)
      uiSourceCode.addLineDecoration(line, Components.CoverageProfile.LineDecorator.type, range.startColumn);
  }

  reset() {
    Workspace.workspace.uiSourceCodes().forEach(
        uiSourceCode => uiSourceCode.removeAllLineDecorations(Components.CoverageProfile.LineDecorator.type));
  }
};

/**
 * @implements {Sources.UISourceCodeFrame.LineDecorator}
 */
Components.CoverageProfile.LineDecorator = class {
  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   */
  decorate(uiSourceCode, textEditor) {
    var gutterType = 'CodeMirror-gutter-coverage';

    var decorations = uiSourceCode.lineDecorations(Components.CoverageProfile.LineDecorator.type);
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

Components.CoverageProfile.LineDecorator.type = 'coverage';
