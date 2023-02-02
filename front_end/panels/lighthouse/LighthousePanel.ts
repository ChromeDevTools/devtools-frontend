// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Emulation from '../emulation/emulation.js';

import {
  Events,
  LighthouseController,
  type AuditProgressChangedEvent,
  type PageAuditabilityChangedEvent,
  type PageWarningsChangedEvent,
} from './LighthouseController.js';
import lighthousePanelStyles from './lighthousePanel.css.js';

import {ProtocolService, type LighthouseRun} from './LighthouseProtocolService.js';

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
  private readonly protocolService: ProtocolService;
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
  private stateBefore?: {
    emulation: {
      type: EmulationModel.DeviceModeModel.Type,
      enabled: boolean,
      outlineEnabled: boolean,
      toolbarControlsEnabled: boolean,
      scale: number,
      device: EmulationModel.EmulatedDevices.EmulatedDevice|null,
      mode: EmulationModel.EmulatedDevices.Mode|null,
    },
    network: {conditions: SDK.NetworkManager.Conditions},
  };
  private isLHAttached?: boolean;
  private currentLighthouseRun?: LighthouseRun;

  private constructor(
      protocolService: ProtocolService,
      controller: LighthouseController,
  ) {
    super('lighthouse');

    this.protocolService = protocolService;
    this.controller = controller;
    this.startView = new StartView(this.controller);
    this.timespanView = new TimespanView(this.controller);
    this.statusView = new StatusView(this.controller);

    this.warningText = null;
    this.unauditableExplanation = null;
    this.cachedRenderedReports = new Map();

    this.dropTarget = new UI.DropTarget.DropTarget(
        this.contentElement, [UI.DropTarget.Type.File], i18nString(UIStrings.dropLighthouseJsonHere),
        this.handleDrop.bind(this));

    this.controller.addEventListener(Events.PageAuditabilityChanged, this.refreshStartAuditUI.bind(this));
    this.controller.addEventListener(Events.PageWarningsChanged, this.refreshWarningsUI.bind(this));
    this.controller.addEventListener(Events.AuditProgressChanged, this.refreshStatusUI.bind(this));
    this.controller.addEventListener(Events.RequestLighthouseTimespanStart, this.onLighthouseTimespanStart.bind(this));
    this.controller.addEventListener(Events.RequestLighthouseTimespanEnd, this.onLighthouseTimespanEnd.bind(this));
    this.controller.addEventListener(Events.RequestLighthouseStart, this.onLighthouseStart.bind(this));
    this.controller.addEventListener(Events.RequestLighthouseCancel, this.onLighthouseCancel.bind(this));

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

      lighthousePanelInstace = new LighthousePanel(protocolService, controller);
    }

    return lighthousePanelInstace;
  }

  static getEvents(): typeof Events {
    return Events;
  }

  private async onLighthouseTimespanStart(): Promise<void> {
    this.timespanView.show(this.contentElement);
    await this.startLighthouse();
    this.timespanView.ready();
  }

  private async onLighthouseTimespanEnd(): Promise<void> {
    this.timespanView.hide();
    await this.collectLighthouseResults();
  }

  private async onLighthouseStart(): Promise<void> {
    await this.startLighthouse();
    await this.collectLighthouseResults();
  }

  private async onLighthouseCancel(): Promise<void> {
    this.timespanView.hide();
    void this.cancelLighthouse();
  }

  private refreshWarningsUI(evt: Common.EventTarget.EventTargetEvent<PageWarningsChangedEvent>): void {
    // PageWarningsChanged fires multiple times during an audit, which we want to ignore.
    if (this.isLHAttached) {
      return;
    }

    this.warningText = evt.data.warning;
    this.startView.setWarningText(evt.data.warning);
  }

  private refreshStartAuditUI(evt: Common.EventTarget.EventTargetEvent<PageAuditabilityChangedEvent>): void {
    // PageAuditabilityChanged fires multiple times during an audit, which we want to ignore.
    if (this.isLHAttached) {
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

    const toolbar = new UI.Toolbar.Toolbar('', lighthouseToolbarContainer);

    this.newButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.performAnAudit), 'largeicon-add');
    toolbar.appendToolbarItem(this.newButton);
    this.newButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.renderStartView.bind(this));

    toolbar.appendSeparator();

    this.reportSelector = new ReportSelector(() => this.renderStartView());
    toolbar.appendToolbarItem(this.reportSelector.comboBox());

    this.clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'largeicon-clear');
    toolbar.appendToolbarItem(this.clearButton);
    this.clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this.clearAll.bind(this));

    this.settingsPane = new UI.Widget.HBox();
    this.settingsPane.show(this.contentElement);
    this.settingsPane.element.classList.add('lighthouse-settings-pane');
    this.settingsPane.element.appendChild(this.startView.settingsToolbar().element);
    this.showSettingsPaneSetting = Common.Settings.Settings.instance().createSetting(
        'lighthouseShowSettingsToolbar', false, Common.Settings.SettingStorageType.Synced);

    this.rightToolbar = new UI.Toolbar.Toolbar('', lighthouseToolbarContainer);
    this.rightToolbar.appendSeparator();
    this.rightToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingToggle(
        this.showSettingsPaneSetting, 'largeicon-settings-gear', i18nString(UIStrings.lighthouseSettings)));
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

  private renderStatusView(inspectedURL: string): void {
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
      reader.onload = (): void => this.loadedFromFile(reader.result as string);
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

  private recordMetrics(flags: {mode: string, legacyNavigation: boolean}): void {
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.LighthouseStarted);

    switch (flags.mode) {
      case 'navigation':
        if (flags.legacyNavigation) {
          Host.userMetrics.lighthouseModeRun(Host.UserMetrics.LighthouseModeRun.LegacyNavigation);
        } else {
          Host.userMetrics.lighthouseModeRun(Host.UserMetrics.LighthouseModeRun.Navigation);
        }
        break;
      case 'timespan':
        Host.userMetrics.lighthouseModeRun(Host.UserMetrics.LighthouseModeRun.Timespan);
        break;
      case 'snapshot':
        Host.userMetrics.lighthouseModeRun(Host.UserMetrics.LighthouseModeRun.Snapshot);
        break;
    }
  }

  private async startLighthouse(): Promise<void> {
    try {
      const inspectedURL = await this.controller.getInspectedURL({force: true});
      const categoryIDs = this.controller.getCategoryIDs();
      const flags = this.controller.getFlags();

      this.recordMetrics(flags);

      this.currentLighthouseRun = {inspectedURL, categoryIDs, flags};

      await this.setupEmulationAndProtocolConnection();

      if (flags.mode === 'timespan') {
        await this.protocolService.startTimespan(this.currentLighthouseRun);
      }

    } catch (err) {
      await this.restoreEmulationAndProtocolConnection();
      if (err instanceof Error) {
        this.statusView.renderBugReport(err);
      }
    }
  }

  private async collectLighthouseResults(): Promise<void> {
    try {
      if (!this.currentLighthouseRun) {
        throw new Error('Lighthouse is not started');
      }
      this.renderStatusView(this.currentLighthouseRun.inspectedURL);

      const lighthouseResponse = await this.protocolService.collectLighthouseResults(this.currentLighthouseRun);

      if (lighthouseResponse && lighthouseResponse.fatal) {
        const error = new Error(lighthouseResponse.message);
        error.stack = lighthouseResponse.stack;
        throw error;
      }

      if (!lighthouseResponse) {
        throw new Error('Auditing failed to produce a result');
      }

      Host.userMetrics.actionTaken(Host.UserMetrics.Action.LighthouseFinished);

      await this.restoreEmulationAndProtocolConnection();
      this.buildReportUI(lighthouseResponse.lhr, lighthouseResponse.artifacts);
      // Give focus to the new audit button when completed
      this.newButton.element.focus();
    } catch (err) {
      await this.restoreEmulationAndProtocolConnection();
      if (err instanceof Error) {
        this.statusView.renderBugReport(err);
      }
    } finally {
      this.currentLighthouseRun = undefined;
    }
  }

  private async cancelLighthouse(): Promise<void> {
    this.currentLighthouseRun = undefined;
    this.statusView.updateStatus(i18nString(UIStrings.cancelling));
    await this.restoreEmulationAndProtocolConnection();
    this.renderStartView();
  }

  /**
   * We set the device emulation on the DevTools-side for two reasons:
   * 1. To workaround some odd device metrics emulation bugs like occuluding viewports
   * 2. To get the attractive device outline
   */
  private async setupEmulationAndProtocolConnection(): Promise<void> {
    const flags = this.controller.getFlags();

    const emulationModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    this.stateBefore = {
      emulation: {
        type: emulationModel.type(),
        enabled: emulationModel.enabledSetting().get(),
        outlineEnabled: emulationModel.deviceOutlineSetting().get(),
        toolbarControlsEnabled: emulationModel.toolbarControlsEnabledSetting().get(),
        scale: emulationModel.scaleSetting().get(),
        device: emulationModel.device(),
        mode: emulationModel.mode(),
      },
      network: {conditions: SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions()},
    };

    emulationModel.toolbarControlsEnabledSetting().set(false);
    if ('formFactor' in flags && flags.formFactor === 'desktop') {
      emulationModel.enabledSetting().set(false);
      emulationModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
    } else if (flags.formFactor === 'mobile') {
      emulationModel.enabledSetting().set(true);
      emulationModel.deviceOutlineSetting().set(true);

      for (const device of EmulationModel.EmulatedDevices.EmulatedDevicesList.instance().standard()) {
        if (device.title === 'Moto G Power') {
          emulationModel.emulate(EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0], 1);
        }
      }
    }

    await this.protocolService.attach();
    this.isLHAttached = true;
  }

  private async restoreEmulationAndProtocolConnection(): Promise<void> {
    if (!this.isLHAttached) {
      return;
    }

    this.isLHAttached = false;
    await this.protocolService.detach();

    if (this.stateBefore) {
      const emulationModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance();

      // Detaching a session after overriding device metrics will prevent other sessions from overriding device metrics in the future.
      // A workaround is to call "Emulation.clearDeviceMetricOverride" which is the result of the next line.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=1337089
      emulationModel.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);

      const {type, enabled, outlineEnabled, toolbarControlsEnabled, scale, device, mode} = this.stateBefore.emulation;
      emulationModel.enabledSetting().set(enabled);
      emulationModel.deviceOutlineSetting().set(outlineEnabled);
      emulationModel.toolbarControlsEnabledSetting().set(toolbarControlsEnabled);

      // `emulate` will ignore the `scale` parameter for responsive emulation.
      // In this case we can just set it here.
      if (type === EmulationModel.DeviceModeModel.Type.Responsive) {
        emulationModel.scaleSetting().set(scale);
      }

      emulationModel.emulate(type, device, mode, scale);

      SDK.NetworkManager.MultitargetNetworkManager.instance().setNetworkConditions(this.stateBefore.network.conditions);
      delete this.stateBefore;
    }

    Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance().update(true);

    const mainTarget = SDK.TargetManager.TargetManager.instance().mainFrameTarget();
    if (!mainTarget) {
      return;
    }
    const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return;
    }

    // Reload to reset page state after a navigation.
    // We want to retain page state for timespan and snapshot modes.
    const mode = this.currentLighthouseRun?.flags.mode;
    if (mode === 'navigation') {
      const inspectedURL = await this.controller.getInspectedURL();
      await resourceTreeModel.navigate(inspectedURL);
    }
  }

  wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([lighthousePanelStyles]);
  }
}
