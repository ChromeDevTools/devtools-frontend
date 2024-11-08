// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {CoverageDecorationManager} from './CoverageDecorationManager.js';
import {CoverageListView} from './CoverageListView.js';
import {type CoverageInfo, CoverageModel, CoverageType, Events, type URLCoverageInfo} from './CoverageModel.js';
import coverageViewStyles from './coverageView.css.js';

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
   *@description Text in Coverage View of the Coverage tab
   */
  filterByUrl: 'Filter by URL',
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
   *@description Message in the Coverage View explaining that DevTools could not capture coverage.
   */
  bfcacheNoCapture: 'Could not capture coverage info because the page was served from the back/forward cache.',
  /**
   *@description  Message in the Coverage View explaining that DevTools could not capture coverage.
   */
  activationNoCapture: 'Could not capture coverage info because the page was prerendered in the background.',
  /**
   *@description  Message in the Coverage View prompting the user to reload the page.
   *@example {reload button icon} PH1
   */
  reloadPrompt: 'Click the reload button {PH1} to reload and get coverage.',

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

let coverageViewInstance: CoverageView|undefined;

export class CoverageView extends UI.Widget.VBox {
  private model: CoverageModel|null;
  private decorationManager: CoverageDecorationManager|null;
  private readonly coverageTypeComboBox: UI.Toolbar.ToolbarComboBox;
  private readonly coverageTypeComboBoxSetting: Common.Settings.Setting<number>;
  private toggleRecordAction: UI.ActionRegistration.Action;
  private readonly toggleRecordButton: UI.Toolbar.ToolbarButton;
  private inlineReloadButton: Element|null;
  private readonly startWithReloadButton: UI.Toolbar.ToolbarButton|undefined;
  private readonly clearAction: UI.ActionRegistration.Action;
  private readonly exportAction: UI.ActionRegistration.Action;
  private textFilterRegExp: RegExp|null;
  private readonly filterInput: UI.Toolbar.ToolbarInput;
  private typeFilterValue: number|null;
  private readonly filterByTypeComboBox: UI.Toolbar.ToolbarComboBox;
  private showContentScriptsSetting: Common.Settings.Setting<boolean>;
  private readonly contentScriptsCheckbox: UI.Toolbar.ToolbarSettingCheckbox;
  private readonly coverageResultsElement: HTMLElement;
  private readonly landingPage: UI.Widget.VBox;
  private readonly bfcacheReloadPromptPage: UI.Widget.VBox;
  private readonly activationReloadPromptPage: UI.Widget.VBox;
  private listView: CoverageListView;
  private readonly statusToolbarElement: HTMLElement;
  private statusMessageElement: HTMLElement;

