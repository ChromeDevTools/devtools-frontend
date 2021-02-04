// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as SourceFrame from '../source_frame/source_frame.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {CoverageDecorationManager, decoratorType} from './CoverageDecorationManager.js';
import {CoverageListView} from './CoverageListView.js';
import {CoverageInfo, CoverageModel, CoverageType, Events, URLCoverageInfo} from './CoverageModel.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Tooltip in Coverage List View of the Coverage tab for selecting JavaScript coverage mode
  */
  chooseCoverageGranularityPer:
      'Choose coverage granularity: Per function has low overhead, per block has significant overhead.',
  /**
  *@description Text in Coverage List View of the Coverage tab
  */
  perFunction: 'Per function',
  /**
  *@description Text in Coverage List View of the Coverage tab
  */
  perBlock: 'Per block',
  /**
  *@description Text to clear everything
  */
  clearAll: 'Clear all',
  /**
  *@description Tooltip text that appears when hovering over the largeicon download button in the Coverage View of the Coverage tab
  */
  export: 'Export...',
  /**
  *@description Text in Coverage View of the Coverage tab
  */
  urlFilter: 'URL filter',
  /**
  *@description Label for the type filter in the Converage Panel
  */
  filterCoverageByType: 'Filter coverage by type',
  /**
  *@description Text for everything
  */
  all: 'All',
  /**
  *@description Text that appears on a button for the css resource type filter.
  */
  css: 'CSS',
  /**
  *@description Text in Timeline Tree View of the Performance panel
  */
  javascript: 'JavaScript',
  /**
  *@description Tooltip text that appears on the setting when hovering over it in Coverage View of the Coverage tab
  */
  includeExtensionContentScripts: 'Include extension content scripts',
  /**
  *@description Title for a type of source files
  */
  contentScripts: 'Content scripts',
  /**
  *@description Message in Coverage View of the Coverage tab
  *@example {record button icon} PH1
  */
  clickTheReloadButtonSToReloadAnd: 'Click the reload button {PH1} to reload and start capturing coverage.',
  /**
  *@description Message in Coverage View of the Coverage tab
  *@example {record button icon} PH1
  */
  clickTheRecordButtonSToStart: 'Click the record button {PH1} to start capturing coverage.',
  /**
  *@description Footer message in Coverage View of the Coverage tab
  *@example {300k used, 600k unused} PH1
  *@example {500k used, 800k unused} PH2
  */
  filteredSTotalS: 'Filtered: {PH1}  Total: {PH2}',
  /**
  *@description Footer message in Coverage View of the Coverage tab
  *@example {1.5 MB} PH1
  *@example {2.1 MB} PH2
  *@example {71%} PH3
  *@example {29%} PH4
  */
  sOfSSUsedSoFarSUnused: '{PH1} of {PH2} ({PH3}%) used so far, {PH4} unused.',
};
const str_ = i18n.i18n.registerUIStrings('coverage/CoverageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let coverageViewInstance: CoverageView;

export class CoverageView extends UI.Widget.VBox {
  _model: CoverageModel|null;
  _decorationManager: CoverageDecorationManager|null;
  _resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null;
  _coverageTypeComboBox: UI.Toolbar.ToolbarComboBox;
  _coverageTypeComboBoxSetting: Common.Settings.Setting<number>;
  _toggleRecordAction: UI.ActionRegistration.Action;
  _toggleRecordButton: UI.Toolbar.ToolbarButton;
  _inlineReloadButton: Element|null;
  _startWithReloadButton: UI.Toolbar.ToolbarButton|undefined;
  _clearButton: UI.Toolbar.ToolbarButton;
  _saveButton: UI.Toolbar.ToolbarButton;
  _textFilterRegExp: RegExp|null;
  _filterInput: UI.Toolbar.ToolbarInput;
  _typeFilterValue: number|null;
  _filterByTypeComboBox: UI.Toolbar.ToolbarComboBox;
  _showContentScriptsSetting: Common.Settings.Setting<boolean>;
  _contentScriptsCheckbox: UI.Toolbar.ToolbarSettingCheckbox;
  _coverageResultsElement: HTMLElement;
  _landingPage: UI.Widget.VBox;
  _listView: CoverageListView;
  _statusToolbarElement: HTMLElement;
  _statusMessageElement: HTMLElement;

  private constructor() {
    super(true);

    this._model = null;
    this._decorationManager = null;
    this._resourceTreeModel = null;

    this.registerRequiredCSS('coverage/coverageView.css', {enableLegacyPatching: true});

    const toolbarContainer = this.contentElement.createChild('div', 'coverage-toolbar-container');
    const toolbar = new UI.Toolbar.Toolbar('coverage-toolbar', toolbarContainer);

    this._coverageTypeComboBox = new UI.Toolbar.ToolbarComboBox(
        this._onCoverageTypeComboBoxSelectionChanged.bind(this), i18nString(UIStrings.chooseCoverageGranularityPer));
    const coverageTypes = [
      {
        label: i18nString(UIStrings.perFunction),
        value: CoverageType.JavaScript | CoverageType.JavaScriptPerFunction,
      },
      {
        label: i18nString(UIStrings.perBlock),
        value: CoverageType.JavaScript,
      },
    ];
    for (const type of coverageTypes) {
      this._coverageTypeComboBox.addOption(this._coverageTypeComboBox.createOption(type.label, `${type.value}`));
    }
    this._coverageTypeComboBoxSetting =
        Common.Settings.Settings.instance().createSetting('coverageViewCoverageType', 0);
    this._coverageTypeComboBox.setSelectedIndex(this._coverageTypeComboBoxSetting.get());
    this._coverageTypeComboBox.setEnabled(true);
    toolbar.appendToolbarItem(this._coverageTypeComboBox);
    this._toggleRecordAction =
        UI.ActionRegistry.ActionRegistry.instance().action('coverage.toggle-recording') as UI.ActionRegistration.Action;
    this._toggleRecordButton = UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction);
    toolbar.appendToolbarItem(this._toggleRecordButton);

    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    const mainTargetSupportsRecordOnReload = mainTarget && mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    this._inlineReloadButton = null;
    if (mainTargetSupportsRecordOnReload) {
      const startWithReloadAction = UI.ActionRegistry.ActionRegistry.instance().action('coverage.start-with-reload') as
          UI.ActionRegistration.Action;
      this._startWithReloadButton = UI.Toolbar.Toolbar.createActionButton(startWithReloadAction);
      toolbar.appendToolbarItem(this._startWithReloadButton);
      this._toggleRecordButton.setEnabled(false);
      this._toggleRecordButton.setVisible(false);
    }
    this._clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'largeicon-clear');
    this._clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._clear.bind(this));
    toolbar.appendToolbarItem(this._clearButton);

    toolbar.appendSeparator();
    this._saveButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.export), 'largeicon-download');
    this._saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      this._exportReport();
    });
    toolbar.appendToolbarItem(this._saveButton);
    this._saveButton.setEnabled(false);

    this._textFilterRegExp = null;
    toolbar.appendSeparator();
    this._filterInput = new UI.Toolbar.ToolbarInput(i18nString(UIStrings.urlFilter), '', 0.4, 1);
    this._filterInput.setEnabled(false);
    this._filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this._onFilterChanged, this);
    toolbar.appendToolbarItem(this._filterInput);

    toolbar.appendSeparator();

    this._typeFilterValue = null;
    this._filterByTypeComboBox = new UI.Toolbar.ToolbarComboBox(
        this._onFilterByTypeChanged.bind(this), i18nString(UIStrings.filterCoverageByType));
    const options = [
      {
        label: i18nString(UIStrings.all),
        value: '',
      },
      {
        label: i18nString(UIStrings.css),
        value: CoverageType.CSS,
      },
      {
        label: i18nString(UIStrings.javascript),
        value: CoverageType.JavaScript | CoverageType.JavaScriptPerFunction,
      },
    ];
    for (const option of options) {
      this._filterByTypeComboBox.addOption(this._filterByTypeComboBox.createOption(option.label, `${option.value}`));
    }

    this._filterByTypeComboBox.setSelectedIndex(0);
    this._filterByTypeComboBox.setEnabled(false);
    toolbar.appendToolbarItem(this._filterByTypeComboBox);

    toolbar.appendSeparator();
    this._showContentScriptsSetting = Common.Settings.Settings.instance().createSetting('showContentScripts', false);
    this._showContentScriptsSetting.addChangeListener(this._onFilterChanged, this);
    this._contentScriptsCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        this._showContentScriptsSetting, i18nString(UIStrings.includeExtensionContentScripts),
        i18nString(UIStrings.contentScripts));
    this._contentScriptsCheckbox.setEnabled(false);
    toolbar.appendToolbarItem(this._contentScriptsCheckbox);

    this._coverageResultsElement = this.contentElement.createChild('div', 'coverage-results');
    this._landingPage = this._buildLandingPage();
    this._listView = new CoverageListView(this._isVisible.bind(this, false));

    this._statusToolbarElement = this.contentElement.createChild('div', 'coverage-toolbar-summary');
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'coverage-message');
    this._landingPage.show(this._coverageResultsElement);
  }

  static instance(): CoverageView {
    if (!coverageViewInstance) {
      coverageViewInstance = new CoverageView();
    }
    return coverageViewInstance;
  }

  _buildLandingPage(): UI.Widget.VBox {
    const widget = new UI.Widget.VBox();
    let message;
    if (this._startWithReloadButton) {
      this._inlineReloadButton =
          UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButtonForId('coverage.start-with-reload'));
      message = i18n.i18n.getFormatLocalizedString(
          str_, UIStrings.clickTheReloadButtonSToReloadAnd, {PH1: this._inlineReloadButton});
    } else {
      const recordButton =
          UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction));
      message = i18n.i18n.getFormatLocalizedString(str_, UIStrings.clickTheRecordButtonSToStart, {PH1: recordButton});
    }
    message.classList.add('message');
    widget.contentElement.appendChild(message);
    widget.element.classList.add('landing-page');
    return widget;
  }

  _clear(): void {
    if (this._model) {
      this._model.reset();
    }
    this._reset();
  }

  _reset(): void {
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
    this._contentScriptsCheckbox.setEnabled(false);
    this._saveButton.setEnabled(false);
  }

  _toggleRecording(): void {
    const enable = !this._toggleRecordAction.toggled();

    if (enable) {
      this._startRecording({reload: false, jsCoveragePerBlock: this.isBlockCoverageSelected()});
    } else {
      this.stopRecording();
    }
  }

  isBlockCoverageSelected(): boolean {
    const option = this._coverageTypeComboBox.selectedOption();
    const coverageType = Number(option ? option.value : Number.NaN);
    // Check that Coverage.CoverageType.JavaScriptPerFunction is not present.
    return coverageType === CoverageType.JavaScript;
  }

  _selectCoverageType(jsCoveragePerBlock: boolean): void {
    const selectedIndex = jsCoveragePerBlock ? 1 : 0;
    this._coverageTypeComboBox.setSelectedIndex(selectedIndex);
  }

  _onCoverageTypeComboBoxSelectionChanged(): void {
    this._coverageTypeComboBoxSetting.set(this._coverageTypeComboBox.selectedIndex());
  }

  async ensureRecordingStarted(): Promise<void> {
    const enabled = this._toggleRecordAction.toggled();

    if (enabled) {
      await this.stopRecording();
    }
    await this._startRecording({reload: false, jsCoveragePerBlock: false});
  }

  async _startRecording(options: {reload: (boolean|undefined), jsCoveragePerBlock: (boolean|undefined)}|
                        null): Promise<void> {
    let hadFocus, reloadButtonFocused;
    if ((this._startWithReloadButton && this._startWithReloadButton.element.hasFocus()) ||
        (this._inlineReloadButton && this._inlineReloadButton.hasFocus())) {
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
    if (!this._model) {
      return;
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStarted);
    if (jsCoveragePerBlock) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStartedPerBlock);
    }
    const success = await this._model.start(Boolean(jsCoveragePerBlock));
    if (!success) {
      return;
    }
    this._selectCoverageType(Boolean(jsCoveragePerBlock));

    this._model.addEventListener(Events.CoverageUpdated, this._onCoverageDataReceived, this);
    this._resourceTreeModel =
        mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel | null;
    if (this._resourceTreeModel) {
      this._resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this);
    }
    this._decorationManager = new CoverageDecorationManager(this._model as CoverageModel);
    this._toggleRecordAction.setToggled(true);
    this._clearButton.setEnabled(false);
    if (this._startWithReloadButton) {
      this._startWithReloadButton.setEnabled(false);
      this._startWithReloadButton.setVisible(false);
      this._toggleRecordButton.setEnabled(true);
      this._toggleRecordButton.setVisible(true);
      if (reloadButtonFocused) {
        this._toggleRecordButton.focus();
      }
    }
    this._coverageTypeComboBox.setEnabled(false);
    this._filterInput.setEnabled(true);
    this._filterByTypeComboBox.setEnabled(true);
    this._contentScriptsCheckbox.setEnabled(true);
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

  _onCoverageDataReceived(event: Common.EventTarget.EventTargetEvent): void {
    const data = event.data as CoverageInfo[];
    this._updateViews(data);
  }

  async stopRecording(): Promise<void> {
    if (this._resourceTreeModel) {
      this._resourceTreeModel.removeEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this);
      this._resourceTreeModel = null;
    }
    if (this.hasFocus()) {
      this._listView.focus();
    }
    // Stopping the model triggers one last poll to get the final data.
    if (this._model) {
      await this._model.stop();
      this._model.removeEventListener(Events.CoverageUpdated, this._onCoverageDataReceived, this);
    }
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

  processBacklog(): void {
    this._model && this._model.processJSBacklog();
  }

  _onMainFrameNavigated(): void {
    this._model && this._model.reset();
    this._decorationManager && this._decorationManager.reset();
    this._listView.reset();
    this._model && this._model.startPolling();
  }

  _updateViews(updatedEntries: CoverageInfo[]): void {
    this._updateStats();
    this._listView.update(this._model && this._model.entries() || []);
    this._saveButton.setEnabled(this._model !== null && this._model.entries().length > 0);
    this._decorationManager && this._decorationManager.update(updatedEntries);
  }

  _updateStats(): void {
    const all = {total: 0, unused: 0};
    const filtered = {total: 0, unused: 0};
    let filterApplied = false;
    if (this._model) {
      for (const info of this._model.entries()) {
        all.total += info.size();
        all.unused += info.unusedSize();
        if (this._isVisible(false, info)) {
          filtered.total += info.size();
          filtered.unused += info.unusedSize();
        } else {
          filterApplied = true;
        }
      }
    }
    this._statusMessageElement.textContent = filterApplied ?
        i18nString(UIStrings.filteredSTotalS, {PH1: formatStat(filtered), PH2: formatStat(all)}) :
        formatStat(all);

    function formatStat({total, unused}: {total: number, unused: number}): string {
      const used = total - unused;
      const percentUsed = total ? Math.round(100 * used / total) : 0;
      return i18nString(UIStrings.sOfSSUsedSoFarSUnused, {
        PH1: Platform.NumberUtilities.bytesToString(used),
        PH2: Platform.NumberUtilities.bytesToString(total),
        PH3: percentUsed,
        PH4: Platform.NumberUtilities.bytesToString(unused),
      });
    }
  }

  _onFilterChanged(): void {
    if (!this._listView) {
      return;
    }
    const text = this._filterInput.value();
    this._textFilterRegExp = text ? createPlainTextSearchRegex(text, 'i') : null;
    this._listView.updateFilterAndHighlight(this._textFilterRegExp);
    this._updateStats();
  }

  _onFilterByTypeChanged(): void {
    if (!this._listView) {
      return;
    }

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageReportFiltered);

    const option = this._filterByTypeComboBox.selectedOption();
    const type = option && option.value;
    this._typeFilterValue = parseInt(type || '', 10) || null;
    this._listView.updateFilterAndHighlight(this._textFilterRegExp);
    this._updateStats();
  }

  _isVisible(ignoreTextFilter: boolean, coverageInfo: URLCoverageInfo): boolean {
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

  async _exportReport(): Promise<void> {
    const fos = new Bindings.FileUtils.FileOutputStream();
    const fileName = `Coverage-${Platform.DateUtilities.toISO8601Compact(new Date())}.json`;
    const accepted = await fos.open(fileName);
    if (!accepted) {
      return;
    }
    this._model && this._model.exportReport(fos);
  }

  selectCoverageItemByUrl(url: string): void {
    this._listView.selectByUrl(url);
  }

  static readonly _extensionBindingsURLPrefix = 'extensions::';
}

