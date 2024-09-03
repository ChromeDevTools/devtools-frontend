// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {
  type AuditProgressChangedEvent,
  Events,
  LighthouseController,
  type PageAuditabilityChangedEvent,
  type PageWarningsChangedEvent,
} from './LighthouseController.js';
import lighthousePanelStyles from './lighthousePanel.css.js';
import {ProtocolService} from './LighthouseProtocolService.js';
import {type ReportJSON, type RunnerResultArtifacts} from './LighthouseReporterTypes.js';
import {LighthouseReportRenderer} from './LighthouseReportRenderer.js';
import {Item, ReportSelector} from './LighthouseReportSelector.js';
import {StartView} from './LighthouseStartView.js';
import {StatusView} from './LighthouseStatusView.js';
import {TimespanView} from './LighthouseTimespanView.js';

const UIStrings = {
  /**
   *@description Text that appears when user drag and drop something (for example, a file) in Lighthouse Panel
   */
  dropLighthouseJsonHere: 'Drop `Lighthouse` JSON here',
  /**
   *@description Tooltip text that appears when hovering over the largeicon add button in the Lighthouse Panel
   */
  performAnAudit: 'Perform an audit…',
  /**
   *@description Text to clear everything
   */
  clearAll: 'Clear all',
  /**
   *@description Tooltip text that appears when hovering over the largeicon settings gear in show settings pane setting in start view of the audits panel
   */
  lighthouseSettings: '`Lighthouse` settings',
  /**
   *@description Status header in the Lighthouse panel
   */
  printing: 'Printing',
  /**
   *@description Status text in the Lighthouse panel
   */
  thePrintPopupWindowIsOpenPlease: 'The print popup window is open. Please close it to continue.',
  /**
   *@description Text in Lighthouse Panel
   */
  cancelling: 'Cancelling',
};
const str_ = i18n.i18n.registerUIStrings('panels/lighthouse/LighthousePanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let lighthousePanelInstace: LighthousePanel;
type Nullable<T> = T|null;

export class LighthousePanel extends UI.Panel.Panel {
  private readonly controller: LighthouseController;
  private readonly startView: StartView;
  private readonly statusView: StatusView;
  private readonly timespanView: TimespanView;
  private warningText: Nullable<string>;
  private unauditableExplanation: Nullable<string>;
  private readonly cachedRenderedReports: Map<ReportJSON, HTMLElement>;
  private readonly dropTarget: UI.DropTarget.DropTarget;
  private readonly auditResultsElement: HTMLElement;
  private clearButton!: UI.Toolbar.ToolbarButton;
  private newButton!: UI.Toolbar.ToolbarButton;
  private reportSelector!: ReportSelector;
  private settingsPane!: UI.Widget.Widget;
  private rightToolbar!: UI.Toolbar.Toolbar;
  private showSettingsPaneSetting!: Common.Settings.Setting<boolean>;

  private constructor(
      controller: LighthouseController,
  ) {
    super('lighthouse');

    this.controller = controller;
    this.startView = new StartView(this.controller, this);
    this.timespanView = new TimespanView(this);
    this.statusView = new StatusView(this);

    this.warningText = null;
    this.unauditableExplanation = null;
    this.cachedRenderedReports = new Map();

    this.dropTarget = new UI.DropTarget.DropTarget(
        this.contentElement, [UI.DropTarget.Type.File], i18nString(UIStrings.dropLighthouseJsonHere),
        this.handleDrop.bind(this));

    this.controller.addEventListener(Events.PageAuditabilityChanged, this.refreshStartAuditUI.bind(this));
    this.controller.addEventListener(Events.PageWarningsChanged, this.refreshWarningsUI.bind(this));
    this.controller.addEventListener(Events.AuditProgressChanged, this.refreshStatusUI.bind(this));

    this.renderToolbar();
    this.auditResultsElement = this.contentElement.createChild('div', 'lighthouse-results-container');
    this.renderStartView();

    this.controller.recomputePageAuditability();
  }

  static instance(opts?: {forceNew: boolean, protocolService: ProtocolService, controller: LighthouseController}):
      LighthousePanel {
    if (!lighthousePanelInstace || opts?.forceNew) {
      const protocolService = opts?.protocolService ?? new ProtocolService();
      const controller = opts?.controller ?? new LighthouseController(protocolService);

      lighthousePanelInstace = new LighthousePanel(controller);
    }

    return lighthousePanelInstace;
  }

  static getEvents(): typeof Events {
    return Events;
  }

  async handleTimespanStart(): Promise<void> {
    try {
      this.timespanView.show(this.contentElement);
      await this.controller.startLighthouse();
      this.timespanView.ready();
    } catch (err) {
      this.handleError(err);
    }
  }

  async handleTimespanEnd(): Promise<void> {
    try {
      this.timespanView.hide();
      this.renderStatusView();
      const {lhr, artifacts} = await this.controller.collectLighthouseResults();
      this.buildReportUI(lhr, artifacts);
    } catch (err) {
      this.handleError(err);
    }
  }

  async handleCompleteRun(): Promise<void> {
    try {
      await this.controller.startLighthouse();
      this.renderStatusView();
      const {lhr, artifacts} = await this.controller.collectLighthouseResults();
      this.buildReportUI(lhr, artifacts);
    } catch (err) {
      this.handleError(err);
    }
  }

  async handleRunCancel(): Promise<void> {
    this.statusView.updateStatus(i18nString(UIStrings.cancelling));
    this.timespanView.hide();
    await this.controller.cancelLighthouse();
    this.renderStartView();
  }

  private handleError(err: unknown): void {
    if (err instanceof Error) {
      this.statusView.renderBugReport(err);
    }
  }

  private refreshWarningsUI(evt: Common.EventTarget.EventTargetEvent<PageWarningsChangedEvent>): void {
    // PageWarningsChanged fires multiple times during an audit, which we want to ignore.
    if (this.controller.getCurrentRun()) {
      return;
    }

    this.warningText = evt.data.warning;
    this.startView.setWarningText(evt.data.warning);
  }

  private refreshStartAuditUI(evt: Common.EventTarget.EventTargetEvent<PageAuditabilityChangedEvent>): void {
    // PageAuditabilityChanged fires multiple times during an audit, which we want to ignore.
    if (this.controller.getCurrentRun()) {
      return;
    }

    this.startView.refresh();

    this.unauditableExplanation = evt.data.helpText;
    this.startView.setUnauditableExplanation(evt.data.helpText);
    this.startView.setStartButtonEnabled(!evt.data.helpText);
  }

  private refreshStatusUI(evt: Common.EventTarget.EventTargetEvent<AuditProgressChangedEvent>): void {
    this.statusView.updateStatus(evt.data.message);
  }

  private refreshToolbarUI(): void {
    this.clearButton.setEnabled(this.reportSelector.hasItems());
  }

  private clearAll(): void {
    this.reportSelector.clearAll();
    this.renderStartView();
    this.refreshToolbarUI();
  }

  private renderToolbar(): void {
    const lighthouseToolbarContainer = this.element.createChild('div', 'lighthouse-toolbar-container');
    lighthouseToolbarContainer.setAttribute('jslog', `${VisualLogging.toolbar()}`);

    const toolbar = new UI.Toolbar.Toolbar('', lighthouseToolbarContainer);

    this.newButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.performAnAudit), 'plus');
    toolbar.appendToolbarItem(this.newButton);
    this.newButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.renderStartView.bind(this));

    toolbar.appendSeparator();

    this.reportSelector = new ReportSelector(() => this.renderStartView());
    toolbar.appendToolbarItem(this.reportSelector.comboBox());

    this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'clear');
    toolbar.appendToolbarItem(this.clearButton);
    this.clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.clearAll.bind(this));

    this.settingsPane = new UI.Widget.HBox();
    this.settingsPane.show(this.contentElement);
    this.settingsPane.element.classList.add('lighthouse-settings-pane');
    this.settingsPane.element.appendChild(this.startView.settingsToolbar().element);
    this.showSettingsPaneSetting = Common.Settings.Settings.instance().createSetting(
        'lighthouse-show-settings-toolbar', false, Common.Settings.SettingStorageType.SYNCED);

    this.rightToolbar = new UI.Toolbar.Toolbar('', lighthouseToolbarContainer);
    this.rightToolbar.appendSeparator();
    this.rightToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingToggle(
        this.showSettingsPaneSetting, 'gear', i18nString(UIStrings.lighthouseSettings), 'gear-filled'));
    this.showSettingsPaneSetting.addChangeListener(this.updateSettingsPaneVisibility.bind(this));
    this.updateSettingsPaneVisibility();

    this.refreshToolbarUI();
  }

  private updateSettingsPaneVisibility(): void {
    this.settingsPane.element.classList.toggle('hidden', !this.showSettingsPaneSetting.get());
  }

  private toggleSettingsDisplay(show: boolean): void {
    this.rightToolbar.element.classList.toggle('hidden', !show);
    this.settingsPane.element.classList.toggle('hidden', !show);
    this.updateSettingsPaneVisibility();
  }

  private renderStartView(): void {
    this.auditResultsElement.removeChildren();
    this.statusView.hide();

    this.reportSelector.selectNewReport();
    this.contentElement.classList.toggle('in-progress', false);

    this.startView.show(this.contentElement);
    this.toggleSettingsDisplay(true);
    this.startView.setUnauditableExplanation(this.unauditableExplanation);
    this.startView.setStartButtonEnabled(!this.unauditableExplanation);
    if (!this.unauditableExplanation) {
      this.startView.focusStartButton();
    }
    this.startView.setWarningText(this.warningText);

    this.newButton.setEnabled(false);
    this.refreshToolbarUI();
    this.setDefaultFocusedChild(this.startView);
  }

  private renderStatusView(): void {
    const inspectedURL = this.controller.getCurrentRun()?.inspectedURL;
    this.contentElement.classList.toggle('in-progress', true);
    this.statusView.setInspectedURL(inspectedURL);
    this.statusView.show(this.contentElement);
  }

  private beforePrint(): void {
    this.statusView.show(this.contentElement);
    this.statusView.toggleCancelButton(false);
    this.statusView.renderText(i18nString(UIStrings.printing), i18nString(UIStrings.thePrintPopupWindowIsOpenPlease));
  }

  private afterPrint(): void {
    this.statusView.hide();
    this.statusView.toggleCancelButton(true);
  }

  private renderReport(lighthouseResult: ReportJSON, artifacts?: RunnerResultArtifacts): void {
    this.toggleSettingsDisplay(false);
    this.contentElement.classList.toggle('in-progress', false);
    this.startView.hideWidget();
    this.statusView.hide();
    this.auditResultsElement.removeChildren();
    this.newButton.setEnabled(true);
    this.refreshToolbarUI();

    const cachedRenderedReport = this.cachedRenderedReports.get(lighthouseResult);
    if (cachedRenderedReport) {
      this.auditResultsElement.appendChild(cachedRenderedReport);
      return;
    }

    const reportContainer = LighthouseReportRenderer.renderLighthouseReport(lighthouseResult, artifacts, {
      beforePrint: this.beforePrint.bind(this),
      afterPrint: this.afterPrint.bind(this),
    });

    this.cachedRenderedReports.set(lighthouseResult, reportContainer);
  }

  private buildReportUI(lighthouseResult: ReportJSON, artifacts?: RunnerResultArtifacts): void {
    if (lighthouseResult === null) {
      return;
    }

    const optionElement = new Item(
        lighthouseResult, () => this.renderReport(lighthouseResult, artifacts), this.renderStartView.bind(this));
    this.reportSelector.prepend(optionElement);
    this.refreshToolbarUI();
    this.renderReport(lighthouseResult);
    this.newButton.element.focus();
  }

  private handleDrop(dataTransfer: DataTransfer): void {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const item = items[0];
    if (item.kind === 'file') {
      const file = items[0].getAsFile();
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => this.loadedFromFile(reader.result as string);
      reader.readAsText(file);
    }
  }

  private loadedFromFile(report: string): void {
    const data = JSON.parse(report);
    if (!data['lighthouseVersion']) {
      return;
    }
    this.buildReportUI(data as ReportJSON);
  }

  override elementsToRestoreScrollPositionsFor(): Element[] {
    const els = super.elementsToRestoreScrollPositionsFor();
    const lhContainerEl = this.auditResultsElement.querySelector('.lh-container');
    if (lhContainerEl) {
      els.push(lhContainerEl);
    }
    return els;
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([lighthousePanelStyles]);
  }
}
