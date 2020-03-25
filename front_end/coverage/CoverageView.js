// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as SDK from '../sdk/sdk.js';
import * as SourceFrame from '../source_frame/source_frame.js';
import * as TextEditor from '../text_editor/text_editor.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {CoverageDecorationManager, decoratorType} from './CoverageDecorationManager.js';
import {CoverageListView} from './CoverageListView.js';
import {CoverageInfo, CoverageModel, CoverageType, Events, URLCoverageInfo} from './CoverageModel.js';  // eslint-disable-line no-unused-vars

export class CoverageView extends UI.Widget.VBox {
  constructor() {
    super(true);

    /** @type {?CoverageModel} */
    this._model = null;
    /** @type {?CoverageDecorationManager} */
    this._decorationManager = null;
    /** @type {?SDK.ResourceTreeModel.ResourceTreeModel} */
    this._resourceTreeModel = null;

    this.registerRequiredCSS('coverage/coverageView.css');

    const toolbarContainer = this.contentElement.createChild('div', 'coverage-toolbar-container');
    const toolbar = new UI.Toolbar.Toolbar('coverage-toolbar', toolbarContainer);

    this._coverageType = null;
    this._coverageTypeComboBox = new UI.Toolbar.ToolbarComboBox(
        this._onCoverageTypeComboBoxSelectionChanged.bind(this),
        ls`Choose coverage granularity: Per function has low overhead, per block has significant overhead.`);
    const coverageTypes = [
      {
        label: ls`Per function`,
        value: CoverageType.JavaScript | CoverageType.JavaScriptPerFunction,
      },
      {
        label: ls`Per block`,
        value: CoverageType.JavaScript,
      },
    ];
    for (const type of coverageTypes) {
      this._coverageTypeComboBox.addOption(this._coverageTypeComboBox.createOption(type.label, type.value));
    }
    this._coverageTypeComboBoxSetting = self.Common.settings.createSetting('coverageViewCoverageType', 0);
    this._coverageTypeComboBox.setSelectedIndex(this._coverageTypeComboBoxSetting.get());
    this._coverageTypeComboBox.setEnabled(true);
    toolbar.appendToolbarItem(this._coverageTypeComboBox);

    this._toggleRecordAction =
        /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action('coverage.toggle-recording'));
    this._toggleRecordButton = UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction);
    toolbar.appendToolbarItem(this._toggleRecordButton);

    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    const mainTargetSupportsRecordOnReload = mainTarget && mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (mainTargetSupportsRecordOnReload) {
      const startWithReloadAction =
          /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action('coverage.start-with-reload'));
      this._startWithReloadButton = UI.Toolbar.Toolbar.createActionButton(startWithReloadAction);
      toolbar.appendToolbarItem(this._startWithReloadButton);
      this._toggleRecordButton.setEnabled(false);
      this._toggleRecordButton.setVisible(false);
    }
    this._clearButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Clear all'), 'largeicon-clear');
    this._clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._clear.bind(this));
    toolbar.appendToolbarItem(this._clearButton);

    toolbar.appendSeparator();
    this._saveButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Export...'), 'largeicon-download');
    this._saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._exportReport();
    });
    toolbar.appendToolbarItem(this._saveButton);
    this._saveButton.setEnabled(false);

    /** @type {?RegExp} */
    this._textFilterRegExp = null;
    toolbar.appendSeparator();
    this._filterInput = new UI.Toolbar.ToolbarInput(Common.UIString.UIString('URL filter'), '', 0.4, 1);
    this._filterInput.setEnabled(false);
    this._filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this._onFilterChanged, this);
    toolbar.appendToolbarItem(this._filterInput);

    toolbar.appendSeparator();

    this._typeFilterValue = null;
    this._filterByTypeComboBox =
        new UI.Toolbar.ToolbarComboBox(this._onFilterByTypeChanged.bind(this), ls`Filter coverage by type`);
    const options = [
      {
        label: ls`All`,
        value: '',
      },
      {
        label: ls`CSS`,
        value: CoverageType.CSS,
      },
      {
        label: ls`JavaScript`,
        value: CoverageType.JavaScript | CoverageType.JavaScriptPerFunction,
      },
    ];
    for (const option of options) {
      this._filterByTypeComboBox.addOption(this._filterByTypeComboBox.createOption(option.label, option.value));
    }

    this._filterByTypeComboBox.setSelectedIndex(0);
    this._filterByTypeComboBox.setEnabled(false);
    toolbar.appendToolbarItem(this._filterByTypeComboBox);

    toolbar.appendSeparator();
    this._showContentScriptsSetting = Common.Settings.Settings.instance().createSetting('showContentScripts', false);
    this._showContentScriptsSetting.addChangeListener(this._onFilterChanged, this);
    const contentScriptsCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        this._showContentScriptsSetting, Common.UIString.UIString('Include extension content scripts'),
        Common.UIString.UIString('Content scripts'));
    toolbar.appendToolbarItem(contentScriptsCheckbox);

    this._coverageResultsElement = this.contentElement.createChild('div', 'coverage-results');
    this._landingPage = this._buildLandingPage();
    this._listView = new CoverageListView(this._isVisible.bind(this, false));

    this._statusToolbarElement = this.contentElement.createChild('div', 'coverage-toolbar-summary');
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'coverage-message');
    this._landingPage.show(this._coverageResultsElement);
  }

  /**
   * @return {!UI.Widget.VBox}
   */
  _buildLandingPage() {
    const widget = new UI.Widget.VBox();
    let message;
    if (this._startWithReloadButton) {
      const reloadButton =
          UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButtonForId('coverage.start-with-reload'));
      message = UI.UIUtils.formatLocalized(
          'Click the reload button %s to reload and start capturing coverage.', [reloadButton]);
    } else {
      const recordButton =
          UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction));
      message = UI.UIUtils.formatLocalized('Click the record button %s to start capturing coverage.', [recordButton]);
    }
    message.classList.add('message');
    widget.contentElement.appendChild(message);
    widget.element.classList.add('landing-page');
    return widget;
  }

  _clear() {
    if (this._model) {
      this._model.reset();
    }
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
    this._filterByTypeComboBox.setEnabled(false);
    this._saveButton.setEnabled(false);
  }

  _toggleRecording() {
    const enable = !this._toggleRecordAction.toggled();

    if (enable) {
      this._startRecording({reload: false, jsCoveragePerBlock: this.isBlockCoverageSelected()});
    } else {
      this.stopRecording();
    }
  }

  /**
   * @return {boolean}
   */
  isBlockCoverageSelected() {
    const coverageType = Number(this._coverageTypeComboBox.selectedOption().value);
    // Check that Coverage.CoverageType.JavaScriptPerFunction is not present.
    return coverageType === CoverageType.JavaScript;
  }

  /**
   * @param {boolean} jsCoveragePerBlock
   */
  _selectCoverageType(jsCoveragePerBlock) {
    const selectedIndex = jsCoveragePerBlock ? 1 : 0;
    this._coverageTypeComboBox.setSelectedIndex(selectedIndex);
  }

  _onCoverageTypeComboBoxSelectionChanged() {
    this._coverageTypeComboBoxSetting.set(this._coverageTypeComboBox.selectedIndex());
  }

  async ensureRecordingStarted() {
    const enabled = this._toggleRecordAction.toggled();

    if (enabled) {
      await this.stopRecording();
    }
    await this._startRecording({reload: false, jsCoveragePerBlock: false});
  }

  /**
   * @param {?{reload: (boolean|undefined), jsCoveragePerBlock: (boolean|undefined)}} options - a collection of options controlling the appearance of the pane.
   *   The options object can have the following properties:
   *   - **reload** - `{boolean}` - Reload page for coverage recording
   *   - **jsCoveragePerBlock** - `{boolean}` - Collect per Block coverage if `true`, per function coverage otherwise.
   */
  async _startRecording(options) {
    let hadFocus, reloadButtonFocused;
    if (this._startWithReloadButton && this._startWithReloadButton.element.hasFocus()) {
      reloadButtonFocused = true;
    } else if (this.hasFocus()) {
      hadFocus = true;
    }

    this._reset();
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (!mainTarget) {
      return;
    }

    const {reload, jsCoveragePerBlock} = {reload: false, jsCoveragePerBlock: false, ...options};

    if (!this._model || reload) {
      this._model = mainTarget.model(CoverageModel);
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStarted);
    if (jsCoveragePerBlock) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStartedPerBlock);
    }
    const success = await this._model.start(jsCoveragePerBlock);
    if (!success) {
      return;
    }
    this._selectCoverageType(jsCoveragePerBlock);

    this._model.addEventListener(Events.CoverageUpdated, this._onCoverageDataReceived, this);
    this._resourceTreeModel = /** @type {?SDK.ResourceTreeModel.ResourceTreeModel} */ (
        mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel));
    if (this._resourceTreeModel) {
      this._resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this);
    }
    this._decorationManager = new CoverageDecorationManager(/** @type {!CoverageModel} */ (this._model));
    this._toggleRecordAction.setToggled(true);
    this._clearButton.setEnabled(false);
    if (this._startWithReloadButton) {
      this._startWithReloadButton.setEnabled(false);
      this._startWithReloadButton.setVisible(false);
      this._toggleRecordButton.setEnabled(true);
      this._toggleRecordButton.setVisible(true);
      if (reloadButtonFocused) {
        this._toggleRecordButton.element.focus();
      }
    }
    this._coverageTypeComboBox.setEnabled(false);
    this._filterInput.setEnabled(true);
    this._filterByTypeComboBox.setEnabled(true);
    if (this._landingPage.isShowing()) {
      this._landingPage.detach();
    }
    this._listView.show(this._coverageResultsElement);
    if (hadFocus && !reloadButtonFocused) {
      this._listView.focus();
    }
    if (reload && this._resourceTreeModel) {
      this._resourceTreeModel.reloadPage();
    } else {
      this._model.startPolling();
    }
  }

  _onCoverageDataReceived(event) {
    this._updateViews(event.data);
  }

  async stopRecording() {
    if (this._resourceTreeModel) {
      this._resourceTreeModel.removeEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this);
      this._resourceTreeModel = null;
    }
    if (this.hasFocus()) {
      this._listView.focus();
    }
    // Stopping the model triggers one last poll to get the final data.
    await this._model.stop();
    this._model.removeEventListener(Events.CoverageUpdated, this._onCoverageDataReceived, this);
    this._toggleRecordAction.setToggled(false);
    this._coverageTypeComboBox.setEnabled(true);
    if (this._startWithReloadButton) {
      this._startWithReloadButton.setEnabled(true);
      this._startWithReloadButton.setVisible(true);
      this._toggleRecordButton.setEnabled(false);
      this._toggleRecordButton.setVisible(false);
    }
    this._clearButton.setEnabled(true);
  }

  processBacklog() {
    this._model.processJSBacklog();
  }

  _onMainFrameNavigated() {
    this._model.reset();
    this._decorationManager.reset();
    this._listView.reset();
    this._model.startPolling();
  }

  /**
   * @param {!Array<!CoverageInfo>} updatedEntries
   */
  _updateViews(updatedEntries) {
    this._updateStats();
    this._listView.update(this._model.entries());
    this._saveButton.setEnabled(this._model.entries().length > 0);
    this._decorationManager.update(updatedEntries);
  }

  _updateStats() {
    let total = 0;
    let unused = 0;
    for (const info of this._model.entries()) {
      if (!this._isVisible(true, info)) {
        continue;
      }
      total += info.size();
      unused += info.unusedSize();
    }

    const used = total - unused;
    const percentUsed = total ? Math.round(100 * used / total) : 0;
    this._statusMessageElement.textContent =
        ls`${Number.bytesToString(used)} of ${Number.bytesToString(total)} (${percentUsed}%) used so far.
        ${Number.bytesToString(unused)} unused.`;
  }

  _onFilterChanged() {
    if (!this._listView) {
      return;
    }
    const text = this._filterInput.value();
    this._textFilterRegExp = text ? createPlainTextSearchRegex(text, 'i') : null;
    this._listView.updateFilterAndHighlight(this._textFilterRegExp);
    this._updateStats();
  }

  _onFilterByTypeChanged() {
    if (!this._listView) {
      return;
    }

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageReportFiltered);

    const type = this._filterByTypeComboBox.selectedOption().value;
    this._typeFilterValue = parseInt(type, 10) || null;
    this._listView.updateFilterAndHighlight(this._textFilterRegExp);
    this._updateStats();
  }

  /**
   * @param {boolean} ignoreTextFilter
   * @param {!URLCoverageInfo} coverageInfo
   * @return {boolean}
   */
  _isVisible(ignoreTextFilter, coverageInfo) {
    const url = coverageInfo.url();
    if (url.startsWith(CoverageView._extensionBindingsURLPrefix)) {
      return false;
    }
    if (coverageInfo.isContentScript() && !this._showContentScriptsSetting.get()) {
      return false;
    }
    if (this._typeFilterValue && !(coverageInfo.type() & this._typeFilterValue)) {
      return false;
    }

    return ignoreTextFilter || !this._textFilterRegExp || this._textFilterRegExp.test(url);
  }

  async _exportReport() {
    const fos = new Bindings.FileUtils.FileOutputStream();
    const fileName = `Coverage-${new Date().toISO8601Compact()}.json`;
    const accepted = await fos.open(fileName);
    if (!accepted) {
      return;
    }
    this._model.exportReport(fos);
  }

  selectCoverageItemByUrl(url) {
    this._listView.selectByUrl(url);
  }
}