let actionDelegateInstance: ActionDelegate;

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const coverageViewId = 'coverage';
    UI.ViewManager.ViewManager.instance()
        .showView(coverageViewId, /** userGesture= */ false, /** omitFocus= */ true)
        .then(() => {
          const view = UI.ViewManager.ViewManager.instance().view(coverageViewId);
          return view && view.widget();
        })
        .then(widget => this._innerHandleAction(widget as CoverageView, actionId));

    return true;
  }
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }
    return actionDelegateInstance;
  }

  _innerHandleAction(coverageView: CoverageView, actionId: string): void {
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

export class LineDecorator implements SourceFrame.SourceFrame.LineDecorator {
  _listeners:
      WeakMap<SourceFrame.SourcesTextEditor.SourcesTextEditor, (arg0: Common.EventTarget.EventTargetEvent) => void>;
  constructor() {
    this._listeners = new WeakMap();
  }

  decorate(
      uiSourceCode: Workspace.UISourceCode.UISourceCode,
      textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor): void {
    const decorations = uiSourceCode.decorationsForType(decoratorType);
    if (!decorations || !decorations.size) {
      this._uninstallGutter(textEditor);
      return;
    }
    const decorationManager = decorations.values().next().value.data() as CoverageDecorationManager;
    decorationManager.usageByLine(uiSourceCode).then(lineUsage => {
      textEditor.operation(() => this._innerDecorate(uiSourceCode, textEditor, lineUsage));
    });
  }

  _innerDecorate(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor,
      lineUsage: (boolean|undefined)[]): void {
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
      const gutterElement = document.createElement('div');
      gutterElement.classList.add(className);
      textEditor.setGutterDecoration(line, gutterType, gutterElement);
    }
  }

  makeGutterClickHandler(url: string): (arg0: Common.EventTarget.EventTargetEvent) => void {
    function handleGutterClick(event: Common.EventTarget.EventTargetEvent): void {
      const eventData = event.data as SourceFrame.SourcesTextEditor.GutterClickEventData;
      if (eventData.gutterType !== LineDecorator._gutterType) {
        return;
      }
      const coverageViewId = 'coverage';
      UI.ViewManager.ViewManager.instance()
          .showView(coverageViewId)
          .then(() => {
            const view = UI.ViewManager.ViewManager.instance().view(coverageViewId);
            return view && view.widget();
          })
          .then(widget => {
            const matchFormattedSuffix = url.match(/(.*):formatted$/);
            const urlWithoutFormattedSuffix = (matchFormattedSuffix && matchFormattedSuffix[1]) || url;
            (widget as CoverageView).selectCoverageItemByUrl(urlWithoutFormattedSuffix);
          });
    }
    return handleGutterClick;
  }

  _installGutter(textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor, url: string): void {
    let listener = this._listeners.get(textEditor);
    if (!listener) {
      listener = this.makeGutterClickHandler(url);
      this._listeners.set(textEditor, listener);
    }
    textEditor.installGutter(LineDecorator._gutterType, false);
    textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick, listener, this);
  }

  _uninstallGutter(textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor): void {
    textEditor.uninstallGutter(LineDecorator._gutterType);
    const listener = this._listeners.get(textEditor);
    if (listener) {
      textEditor.removeEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick, listener, this);
      this._listeners.delete(textEditor);
    }
  }

  static readonly _gutterType = 'CodeMirror-gutter-coverage';
}
