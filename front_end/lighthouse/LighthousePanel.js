// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Emulation from '../emulation/emulation.js';  // eslint-disable-line no-unused-vars
import * as HostModule from '../host/host.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {Events, LighthouseController} from './LighthouseController.js';
import {ProtocolService} from './LighthouseProtocolService.js';
import {LighthouseReportRenderer, LighthouseReportUIFeatures} from './LighthouseReportRenderer.js';
import {Item, ReportSelector} from './LighthouseReportSelector.js';
import {StartView} from './LighthouseStartView.js';
import {StatusView} from './LighthouseStatusView.js';

/**
 * @unrestricted
 */
export class LighthousePanel extends UI.Panel.Panel {
  constructor() {
    super('lighthouse');
    this.registerRequiredCSS('third_party/lighthouse/report-assets/report.css');
    this.registerRequiredCSS('lighthouse/lighthousePanel.css');

    this._protocolService = new ProtocolService();
    this._controller = new LighthouseController(this._protocolService);
    this._startView = new StartView(this._controller);
    this._statusView = new StatusView(this._controller);

    this._unauditableExplanation = null;
    this._cachedRenderedReports = new Map();

    this._dropTarget = new UI.DropTarget.DropTarget(
        this.contentElement, [UI.DropTarget.Type.File], Common.UIString.UIString('Drop Lighthouse JSON here'),
        this._handleDrop.bind(this));

    this._controller.addEventListener(Events.PageAuditabilityChanged, this._refreshStartAuditUI.bind(this));
    this._controller.addEventListener(Events.AuditProgressChanged, this._refreshStatusUI.bind(this));
    this._controller.addEventListener(Events.RequestLighthouseStart, event => {
      this._startLighthouse(event);
    });
    this._controller.addEventListener(Events.RequestLighthouseCancel, event => {
      this._cancelLighthouse();
    });

    this._renderToolbar();
    this._auditResultsElement = this.contentElement.createChild('div', 'lighthouse-results-container');
    this._renderStartView();

    this._controller.recomputePageAuditability();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} evt
   */
  _refreshStartAuditUI(evt) {
    // PageAuditabilityChanged fires multiple times during an audit, which we want to ignore.
    if (this._isLHAttached) {
      return;
    }

    this._unauditableExplanation = evt.data.helpText;
    this._startView.setUnauditableExplanation(evt.data.helpText);
    this._startView.setStartButtonEnabled(!evt.data.helpText);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} evt
   */
  _refreshStatusUI(evt) {
    this._statusView.updateStatus(evt.data.message);
  }

  _refreshToolbarUI() {
    this._clearButton.setEnabled(this._reportSelector.hasItems());
  }

  _clearAll() {
    this._reportSelector.clearAll();
    this._renderStartView();
    this._refreshToolbarUI();
  }

  _renderToolbar() {
    const lighthouseToolbarContainer = this.element.createChild('div', 'lighthouse-toolbar-container');

    const toolbar = new UI.Toolbar.Toolbar('', lighthouseToolbarContainer);

    this._newButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Perform an audit…'), 'largeicon-add');
    toolbar.appendToolbarItem(this._newButton);
    this._newButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._renderStartView.bind(this));

    toolbar.appendSeparator();

    this._reportSelector = new ReportSelector(() => this._renderStartView());
    toolbar.appendToolbarItem(this._reportSelector.comboBox());

