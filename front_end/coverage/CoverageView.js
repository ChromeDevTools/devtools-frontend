// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Coverage.CoverageView = class extends UI.VBox {
  constructor() {
    super(true);

    /** @type {?Coverage.CoverageModel} */
    this._model = null;
    this.registerRequiredCSS('coverage/coverageView.css');

    var toolbarContainer = this.contentElement.createChild('div', 'coverage-toolbar-container');
    var topToolbar = new UI.Toolbar('coverage-toolbar', toolbarContainer);

    this._toggleRecordAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('coverage.toggle-recording'));
    topToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._toggleRecordAction));

    var clearButton = new UI.ToolbarButton(Common.UIString('Clear all'), 'largeicon-clear');
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._reset.bind(this));
    topToolbar.appendToolbarItem(clearButton);

    this._coverageResultsElement = this.contentElement.createChild('div', 'coverage-results');
    this._progressElement = this._coverageResultsElement.createChild('div', 'progress-view');
    this._listView = new Coverage.CoverageListView();

    this._statusToolbarElement = this.contentElement.createChild('div', 'coverage-toolbar-summary');
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'coverage-message');
  }

  _reset() {
    Workspace.workspace.uiSourceCodes().forEach(
        uiSourceCode => uiSourceCode.removeDecorationsForType(Coverage.CoverageView.LineDecorator.type));

    this._listView.detach();
    this._coverageResultsElement.removeChildren();
    this._progressElement.textContent = '';
    this._coverageResultsElement.appendChild(this._progressElement);

    this._statusMessageElement.textContent = '';
  }

  _toggleRecording() {
    var enable = !this._toggleRecordAction.toggled();

    if (enable)
      this._startRecording();
    else
      this._stopRecording();
  }

  _startRecording() {
    this._reset();
    var mainTarget = SDK.targetManager.mainTarget();
    if (!mainTarget)
      return;
    console.assert(!this._model, 'Attempting to start coverage twice');
    var model = new Coverage.CoverageModel(mainTarget);
    if (!model.start())
      return;
    this._model = model;
    this._toggleRecordAction.setToggled(true);
    this._progressElement.textContent = Common.UIString('Recording...');
  }

  async _stopRecording() {
    this._toggleRecordAction.setToggled(false);
    this._progressElement.textContent = Common.UIString('Fetching results...');

    var coverageInfo = await this._model.stop();
    this._model = null;
    this._updateViews(coverageInfo);
  }

  /**
   * @param {!Array<!Coverage.URLCoverageInfo>} coverageInfo
   */
  async _updateViews(coverageInfo) {
    this._updateStats(coverageInfo);
    this._coverageResultsElement.removeChildren();
    this._listView.update(coverageInfo);
    this._listView.show(this._coverageResultsElement);
    await Promise.all(coverageInfo.map(entry => Coverage.CoverageView._updateGutter(entry)));
  }

  /**
   * @param {!Array<!Coverage.URLCoverageInfo>} coverageInfo
   */
  _updateStats(coverageInfo) {
    var total = 0;
    var unused = 0;
    for (var info of coverageInfo) {
      total += info.size();
      unused += info.unusedSize();
    }

    var percentUnused = total ? Math.round(100 * unused / total) : 0;
    this._statusMessageElement.textContent = Common.UIString(
        '%s of %s bytes are not used. (%d%%)', Number.bytesToString(unused), Number.bytesToString(total),
        percentUnused);
  }

  /**
   * @param {!Coverage.URLCoverageInfo} coverageInfo
   */
  static async _updateGutter(coverageInfo) {
    var uiSourceCode = Workspace.workspace.uiSourceCodeForURL(coverageInfo.url());
    if (!uiSourceCode)
      return;
    // FIXME: gutter should be set in terms of offsets and therefore should not require contents.
    var ranges = await coverageInfo.buildTextRanges();
    for (var r of ranges)
      uiSourceCode.addDecoration(r.range, Coverage.CoverageView.LineDecorator.type, r.count);
  }
};

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
    var gutterType = 'CodeMirror-gutter-coverage';

    var decorations = uiSourceCode.decorationsForType(Coverage.CoverageView.LineDecorator.type);
    textEditor.uninstallGutter(gutterType);
    if (!decorations || !decorations.size)
      return;

    textEditor.installGutter(gutterType, false);
    var lastLine = 0;
    var lastData = undefined;
    for (var decoration of decorations) {
      var range = decoration.range();
      var startLine = range.startLine;
      if (lastLine && lastLine === startLine && lastData !== !!decoration.data()) {
        var element = createElementWithClass('div', 'text-editor-coverage-mixed-marker');
        textEditor.setGutterDecoration(startLine, gutterType, element);
        startLine++;
      } else {
        startLine = Math.max(startLine, lastLine);
      }
      lastLine = range.endLine;
      lastData = !!decoration.data();
      var className = lastData ? 'text-editor-coverage-used-marker' : 'text-editor-coverage-unused-marker';
      for (var line = startLine; line <= lastLine; ++line) {
        var element = createElementWithClass('div', className);
        textEditor.setGutterDecoration(line, gutterType, element);
      }
    }
  }
};

Coverage.CoverageView.LineDecorator.type = 'coverage';

/**
 * @implements {UI.ActionDelegate}
 */
Coverage.CoverageView.RecordActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var coverageViewId = 'coverage';
    UI.viewManager.showView(coverageViewId)
        .then(() => UI.viewManager.view(coverageViewId).widget())
        .then(widget => /** @type !Coverage.CoverageView} */ (widget)._toggleRecording());

    return true;
  }
};
