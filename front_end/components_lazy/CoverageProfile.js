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
   * @param {!Common.TextRange} range
   */
  appendUnusedRule(url, range) {
    if (!url)
      return;

    var uiSourceCode = Workspace.workspace.uiSourceCodeForURL(url);
    if (!uiSourceCode)
      return;

    if (range.startColumn)
      range.startColumn--;
    uiSourceCode.addDecoration(range, Components.CoverageProfile.LineDecorator.type, 0);
  }

  reset() {
    Workspace.workspace.uiSourceCodes().forEach(
        uiSourceCode => uiSourceCode.removeDecorationsForType(Components.CoverageProfile.LineDecorator.type));
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

    var decorations = uiSourceCode.decorationsForType(Components.CoverageProfile.LineDecorator.type);
    textEditor.uninstallGutter(gutterType);
    if (!decorations.size)
      return;

    textEditor.installGutter(gutterType, false);

    for (var decoration of decorations) {
      for (var line = decoration.range().startLine; line <= decoration.range().endLine; ++line) {
        var element = createElementWithClass('div', 'text-editor-line-marker-coverage');
        textEditor.setGutterDecoration(line, gutterType, element);
      }
    }
  }
};

Components.CoverageProfile.LineDecorator.type = 'coverage';
