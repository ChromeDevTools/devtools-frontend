// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as UI from '../../ui/legacy/legacy.js';

import {CoverageDecorationManager} from './CoverageDecorationManager.js';
import {CoverageListView} from './CoverageListView.js';
import coverageViewStyles from './coverageView.css.js';

import {CoverageModel, Events, CoverageType, type CoverageInfo, type URLCoverageInfo} from './CoverageModel.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('panels/coverage/CoverageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let coverageViewInstance: CoverageView;

export class CoverageView extends UI.Widget.VBox {
  private model: CoverageModel|null;
  private decorationManager: CoverageDecorationManager|null;
  private resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null;
  private readonly coverageTypeComboBox: UI.Toolbar.ToolbarComboBox;
  private readonly coverageTypeComboBoxSetting: Common.Settings.Setting<number>;
  private toggleRecordAction: UI.ActionRegistration.Action;
  private readonly toggleRecordButton: UI.Toolbar.ToolbarButton;
  private inlineReloadButton: Element|null;
  private readonly startWithReloadButton: UI.Toolbar.ToolbarButton|undefined;
  private readonly clearButton: UI.Toolbar.ToolbarButton;
  private readonly saveButton: UI.Toolbar.ToolbarButton;
  private textFilterRegExp: RegExp|null;
  private readonly filterInput: UI.Toolbar.ToolbarInput;
  private typeFilterValue: number|null;
  private readonly filterByTypeComboBox: UI.Toolbar.ToolbarComboBox;
  private showContentScriptsSetting: Common.Settings.Setting<boolean>;
  private readonly contentScriptsCheckbox: UI.Toolbar.ToolbarSettingCheckbox;
  private readonly coverageResultsElement: HTMLElement;
  private readonly landingPage: UI.Widget.VBox;
  private listView: CoverageListView;
  private readonly statusToolbarElement: HTMLElement;
  private statusMessageElement: HTMLElement;

