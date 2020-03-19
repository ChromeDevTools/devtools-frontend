/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 * Copyright (C) 2012 Intel Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Extensions from '../extensions/extensions.js';
import * as Host from '../host/host.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as PerfUI from '../perf_ui/perf_ui.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as SDK from '../sdk/sdk.js';
import * as TimelineModel from '../timeline_model/timeline_model.js';
import * as UI from '../ui/ui.js';

import {Events, PerformanceModel, Window} from './PerformanceModel.js';  // eslint-disable-line no-unused-vars
import {Client, TimelineController} from './TimelineController.js';      // eslint-disable-line no-unused-vars
import {TimelineEventOverview, TimelineEventOverviewCoverage, TimelineEventOverviewCPUActivity, TimelineEventOverviewFrames, TimelineEventOverviewInput, TimelineEventOverviewMemory, TimelineEventOverviewNetwork, TimelineEventOverviewResponsiveness, TimelineFilmStripOverview,} from './TimelineEventOverview.js';  // eslint-disable-line no-unused-vars
import {TimelineFlameChartView} from './TimelineFlameChartView.js';
import {TimelineHistoryManager} from './TimelineHistoryManager.js';
import {TimelineLoader} from './TimelineLoader.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';
import {UIDevtoolsController} from './UIDevtoolsController.js';
import {UIDevtoolsUtils} from './UIDevtoolsUtils.js';

/**
 * @implements {Client}
 * @implements {TimelineModeViewDelegate}
 * @unrestricted
 */
