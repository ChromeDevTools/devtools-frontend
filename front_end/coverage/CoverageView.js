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
    var toolbar = new UI.Toolbar('coverage-toolbar', toolbarContainer);

    this._toggleRecordAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('coverage.toggle-recording'));
    this._toggleRecordButton = UI.Toolbar.createActionButton(this._toggleRecordAction);
    toolbar.appendToolbarItem(this._toggleRecordButton);

    var startWithReloadAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('coverage.start-with-reload'));
    this._startWithReloadButton = UI.Toolbar.createActionButton(startWithReloadAction);
    toolbar.appendToolbarItem(this._startWithReloadButton);
    this._clearButton = new UI.ToolbarButton(Common.UIString('Clear all'), 'largeicon-clear');
    this._clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._clear.bind(this));
    toolbar.appendToolbarItem(this._clearButton);

    /** @type {?RegExp} */
    this._textFilterRegExp = null;

    toolbar.appendSeparator();
    this._filterInput = new UI.ToolbarInput(Common.UIString('URL filter'), 0.4, 1, true);
    this._filterInput.setEnabled(false);
    this._filterInput.addEventListener(UI.ToolbarInput.Event.TextChanged, this._onFilterChanged, this);
    toolbar.appendToolbarItem(this._filterInput);

    toolbar.appendSeparator();
    this._showContentScriptsSetting = Common.settings.createSetting('showContentScripts', false);
    this._showContentScriptsSetting.addChangeListener(this._onFilterChanged, this);
    var contentScriptsCheckbox = new UI.ToolbarSettingCheckbox(
        this._showContentScriptsSetting, Common.UIString('Include extension content scripts'),
        Common.UIString('Content scripts'));
    toolbar.appendToolbarItem(contentScriptsCheckbox);

    this._coverageResultsElement = this.contentElement.createChild('div', 'coverage-results');
    this._landingPage = this._buildLandingPage();
    this._listView = new Coverage.CoverageListView(this._isVisible.bind(this, false));

    this._statusToolbarElement = this.contentElement.createChild('div', 'coverage-toolbar-summary');
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'coverage-message');
    this._landingPage.show(this._coverageResultsElement);
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

  _clear() {
    this._model = null;
    this._reset();
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
    this._filterInput.setEnabled(false);
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
    this._model = null;
    this._startRecording();
    resourceTreeModel.reloadPage();
  }

  _startRecording() {
    this._reset();
    var mainTarget = SDK.targetManager.mainTarget();
    if (!mainTarget)
      return;
    if (!this._model)
      this._model = new Coverage.CoverageModel(mainTarget);
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStarted);
    if (!this._model.start())
      return;
    this._decorationManager = new Coverage.CoverageDecorationManager(this._model);
    this._toggleRecordAction.setToggled(true);
    this._clearButton.setEnabled(false);
    this._startWithReloadButton.setEnabled(false);
    this._filterInput.setEnabled(true);
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
    this._toggleRecordAction.setToggled(false);
    this._startWithReloadButton.setEnabled(true);
    this._clearButton.setEnabled(true);
  }

  /**
   * @param {!Array<!Coverage.CoverageInfo>} updatedEntries
   */
  async _updateViews(updatedEntries) {
    this._updateStats();
    this._listView.update(this._model.entries());
    this._decorationManager.update(updatedEntries);
  }

  _updateStats() {
    var total = 0;
    var unused = 0;
    for (var info of this._model.entries()) {
      if (!this._isVisible(true, info))
        continue;
      total += info.size();
      unused += info.unusedSize();
    }

    var percentUnused = total ? Math.round(100 * unused / total) : 0;
    this._statusMessageElement.textContent = Common.UIString(
        '%s of %s bytes are not used. (%d%%)', Number.bytesToString(unused), Number.bytesToString(total),
        percentUnused);
  }

  _onFilterChanged() {
    if (!this._listView)
      return;
    var text = this._filterInput.value();
    this._textFilterRegExp = text ? createPlainTextSearchRegex(text, 'i') : null;
    this._listView.updateFilterAndHighlight(this._textFilterRegExp);
    this._updateStats();
  }

  /**
   * @param {boolean} ignoreTextFilter
   * @param {!Coverage.URLCoverageInfo} coverageInfo
   * @return {boolean}
   */
  _isVisible(ignoreTextFilter, coverageInfo) {
    var url = coverageInfo.url();
    if (url.startsWith(Coverage.CoverageView._extensionBindingsURLPrefix))
      return false;
    if (coverageInfo.isContentScript() && !this._showContentScriptsSetting.get())
      return false;
    return ignoreTextFilter || !this._textFilterRegExp || this._textFilterRegExp.test(url);
  }
};

Coverage.CoverageView._extensionBindingsURLPrefix = 'extensions::';

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