  private constructor() {
    super(true);

    this.model = null;
    this.decorationManager = null;
    this.resourceTreeModel = null;

    const toolbarContainer = this.contentElement.createChild('div', 'coverage-toolbar-container');
    const toolbar = new UI.Toolbar.Toolbar('coverage-toolbar', toolbarContainer);
    toolbar.makeWrappable(true);

    this.coverageTypeComboBox = new UI.Toolbar.ToolbarComboBox(
        this.onCoverageTypeComboBoxSelectionChanged.bind(this), i18nString(UIStrings.chooseCoverageGranularityPer));
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
      this.coverageTypeComboBox.addOption(this.coverageTypeComboBox.createOption(type.label, `${type.value}`));
    }
    this.coverageTypeComboBoxSetting = Common.Settings.Settings.instance().createSetting('coverageViewCoverageType', 0);
    this.coverageTypeComboBox.setSelectedIndex(this.coverageTypeComboBoxSetting.get());
    this.coverageTypeComboBox.setEnabled(true);
    toolbar.appendToolbarItem(this.coverageTypeComboBox);
    this.toggleRecordAction =
        UI.ActionRegistry.ActionRegistry.instance().action('coverage.toggle-recording') as UI.ActionRegistration.Action;
    this.toggleRecordButton = UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction);
    toolbar.appendToolbarItem(this.toggleRecordButton);

    const mainTarget = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
    const mainTargetSupportsRecordOnReload = mainTarget && mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    this.inlineReloadButton = null;
    if (mainTargetSupportsRecordOnReload) {
      const startWithReloadAction = UI.ActionRegistry.ActionRegistry.instance().action('coverage.start-with-reload') as
          UI.ActionRegistration.Action;
      this.startWithReloadButton = UI.Toolbar.Toolbar.createActionButton(startWithReloadAction);
      toolbar.appendToolbarItem(this.startWithReloadButton);
      this.toggleRecordButton.setEnabled(false);
      this.toggleRecordButton.setVisible(false);
    }
    this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'largeicon-clear');
    this.clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.clear.bind(this));
    toolbar.appendToolbarItem(this.clearButton);

    toolbar.appendSeparator();
    this.saveButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.export), 'largeicon-download');
    this.saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, _event => {
      void this.exportReport();
    });
    toolbar.appendToolbarItem(this.saveButton);
    this.saveButton.setEnabled(false);

    this.textFilterRegExp = null;
    toolbar.appendSeparator();
    this.filterInput = new UI.Toolbar.ToolbarInput(i18nString(UIStrings.urlFilter), '', 0.4, 1);
    this.filterInput.setEnabled(false);
    this.filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this.onFilterChanged, this);
    toolbar.appendToolbarItem(this.filterInput);

    toolbar.appendSeparator();

    this.typeFilterValue = null;
    this.filterByTypeComboBox = new UI.Toolbar.ToolbarComboBox(
        this.onFilterByTypeChanged.bind(this), i18nString(UIStrings.filterCoverageByType));
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
      this.filterByTypeComboBox.addOption(this.filterByTypeComboBox.createOption(option.label, `${option.value}`));
    }

    this.filterByTypeComboBox.setSelectedIndex(0);
    this.filterByTypeComboBox.setEnabled(false);
    toolbar.appendToolbarItem(this.filterByTypeComboBox);

    toolbar.appendSeparator();
    this.showContentScriptsSetting = Common.Settings.Settings.instance().createSetting('showContentScripts', false);
    this.showContentScriptsSetting.addChangeListener(this.onFilterChanged, this);
    this.contentScriptsCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        this.showContentScriptsSetting, i18nString(UIStrings.includeExtensionContentScripts),
        i18nString(UIStrings.contentScripts));
    this.contentScriptsCheckbox.setEnabled(false);
    toolbar.appendToolbarItem(this.contentScriptsCheckbox);

    this.coverageResultsElement = this.contentElement.createChild('div', 'coverage-results');
    this.landingPage = this.buildLandingPage();
    this.listView = new CoverageListView(this.isVisible.bind(this, false));

    this.statusToolbarElement = this.contentElement.createChild('div', 'coverage-toolbar-summary');
    this.statusMessageElement = this.statusToolbarElement.createChild('div', 'coverage-message');
    this.landingPage.show(this.coverageResultsElement);
  }

  static instance(): CoverageView {
    if (!coverageViewInstance) {
      coverageViewInstance = new CoverageView();
    }
    return coverageViewInstance;
  }

  private buildLandingPage(): UI.Widget.VBox {
    const widget = new UI.Widget.VBox();
    let message;
    if (this.startWithReloadButton) {
      this.inlineReloadButton =
          UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButtonForId('coverage.start-with-reload'));
      message = i18n.i18n.getFormatLocalizedString(
          str_, UIStrings.clickTheReloadButtonSToReloadAnd, {PH1: this.inlineReloadButton});
    } else {
      const recordButton =
          UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction));
      message = i18n.i18n.getFormatLocalizedString(str_, UIStrings.clickTheRecordButtonSToStart, {PH1: recordButton});
    }
    message.classList.add('message');
    widget.contentElement.appendChild(message);
    widget.element.classList.add('landing-page');
    return widget;
  }

  private clear(): void {
    if (this.model) {
      this.model.reset();
    }
    this.reset();
  }

  private reset(): void {
    if (this.decorationManager) {
      this.decorationManager.dispose();
      this.decorationManager = null;
    }
    this.listView.reset();
    this.listView.detach();
    this.landingPage.show(this.coverageResultsElement);
    this.statusMessageElement.textContent = '';
    this.filterInput.setEnabled(false);
    this.filterByTypeComboBox.setEnabled(false);
    this.contentScriptsCheckbox.setEnabled(false);
    this.saveButton.setEnabled(false);
  }

  toggleRecording(): void {
    const enable = !this.toggleRecordAction.toggled();

    if (enable) {
      void this.startRecording({reload: false, jsCoveragePerBlock: this.isBlockCoverageSelected()});
    } else {
      void this.stopRecording();
    }
  }

  isBlockCoverageSelected(): boolean {
    const option = this.coverageTypeComboBox.selectedOption();
    const coverageType = Number(option ? option.value : Number.NaN);
    // Check that Coverage.CoverageType.JavaScriptPerFunction is not present.
    return coverageType === CoverageType.JavaScript;
  }

  private selectCoverageType(jsCoveragePerBlock: boolean): void {
    const selectedIndex = jsCoveragePerBlock ? 1 : 0;
    this.coverageTypeComboBox.setSelectedIndex(selectedIndex);
  }

  private onCoverageTypeComboBoxSelectionChanged(): void {
    this.coverageTypeComboBoxSetting.set(this.coverageTypeComboBox.selectedIndex());
  }

  async ensureRecordingStarted(): Promise<void> {
    const enabled = this.toggleRecordAction.toggled();

    if (enabled) {
      await this.stopRecording();
    }
    await this.startRecording({reload: false, jsCoveragePerBlock: false});
  }

  async startRecording(options: {reload: (boolean|undefined), jsCoveragePerBlock: (boolean|undefined)}|
                       null): Promise<void> {
    let hadFocus, reloadButtonFocused;
    if ((this.startWithReloadButton && this.startWithReloadButton.element.hasFocus()) ||
        (this.inlineReloadButton && this.inlineReloadButton.hasFocus())) {
      reloadButtonFocused = true;
    } else if (this.hasFocus()) {
      hadFocus = true;
    }

    this.reset();
    const mainTarget = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
    if (!mainTarget) {
      return;
    }

    const {reload, jsCoveragePerBlock} = {reload: false, jsCoveragePerBlock: false, ...options};

    if (!this.model || reload) {
      this.model = mainTarget.model(CoverageModel);
    }
    if (!this.model) {
      return;
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStarted);
    if (jsCoveragePerBlock) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageStartedPerBlock);
    }
    const success = await this.model.start(Boolean(jsCoveragePerBlock));
    if (!success) {
      return;
    }
    this.selectCoverageType(Boolean(jsCoveragePerBlock));

    this.model.addEventListener(Events.CoverageUpdated, this.onCoverageDataReceived, this);
    this.resourceTreeModel =
        mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel | null;
    if (this.resourceTreeModel) {
      this.resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this.onMainFrameNavigated, this);
    }
    this.decorationManager = new CoverageDecorationManager(this.model as CoverageModel);
    this.toggleRecordAction.setToggled(true);
    this.clearButton.setEnabled(false);
    if (this.startWithReloadButton) {
      this.startWithReloadButton.setEnabled(false);
      this.startWithReloadButton.setVisible(false);
      this.toggleRecordButton.setEnabled(true);
      this.toggleRecordButton.setVisible(true);
      if (reloadButtonFocused) {
        this.toggleRecordButton.focus();
      }
    }
    this.coverageTypeComboBox.setEnabled(false);
    this.filterInput.setEnabled(true);
    this.filterByTypeComboBox.setEnabled(true);
    this.contentScriptsCheckbox.setEnabled(true);
    if (this.landingPage.isShowing()) {
      this.landingPage.detach();
    }
    this.listView.show(this.coverageResultsElement);
    if (hadFocus && !reloadButtonFocused) {
      this.listView.focus();
    }
    if (reload && this.resourceTreeModel) {
      this.resourceTreeModel.reloadPage();
    } else {
      void this.model.startPolling();
    }
  }

  private onCoverageDataReceived(event: Common.EventTarget.EventTargetEvent<CoverageInfo[]>): void {
    const data = event.data;
    this.updateViews(data);
  }

  async stopRecording(): Promise<void> {
    if (this.resourceTreeModel) {
      this.resourceTreeModel.removeEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this.onMainFrameNavigated, this);
      this.resourceTreeModel = null;
    }
    if (this.hasFocus()) {
      this.listView.focus();
    }
    // Stopping the model triggers one last poll to get the final data.
    if (this.model) {
      await this.model.stop();
      this.model.removeEventListener(Events.CoverageUpdated, this.onCoverageDataReceived, this);
    }
    this.toggleRecordAction.setToggled(false);
    this.coverageTypeComboBox.setEnabled(true);
    if (this.startWithReloadButton) {
      this.startWithReloadButton.setEnabled(true);
      this.startWithReloadButton.setVisible(true);
      this.toggleRecordButton.setEnabled(false);
      this.toggleRecordButton.setVisible(false);
    }
    this.clearButton.setEnabled(true);
  }

  processBacklog(): void {
    this.model && this.model.processJSBacklog();
  }

  private onMainFrameNavigated(): void {
    this.model && this.model.reset();
    this.decorationManager && this.decorationManager.reset();
    this.listView.reset();
    this.model && this.model.startPolling();
  }

  private updateViews(updatedEntries: CoverageInfo[]): void {
    this.updateStats();
    this.listView.update(this.model && this.model.entries() || []);
    this.saveButton.setEnabled(this.model !== null && this.model.entries().length > 0);
    this.decorationManager && this.decorationManager.update(updatedEntries);
  }

  private updateStats(): void {
    const all = {total: 0, unused: 0};
    const filtered = {total: 0, unused: 0};
    let filterApplied = false;
    if (this.model) {
      for (const info of this.model.entries()) {
        all.total += info.size();
        all.unused += info.unusedSize();
        if (this.isVisible(false, info)) {
          filtered.total += info.size();
          filtered.unused += info.unusedSize();
        } else {
          filterApplied = true;
        }
      }
    }
    this.statusMessageElement.textContent = filterApplied ?
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

  private onFilterChanged(): void {
    if (!this.listView) {
      return;
    }
    const text = this.filterInput.value();
    this.textFilterRegExp = text ? Platform.StringUtilities.createPlainTextSearchRegex(text, 'i') : null;
    this.listView.updateFilterAndHighlight(this.textFilterRegExp);
    this.updateStats();
  }

  private onFilterByTypeChanged(): void {
    if (!this.listView) {
      return;
    }

    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CoverageReportFiltered);

    const option = this.filterByTypeComboBox.selectedOption();
    const type = option && option.value;
    this.typeFilterValue = parseInt(type || '', 10) || null;
    this.listView.updateFilterAndHighlight(this.textFilterRegExp);
    this.updateStats();
  }

  private isVisible(ignoreTextFilter: boolean, coverageInfo: URLCoverageInfo): boolean {
    const url = coverageInfo.url();
    if (url.startsWith(CoverageView.EXTENSION_BINDINGS_URL_PREFIX)) {
      return false;
    }
    if (coverageInfo.isContentScript() && !this.showContentScriptsSetting.get()) {
      return false;
    }
    if (this.typeFilterValue && !(coverageInfo.type() & this.typeFilterValue)) {
      return false;
    }

    return ignoreTextFilter || !this.textFilterRegExp || this.textFilterRegExp.test(url);
  }

  private async exportReport(): Promise<void> {
    const fos = new Bindings.FileUtils.FileOutputStream();
    const fileName =
        `Coverage-${Platform.DateUtilities.toISO8601Compact(new Date())}.json` as Platform.DevToolsPath.RawPathString;
    const accepted = await fos.open(fileName);
    if (!accepted) {
      return;
    }
    this.model && this.model.exportReport(fos);
  }

  selectCoverageItemByUrl(url: string): void {
    this.listView.selectByUrl(url);
  }

  static readonly EXTENSION_BINDINGS_URL_PREFIX = 'extensions::';
  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([coverageViewStyles]);
  }
}

let actionDelegateInstance: ActionDelegate;

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const coverageViewId = 'coverage';
    void UI.ViewManager.ViewManager.instance()
        .showView(coverageViewId, /** userGesture= */ false, /** omitFocus= */ true)
        .then(() => {
          const view = UI.ViewManager.ViewManager.instance().view(coverageViewId);
          return view && view.widget();
        })
        .then(widget => this.innerHandleAction(widget as CoverageView, actionId));

    return true;
  }
  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!actionDelegateInstance || forceNew) {
      actionDelegateInstance = new ActionDelegate();
    }
    return actionDelegateInstance;
  }

  private innerHandleAction(coverageView: CoverageView, actionId: string): void {
    switch (actionId) {
      case 'coverage.toggle-recording':
        coverageView.toggleRecording();
        break;
      case 'coverage.start-with-reload':
        void coverageView.startRecording({reload: true, jsCoveragePerBlock: coverageView.isBlockCoverageSelected()});
        break;
      default:
        console.assert(false, `Unknown action: ${actionId}`);
    }
  }
}