CoverageView._extensionBindingsURLPrefix = 'extensions::';

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const coverageViewId = 'coverage';
    UI.ViewManager.ViewManager.instance()
        .showView(coverageViewId, /** userGesture= */ false, /** omitFocus= */ true)
        .then(() => UI.ViewManager.ViewManager.instance().view(coverageViewId).widget())
        .then(widget => this._innerHandleAction(/** @type !CoverageView} */ (widget), actionId));

    return true;
  }

  /**
   * @param {!CoverageView} coverageView
   * @param {string} actionId
   */
  _innerHandleAction(coverageView, actionId) {
    switch (actionId) {
      case 'coverage.toggle-recording':
        coverageView._toggleRecording();
        break;
      case 'coverage.start-with-reload':
        coverageView._startRecording({reload: true, jsCoveragePerBlock: coverageView.isBlockCoverageSelected()});
        break;
      default:
        console.assert(false, `Unknown action: ${actionId}`);
    }
  }
}

/**
 * @implements {SourceFrame.SourceFrame.LineDecorator}
 */
export class LineDecorator {
  constructor() {
    /** @type {!WeakMap<!TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor, function(!Common.EventTarget.EventTargetEvent)>} */
    this._listeners = new WeakMap();
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor} textEditor
   */
  decorate(uiSourceCode, textEditor) {
    const decorations = uiSourceCode.decorationsForType(decoratorType);
    if (!decorations || !decorations.size) {
      this._uninstallGutter(textEditor);
      return;
    }
    const decorationManager =
        /** @type {!CoverageDecorationManager} */ (decorations.values().next().value.data());
    decorationManager.usageByLine(uiSourceCode).then(lineUsage => {
      textEditor.operation(() => this._innerDecorate(uiSourceCode, textEditor, lineUsage));
    });
  }

