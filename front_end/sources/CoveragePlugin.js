// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Plugin} from './Plugin.js';

export class CoveragePlugin extends Plugin {
  /**
   * @param {!SourceFrame.SourcesTextEditor} textEditor
   * @param {!Workspace.UISourceCode} uiSourceCode
   */
  constructor(textEditor, uiSourceCode) {
    super();

    this._textEditor = textEditor;
    this._uiSourceCode = uiSourceCode;

    /* @type {!Workspace.UISourceCode} uiSourceCode */
    this._originalSourceCode = Formatter.sourceFormatter.getOriginalUISourceCode(this._uiSourceCode);

    this._text = new UI.ToolbarButton(ls`Click to show Coverage Panel`);
    this._text.setSecondary();
    this._text.addEventListener(UI.ToolbarButton.Events.Click, () => {
      UI.viewManager.showView('coverage');
    });

    const mainTarget = self.SDK.targetManager.mainTarget();
    if (mainTarget) {
      this._model = mainTarget.model(Coverage.CoverageModel);
      this._model.addEventListener(Coverage.CoverageModel.Events.CoverageReset, this._handleReset, this);

      this._coverage = this._model.getCoverageForUrl(this._originalSourceCode.url());
      if (this._coverage) {
        this._coverage.addEventListener(
            Coverage.URLCoverageInfo.Events.SizesChanged, this._handleCoverageSizesChanged, this);
      }
    }

    this._updateStats();
  }

  /**
   * @override
   */
  dispose() {
    if (this._coverage) {
      this._coverage.removeEventListener(
          Coverage.URLCoverageInfo.Events.SizesChanged, this._handleCoverageSizesChanged, this);
    }
    if (this._model) {
      this._model.removeEventListener(Coverage.CoverageModel.Events.CoverageReset, this._handleReset, this);
    }
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  static accepts(uiSourceCode) {
    return uiSourceCode.contentType().isDocumentOrScriptOrStyleSheet();
  }

  _handleReset() {
    this._coverage = null;
    this._updateStats();
  }

  _handleCoverageSizesChanged() {
    this._updateStats();
  }

  _updateStats() {
    if (this._coverage) {
      this._text.setTitle(ls`Show Details`);
      this._text.setText(ls`Coverage: ${this._coverage.usedPercentage().toFixed(1)} %`);
    } else {
      this._text.setTitle(ls`Click to show Coverage Panel`);
      this._text.setText(ls`Coverage: n/a`);
    }
  }

  /**
   * @override
   * @return {!Promise<!Array<!UI.ToolbarItem>>}
   */
  async rightToolbarItems() {
    return [this._text];
  }
}