  constructor() {
    super(true);

    this.element.setAttribute('jslog', `${VisualLogging.panel('coverage').track({resize: true})}`);

    this.model = null;
    this.decorationManager = null;

    const toolbarContainer = this.contentElement.createChild('div', 'coverage-toolbar-container');
    toolbarContainer.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    const toolbar = new UI.Toolbar.Toolbar('coverage-toolbar', toolbarContainer);
    toolbar.makeWrappable(true);

    this.coverageTypeComboBox = new UI.Toolbar.ToolbarComboBox(
        this.onCoverageTypeComboBoxSelectionChanged.bind(this), i18nString(UIStrings.chooseCoverageGranularityPer),
        undefined, 'coverage-type');
    const coverageTypes = [
      {
        label: i18nString(UIStrings.perFunction),
        value: CoverageType.JAVA_SCRIPT | CoverageType.JAVA_SCRIPT_PER_FUNCTION,
      },
      {
        label: i18nString(UIStrings.perBlock),
        value: CoverageType.JAVA_SCRIPT,
      },
    ];
    for (const type of coverageTypes) {
      this.coverageTypeComboBox.addOption(this.coverageTypeComboBox.createOption(type.label, `${type.value}`));
    }
    this.coverageTypeComboBoxSetting =
        Common.Settings.Settings.instance().createSetting('coverage-view-coverage-type', 0);
    this.coverageTypeComboBox.setSelectedIndex(this.coverageTypeComboBoxSetting.get());
    this.coverageTypeComboBox.setEnabled(true);
    toolbar.appendToolbarItem(this.coverageTypeComboBox);
    this.toggleRecordAction = UI.ActionRegistry.ActionRegistry.instance().getAction('coverage.toggle-recording');
    this.toggleRecordButton = UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction);
    toolbar.appendToolbarItem(this.toggleRecordButton);

    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const mainTargetSupportsRecordOnReload = mainTarget && mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    this.inlineReloadButton = null;
    if (mainTargetSupportsRecordOnReload) {
      this.startWithReloadButton = UI.Toolbar.Toolbar.createActionButtonForId('coverage.start-with-reload');
      toolbar.appendToolbarItem(this.startWithReloadButton);
      this.toggleRecordButton.setEnabled(false);
      this.toggleRecordButton.setVisible(false);
    }
    this.clearAction = UI.ActionRegistry.ActionRegistry.instance().getAction('coverage.clear');
    this.clearAction.setEnabled(false);
    toolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.clearAction));

    toolbar.appendSeparator();
    this.exportAction = UI.ActionRegistry.ActionRegistry.instance().getAction('coverage.export');
    this.exportAction.setEnabled(false);
    toolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this.exportAction));

    this.textFilterRegExp = null;
    toolbar.appendSeparator();
    this.filterInput = new UI.Toolbar.ToolbarFilter(i18nString(UIStrings.filterByUrl), 0.4, 1);
    this.filterInput.setEnabled(false);
    this.filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.onFilterChanged, this);
    toolbar.appendToolbarItem(this.filterInput);

    toolbar.appendSeparator();

    this.typeFilterValue = null;
    this.filterByTypeComboBox = new UI.Toolbar.ToolbarComboBox(
        this.onFilterByTypeChanged.bind(this), i18nString(UIStrings.filterCoverageByType), undefined,
        'coverage-by-type');
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
        value: CoverageType.JAVA_SCRIPT | CoverageType.JAVA_SCRIPT_PER_FUNCTION,
      },
    ];
    for (const option of options) {
      this.filterByTypeComboBox.addOption(this.filterByTypeComboBox.createOption(option.label, `${option.value}`));
    }

    this.filterByTypeComboBox.setSelectedIndex(0);
    this.filterByTypeComboBox.setEnabled(false);
    toolbar.appendToolbarItem(this.filterByTypeComboBox);

    toolbar.appendSeparator();
    this.showContentScriptsSetting = Common.Settings.Settings.instance().createSetting('show-content-scripts', false);
    this.showContentScriptsSetting.addChangeListener(this.onFilterChanged, this);
    this.contentScriptsCheckbox = new UI.Toolbar.ToolbarSettingCheckbox(
        this.showContentScriptsSetting, i18nString(UIStrings.includeExtensionContentScripts),
        i18nString(UIStrings.contentScripts));
    this.contentScriptsCheckbox.setEnabled(false);
    toolbar.appendToolbarItem(this.contentScriptsCheckbox);

    this.coverageResultsElement = this.contentElement.createChild('div', 'coverage-results');
    this.landingPage = this.buildLandingPage();
    this.bfcacheReloadPromptPage = this.buildReloadPromptPage(i18nString(UIStrings.bfcacheNoCapture), 'bfcache-page');
    this.activationReloadPromptPage =
        this.buildReloadPromptPage(i18nString(UIStrings.activationNoCapture), 'prerender-page');
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

  static removeInstance(): void {
    coverageViewInstance = undefined;
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

  private buildReloadPromptPage(message: Common.UIString.LocalizedString, className: string): UI.Widget.VBox {
    const widget = new UI.Widget.VBox();
    const reasonDiv = document.createElement('div');
    reasonDiv.classList.add('message');
    reasonDiv.textContent = message;
    widget.contentElement.appendChild(reasonDiv);
    this.inlineReloadButton =
        UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButtonForId('inspector-main.reload'));
    const messageElement =
        i18n.i18n.getFormatLocalizedString(str_, UIStrings.reloadPrompt, {PH1: this.inlineReloadButton});
    messageElement.classList.add('message');
    widget.contentElement.appendChild(messageElement);
    widget.element.classList.add(className);
    return widget;
  }

  clear(): void {
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
    this.exportAction.setEnabled(false);
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
    return coverageType === CoverageType.JAVA_SCRIPT;
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
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
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
    this.model.addEventListener(Events.SourceMapResolved, this.updateListView, this);
    const resourceTreeModel =
        mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel | null;
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.onPrimaryPageChanged, this);
    this.decorationManager = new CoverageDecorationManager(
        this.model, Workspace.Workspace.WorkspaceImpl.instance(),
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(),
        Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance());
    this.toggleRecordAction.setToggled(true);
    this.clearAction.setEnabled(false);
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
    if (reload && resourceTreeModel) {
      resourceTreeModel.reloadPage();
    } else {
      void this.model.startPolling();
    }
  }

  private onCoverageDataReceived(event: Common.EventTarget.EventTargetEvent<CoverageInfo[]>): void {
    const data = event.data;
    this.updateViews(data);
  }

  private updateListView(): void {
    this.listView.update(this.model && this.model.entries() || []);
  }

  async stopRecording(): Promise<void> {
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.PrimaryPageChanged,
        this.onPrimaryPageChanged, this);
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
    this.clearAction.setEnabled(true);
  }

  processBacklog(): void {
    this.model && void this.model.processJSBacklog();
  }

  private async onPrimaryPageChanged(
      event: Common.EventTarget.EventTargetEvent<
          {frame: SDK.ResourceTreeModel.ResourceTreeFrame, type: SDK.ResourceTreeModel.PrimaryPageChangeType}>):
      Promise<void> {
    const frame = event.data.frame;
    const coverageModel = frame.resourceTreeModel().target().model(CoverageModel);
    if (!coverageModel) {
      return;
    }
    // If the primary page target has changed (due to MPArch activation), switch to new CoverageModel.
    if (this.model !== coverageModel) {
      if (this.model) {
        await this.model.stop();
        this.model.removeEventListener(Events.CoverageUpdated, this.onCoverageDataReceived, this);
      }
      this.model = coverageModel;
      const success = await this.model.start(this.isBlockCoverageSelected());
      if (!success) {
        return;
      }

      this.model.addEventListener(Events.CoverageUpdated, this.onCoverageDataReceived, this);
      this.decorationManager = new CoverageDecorationManager(
          this.model, Workspace.Workspace.WorkspaceImpl.instance(),
          Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance(),
          Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance());
    }

    if (this.bfcacheReloadPromptPage.isShowing()) {
      this.bfcacheReloadPromptPage.detach();
      this.listView.show(this.coverageResultsElement);
    }
    if (this.activationReloadPromptPage.isShowing()) {
      this.activationReloadPromptPage.detach();
      this.listView.show(this.coverageResultsElement);
    }
    if (frame.backForwardCacheDetails.restoredFromCache) {
      this.listView.detach();
      this.bfcacheReloadPromptPage.show(this.coverageResultsElement);
    }
    if (event.data.type === SDK.ResourceTreeModel.PrimaryPageChangeType.ACTIVATION) {
      this.listView.detach();
      this.activationReloadPromptPage.show(this.coverageResultsElement);
    }

    this.model.reset();
    this.decorationManager && this.decorationManager.reset();
    this.listView.reset();
    void this.model.startPolling();
  }

  private updateViews(updatedEntries: CoverageInfo[]): void {
    this.updateStats();
    this.listView.update(this.model && this.model.entries() || []);
    this.exportAction.setEnabled(this.model !== null && this.model.entries().length > 0);
    this.decorationManager && this.decorationManager.update(updatedEntries);
  }

  private updateStats(): void {
    const all = {total: 0, unused: 0};
    const filtered = {total: 0, unused: 0};
    const filterApplied = this.textFilterRegExp !== null;
    if (this.model) {
      for (const info of this.model.entries()) {
        all.total += info.size();
        all.unused += info.unusedSize();
        if (this.isVisible(false, info)) {
          if (this.textFilterRegExp?.test(info.url())) {
            filtered.total += info.size();
            filtered.unused += info.unusedSize();
          } else {
            // If it doesn't match the filter, calculate the stats from visible children if there are any
            for (const childInfo of info.sourcesURLCoverageInfo.values()) {
              if (this.isVisible(false, childInfo)) {
                filtered.total += childInfo.size();
                filtered.unused += childInfo.unusedSize();
              }
            }
          }
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
        PH1: i18n.ByteUtilities.bytesToString(used),
        PH2: i18n.ByteUtilities.bytesToString(total),
        PH3: percentUsed,
        PH4: i18n.ByteUtilities.bytesToString(unused),
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
    // If it's a parent, check if any children are visible
    if (coverageInfo.sourcesURLCoverageInfo.size > 0) {
      for (const sourceURLCoverageInfo of coverageInfo.sourcesURLCoverageInfo.values()) {
        if (this.isVisible(ignoreTextFilter, sourceURLCoverageInfo)) {
          return true;
        }
      }
    }

    return ignoreTextFilter || !this.textFilterRegExp || this.textFilterRegExp.test(url);
  }

  async exportReport(): Promise<void> {
    const fos = new Bindings.FileUtils.FileOutputStream();
    const fileName =
        `Coverage-${Platform.DateUtilities.toISO8601Compact(new Date())}.json` as Platform.DevToolsPath.RawPathString;
    const accepted = await fos.open(fileName);
    if (!accepted) {
      return;
    }
    this.model && await this.model.exportReport(fos);
  }

  selectCoverageItemByUrl(url: string): void {
    this.listView.selectByUrl(url);
  }

  static readonly EXTENSION_BINDINGS_URL_PREFIX = 'extensions::';

  override wasShown(): void {
    UI.Context.Context.instance().setFlavor(CoverageView, this);
    super.wasShown();
    this.registerCSSFiles([coverageViewStyles]);
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().setFlavor(CoverageView, null);
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
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

  private innerHandleAction(coverageView: CoverageView, actionId: string): void {
    switch (actionId) {
      case 'coverage.toggle-recording':
        coverageView.toggleRecording();
        break;
      case 'coverage.start-with-reload':
        void coverageView.startRecording({reload: true, jsCoveragePerBlock: coverageView.isBlockCoverageSelected()});
        break;
      case 'coverage.clear':
        coverageView.clear();
        break;
      case 'coverage.export':
        void coverageView.exportReport();
        break;
      default:
        console.assert(false, `Unknown action: ${actionId}`);
    }
  }
}