    this._clearButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Clear all'), 'largeicon-clear');
    toolbar.appendToolbarItem(this._clearButton);
    this._clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._clearAll.bind(this));

    this._settingsPane = new UI.Widget.HBox();
    this._settingsPane.show(this.contentElement);
    this._settingsPane.element.classList.add('lighthouse-settings-pane');
    this._settingsPane.element.appendChild(this._startView.settingsToolbar().element);
    this._showSettingsPaneSetting =
        Common.Settings.Settings.instance().createSetting('lighthouseShowSettingsToolbar', false);

    this._rightToolbar = new UI.Toolbar.Toolbar('', lighthouseToolbarContainer);
    this._rightToolbar.appendSeparator();
    this._rightToolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingToggle(
        this._showSettingsPaneSetting, 'largeicon-settings-gear', ls`Lighthouse settings`));
    this._showSettingsPaneSetting.addChangeListener(this._updateSettingsPaneVisibility.bind(this));
    this._updateSettingsPaneVisibility();

    this._refreshToolbarUI();
  }

  _updateSettingsPaneVisibility() {
    this._settingsPane.element.classList.toggle('hidden', !this._showSettingsPaneSetting.get());
  }

  /**
   * @param {boolean} show
   */
  _toggleSettingsDisplay(show) {
    this._rightToolbar.element.classList.toggle('hidden', !show);
    this._settingsPane.element.classList.toggle('hidden', !show);
    this._updateSettingsPaneVisibility();
  }

  _renderStartView() {
    this._auditResultsElement.removeChildren();
    this._statusView.hide();

    this._reportSelector.selectNewReport();
    this.contentElement.classList.toggle('in-progress', false);

    this._startView.show(this.contentElement);
    this._toggleSettingsDisplay(true);
    this._startView.setUnauditableExplanation(this._unauditableExplanation);
    this._startView.setStartButtonEnabled(!this._unauditableExplanation);
    if (!this._unauditableExplanation) {
      this._startView.focusStartButton();
    }

    this._newButton.setEnabled(false);
    this._refreshToolbarUI();
    this.setDefaultFocusedChild(this._startView);
  }

  /**
   * @param {string} inspectedURL
   */
  _renderStatusView(inspectedURL) {
    this.contentElement.classList.toggle('in-progress', true);
    this._statusView.setInspectedURL(inspectedURL);
    this._statusView.show(this.contentElement);
  }

  _beforePrint() {
    this._statusView.show(this.contentElement);
    this._statusView.toggleCancelButton(false);
    this._statusView.renderText(ls`Printing`, ls`The print popup window is open. Please close it to continue.`);
  }

  _afterPrint() {
    this._statusView.hide();
    this._statusView.toggleCancelButton(true);
  }

  /**
   * @param {!ReportRenderer.ReportJSON} lighthouseResult
   * @param {!ReportRenderer.RunnerResultArtifacts=} artifacts
   */
  _renderReport(lighthouseResult, artifacts) {
    this._toggleSettingsDisplay(false);
    this.contentElement.classList.toggle('in-progress', false);
    this._startView.hideWidget();
    this._statusView.hide();
    this._auditResultsElement.removeChildren();
    this._newButton.setEnabled(true);
    this._refreshToolbarUI();

    const cachedRenderedReport = this._cachedRenderedReports.get(lighthouseResult);
    if (cachedRenderedReport) {
      this._auditResultsElement.appendChild(cachedRenderedReport);
      return;
    }

    const reportContainer = this._auditResultsElement.createChild('div', 'lh-vars lh-root lh-devtools');

    const dom = new DOM(/** @type {!Document} */ (this._auditResultsElement.ownerDocument));
    const renderer = new LighthouseReportRenderer(dom);

    const templatesHTML = self.Runtime.cachedResources['third_party/lighthouse/report-assets/templates.html'];
    const templatesDOM = new DOMParser().parseFromString(templatesHTML, 'text/html');
    if (!templatesDOM) {
      return;
    }

    renderer.setTemplateContext(templatesDOM);
    const el = renderer.renderReport(lighthouseResult, reportContainer);
    LighthouseReportRenderer.addViewTraceButton(el, artifacts);
    // Linkifying requires the target be loaded. Do not block the report
    // from rendering, as this is just an embellishment and the main target
    // could take awhile to load.
    this._waitForMainTargetLoad().then(() => {
      LighthouseReportRenderer.linkifyNodeDetails(el);
      LighthouseReportRenderer.linkifySourceLocationDetails(el);
    });
    LighthouseReportRenderer.handleDarkMode(el);

    const features = new LighthouseReportUIFeatures(dom);
    features.setBeforePrint(this._beforePrint.bind(this));
    features.setAfterPrint(this._afterPrint.bind(this));
    features.setTemplateContext(templatesDOM);
    features.initFeatures(lighthouseResult);

    this._cachedRenderedReports.set(lighthouseResult, reportContainer);
  }

  _waitForMainTargetLoad() {
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    const resourceTreeModel = mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    return resourceTreeModel.once(SDK.ResourceTreeModel.Events.Load);
  }

  /**
   * @param {!ReportRenderer.ReportJSON} lighthouseResult
   * @param {!ReportRenderer.RunnerResultArtifacts=} artifacts
   */
  _buildReportUI(lighthouseResult, artifacts) {
    if (lighthouseResult === null) {
      return;
    }

    const optionElement = new Item(
        lighthouseResult, () => this._renderReport(lighthouseResult, artifacts), this._renderStartView.bind(this));
    this._reportSelector.prepend(optionElement);
    this._refreshToolbarUI();
    this._renderReport(lighthouseResult);
  }

  /**
   * @param {!DataTransfer} dataTransfer
   */
  _handleDrop(dataTransfer) {
    const items = dataTransfer.items;
    if (!items.length) {
      return;
    }
    const item = items[0];
    if (item.kind === 'file') {
      const entry = items[0].webkitGetAsEntry();
      if (!entry.isFile) {
        return;
      }
      entry.file(file => {
        const reader = new FileReader();
        reader.onload = () => this._loadedFromFile(/** @type {string} */ (reader.result));
        reader.readAsText(file);
      });
    }
  }

  /**
   * @param {string} report
   */
  _loadedFromFile(report) {
    const data = JSON.parse(report);
    if (!data['lighthouseVersion']) {
      return;
    }
    this._buildReportUI(/** @type {!ReportRenderer.ReportJSON} */ (data));
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _startLighthouse(event) {
    HostModule.userMetrics.actionTaken(Host.UserMetrics.Action.LighthouseStarted);

    try {
      const inspectedURL = await this._controller.getInspectedURL({force: true});
      const categoryIDs = this._controller.getCategoryIDs();
      const flags = this._controller.getFlags();

      await this._setupEmulationAndProtocolConnection();

      this._renderStatusView(inspectedURL);

      const lighthouseResponse = await this._protocolService.startLighthouse(inspectedURL, categoryIDs, flags);

      if (lighthouseResponse && lighthouseResponse.fatal) {
        const error = new Error(lighthouseResponse.message);
        error.stack = lighthouseResponse.stack;
        throw error;
      }

      if (!lighthouseResponse) {
        throw new Error('Auditing failed to produce a result');
      }

      HostModule.userMetrics.actionTaken(Host.UserMetrics.Action.LighthouseFinished);

      await this._resetEmulationAndProtocolConnection();
      this._buildReportUI(lighthouseResponse.lhr, lighthouseResponse.artifacts);
      // Give focus to the new audit button when completed
      this._newButton.element.focus();
      const keyboardInitiated = /** @type {boolean} */ (event.data);
      if (keyboardInitiated) {
        UI.UIUtils.markAsFocusedByKeyboard(this._newButton.element);
      }
    } catch (err) {
      await this._resetEmulationAndProtocolConnection();
      if (err instanceof Error) {
        this._statusView.renderBugReport(err);
      }
    }
  }

  async _cancelLighthouse() {
    this._statusView.updateStatus(ls`Cancelling`);
    await this._resetEmulationAndProtocolConnection();
    this._renderStartView();
  }

  /**
   * We set the device emulation on the DevTools-side for two reasons:
   * 1. To workaround some odd device metrics emulation bugs like occuluding viewports
   * 2. To get the attractive device outline
   *
   * We also set flags.internalDisableDeviceScreenEmulation = true to let LH only apply UA emulation
   */
  async _setupEmulationAndProtocolConnection() {
    const flags = this._controller.getFlags();

    const emulationModel = self.singleton(Emulation.DeviceModeModel.DeviceModeModel);
    this._stateBefore = {
      emulation: {
        enabled: emulationModel.enabledSetting().get(),
        outlineEnabled: emulationModel.deviceOutlineSetting().get(),
        toolbarControlsEnabled: emulationModel.toolbarControlsEnabledSetting().get()
      },
      network: {conditions: self.SDK.multitargetNetworkManager.networkConditions()}
    };

    emulationModel.toolbarControlsEnabledSetting().set(false);
    if (flags.emulatedFormFactor === 'desktop') {
      emulationModel.enabledSetting().set(false);
      emulationModel.emulate(Emulation.DeviceModeModel.Type.None, null, null);
    } else if (flags.emulatedFormFactor === 'mobile') {
      emulationModel.enabledSetting().set(true);
      emulationModel.deviceOutlineSetting().set(true);

      for (const device of Emulation.EmulatedDevices.EmulatedDevicesList.instance().standard()) {
        if (device.title === 'Nexus 5X') {
          emulationModel.emulate(Emulation.DeviceModeModel.Type.Device, device, device.modes[0], 1);
        }
      }
    }

    await this._protocolService.attach();
    this._isLHAttached = true;
  }

  async _resetEmulationAndProtocolConnection() {
    if (!this._isLHAttached) {
      return;
    }

    this._isLHAttached = false;
    await this._protocolService.detach();

    if (this._stateBefore) {
      const emulationModel = self.singleton(Emulation.DeviceModeModel.DeviceModeModel);
      emulationModel.enabledSetting().set(this._stateBefore.emulation.enabled);
      emulationModel.deviceOutlineSetting().set(this._stateBefore.emulation.outlineEnabled);
      emulationModel.toolbarControlsEnabledSetting().set(this._stateBefore.emulation.toolbarControlsEnabled);
      self.SDK.multitargetNetworkManager.setNetworkConditions(this._stateBefore.network.conditions);
      delete this._stateBefore;
    }

    Emulation.InspectedPagePlaceholder.instance().update(true);

    const resourceTreeModel =
        SDK.SDKModel.TargetManager.instance().mainTarget().model(SDK.ResourceTreeModel.ResourceTreeModel);
    // reload to reset the page state
    const inspectedURL = await this._controller.getInspectedURL();
    await resourceTreeModel.navigate(inspectedURL);
  }
}