  /**
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor} textEditor
   * @param {!Array<boolean>} lineUsage
   */
  _innerDecorate(uiSourceCode, textEditor, lineUsage) {
    const gutterType = LineDecorator._gutterType;
    this._uninstallGutter(textEditor);
    if (lineUsage.length) {
      this._installGutter(textEditor, uiSourceCode.url());
    }
    for (let line = 0; line < lineUsage.length; ++line) {
      // Do not decorate the line if we don't have data.
      if (typeof lineUsage[line] !== 'boolean') {
        continue;
      }
      const className = lineUsage[line] ? 'text-editor-coverage-used-marker' : 'text-editor-coverage-unused-marker';
      const gutterElement = createElementWithClass('div', className);
      textEditor.setGutterDecoration(line, gutterType, gutterElement);
    }
  }

  /**
   * @param {string} url - the url of the file  this click handler will select in the coverage drawer
   * @return {function(!Common.EventTarget.EventTargetEvent)}
   */
  makeGutterClickHandler(url) {
    function handleGutterClick(event) {
      const eventData = /** @type {!SourceFrame.SourcesTextEditor.GutterClickEventData} */ (event.data);
      if (eventData.gutterType !== LineDecorator._gutterType) {
        return;
      }
      const coverageViewId = 'coverage';
      UI.ViewManager.ViewManager.instance()
          .showView(coverageViewId)
          .then(() => UI.ViewManager.ViewManager.instance().view(coverageViewId).widget())
          .then(widget => {
            const matchFormattedSuffix = url.match(/(.*):formatted$/);
            const urlWithoutFormattedSuffix = (matchFormattedSuffix && matchFormattedSuffix[1]) || url;
            widget.selectCoverageItemByUrl(urlWithoutFormattedSuffix);
          });
    }
    return handleGutterClick;
  }

  /**
     * @param {!TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor} textEditor - the text editor to install the gutter on
     * @param {string} url - the url of the file in the text editor
   */
  _installGutter(textEditor, url) {
    let listener = this._listeners.get(textEditor);
    if (!listener) {
      listener = this.makeGutterClickHandler(url);
      this._listeners.set(textEditor, listener);
    }
    textEditor.installGutter(LineDecorator._gutterType, false);
    textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick, listener, this);
  }

  /**
     * @param {!TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor} textEditor  - the text editor to uninstall the gutter from
     */
  _uninstallGutter(textEditor) {
    textEditor.uninstallGutter(LineDecorator._gutterType);
    const listener = this._listeners.get(textEditor);
    if (listener) {
      textEditor.removeEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick, listener, this);
      this._listeners.delete(textEditor);
    }
  }
}

LineDecorator._gutterType = 'CodeMirror-gutter-coverage';