export class TimelinePanel extends UI.Panel.Panel {
  constructor() {
    super('timeline');
    this.registerRequiredCSS('timeline/timelinePanel.css');
    this.element.addEventListener('contextmenu', this._contextMenu.bind(this), false);
    this._dropTarget = new UI.DropTarget.DropTarget(
        this.element, [UI.DropTarget.Type.File, UI.DropTarget.Type.URI],
        Common.UIString.UIString('Drop timeline file or URL here'), this._handleDrop.bind(this));

    /** @type {!Array<!UI.Toolbar.ToolbarItem>} */
    this._recordingOptionUIControls = [];
    this._state = State.Idle;
    this._recordingPageReload = false;
    this._millisecondsToRecordAfterLoadEvent = 3000;
    this._toggleRecordAction =
        /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action('timeline.toggle-recording'));
    this._recordReloadAction =
        /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action('timeline.record-reload'));

    this._historyManager = new TimelineHistoryManager();

    /** @type {?PerformanceModel} */
    this._performanceModel = null;

    this._viewModeSetting = Common.Settings.Settings.instance().createSetting('timelineViewMode', ViewMode.FlameChart);

    this._disableCaptureJSProfileSetting =
        Common.Settings.Settings.instance().createSetting('timelineDisableJSSampling', false);
    this._disableCaptureJSProfileSetting.setTitle(Common.UIString.UIString('Disable JavaScript samples'));
    this._captureLayersAndPicturesSetting =
        Common.Settings.Settings.instance().createSetting('timelineCaptureLayersAndPictures', false);
    this._captureLayersAndPicturesSetting.setTitle(
        Common.UIString.UIString('Enable advanced paint instrumentation (slow)'));

    this._showScreenshotsSetting = Common.Settings.Settings.instance().createSetting('timelineShowScreenshots', true);
    this._showScreenshotsSetting.setTitle(Common.UIString.UIString('Screenshots'));
    this._showScreenshotsSetting.addChangeListener(this._updateOverviewControls, this);

    this._startCoverage = Common.Settings.Settings.instance().createSetting('timelineStartCoverage', false);
    this._startCoverage.setTitle(ls`Coverage`);

    if (!Root.Runtime.experiments.isEnabled('recordCoverageWithPerformanceTracing')) {
      this._startCoverage.set(false);
    }

    this._showMemorySetting = Common.Settings.Settings.instance().createSetting('timelineShowMemory', false);
    this._showMemorySetting.setTitle(Common.UIString.UIString('Memory'));
    this._showMemorySetting.addChangeListener(this._onModeChanged, this);

    const timelineToolbarContainer = this.element.createChild('div', 'timeline-toolbar-container');
    this._panelToolbar = new UI.Toolbar.Toolbar('timeline-main-toolbar', timelineToolbarContainer);
    this._panelRightToolbar = new UI.Toolbar.Toolbar('', timelineToolbarContainer);
    this._createSettingsPane();
    this._updateShowSettingsToolbarButton();

    this._timelinePane = new UI.Widget.VBox();
    this._timelinePane.show(this.element);
    const topPaneElement = this._timelinePane.element.createChild('div', 'hbox');
    topPaneElement.id = 'timeline-overview-panel';

    // Create top overview component.
    this._overviewPane = new PerfUI.TimelineOverviewPane.TimelineOverviewPane('timeline');
    this._overviewPane.addEventListener(
        PerfUI.TimelineOverviewPane.Events.WindowChanged, this._onOverviewWindowChanged.bind(this));
    this._overviewPane.show(topPaneElement);
    /** @type {!Array<!TimelineEventOverview>} */
    this._overviewControls = [];

    this._statusPaneContainer = this._timelinePane.element.createChild('div', 'status-pane-container fill');

    this._createFileSelector();

    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this._loadEventFired, this);

    this._flameChart = new TimelineFlameChartView(this);
    this._searchableView = new UI.SearchableView.SearchableView(this._flameChart);
    this._searchableView.setMinimumSize(0, 100);
    this._searchableView.element.classList.add('searchable-view');
    this._searchableView.show(this._timelinePane.element);
    this._flameChart.show(this._searchableView.element);
    this._flameChart.setSearchableView(this._searchableView);
    this._searchableView.hideWidget();

    this._onModeChanged();
    this._populateToolbar();
    this._showLandingPage();
    this._updateTimelineControls();

    self.Extensions.extensionServer.addEventListener(
        Extensions.ExtensionServer.Events.TraceProviderAdded, this._appendExtensionsToToolbar, this);
    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.SuspendStateChanged, this._onSuspendStateChanged, this);
  }

  /**
   * @return {!TimelinePanel}
   */
  static instance() {
    return /** @type {!TimelinePanel} */ (self.runtime.sharedInstance(TimelinePanel));
  }

  /**
   * @override
   * @return {?UI.SearchableView.SearchableView}
   */
  searchableView() {
    return this._searchableView;
  }

  /**
   * @override
   */
  wasShown() {
    self.UI.context.setFlavor(TimelinePanel, this);
    // Record the performance tool load time.
    Host.userMetrics.panelLoaded('timeline', 'DevTools.Launch.Timeline');
  }

  /**
   * @override
   */
  willHide() {
    self.UI.context.setFlavor(TimelinePanel, null);
    this._historyManager.cancelIfShowing();
  }

  /**
   * @param {!Array.<!SDK.TracingManager.EventPayload>} events
   */
  loadFromEvents(events) {
    if (this._state !== State.Idle) {
      return;
    }
    this._prepareToLoadTimeline();
    this._loader = TimelineLoader.loadFromEvents(events, this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onOverviewWindowChanged(event) {
    const left = event.data.startTime;
    const right = event.data.endTime;
    this._performanceModel.setWindow({left, right}, /* animate */ true);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onModelWindowChanged(event) {
    const window = /** @type {!Window} */ (event.data.window);
    this._overviewPane.setWindowTimes(window.left, window.right);
  }

  /**
   * @param {!State} state
   */
  _setState(state) {
    this._state = state;
    this._updateTimelineControls();
  }

  /**
   * @param {!Common.Settings.Setting} setting
   * @param {string} tooltip
   * @return {!UI.Toolbar.ToolbarItem}
   */
  _createSettingCheckbox(setting, tooltip) {
    const checkboxItem = new UI.Toolbar.ToolbarSettingCheckbox(setting, tooltip);
    this._recordingOptionUIControls.push(checkboxItem);
    return checkboxItem;
  }

  _populateToolbar() {
    // Record
    this._panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction));
    this._panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButton(this._recordReloadAction));
    this._clearButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Clear'), 'largeicon-clear');
    this._clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => this._onClearButton());
    this._panelToolbar.appendToolbarItem(this._clearButton);

    // Load / Save
    this._loadButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Load profile…'), 'largeicon-load');
    this._loadButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => this._selectFileToLoad());
    this._saveButton =
        new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Save profile…'), 'largeicon-download');
    this._saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._saveToFile();
    });
    this._panelToolbar.appendSeparator();
    this._panelToolbar.appendToolbarItem(this._loadButton);
    this._panelToolbar.appendToolbarItem(this._saveButton);

    // History
    this._panelToolbar.appendSeparator();
    this._panelToolbar.appendToolbarItem(this._historyManager.button());
    this._panelToolbar.appendSeparator();

    // View
    this._panelToolbar.appendSeparator();
    this._showScreenshotsToolbarCheckbox =
        this._createSettingCheckbox(this._showScreenshotsSetting, Common.UIString.UIString('Capture screenshots'));
    this._panelToolbar.appendToolbarItem(this._showScreenshotsToolbarCheckbox);

    this._showMemoryToolbarCheckbox =
        this._createSettingCheckbox(this._showMemorySetting, Common.UIString.UIString('Show memory timeline'));
    this._panelToolbar.appendToolbarItem(this._showMemoryToolbarCheckbox);

    if (Root.Runtime.experiments.isEnabled('recordCoverageWithPerformanceTracing')) {
      this._startCoverageCheckbox =
          this._createSettingCheckbox(this._startCoverage, ls`Record coverage with performance trace`);
      this._panelToolbar.appendToolbarItem(this._startCoverageCheckbox);
    }

    // GC
    this._panelToolbar.appendToolbarItem(UI.Toolbar.Toolbar.createActionButtonForId('components.collect-garbage'));

    // Settings
    this._panelRightToolbar.appendSeparator();
    this._panelRightToolbar.appendToolbarItem(this._showSettingsPaneButton);
  }

  _createSettingsPane() {
    this._showSettingsPaneSetting =
        Common.Settings.Settings.instance().createSetting('timelineShowSettingsToolbar', false);
    this._showSettingsPaneButton = new UI.Toolbar.ToolbarSettingToggle(
        this._showSettingsPaneSetting, 'largeicon-settings-gear', Common.UIString.UIString('Capture settings'));
    self.SDK.multitargetNetworkManager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, this._updateShowSettingsToolbarButton,
        this);
    MobileThrottling.ThrottlingManager.throttlingManager().addEventListener(
        MobileThrottling.ThrottlingManager.Events.RateChanged, this._updateShowSettingsToolbarButton, this);
    this._disableCaptureJSProfileSetting.addChangeListener(this._updateShowSettingsToolbarButton, this);
    this._captureLayersAndPicturesSetting.addChangeListener(this._updateShowSettingsToolbarButton, this);

    this._settingsPane = new UI.Widget.HBox();
    this._settingsPane.element.classList.add('timeline-settings-pane');
    this._settingsPane.show(this.element);

    const captureToolbar = new UI.Toolbar.Toolbar('', this._settingsPane.element);
    captureToolbar.element.classList.add('flex-auto');
    captureToolbar.makeVertical();
    captureToolbar.appendToolbarItem(this._createSettingCheckbox(
        this._disableCaptureJSProfileSetting,
        Common.UIString.UIString(
            'Disables JavaScript sampling, reduces overhead when running against mobile devices')));
    captureToolbar.appendToolbarItem(this._createSettingCheckbox(
        this._captureLayersAndPicturesSetting,
        Common.UIString.UIString(
            'Captures advanced paint instrumentation, introduces significant performance overhead')));

    const throttlingPane = new UI.Widget.VBox();
    throttlingPane.element.classList.add('flex-auto');
    throttlingPane.show(this._settingsPane.element);

    const networkThrottlingToolbar = new UI.Toolbar.Toolbar('', throttlingPane.element);
    networkThrottlingToolbar.appendText(Common.UIString.UIString('Network:'));
    this._networkThrottlingSelect = this._createNetworkConditionsSelect();
    networkThrottlingToolbar.appendToolbarItem(this._networkThrottlingSelect);

    const cpuThrottlingToolbar = new UI.Toolbar.Toolbar('', throttlingPane.element);
    cpuThrottlingToolbar.appendText(Common.UIString.UIString('CPU:'));
    this._cpuThrottlingSelect = MobileThrottling.ThrottlingManager.throttlingManager().createCPUThrottlingSelector();
    cpuThrottlingToolbar.appendToolbarItem(this._cpuThrottlingSelect);

    this._showSettingsPaneSetting.addChangeListener(this._updateSettingsPaneVisibility.bind(this));
    this._updateSettingsPaneVisibility();
  }

  /**
    * @param {!Common.EventTarget.EventTargetEvent} event
    */
  _appendExtensionsToToolbar(event) {
    const provider = /** @type {!Extensions.ExtensionTraceProvider.ExtensionTraceProvider} */ (event.data);
    const setting = TimelinePanel._settingForTraceProvider(provider);
    const checkbox = this._createSettingCheckbox(setting, provider.longDisplayName());
    this._panelToolbar.appendToolbarItem(checkbox);
  }

  /**
   * @param {!Extensions.ExtensionTraceProvider.ExtensionTraceProvider} traceProvider
   * @return {!Common.Settings.Setting<boolean>}
   */
  static _settingForTraceProvider(traceProvider) {
    let setting = traceProvider[traceProviderSettingSymbol];
    if (!setting) {
      const providerId = traceProvider.persistentIdentifier();
      setting = Common.Settings.Settings.instance().createSetting(providerId, false);
      setting.setTitle(traceProvider.shortDisplayName());
      traceProvider[traceProviderSettingSymbol] = setting;
    }
    return setting;
  }

  /**
   * @return {!UI.Toolbar.ToolbarComboBox}
   */
  _createNetworkConditionsSelect() {
    const toolbarItem = new UI.Toolbar.ToolbarComboBox(null, ls`Network conditions`);
    toolbarItem.setMaxWidth(140);
    MobileThrottling.ThrottlingManager.throttlingManager().decorateSelectWithNetworkThrottling(
        toolbarItem.selectElement());
    return toolbarItem;
  }

  _prepareToLoadTimeline() {
    console.assert(this._state === State.Idle);
    this._setState(State.Loading);
    if (this._performanceModel) {
      this._performanceModel.dispose();
      this._performanceModel = null;
    }
  }

  _createFileSelector() {
    if (this._fileSelectorElement) {
      this._fileSelectorElement.remove();
    }
    this._fileSelectorElement = UI.UIUtils.createFileSelectorElement(this._loadFromFile.bind(this));
    this._timelinePane.element.appendChild(this._fileSelectorElement);
  }

  /**
   * @param {!Event} event
   */
  _contextMenu(event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendItemsAtLocation('timelineMenu');
    contextMenu.show();
  }

  /**
   * @suppress {deprecated}
   */
  async _saveToFile() {
    if (this._state !== State.Idle) {
      return;
    }
    const performanceModel = this._performanceModel;
    if (!performanceModel) {
      return;
    }

    const now = new Date();
    const fileName = 'Profile-' + now.toISO8601Compact() + '.json';
    const stream = new Bindings.FileUtils.FileOutputStream();

    const accepted = await stream.open(fileName);
    if (!accepted) {
      return;
    }

    const error = await performanceModel.save(stream);
    if (!error) {
      return;
    }
    Common.Console.Console.instance().error(
        Common.UIString.UIString('Failed to save timeline: %s (%s, %s)', error.message, error.name, error.code));
  }

  async _showHistory() {
    const model = await this._historyManager.showHistoryDropDown();
    if (model && model !== this._performanceModel) {
      this._setModel(model);
    }
  }

  /**
   * @param {number} direction
   * @return {boolean}
   */
  _navigateHistory(direction) {
    const model = this._historyManager.navigate(direction);
    if (model && model !== this._performanceModel) {
      this._setModel(model);
    }
    return true;
  }

  _selectFileToLoad() {
    this._fileSelectorElement.click();
  }

  /**
   * @param {!File} file
   */
  _loadFromFile(file) {
    if (this._state !== State.Idle) {
      return;
    }
    this._prepareToLoadTimeline();
    this._loader = TimelineLoader.loadFromFile(file, this);
    this._createFileSelector();
  }

  /**
   * @param {string} url
   */
  _loadFromURL(url) {
    if (this._state !== State.Idle) {
      return;
    }
    this._prepareToLoadTimeline();
    this._loader = TimelineLoader.loadFromURL(url, this);
  }

  _updateOverviewControls() {
    this._overviewControls = [];
    this._overviewControls.push(new TimelineEventOverviewResponsiveness());
    if (Root.Runtime.experiments.isEnabled('inputEventsOnTimelineOverview')) {
      this._overviewControls.push(new TimelineEventOverviewInput());
    }
    this._overviewControls.push(new TimelineEventOverviewFrames());
    this._overviewControls.push(new TimelineEventOverviewCPUActivity());
    this._overviewControls.push(new TimelineEventOverviewNetwork());
    if (this._showScreenshotsSetting.get() && this._performanceModel &&
        this._performanceModel.filmStripModel().frames().length) {
      this._overviewControls.push(new TimelineFilmStripOverview());
    }
    if (this._showMemorySetting.get()) {
      this._overviewControls.push(new TimelineEventOverviewMemory());
    }
    if (this._startCoverage.get()) {
      this._overviewControls.push(new TimelineEventOverviewCoverage());
    }
    for (const control of this._overviewControls) {
      control.setModel(this._performanceModel);
    }
    this._overviewPane.setOverviewControls(this._overviewControls);
  }

  _onModeChanged() {
    this._updateOverviewControls();
    this.doResize();
    this.select(null);
  }

  _updateSettingsPaneVisibility() {
    if (this._showSettingsPaneSetting.get()) {
      this._settingsPane.showWidget();
    } else {
      this._settingsPane.hideWidget();
    }
  }

  _updateShowSettingsToolbarButton() {
    const messages = [];
    if (MobileThrottling.ThrottlingManager.throttlingManager().cpuThrottlingRate() !== 1) {
      messages.push(Common.UIString.UIString('- CPU throttling is enabled'));
    }
    if (self.SDK.multitargetNetworkManager.isThrottling()) {
      messages.push(Common.UIString.UIString('- Network throttling is enabled'));
    }
    if (this._captureLayersAndPicturesSetting.get()) {
      messages.push(Common.UIString.UIString('- Significant overhead due to paint instrumentation'));
    }
    if (this._disableCaptureJSProfileSetting.get()) {
      messages.push(Common.UIString.UIString('- JavaScript sampling is disabled'));
    }

    this._showSettingsPaneButton.setDefaultWithRedColor(messages.length);
    this._showSettingsPaneButton.setToggleWithRedColor(messages.length);

    if (messages.length) {
      const tooltipElement = createElement('div');
      messages.forEach(message => {
        tooltipElement.createChild('div').textContent = message;
      });
      this._showSettingsPaneButton.setTitle(tooltipElement);
    } else {
      this._showSettingsPaneButton.setTitle(Common.UIString.UIString('Capture settings'));
    }
  }

  /**
   * @param {boolean} enabled
   */
  _setUIControlsEnabled(enabled) {
    this._recordingOptionUIControls.forEach(control => control.setEnabled(enabled));
  }

  async _startRecording() {
    console.assert(!this._statusPane, 'Status pane is already opened.');
    this._setState(State.StartPending);

    const recordingOptions = {
      enableJSSampling: !this._disableCaptureJSProfileSetting.get(),
      capturePictures: this._captureLayersAndPicturesSetting.get(),
      captureFilmStrip: this._showScreenshotsSetting.get(),
      startCoverage: this._startCoverage.get()
    };

    if (recordingOptions.startCoverage) {
      await UI.ViewManager.ViewManager.instance()
          .showView('coverage')
          .then(() => UI.ViewManager.ViewManager.instance().view('coverage').widget())
          .then(widget => widget.ensureRecordingStarted());
    }

    this._showRecordingStarted();

    const enabledTraceProviders = self.Extensions.extensionServer.traceProviders().filter(
        provider => TimelinePanel._settingForTraceProvider(provider).get());

    const mainTarget = /** @type {!SDK.SDKModel.Target} */ (SDK.SDKModel.TargetManager.instance().mainTarget());
    if (UIDevtoolsUtils.isUiDevTools()) {
      this._controller = new UIDevtoolsController(mainTarget, this);
    } else {
      this._controller = new TimelineController(mainTarget, this);
    }
    this._setUIControlsEnabled(false);
    this._hideLandingPage();
    const response = await this._controller.startRecording(recordingOptions, enabledTraceProviders);
    if (response[ProtocolClient.InspectorBackend.ProtocolError]) {
      this._recordingFailed(response[ProtocolClient.InspectorBackend.ProtocolError]);
    } else {
      this._recordingStarted();
    }
  }

  async _stopRecording() {
    if (this._statusPane) {
      this._statusPane.finish();
      this._statusPane.updateStatus(Common.UIString.UIString('Stopping timeline…'));
      this._statusPane.updateProgressBar(Common.UIString.UIString('Received'), 0);
    }
    this._setState(State.StopPending);
    if (this._startCoverage.get()) {
      await UI.ViewManager.ViewManager.instance()
          .showView('coverage')
          .then(() => UI.ViewManager.ViewManager.instance().view('coverage').widget())
          .then(widget => widget.stopRecording());
    }
    const model = await this._controller.stopRecording();
    this._performanceModel = model;
    this._setUIControlsEnabled(true);
    this._controller.dispose();
    this._controller = null;
  }

  /**
   * @param {string} error The error message to display
   */
  _recordingFailed(error) {
    if (this._statusPane) {
      this._statusPane.hide();
    }
    this._statusPane = new StatusPane(
        {description: error, buttonText: ls`Close`, buttonDisabled: false}, () => this.loadingComplete(null));
    this._statusPane.showPane(this._statusPaneContainer);
    this._statusPane.updateStatus(ls`Recording failed`);

    this._setState(State.RecordingFailed);
    this._performanceModel = null;
    this._setUIControlsEnabled(true);
    this._controller.dispose();
    this._controller = null;
  }

  _onSuspendStateChanged() {
    this._updateTimelineControls();
  }

  _updateTimelineControls() {
    const state = State;
    this._toggleRecordAction.setToggled(this._state === state.Recording);
    this._toggleRecordAction.setEnabled(this._state === state.Recording || this._state === state.Idle);
    this._recordReloadAction.setEnabled(this._state === state.Idle);
    this._historyManager.setEnabled(this._state === state.Idle);
    this._clearButton.setEnabled(this._state === state.Idle);
    this._panelToolbar.setEnabled(this._state !== state.Loading);
    this._panelRightToolbar.setEnabled(this._state !== state.Loading);
    this._dropTarget.setEnabled(this._state === state.Idle);
    this._loadButton.setEnabled(this._state === state.Idle);
    this._saveButton.setEnabled(this._state === state.Idle && !!this._performanceModel);
  }

  _toggleRecording() {
    if (this._state === State.Idle) {
      this._recordingPageReload = false;
      this._startRecording();
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.TimelineStarted);
    } else if (this._state === State.Recording) {
      this._stopRecording();
    }
  }

  _recordReload() {
    if (this._state !== State.Idle) {
      return;
    }
    this._recordingPageReload = true;
    this._startRecording();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.TimelinePageReloadStarted);
  }

  _onClearButton() {
    this._historyManager.clear();
    this._clear();
  }

  _clear() {
    this._showLandingPage();
    this._reset();
  }

  _reset() {
    self.runtime.sharedInstance(PerfUI.LineLevelProfile.Performance).reset();
    this._setModel(null);
  }

  /**
   * @param {!PerformanceModel} model
   */
  _applyFilters(model) {
    if (model.timelineModel().isGenericTrace() || Root.Runtime.experiments.isEnabled('timelineShowAllEvents')) {
      return;
    }
    model.setFilters([TimelineUIUtils.visibleEventsFilter()]);
  }

  /**
   * @param {?PerformanceModel} model
   */
  _setModel(model) {
    if (this._performanceModel) {
      this._performanceModel.removeEventListener(Events.WindowChanged, this._onModelWindowChanged, this);
    }
    this._performanceModel = model;
    if (model) {
      this._searchableView.showWidget();
      this._applyFilters(model);
    } else {
      this._searchableView.hideWidget();
    }
    this._flameChart.setModel(model);

    this._updateOverviewControls();
    this._overviewPane.reset();
    if (model) {
      this._performanceModel.addEventListener(Events.WindowChanged, this._onModelWindowChanged, this);
      this._overviewPane.setBounds(
          model.timelineModel().minimumRecordTime(), model.timelineModel().maximumRecordTime());
      const lineLevelProfile = self.runtime.sharedInstance(PerfUI.LineLevelProfile.Performance);
      lineLevelProfile.reset();
      for (const profile of model.timelineModel().cpuProfiles()) {
        lineLevelProfile.appendCPUProfile(profile);
      }
      this._setMarkers(model.timelineModel());
      this._flameChart.setSelection(null);
      this._overviewPane.setWindowTimes(model.window().left, model.window().right);
    }
    for (const control of this._overviewControls) {
      control.setModel(model);
    }
    if (this._flameChart) {
      this._flameChart.resizeToPreferredHeights();
    }
    this._updateTimelineControls();
  }

  _recordingStarted() {
    if (this._recordingPageReload) {
      const target = this._controller.mainTarget();
      const resourceModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (resourceModel) {
        resourceModel.reloadPage();
      }
    }
    this._reset();
    this._setState(State.Recording);
    this._showRecordingStarted();
    this._statusPane.enableAndFocusButton();
    this._statusPane.updateStatus(Common.UIString.UIString('Profiling…'));
    this._statusPane.updateProgressBar(Common.UIString.UIString('Buffer usage'), 0);
    this._statusPane.startTimer();
    this._hideLandingPage();
  }

  /**
   * @override
   * @param {number} usage
   */
  recordingProgress(usage) {
    this._statusPane.updateProgressBar(Common.UIString.UIString('Buffer usage'), usage * 100);
  }

  _showLandingPage() {
    if (this._landingPage) {
      this._landingPage.show(this._statusPaneContainer);
      return;
    }

    /**
     * @param {string} tagName
     * @param {string} contents
     */
    function encloseWithTag(tagName, contents) {
      const e = createElement(tagName);
      e.textContent = contents;
      return e;
    }

    const learnMoreNode = UI.XLink.XLink.create(
        'https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/',
        Common.UIString.UIString('Learn\xa0more'));

    const recordKey =
        encloseWithTag('b', self.UI.shortcutRegistry.shortcutDescriptorsForAction('timeline.toggle-recording')[0].name);
    const reloadKey =
        encloseWithTag('b', self.UI.shortcutRegistry.shortcutDescriptorsForAction('timeline.record-reload')[0].name);
    const navigateNode = encloseWithTag('b', Common.UIString.UIString('WASD'));

    this._landingPage = new UI.Widget.VBox();
    this._landingPage.contentElement.classList.add('timeline-landing-page', 'fill');
    const centered = this._landingPage.contentElement.createChild('div');

    const recordButton = UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction));
    const reloadButton =
        UI.UIUtils.createInlineButton(UI.Toolbar.Toolbar.createActionButtonForId('timeline.record-reload'));

    centered.createChild('p').appendChild(UI.UIUtils.formatLocalized(
        'Click the record button %s or hit %s to start a new recording.\nClick the reload button %s or hit %s to record the page load.',
        [recordButton, recordKey, reloadButton, reloadKey]));

    centered.createChild('p').appendChild(UI.UIUtils.formatLocalized(
        'After recording, select an area of interest in the overview by dragging.\nThen, zoom and pan the timeline with the mousewheel or %s keys.\n%s',
        [navigateNode, learnMoreNode]));

    this._landingPage.show(this._statusPaneContainer);
  }

  _hideLandingPage() {
    this._landingPage.detach();
  }

  /**
   * @override
   */
  loadingStarted() {
    this._hideLandingPage();

    if (this._statusPane) {
      this._statusPane.hide();
    }
    this._statusPane = new StatusPane({showProgress: true}, this._cancelLoading.bind(this));
    this._statusPane.showPane(this._statusPaneContainer);
    this._statusPane.updateStatus(Common.UIString.UIString('Loading profile…'));
    // FIXME: make loading from backend cancelable as well.
    if (!this._loader) {
      this._statusPane.finish();
    }
    this.loadingProgress(0);
  }

  /**
   * @override
   * @param {number=} progress
   */
  loadingProgress(progress) {
    if (typeof progress === 'number') {
      this._statusPane.updateProgressBar(Common.UIString.UIString('Received'), progress * 100);
    }
  }

  /**
   * @override
   */
  processingStarted() {
    this._statusPane.updateStatus(Common.UIString.UIString('Processing profile…'));
  }

  /**
   * @override
   * @param {?SDK.TracingModel.TracingModel} tracingModel
   */
  loadingComplete(tracingModel) {
    delete this._loader;
    this._setState(State.Idle);

    if (this._statusPane) {
      this._statusPane.hide();
    }
    delete this._statusPane;

    if (!tracingModel) {
      this._clear();
      return;
    }

    if (!this._performanceModel) {
      this._performanceModel = new PerformanceModel();
    }
    this._performanceModel.setTracingModel(tracingModel);
    this._setModel(this._performanceModel);
    this._historyManager.addRecording(this._performanceModel);

    if (this._startCoverage.get()) {
      UI.ViewManager.ViewManager.instance()
          .showView('coverage')
          .then(() => UI.ViewManager.ViewManager.instance().view('coverage').widget())
          .then(widget => widget.processBacklog())
          .then(() => this._updateOverviewControls());
    }
  }

  _showRecordingStarted() {
    if (this._statusPane) {
      return;
    }
    this._statusPane = new StatusPane({showTimer: true, showProgress: true}, this._stopRecording.bind(this));
    this._statusPane.showPane(this._statusPaneContainer);
    this._statusPane.updateStatus(Common.UIString.UIString('Initializing profiler…'));
  }

  _cancelLoading() {
    if (this._loader) {
      this._loader.cancel();
    }
  }

  /**
   * @param {!TimelineModel.TimelineModel.TimelineModelImpl} timelineModel
   */
  _setMarkers(timelineModel) {
    const markers = new Map();
    const recordTypes = TimelineModel.TimelineModel.RecordType;
    const zeroTime = timelineModel.minimumRecordTime();
    for (const event of timelineModel.timeMarkerEvents()) {
      if (event.name === recordTypes.TimeStamp || event.name === recordTypes.ConsoleTime) {
        continue;
      }
      markers.set(event.startTime, TimelineUIUtils.createEventDivider(event, zeroTime));
    }
    this._overviewPane.setMarkers(markers);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  async _loadEventFired(event) {
    if (this._state !== State.Recording || !this._recordingPageReload ||
        this._controller.mainTarget() !== event.data.resourceTreeModel.target()) {
      return;
    }
    const controller = this._controller;
    await new Promise(r => setTimeout(r, this._millisecondsToRecordAfterLoadEvent));

    // Check if we're still in the same recording session.
    if (controller !== this._controller || this._state !== State.Recording) {
      return;
    }
    this._stopRecording();
  }

  /**
   * @param {!TimelineSelection} selection
   * @return {?TimelineModel.TimelineFrameModel.TimelineFrame}
   */
  _frameForSelection(selection) {
    switch (selection.type()) {
      case TimelineSelection.Type.Frame:
        return /** @type {!TimelineModel.TimelineFrameModel.TimelineFrame} */ (selection.object());
      case TimelineSelection.Type.Range:
        return null;
      case TimelineSelection.Type.TraceEvent:
        return this._performanceModel.frameModel().frames(selection._endTime, selection._endTime)[0];
      default:
        console.assert(false, 'Should never be reached');
        return null;
    }
  }

  /**
   * @param {number} offset
   */
  _jumpToFrame(offset) {
    const currentFrame = this._selection && this._frameForSelection(this._selection);
    if (!currentFrame) {
      return;
    }
    const frames = this._performanceModel.frames();
    let index = frames.indexOf(currentFrame);
    console.assert(index >= 0, 'Can\'t find current frame in the frame list');
    index = Platform.NumberUtilities.clamp(index + offset, 0, frames.length - 1);
    const frame = frames[index];
    this._revealTimeRange(frame.startTime, frame.endTime);
    this.select(TimelineSelection.fromFrame(frame));
    return true;
  }

  /**
   * @override
   * @param {?TimelineSelection} selection
   */
  select(selection) {
    this._selection = selection;
    this._flameChart.setSelection(selection);
  }

  /**
   * @override
   * @param {?Array<!SDK.TracingModel.Event>} events
   * @param {number} time
   */
  selectEntryAtTime(events, time) {
    if (!events) {
      return;
    }
    // Find best match, then backtrack to the first visible entry.
    for (let index = events.upperBound(time, (time, event) => time - event.startTime) - 1; index >= 0; --index) {
      const event = events[index];
      const endTime = event.endTime || event.startTime;
      if (SDK.TracingModel.TracingModel.isTopLevelEvent(event) && endTime < time) {
        break;
      }
      if (this._performanceModel.isVisible(event) && endTime >= time) {
        this.select(TimelineSelection.fromTraceEvent(event));
        return;
      }
    }
    this.select(null);
  }

  /**
   * @override
   * @param {?SDK.TracingModel.Event} event
   */
  highlightEvent(event) {
    this._flameChart.highlightEvent(event);
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  _revealTimeRange(startTime, endTime) {
    const window = this._performanceModel.window();
    let offset = 0;
    if (window.right < endTime) {
      offset = endTime - window.right;
    } else if (window.left > startTime) {
      offset = startTime - window.left;
    }
    this._performanceModel.setWindow({left: window.left + offset, right: window.right + offset}, /* animate */ true);
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
    if (item.kind === 'string') {
      const url = dataTransfer.getData('text/uri-list');
      if (new Common.ParsedURL.ParsedURL(url).isValid) {
        this._loadFromURL(url);
      }
    } else if (item.kind === 'file') {
      const entry = items[0].webkitGetAsEntry();
      if (!entry.isFile) {
        return;
      }
      entry.file(this._loadFromFile.bind(this));
    }
  }
}

/**
 * @enum {symbol}
 */
export const State = {
  Idle: Symbol('Idle'),
  StartPending: Symbol('StartPending'),
  Recording: Symbol('Recording'),
  StopPending: Symbol('StopPending'),
  Loading: Symbol('Loading'),
  RecordingFailed: Symbol('RecordingFailed')
};

/**
 * @enum {string}
 */
export const ViewMode = {
  FlameChart: 'FlameChart',
  BottomUp: 'BottomUp',
  CallTree: 'CallTree',
  EventLog: 'EventLog'
};

// Define row and header height, should be in sync with styles for timeline graphs.
export const rowHeight = 18;

export const headerHeight = 20;

export class TimelineSelection {
  /**
   * @param {!TimelineSelection.Type} type
   * @param {number} startTime
   * @param {number} endTime
   * @param {!Object=} object
   */
  constructor(type, startTime, endTime, object) {
    this._type = type;
    this._startTime = startTime;
    this._endTime = endTime;
    this._object = object || null;
  }

  /**
   * @param {!TimelineModel.TimelineFrameModel.TimelineFrame} frame
   * @return {!TimelineSelection}
   */
  static fromFrame(frame) {
    return new TimelineSelection(TimelineSelection.Type.Frame, frame.startTime, frame.endTime, frame);
  }

  /**
   * @param {!TimelineModel.TimelineModel.NetworkRequest} request
   * @return {!TimelineSelection}
   */
  static fromNetworkRequest(request) {
    return new TimelineSelection(
        TimelineSelection.Type.NetworkRequest, request.startTime, request.endTime || request.startTime, request);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {!TimelineSelection}
   */
  static fromTraceEvent(event) {
    return new TimelineSelection(
        TimelineSelection.Type.TraceEvent, event.startTime, event.endTime || (event.startTime + 1), event);
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   * @return {!TimelineSelection}
   */
  static fromRange(startTime, endTime) {
    return new TimelineSelection(TimelineSelection.Type.Range, startTime, endTime);
  }

  /**
   * @return {!TimelineSelection.Type}
   */
  type() {
    return this._type;
  }

  /**
   * @return {?Object}
   */
  object() {
    return this._object;
  }

  /**
   * @return {number}
   */
  startTime() {
    return this._startTime;
  }

  /**
   * @return {number}
   */
  endTime() {
    return this._endTime;
  }
}

/**
 * @enum {string}
 */
TimelineSelection.Type = {
  Frame: 'Frame',
  NetworkRequest: 'NetworkRequest',
  TraceEvent: 'TraceEvent',
  Range: 'Range'
};

/**
 * @interface
 */
export class TimelineModeViewDelegate {
  /**
   * @param {?TimelineSelection} selection
   */
  select(selection) {
  }

  /**
   * @param {?Array<!SDK.TracingModel.Event>} events
   * @param {number} time
   */
  selectEntryAtTime(events, time) {
  }

  /**
   * @param {?SDK.TracingModel.Event} event
   */
  highlightEvent(event) {
  }
}

/**
 * @unrestricted
 */
export class StatusPane extends UI.Widget.VBox {
  /**
   * @param {!{showTimer: (boolean|undefined), showProgress: (boolean|undefined), description: (string|undefined), buttonText: (string|undefined), buttonDisabled: (boolean|undefined)}} options - a collection of options controlling the appearance of the pane.
   *   The options object can have the following properties:
   *   - **showTimer** - `{boolean}` - Display seconds since dialog opened
   *   - **showProgress** - `{boolean}` - Display a progress bar
   *   - **description** - `{string}` - Display this string in a description line
   *   - **buttonText** - `{string}` - The localized text to display on the button
   *   - **buttonDisabled** - `{string}` - Whether the button starts disabled or not - defaults to true
   * @param {function(): undefined|function(): !Promise<undefined>} buttonCallback
   */
  constructor(options, buttonCallback) {
    super(true);
    this.registerRequiredCSS('timeline/timelineStatusDialog.css');
    this.contentElement.classList.add('timeline-status-dialog');

    const statusLine = this.contentElement.createChild('div', 'status-dialog-line status');
    statusLine.createChild('div', 'label').textContent = Common.UIString.UIString('Status');
    this._status = statusLine.createChild('div', 'content');
    UI.ARIAUtils.markAsStatus(this._status);

    if (options.showTimer) {
      const timeLine = this.contentElement.createChild('div', 'status-dialog-line time');
      timeLine.createChild('div', 'label').textContent = Common.UIString.UIString('Time');
      this._time = timeLine.createChild('div', 'content');
    }

    if (options.showProgress) {
      const progressLine = this.contentElement.createChild('div', 'status-dialog-line progress');
      this._progressLabel = progressLine.createChild('div', 'label');
      this._progressBar = progressLine.createChild('div', 'indicator-container').createChild('div', 'indicator');
      UI.ARIAUtils.markAsProgressBar(this._progressBar);
    }

    if (typeof options.description === 'string') {
      const descriptionLine = this.contentElement.createChild('div', 'status-dialog-line description');
      descriptionLine.createChild('div', 'label').textContent = ls`Description`;
      this._description = descriptionLine.createChild('div', 'content');
      this._description.innerText = options.description;
    }

    const buttonText = options.buttonText || ls`Stop`;
    this._button = UI.UIUtils.createTextButton(buttonText, buttonCallback, '', true);
    // Profiling can't be stopped during initialization.
    this._button.disabled = !options.buttonDisabled === false;
    this.contentElement.createChild('div', 'stop-button').appendChild(this._button);
  }

  finish() {
    this._stopTimer();
    this._button.disabled = true;
  }

  hide() {
    this.element.parentNode.classList.remove('tinted');
    this.element.remove();
  }

  /**
   * @param {!Element} parent
   */
  showPane(parent) {
    this.show(parent);
    parent.classList.add('tinted');
  }

  enableAndFocusButton() {
    this._button.disabled = false;
    this._button.focus();
  }

  /**
   * @param {string} text
   */
  updateStatus(text) {
    this._status.textContent = text;
  }

  /**
   * @param {string} activity
   * @param {number} percent
   */
  updateProgressBar(activity, percent) {
    this._progressLabel.textContent = activity;
    this._progressBar.style.width = percent.toFixed(1) + '%';
    UI.ARIAUtils.setValueNow(this._progressBar, percent);
    this._updateTimer();
  }

  startTimer() {
    this._startTime = Date.now();
    this._timeUpdateTimer = setInterval(this._updateTimer.bind(this, false), 1000);
    this._updateTimer();
  }

  _stopTimer() {
    if (!this._timeUpdateTimer) {
      return;
    }
    clearInterval(this._timeUpdateTimer);
    this._updateTimer(true);
    delete this._timeUpdateTimer;
  }

  /**
   * @param {boolean=} precise
   */
  _updateTimer(precise) {
    if (!this._timeUpdateTimer) {
      return;
    }
    const elapsed = (Date.now() - this._startTime) / 1000;
    this._time.textContent = Common.UIString.UIString('%s\xa0sec', elapsed.toFixed(precise ? 1 : 0));
  }
}


/**
 * @implements {Common.QueryParamHandler.QueryParamHandler}
 * @unrestricted
 */
export class LoadTimelineHandler {
  /**
   * @override
   * @param {string} value
   */
  handleQueryParam(value) {
    UI.ViewManager.ViewManager.instance().showView('timeline').then(() => {
      TimelinePanel.instance()._loadFromURL(window.decodeURIComponent(value));
    });
  }
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 * @unrestricted
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    const panel = self.UI.context.flavor(TimelinePanel);
    console.assert(panel && panel instanceof TimelinePanel);
    switch (actionId) {
      case 'timeline.toggle-recording':
        panel._toggleRecording();
        return true;
      case 'timeline.record-reload':
        panel._recordReload();
        return true;
      case 'timeline.save-to-file':
        panel._saveToFile();
        return true;
      case 'timeline.load-from-file':
        panel._selectFileToLoad();
        return true;
      case 'timeline.jump-to-previous-frame':
        panel._jumpToFrame(-1);
        return true;
      case 'timeline.jump-to-next-frame':
        panel._jumpToFrame(1);
        return true;
      case 'timeline.show-history':
        panel._showHistory();
        return true;
      case 'timeline.previous-recording':
        panel._navigateHistory(1);
        return true;
      case 'timeline.next-recording':
        panel._navigateHistory(-1);
        return true;
    }
    return false;
  }
}

export const traceProviderSettingSymbol = Symbol('traceProviderSetting');
