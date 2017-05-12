// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Coverage.CoverageView = class extends UI.VBox {
  constructor() {
    super(true);

    /** @type {?Coverage.CoverageModel} */
    this._model = null;
    /** @type {number|undefined} */
    this._pollTimer;
    /** @type {?Coverage.CoverageDecorationManager} */
    this._decorationManager = null;

    this.registerRequiredCSS('coverage/coverageView.css');

    var toolbarContainer = this.contentElement.createChild('div', 'coverage-toolbar-container');
    var topToolbar = new UI.Toolbar('coverage-toolbar', toolbarContainer);

    this._toggleRecordAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('coverage.toggle-recording'));
    this._toggleRecordButton = UI.Toolbar.createActionButton(this._toggleRecordAction);
    topToolbar.appendToolbarItem(this._toggleRecordButton);

    var startWithReloadAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('coverage.start-with-reload'));
    this._startWithReloadButton = UI.Toolbar.createActionButton(startWithReloadAction);
    topToolbar.appendToolbarItem(this._startWithReloadButton);

    this._clearButton = new UI.ToolbarButton(Common.UIString('Clear all'), 'largeicon-clear');
    this._clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._reset.bind(this));
    topToolbar.appendToolbarItem(this._clearButton);

    this._coverageResultsElement = this.contentElement.createChild('div', 'coverage-results');
    this._landingPage = this._buildLandingPage();

    this._listView = new Coverage.CoverageListView();

    this._statusToolbarElement = this.contentElement.createChild('div', 'coverage-toolbar-summary');
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'coverage-message');
    this._landingPage.show(this._coverageResultsElement);
  }

  _reset() {
    if (this._decorationManager) {
      this._decorationManager.dispose();
      this._decorationManager = null;
    }
    this._listView.reset();
    this._listView.detach();
    this._landingPage.show(this._coverageResultsElement);
    this._statusMessageElement.textContent = '';
  }

  /**
   * @return {!UI.VBox}
   */
  _buildLandingPage() {
    var recordButton = UI.createInlineButton(UI.Toolbar.createActionButton(this._toggleRecordAction));
    var reloadButton = UI.createInlineButton(UI.Toolbar.createActionButtonForId('coverage.start-with-reload'));
    var widget = new UI.VBox();
    var message = UI.formatLocalized(
        'Click the record button %s to start capturing coverage.\n' +
            'Click the reload button %s to reload and start capturing coverage.',
        [recordButton, reloadButton]);
    message.classList.add('message');
    widget.contentElement.appendChild(message);
    widget.element.classList.add('landing-page');
    return widget;
  }

  _toggleRecording() {
    var enable = !this._toggleRecordAction.toggled();

    if (enable)
      this._startRecording();
    else
      this._stopRecording();
  }

  _startWithReload() {
    var mainTarget = SDK.targetManager.mainTarget();
    if (!mainTarget)
      return;
    var resourceTreeModel = /** @type {?SDK.ResourceTreeModel} */ (mainTarget.model(SDK.ResourceTreeModel));
    if (!resourceTreeModel)
      return;
    this._startRecording();
    resourceTreeModel.reloadPage();
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
    this._decorationManager = new Coverage.CoverageDecorationManager(model);
    this._toggleRecordAction.setToggled(true);
    this._clearButton.setEnabled(false);
    this._startWithReloadButton.setEnabled(false);
    if (this._landingPage.isShowing())
      this._landingPage.detach();
    this._listView.show(this._coverageResultsElement);
    this._poll();
  }

  async _poll() {
    delete this._pollTimer;
    var updates = await this._model.poll();
    this._updateViews(updates);
    this._pollTimer = setTimeout(() => this._poll(), 700);
  }

  async _stopRecording() {
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      delete this._pollTimer;
    }
    var updatedEntries = await this._model.stop();
    this._updateViews(updatedEntries);
    this._model = null;
    this._toggleRecordAction.setToggled(false);
    this._startWithReloadButton.setEnabled(true);
    this._clearButton.setEnabled(true);
  }

  /**
   * @param {!Array<!Coverage.CoverageInfo>} updatedEntries
   */
  async _updateViews(updatedEntries) {
    var urlEntries = this._model.entries();
    this._updateStats(urlEntries);
    this._listView.update(urlEntries);
    this._decorationManager.update(updatedEntries);
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
};

/**
 * @implements {UI.ActionDelegate}
 */
Coverage.CoverageView.ActionDelegate = class {
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
        .then(widget => this._innerHandleAction(/** @type !Coverage.CoverageView} */ (widget), actionId));

    return true;
  }

  /**
   * @param {!Coverage.CoverageView} coverageView
   * @param {string} actionId
   */
  _innerHandleAction(coverageView, actionId) {
    switch (actionId) {
      case 'coverage.toggle-recording':
        coverageView._toggleRecording();
        break;
      case 'coverage.start-with-reload':
        coverageView._startWithReload();
        break;
      default:
        console.assert(false, `Unknown action: ${actionId}`);
    }
  }
};
