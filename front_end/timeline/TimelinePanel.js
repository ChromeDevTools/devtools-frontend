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

/**
 * @implements {Timeline.TimelineLifecycleDelegate}
 * @implements {Timeline.TimelineModeViewDelegate}
 * @implements {UI.Searchable}
 * @unrestricted
 */
Timeline.TimelinePanel = class extends UI.Panel {
  constructor() {
    super('timeline');
    this.registerRequiredCSS('timeline/timelinePanel.css');
    this.element.addEventListener('contextmenu', this._contextMenu.bind(this), false);
    this._dropTarget = new UI.DropTarget(
        this.element, [UI.DropTarget.Types.Files, UI.DropTarget.Types.URIList],
        Common.UIString('Drop timeline file or URL here'), this._handleDrop.bind(this));

    /** @type {!Array<!UI.ToolbarItem>} */
    this._recordingOptionUIControls = [];
    this._state = Timeline.TimelinePanel.State.Idle;
    this._windowStartTime = 0;
    this._windowEndTime = Infinity;
    this._millisecondsToRecordAfterLoadEvent = 3000;
    this._toggleRecordAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('timeline.toggle-recording'));

    /** @type {!Array<!TimelineModel.TimelineModel.Filter>} */
    this._filters = [];
    if (!Runtime.experiments.isEnabled('timelineShowAllEvents')) {
      this._filters.push(Timeline.TimelineUIUtils.visibleEventsFilter());
      this._filters.push(new TimelineModel.ExcludeTopLevelFilter());
    }

    // Create models.
    this._tracingModelBackingStorage = new Bindings.TempFileBackingStorage('tracing');
    this._tracingModel = new SDK.TracingModel(this._tracingModelBackingStorage);
    this._model = new TimelineModel.TimelineModel(Timeline.TimelineUIUtils.visibleEventsFilter());
    this._frameModel =
        new TimelineModel.TimelineFrameModel(event => Timeline.TimelineUIUtils.eventStyle(event).category.name);
    this._filmStripModel = new SDK.FilmStripModel(this._tracingModel);
    this._irModel = new TimelineModel.TimelineIRModel();
    /** @type {!Array<!{title: string, model: !SDK.TracingModel}>} */
    this._extensionTracingModels = [];
    this._cpuThrottlingManager = new Components.CPUThrottlingManager();

    /** @type {!Array<!Timeline.TimelineModeView>} */
    this._currentViews = [];

    this._disableCaptureJSProfileSetting = Common.settings.createSetting('timelineDisableJSSampling', false);
    this._captureLayersAndPicturesSetting = Common.settings.createSetting('timelineCaptureLayersAndPictures', false);

    this._showScreenshotsSetting = Common.settings.createLocalSetting('timelineShowScreenshots', true);
    this._showScreenshotsSetting.addChangeListener(this._onModeChanged, this);
    this._showMemorySetting = Common.settings.createLocalSetting('timelineShowMemory', false);
    this._showMemorySetting.addChangeListener(this._onModeChanged, this);

    this._panelToolbar = new UI.Toolbar('', this.element);
    this._createSettingsPane();
    this._updateShowSettingsToolbarButton();

    this._timelinePane = new UI.VBox();
    this._timelinePane.show(this.element);
    var topPaneElement = this._timelinePane.element.createChild('div', 'hbox');
    topPaneElement.id = 'timeline-overview-panel';

    // Create top overview component.
    this._overviewPane = new PerfUI.TimelineOverviewPane('timeline');
    this._overviewPane.addEventListener(
        PerfUI.TimelineOverviewPane.Events.WindowChanged, this._onWindowChanged.bind(this));
    this._overviewPane.show(topPaneElement);
    this._statusPaneContainer = this._timelinePane.element.createChild('div', 'status-pane-container fill');

    this._createFileSelector();

    SDK.targetManager.addEventListener(SDK.TargetManager.Events.PageReloadRequested, this._pageReloadRequested, this);
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.Load, this._loadEventFired, this);

    // Create top level properties splitter.
    this._detailsSplitWidget = new UI.SplitWidget(false, true, 'timelinePanelDetailsSplitViewState', 400);
    this._detailsSplitWidget.element.classList.add('timeline-details-split');
    this._detailsView =
        new Timeline.TimelineDetailsView(this._model, this._frameModel, this._filmStripModel, this._filters, this);
    this._detailsSplitWidget.installResizer(this._detailsView.headerElement());
    this._detailsSplitWidget.setSidebarWidget(this._detailsView);

    this._searchableView = new UI.SearchableView(this);
    this._searchableView.setMinimumSize(0, 100);
    this._searchableView.element.classList.add('searchable-view');
    this._detailsSplitWidget.setMainWidget(this._searchableView);

    this._stackView = new UI.StackView(false);
    this._stackView.element.classList.add('timeline-view-stack');

    this._stackView.show(this._searchableView.element);
    this._onModeChanged();

    this._populateToolbar();
    this._showLandingPage();

    Extensions.extensionServer.addEventListener(
        Extensions.ExtensionServer.Events.TraceProviderAdded, this._appendExtensionsToToolbar, this);

    this._detailsSplitWidget.show(this._timelinePane.element);
    this._detailsSplitWidget.hideSidebar();
    SDK.targetManager.addEventListener(SDK.TargetManager.Events.SuspendStateChanged, this._onSuspendStateChanged, this);

    /** @type {!SDK.TracingModel.Event}|undefined */
    this._selectedSearchResult;
    /** @type {!Array<!SDK.TracingModel.Event>}|undefined */
    this._searchResults;
    /** @type {?symbol} */
    this._sessionGeneration = null;
    /** @type {number} */
    this._recordingStartTime = 0;
  }

  /**
   * @return {!Timeline.TimelinePanel}
   */
  static instance() {
    return /** @type {!Timeline.TimelinePanel} */ (self.runtime.sharedInstance(Timeline.TimelinePanel));
  }

  /**
   * @override
   * @return {?UI.SearchableView}
   */
  searchableView() {
    return this._searchableView;
  }

  /**
   * @override
   */
  wasShown() {
    UI.context.setFlavor(Timeline.TimelinePanel, this);
  }

  /**
   * @override
   */
  willHide() {
    UI.context.setFlavor(Timeline.TimelinePanel, null);
  }

  /**
   * @return {number}
   */
  windowStartTime() {
    if (this._windowStartTime)
      return this._windowStartTime;
    return this._model.minimumRecordTime();
  }

  /**
   * @return {number}
   */
  windowEndTime() {
    if (this._windowEndTime < Infinity)
      return this._windowEndTime;
    return this._model.maximumRecordTime() || Infinity;
  }

  /**
   * @param {!Common.Event} event
   */
  _onWindowChanged(event) {
    this._windowStartTime = event.data.startTime;
    this._windowEndTime = event.data.endTime;

    for (var i = 0; i < this._currentViews.length; ++i)
      this._currentViews[i].setWindowTimes(this._windowStartTime, this._windowEndTime);

    if (!this._selection || this._selection.type() === Timeline.TimelineSelection.Type.Range)
      this.select(null);
  }

  /**
   * @param {!Common.Event} event
   */
  _onOverviewSelectionChanged(event) {
    var selection = /** @type {!Timeline.TimelineSelection} */ (event.data);
    this.select(selection);
  }

  /**
   * @override
   * @param {number} windowStartTime
   * @param {number} windowEndTime
   */
  requestWindowTimes(windowStartTime, windowEndTime) {
    this._overviewPane.requestWindowTimes(windowStartTime, windowEndTime);
  }

  /**
   * @param {!Timeline.TimelineModeView} modeView
   */
  _addModeView(modeView) {
    modeView.setWindowTimes(this.windowStartTime(), this.windowEndTime());
    modeView.refreshRecords();
    var splitWidget =
        this._stackView.appendView(modeView.view(), 'timelinePanelTimelineStackSplitViewState', undefined, 112);
    var resizer = modeView.resizerElement();
    if (splitWidget && resizer) {
      splitWidget.hideDefaultResizer();
      splitWidget.installResizer(resizer);
    }
    this._currentViews.push(modeView);
  }

  _removeAllModeViews() {
    this._currentViews.forEach(view => view.dispose());
    this._currentViews = [];
    this._stackView.detachChildWidgets();
  }

  /**
   * @param {!Timeline.TimelinePanel.State} state
   */
  _setState(state) {
    this._state = state;
    this._updateTimelineControls();
  }

  /**
   * @param {string} name
   * @param {!Common.Setting} setting
   * @param {string} tooltip
   * @return {!UI.ToolbarItem}
   */
  _createSettingCheckbox(name, setting, tooltip) {
    const checkboxItem = new UI.ToolbarCheckbox(name, tooltip, setting);
    this._recordingOptionUIControls.push(checkboxItem);
    return checkboxItem;
  }

  _populateToolbar() {
    // Record
    this._panelToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._toggleRecordAction));
    this._panelToolbar.appendToolbarItem(UI.Toolbar.createActionButtonForId('main.reload'));
    var clearButton = new UI.ToolbarButton(Common.UIString('Clear'), 'largeicon-clear');
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, () => this._clear());
    this._panelToolbar.appendToolbarItem(clearButton);
    this._panelToolbar.appendSeparator();

    // View
    this._panelToolbar.appendSeparator();
    this._showScreenshotsToolbarCheckbox = this._createSettingCheckbox(
        Common.UIString('Screenshots'), this._showScreenshotsSetting, Common.UIString('Capture screenshots'));
    this._panelToolbar.appendToolbarItem(this._showScreenshotsToolbarCheckbox);

    this._showMemoryToolbarCheckbox = this._createSettingCheckbox(
        Common.UIString('Memory'), this._showMemorySetting, Common.UIString('Show memory timeline.'));
    this._panelToolbar.appendToolbarItem(this._showMemoryToolbarCheckbox);

    // Settings
    this._panelToolbar.appendToolbarItem(this._showSettingsPaneButton);

    // GC
    this._panelToolbar.appendToolbarItem(UI.Toolbar.createActionButtonForId('components.collect-garbage'));
  }

  _createSettingsPane() {
    this._showSettingsPaneSetting = Common.settings.createSetting('timelineShowSettingsToolbar', false);
    this._showSettingsPaneButton = new UI.ToolbarSettingToggle(
        this._showSettingsPaneSetting, 'largeicon-settings-gear', Common.UIString('Capture settings'));
    SDK.multitargetNetworkManager.addEventListener(
        SDK.MultitargetNetworkManager.Events.ConditionsChanged, this._updateShowSettingsToolbarButton, this);
    this._cpuThrottlingManager.addEventListener(
        Components.CPUThrottlingManager.Events.RateChanged, this._updateShowSettingsToolbarButton, this);
    this._disableCaptureJSProfileSetting.addChangeListener(this._updateShowSettingsToolbarButton, this);
    this._captureLayersAndPicturesSetting.addChangeListener(this._updateShowSettingsToolbarButton, this);

    this._settingsPane = new UI.HBox();
    this._settingsPane.element.classList.add('timeline-settings-pane');
    this._settingsPane.show(this.element);

    var captureToolbar = new UI.Toolbar('', this._settingsPane.element);
    captureToolbar.element.classList.add('flex-auto');
    captureToolbar.makeVertical();
    captureToolbar.appendToolbarItem(this._createSettingCheckbox(
        Common.UIString('Disable JavaScript Samples'), this._disableCaptureJSProfileSetting,
        Common.UIString('Disables JavaScript sampling, reduces overhead when running against mobile devices')));
    captureToolbar.appendToolbarItem(this._createSettingCheckbox(
        Common.UIString('Enable advanced paint instrumentation (slow)'), this._captureLayersAndPicturesSetting,
        Common.UIString('Captures advanced paint instrumentation, introduces significant performance overhead')));

    var throttlingPane = new UI.VBox();
    throttlingPane.element.classList.add('flex-auto');
    throttlingPane.show(this._settingsPane.element);

    var throttlingToolbar1 = new UI.Toolbar('', throttlingPane.element);
    throttlingToolbar1.appendText(Common.UIString('Network:'));
    throttlingToolbar1.appendToolbarItem(this._createNetworkConditionsSelect());
    var throttlingToolbar2 = new UI.Toolbar('', throttlingPane.element);
    throttlingToolbar2.appendText(Common.UIString('CPU:'));
    throttlingToolbar2.appendToolbarItem(this._cpuThrottlingManager.createControl());

    this._showSettingsPaneSetting.addChangeListener(this._updateSettingsPaneVisibility.bind(this));
    this._updateSettingsPaneVisibility();
  }

  /**
    * @param {!Common.Event} event
    */
  _appendExtensionsToToolbar(event) {
    var provider = /** @type {!Extensions.ExtensionTraceProvider} */ (event.data);
    const setting = Timeline.TimelinePanel._settingForTraceProvider(provider);
    const checkbox = this._createSettingCheckbox(provider.shortDisplayName(), setting, provider.longDisplayName());
    this._panelToolbar.appendToolbarItem(checkbox);
  }

  /**
   * @param {!Extensions.ExtensionTraceProvider} traceProvider
   * @return {!Common.Setting<boolean>}
   */
  static _settingForTraceProvider(traceProvider) {
    var setting = traceProvider[Timeline.TimelinePanel._traceProviderSettingSymbol];
    if (!setting) {
      var providerId = traceProvider.persistentIdentifier();
      setting = Common.settings.createSetting(providerId, false);
      traceProvider[Timeline.TimelinePanel._traceProviderSettingSymbol] = setting;
    }
    return setting;
  }

  /**
   * @return {!UI.ToolbarComboBox}
   */
  _createNetworkConditionsSelect() {
    var toolbarItem = new UI.ToolbarComboBox(null);
    toolbarItem.setMaxWidth(140);
    Components.NetworkConditionsSelector.decorateSelect(toolbarItem.selectElement());
    return toolbarItem;
  }

  _prepareToLoadTimeline() {
    console.assert(this._state === Timeline.TimelinePanel.State.Idle);
    this._setState(Timeline.TimelinePanel.State.Loading);
  }

  _createFileSelector() {
    if (this._fileSelectorElement)
      this._fileSelectorElement.remove();
    this._fileSelectorElement = UI.createFileSelectorElement(this._loadFromFile.bind(this));
    this._timelinePane.element.appendChild(this._fileSelectorElement);
  }

  /**
   * @param {!Event} event
   */
  _contextMenu(event) {
    var contextMenu = new UI.ContextMenu(event);
    contextMenu.appendItemsAtLocation('timelineMenu');
    contextMenu.show();
  }

  /**
   * @return {boolean}
   */
  _saveToFile() {
    if (this._state !== Timeline.TimelinePanel.State.Idle)
      return true;
    if (this._model.isEmpty())
      return true;

    var now = new Date();
    var fileName = 'Profile-' + now.toISO8601Compact() + '.json';
    var stream = new Bindings.FileOutputStream();

    /**
     * @param {boolean} accepted
     * @this {Timeline.TimelinePanel}
     */
    function callback(accepted) {
      if (!accepted)
        return;
      var saver = new Timeline.TracingTimelineSaver();
      this._tracingModelBackingStorage.writeToStream(stream, saver);
    }
    stream.open(fileName, callback.bind(this));
    return true;
  }

  /**
   * @return {boolean}
   */
  _selectFileToLoad() {
    this._fileSelectorElement.click();
    return true;
  }

  /**
   * @param {!File} file
   */
  _loadFromFile(file) {
    if (this._state !== Timeline.TimelinePanel.State.Idle)
      return;
    this._prepareToLoadTimeline();
    this._loader = Timeline.TimelineLoader.loadFromFile(this._tracingModel, file, this);
    this._createFileSelector();
  }

  /**
   * @param {string} url
   */
  _loadFromURL(url) {
    if (this._state !== Timeline.TimelinePanel.State.Idle)
      return;
    this._prepareToLoadTimeline();
    this._loader = Timeline.TimelineLoader.loadFromURL(this._tracingModel, url, this);
  }

  _refreshViews() {
    this._currentViews.forEach(view => view.refreshRecords());
  }

  _onModeChanged() {
    const showMemory = this._showMemorySetting.get();
    const showScreenshots = this._showScreenshotsSetting.get();
    // Set up overview controls.
    this._overviewControls = [];
    this._overviewControls.push(new Timeline.TimelineEventOverviewResponsiveness(this._model, this._frameModel));
    if (Runtime.experiments.isEnabled('inputEventsOnTimelineOverview'))
      this._overviewControls.push(new Timeline.TimelineEventOverviewInput(this._model));
    this._overviewControls.push(new Timeline.TimelineEventOverviewFrames(this._model, this._frameModel));
    this._overviewControls.push(new Timeline.TimelineEventOverviewCPUActivity(this._model));
    this._overviewControls.push(new Timeline.TimelineEventOverviewNetwork(this._model));
    if (showScreenshots)
      this._overviewControls.push(new Timeline.TimelineFilmStripOverview(this._model, this._filmStripModel));
    if (showMemory)
      this._overviewControls.push(new Timeline.TimelineEventOverviewMemory(this._model));
    this._overviewPane.setOverviewControls(this._overviewControls);

    // Set up the main view.
    this._removeAllModeViews();
    this._flameChart = new Timeline.TimelineFlameChartView(
        this, this._model, this._frameModel, this._irModel, this._extensionTracingModels, this._filters);
    this._addModeView(this._flameChart);

    if (showMemory) {
      this._addModeView(
          new Timeline.MemoryCountersGraph(this, this._model, [Timeline.TimelineUIUtils.visibleEventsFilter()]));
    }

    this.doResize();
    this.select(null);
  }

  _updateSettingsPaneVisibility() {
    if (this._showSettingsPaneSetting.get())
      this._settingsPane.showWidget();
    else
      this._settingsPane.hideWidget();
  }

  _updateShowSettingsToolbarButton() {
    var messages = [];
    if (this._cpuThrottlingManager.rate() !== 1)
      messages.push(Common.UIString('- CPU throttling is enabled'));
    if (SDK.multitargetNetworkManager.isThrottling())
      messages.push(Common.UIString('- Network throttling is enabled'));
    if (this._captureLayersAndPicturesSetting.get())
      messages.push(Common.UIString('- Significant overhead due to paint instrumentation'));
    if (this._disableCaptureJSProfileSetting.get())
      messages.push(Common.UIString('- JavaScript sampling is disabled'));

    this._showSettingsPaneButton.setDefaultWithRedColor(messages.length);
    this._showSettingsPaneButton.setToggleWithRedColor(messages.length);

    if (messages.length) {
      var tooltipElement = createElement('div');
      messages.forEach(message => {
        tooltipElement.createChild('div').textContent = message;
      });
      this._showSettingsPaneButton.setTitle(tooltipElement);
    } else {
      this._showSettingsPaneButton.setTitle(Common.UIString('Capture settings'));
    }
  }

  /**
   * @param {boolean} enabled
   */
  _setUIControlsEnabled(enabled) {
    this._recordingOptionUIControls.forEach(control => control.setEnabled(enabled));
  }

  /**
   * @param {boolean} userInitiated
   */
  _startRecording(userInitiated) {
    console.assert(!this._statusPane, 'Status pane is already opened.');
    var mainTarget = SDK.targetManager.mainTarget();
    if (!mainTarget)
      return;
    this._setState(Timeline.TimelinePanel.State.StartPending);
    this._showRecordingStarted();

    this._sessionGeneration = Symbol('timelineSessionGeneration');
    this._autoRecordGeneration = userInitiated ? null : Symbol('Generation');
    var enabledTraceProviders = Extensions.extensionServer.traceProviders().filter(
        provider => Timeline.TimelinePanel._settingForTraceProvider(provider).get());

    const recordingOptions = {
      enableJSSampling: !this._disableCaptureJSProfileSetting.get(),
      capturePictures: this._captureLayersAndPicturesSetting.get(),
      captureFilmStrip: this._showScreenshotsSetting.get()
    };

    this._controller = new Timeline.TimelineController(mainTarget, this, this._tracingModel);
    this._controller.startRecording(recordingOptions, enabledTraceProviders);
    this._recordingStartTime = Date.now();

    for (var i = 0; i < this._overviewControls.length; ++i)
      this._overviewControls[i].timelineStarted();

    Host.userMetrics.actionTaken(
        userInitiated ? Host.UserMetrics.Action.TimelineStarted : Host.UserMetrics.Action.TimelinePageReloadStarted);
    this._setUIControlsEnabled(false);
    this._hideLandingPage();
  }

  _stopRecording() {
    if (this._statusPane) {
      this._statusPane.finish();
      this._statusPane.updateStatus(Common.UIString('Stopping timeline\u2026'));
      this._statusPane.updateProgressBar(Common.UIString('Received'), 0);
    }
    this._setState(Timeline.TimelinePanel.State.StopPending);
    this._autoRecordGeneration = null;
    this._controller.stopRecording();
    this._controller = null;
    this._setUIControlsEnabled(true);
  }

  _onSuspendStateChanged() {
    this._updateTimelineControls();
  }

  _updateTimelineControls() {
    var state = Timeline.TimelinePanel.State;
    this._toggleRecordAction.setToggled(this._state === state.Recording);
    this._toggleRecordAction.setEnabled(this._state === state.Recording || this._state === state.Idle);
    this._panelToolbar.setEnabled(this._state !== state.Loading);
    this._dropTarget.setEnabled(this._state === state.Idle);
  }

  _toggleRecording() {
    if (this._state === Timeline.TimelinePanel.State.Idle)
      this._startRecording(true);
    else if (this._state === Timeline.TimelinePanel.State.Recording)
      this._stopRecording();
  }

  _clear() {
    this._showLandingPage();
    this._detailsSplitWidget.hideSidebar();
    this._sessionGeneration = null;
    this._recordingStartTime = 0;
    this._reset();
  }

  _reset() {
    PerfUI.LineLevelProfile.instance().reset();
    this._tracingModel.reset();
    this._model.reset();
    for (let extensionEntry of this._extensionTracingModels)
      extensionEntry.model.reset();
    this._extensionTracingModels.splice(0);

    this.requestWindowTimes(0, Infinity);
    delete this._selection;
    this._frameModel.reset();
    this._filmStripModel.reset(this._tracingModel);
    this._overviewPane.reset();
    this._currentViews.forEach(view => view.reset());
    this._overviewControls.forEach(overview => overview.reset());
    this.select(null);
  }

  /**
   * @override
   */
  recordingStarted() {
    this._reset();
    this._setState(Timeline.TimelinePanel.State.Recording);
    this._showRecordingStarted();
    this._statusPane.updateStatus(Common.UIString('Profiling\u2026'));
    this._statusPane.updateProgressBar(Common.UIString('Buffer usage'), 0);
    this._statusPane.startTimer();
    this._hideLandingPage();
  }

  /**
   * @override
   * @param {number} usage
   */
  recordingProgress(usage) {
    this._statusPane.updateProgressBar(Common.UIString('Buffer usage'), usage * 100);
  }

  /**
   * @override
   * @param {string} title
   * @param {!SDK.TracingModel} tracingModel
   * @param {number} timeOffset
   */
  addExtensionEvents(title, tracingModel, timeOffset) {
    this._extensionTracingModels.push({title: title, model: tracingModel, timeOffset: timeOffset});
    if (this._state !== Timeline.TimelinePanel.State.Idle)
      return;
    tracingModel.adjustTime(this._model.minimumRecordTime() + (timeOffset / 1000) - this._recordingStartTime);
    for (let view of this._currentViews)
      view.extensionDataAdded();
  }

  /**
   * @override
   * @return {?symbol}
   */
  sessionGeneration() {
    return this._sessionGeneration;
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
      var e = createElement(tagName);
      e.textContent = contents;
      return e;
    }

    var learnMoreNode = UI.createExternalLink(
        'https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/', Common.UIString('Learn more'));
    var recordNode =
        encloseWithTag('b', UI.shortcutRegistry.shortcutDescriptorsForAction('timeline.toggle-recording')[0].name);
    var reloadNode = encloseWithTag('b', UI.shortcutRegistry.shortcutDescriptorsForAction('main.reload')[0].name);
    var navigateNode = encloseWithTag('b', Common.UIString('WASD'));

    this._landingPage = new UI.VBox();
    this._landingPage.contentElement.classList.add('timeline-landing-page', 'fill');
    var centered = this._landingPage.contentElement.createChild('div');

    var p = centered.createChild('p');
    p.createTextChild(Common.UIString(
        'The Performance panel lets you record what the browser does during page load and user interaction. ' +
        'The timeline it generates can help you determine why certain parts of your page are slow.'));

    p = centered.createChild('p');
    p.appendChild(UI.formatLocalized(
        'To capture a new recording, click the record toolbar button or hit %s. ' +
        'To evaluate page load performance, hit %s to record the reload.',
        [recordNode, reloadNode]));

    p = centered.createChild('p');
    p.appendChild(UI.formatLocalized(
        'After recording, select an area of interest in the overview by dragging. ' +
        'Then, zoom and pan the timeline with the mousewheel or %s keys.',
        [navigateNode]));

    p = centered.createChild('p');
    p.appendChild(learnMoreNode);

    var timelineSpan = encloseWithTag('b', Common.UIString('Timeline'));
    var performanceSpan = encloseWithTag('b', Common.UIString('Performance'));

    p = centered.createChild('p', 'timeline-landing-warning');
    p.appendChild(UI.formatLocalized(
        'The %s panel has been enriched with the JavaScript profiler capabilities and is now called %s.%s' +
        'You can find the legacy JavaScript CPU profiler under %s%s \u2192 More Tools \u2192 JavaScript Profiler.',
        [timelineSpan, performanceSpan, createElement('p'), createElement('br'), UI.Icon.create('largeicon-menu')]));

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

    if (this._statusPane)
      this._statusPane.hide();
    this._statusPane = new Timeline.TimelinePanel.StatusPane(false, this._cancelLoading.bind(this));
    this._statusPane.showPane(this._statusPaneContainer);
    this._statusPane.updateStatus(Common.UIString('Loading profile\u2026'));
    // FIXME: make loading from backend cancelable as well.
    if (!this._loader)
      this._statusPane.finish();
    this.loadingProgress(0);
  }

  /**
   * @override
   * @param {number=} progress
   */
  loadingProgress(progress) {
    if (typeof progress === 'number')
      this._statusPane.updateProgressBar(Common.UIString('Received'), progress * 100);
  }

  /**
   * @override
   * @param {boolean} success
   */
  loadingComplete(success) {
    var loadedFromFile = !!this._loader;
    delete this._loader;
    this._setState(Timeline.TimelinePanel.State.Idle);

    if (!success) {
      this._statusPane.hide();
      delete this._statusPane;
      this._clear();
      return;
    }

    if (this._statusPane)
      this._statusPane.updateStatus(Common.UIString('Processing profile\u2026'));
    this._model.setEvents(this._tracingModel, loadedFromFile);
    this._frameModel.reset();
    this._frameModel.addTraceEvents(
        SDK.targetManager.mainTarget(), this._model.inspectedTargetEvents(), this._model.sessionId() || '');
    this._filmStripModel.reset(this._tracingModel);
    var groups = TimelineModel.TimelineModel.AsyncEventGroup;
    var asyncEventsByGroup = this._model.mainThreadAsyncEvents();
    this._irModel.populate(asyncEventsByGroup.get(groups.input), asyncEventsByGroup.get(groups.animation));
    this._model.cpuProfiles().forEach(profile => PerfUI.LineLevelProfile.instance().appendCPUProfile(profile));
    if (this._statusPane)
      this._statusPane.hide();
    delete this._statusPane;

    for (let entry of this._extensionTracingModels)
      entry.model.adjustTime(this._model.minimumRecordTime() + (entry.timeOffset / 1000) - this._recordingStartTime);

    this._flameChart.resizeToPreferredHeights();
    this._overviewPane.reset();
    this._overviewPane.setBounds(this._model.minimumRecordTime(), this._model.maximumRecordTime());
    this._setAutoWindowTimes();
    this._refreshViews();
    for (var i = 0; i < this._overviewControls.length; ++i)
      this._overviewControls[i].timelineStopped();
    this._setMarkers();
    this._overviewPane.scheduleUpdate();
    this._updateSearchHighlight(false, true);
    this._detailsSplitWidget.showBoth();
  }

  _showRecordingStarted() {
    if (this._statusPane)
      return;
    this._statusPane = new Timeline.TimelinePanel.StatusPane(true, this._stopRecording.bind(this));
    this._statusPane.showPane(this._statusPaneContainer);
    this._statusPane.updateStatus(Common.UIString('Initializing profiler\u2026'));
  }

  _cancelLoading() {
    if (this._loader)
      this._loader.cancel();
  }

  _setMarkers() {
    var markers = new Map();
    var recordTypes = TimelineModel.TimelineModel.RecordType;
    var zeroTime = this._model.minimumRecordTime();
    for (var record of this._model.eventDividerRecords()) {
      if (record.type() === recordTypes.TimeStamp || record.type() === recordTypes.ConsoleTime)
        continue;
      markers.set(record.startTime(), Timeline.TimelineUIUtils.createDividerForRecord(record, zeroTime, 0));
    }
    this._overviewPane.setMarkers(markers);
  }

  /**
   * @param {!Common.Event} event
   */
  _pageReloadRequested(event) {
    if (this._state !== Timeline.TimelinePanel.State.Idle || !this.isShowing())
      return;
    this._startRecording(false);
  }

  /**
   * @param {!Common.Event} event
   */
  _loadEventFired(event) {
    if (this._state !== Timeline.TimelinePanel.State.Recording || !this._autoRecordGeneration)
      return;
    setTimeout(stopRecordingOnReload.bind(this, this._autoRecordGeneration), this._millisecondsToRecordAfterLoadEvent);

    /**
     * @this {Timeline.TimelinePanel}
     * @param {!Object} recordGeneration
     */
    function stopRecordingOnReload(recordGeneration) {
      // Check if we're still in the same recording session.
      if (this._state !== Timeline.TimelinePanel.State.Recording || this._autoRecordGeneration !== recordGeneration)
        return;
      this._stopRecording();
    }
  }

  // UI.Searchable implementation

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._searchResults || !this._searchResults.length)
      return;
    var index = this._selectedSearchResult ? this._searchResults.indexOf(this._selectedSearchResult) : -1;
    this._jumpToSearchResult(index + 1);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchResults || !this._searchResults.length)
      return;
    var index = this._selectedSearchResult ? this._searchResults.indexOf(this._selectedSearchResult) : 0;
    this._jumpToSearchResult(index - 1);
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return false;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return false;
  }

  /**
   * @param {number} index
   */
  _jumpToSearchResult(index) {
    this._selectSearchResult((index + this._searchResults.length) % this._searchResults.length);
    this._currentViews[0].highlightSearchResult(this._selectedSearchResult, this._searchRegex, true);
  }

  /**
   * @param {number} index
   */
  _selectSearchResult(index) {
    this._selectedSearchResult = this._searchResults[index];
    this._searchableView.updateCurrentMatchIndex(index);
  }

  _clearHighlight() {
    this._currentViews[0].highlightSearchResult(null);
  }

  /**
   * @param {boolean} revealRecord
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  _updateSearchHighlight(revealRecord, shouldJump, jumpBackwards) {
    if (!this._searchRegex) {
      this._clearHighlight();
      return;
    }

    if (!this._searchResults)
      this._updateSearchResults(shouldJump, jumpBackwards);
    this._currentViews[0].highlightSearchResult(this._selectedSearchResult, this._searchRegex, revealRecord);
  }

  /**
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  _updateSearchResults(shouldJump, jumpBackwards) {
    if (!this._searchRegex)
      return;

    // FIXME: search on all threads.
    var events = this._model.mainThreadEvents();
    var filters = this._filters.concat([new Timeline.TimelineTextFilter(this._searchRegex)]);
    var matches = [];
    for (var index = events.lowerBound(this._windowStartTime, (time, event) => time - event.startTime);
         index < events.length; ++index) {
      var event = events[index];
      if (event.startTime > this._windowEndTime)
        break;
      if (TimelineModel.TimelineModel.isVisible(filters, event))
        matches.push(event);
    }

    var matchesCount = matches.length;
    if (matchesCount) {
      this._searchResults = matches;
      this._searchableView.updateSearchMatchesCount(matchesCount);

      var selectedIndex = matches.indexOf(this._selectedSearchResult);
      if (shouldJump && selectedIndex === -1)
        selectedIndex = jumpBackwards ? this._searchResults.length - 1 : 0;
      this._selectSearchResult(selectedIndex);
    } else {
      this._searchableView.updateSearchMatchesCount(0);
      delete this._selectedSearchResult;
    }
  }

  /**
   * @override
   */
  searchCanceled() {
    this._clearHighlight();
    delete this._searchResults;
    delete this._selectedSearchResult;
    delete this._searchRegex;
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    var query = searchConfig.query;
    this._searchRegex = createPlainTextSearchRegex(query, 'i');
    delete this._searchResults;
    this._updateSearchHighlight(true, shouldJump, jumpBackwards);
  }

  /**
   * @param {!Timeline.TimelineSelection} selection
   * @return {?TimelineModel.TimelineFrame}
   */
  _frameForSelection(selection) {
    switch (selection.type()) {
      case Timeline.TimelineSelection.Type.Frame:
        return /** @type {!TimelineModel.TimelineFrame} */ (selection.object());
      case Timeline.TimelineSelection.Type.Range:
        return null;
      case Timeline.TimelineSelection.Type.TraceEvent:
        return this._frameModel.filteredFrames(selection._endTime, selection._endTime)[0];
      default:
        console.assert(false, 'Should never be reached');
        return null;
    }
  }

  /**
   * @param {number} offset
   */
  _jumpToFrame(offset) {
    var currentFrame = this._frameForSelection(this._selection);
    if (!currentFrame)
      return;
    var frames = this._frameModel.frames();
    var index = frames.indexOf(currentFrame);
    console.assert(index >= 0, 'Can\'t find current frame in the frame list');
    index = Number.constrain(index + offset, 0, frames.length - 1);
    var frame = frames[index];
    this._revealTimeRange(frame.startTime, frame.endTime);
    this.select(Timeline.TimelineSelection.fromFrame(frame));
    return true;
  }

  /**
   * @override
   * @param {?Timeline.TimelineSelection} selection
   * @param {!Timeline.TimelineDetailsView.Tab=} preferredTab
   */
  select(selection, preferredTab) {
    if (!selection)
      selection = Timeline.TimelineSelection.fromRange(this._windowStartTime, this._windowEndTime);
    this._selection = selection;
    if (preferredTab)
      this._detailsView.setPreferredTab(preferredTab);
    for (var view of this._currentViews)
      view.setSelection(selection);
    this._detailsView.setSelection(selection);
  }

  /**
   * @override
   * @param {number} time
   */
  selectEntryAtTime(time) {
    var events = this._model.mainThreadEvents();
    // Find best match, then backtrack to the first visible entry.
    for (var index = events.upperBound(time, (time, event) => time - event.startTime) - 1; index >= 0; --index) {
      var event = events[index];
      var endTime = event.endTime || event.startTime;
      if (SDK.TracingModel.isTopLevelEvent(event) && endTime < time)
        break;
      if (TimelineModel.TimelineModel.isVisible(this._filters, event) && endTime >= time) {
        this.select(Timeline.TimelineSelection.fromTraceEvent(event));
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
    for (var view of this._currentViews)
      view.highlightEvent(event);
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  _revealTimeRange(startTime, endTime) {
    var timeShift = 0;
    if (this._windowEndTime < endTime)
      timeShift = endTime - this._windowEndTime;
    else if (this._windowStartTime > startTime)
      timeShift = startTime - this._windowStartTime;
    if (timeShift)
      this.requestWindowTimes(this._windowStartTime + timeShift, this._windowEndTime + timeShift);
  }

  /**
   * @param {!DataTransfer} dataTransfer
   */
  _handleDrop(dataTransfer) {
    var items = dataTransfer.items;
    if (!items.length)
      return;
    var item = items[0];
    if (item.kind === 'string') {
      var url = dataTransfer.getData('text/uri-list');
      if (new Common.ParsedURL(url).isValid)
        this._loadFromURL(url);
    } else if (item.kind === 'file') {
      var entry = items[0].webkitGetAsEntry();
      if (!entry.isFile)
        return;
      entry.file(this._loadFromFile.bind(this));
    }
  }

  _setAutoWindowTimes() {
    var tasks = this._model.mainThreadTasks();
    if (!tasks.length) {
      this.requestWindowTimes(this._tracingModel.minimumRecordTime(), this._tracingModel.maximumRecordTime());
      return;
    }
    /**
     * @param {number} startIndex
     * @param {number} stopIndex
     * @return {number}
     */
    function findLowUtilizationRegion(startIndex, stopIndex) {
      var /** @const */ threshold = 0.1;
      var cutIndex = startIndex;
      var cutTime = (tasks[cutIndex].startTime() + tasks[cutIndex].endTime()) / 2;
      var usedTime = 0;
      var step = Math.sign(stopIndex - startIndex);
      for (var i = startIndex; i !== stopIndex; i += step) {
        var task = tasks[i];
        var taskTime = (task.startTime() + task.endTime()) / 2;
        var interval = Math.abs(cutTime - taskTime);
        if (usedTime < threshold * interval) {
          cutIndex = i;
          cutTime = taskTime;
          usedTime = 0;
        }
        usedTime += task.endTime() - task.startTime();
      }
      return cutIndex;
    }
    var rightIndex = findLowUtilizationRegion(tasks.length - 1, 0);
    var leftIndex = findLowUtilizationRegion(0, rightIndex);
    var leftTime = tasks[leftIndex].startTime();
    var rightTime = tasks[rightIndex].endTime();
    var span = rightTime - leftTime;
    var totalSpan = this._tracingModel.maximumRecordTime() - this._tracingModel.minimumRecordTime();
    if (span < totalSpan * 0.1) {
      leftTime = this._tracingModel.minimumRecordTime();
      rightTime = this._tracingModel.maximumRecordTime();
    } else {
      leftTime = Math.max(leftTime - 0.05 * span, this._tracingModel.minimumRecordTime());
      rightTime = Math.min(rightTime + 0.05 * span, this._tracingModel.maximumRecordTime());
    }
    this.requestWindowTimes(leftTime, rightTime);
  }
};

/**
 * @enum {symbol}
 */
Timeline.TimelinePanel.State = {
  Idle: Symbol('Idle'),
  StartPending: Symbol('StartPending'),
  Recording: Symbol('Recording'),
  StopPending: Symbol('StopPending'),
  Loading: Symbol('Loading')
};

// Define row and header height, should be in sync with styles for timeline graphs.
Timeline.TimelinePanel.rowHeight = 18;
Timeline.TimelinePanel.headerHeight = 20;

/**
 * @interface
 */
Timeline.LoaderClient = function() {};

Timeline.LoaderClient.prototype = {
  loadingStarted() {},

  /**
   * @param {number=} progress
   */
  loadingProgress(progress) {},

  /**
   * @param {boolean} success
   */
  loadingComplete(success) {},
};

/**
 * @interface
 * @extends {Timeline.LoaderClient}
 */
Timeline.TimelineLifecycleDelegate = function() {};

Timeline.TimelineLifecycleDelegate.prototype = {
  recordingStarted() {},

  /**
   * @param {number} usage
   */
  recordingProgress(usage) {},

  /**
   * @param {string} title
   * @param {!SDK.TracingModel} tracingModel
   * @param {number} timeOffset
   */
  addExtensionEvents(title, tracingModel, timeOffset) {},

  /** @return {?symbol} */
  sessionGeneration() {}
};

Timeline.TimelineSelection = class {
  /**
   * @param {!Timeline.TimelineSelection.Type} type
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
   * @param {!TimelineModel.TimelineFrame} frame
   * @return {!Timeline.TimelineSelection}
   */
  static fromFrame(frame) {
    return new Timeline.TimelineSelection(Timeline.TimelineSelection.Type.Frame, frame.startTime, frame.endTime, frame);
  }

  /**
   * @param {!TimelineModel.TimelineModel.NetworkRequest} request
   * @return {!Timeline.TimelineSelection}
   */
  static fromNetworkRequest(request) {
    return new Timeline.TimelineSelection(
        Timeline.TimelineSelection.Type.NetworkRequest, request.startTime, request.endTime || request.startTime,
        request);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {!Timeline.TimelineSelection}
   */
  static fromTraceEvent(event) {
    return new Timeline.TimelineSelection(
        Timeline.TimelineSelection.Type.TraceEvent, event.startTime, event.endTime || (event.startTime + 1), event);
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   * @return {!Timeline.TimelineSelection}
   */
  static fromRange(startTime, endTime) {
    return new Timeline.TimelineSelection(Timeline.TimelineSelection.Type.Range, startTime, endTime);
  }

  /**
   * @return {!Timeline.TimelineSelection.Type}
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
};

/**
 * @enum {string}
 */
Timeline.TimelineSelection.Type = {
  Frame: 'Frame',
  NetworkRequest: 'NetworkRequest',
  TraceEvent: 'TraceEvent',
  Range: 'Range'
};


/**
 * @interface
 * @extends {Common.EventTarget}
 */
Timeline.TimelineModeView = function() {};

Timeline.TimelineModeView.prototype = {
  /**
   * @return {!UI.Widget}
   */
  view() {},

  dispose() {},

  /**
   * @return {?Element}
   */
  resizerElement() {},

  reset() {},

  refreshRecords() {},

  extensionDataAdded() {},

  /**
   * @param {?SDK.TracingModel.Event} event
   * @param {string=} regex
   * @param {boolean=} select
   */
  highlightSearchResult(event, regex, select) {},

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  setWindowTimes(startTime, endTime) {},

  /**
   * @param {?Timeline.TimelineSelection} selection
   */
  setSelection(selection) {},

  /**
   * @param {?SDK.TracingModel.Event} event
   */
  highlightEvent(event) {}
};

/**
 * @interface
 */
Timeline.TimelineModeViewDelegate = function() {};

Timeline.TimelineModeViewDelegate.prototype = {
  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  requestWindowTimes(startTime, endTime) {},

  /**
   * @param {?Timeline.TimelineSelection} selection
   * @param {!Timeline.TimelineDetailsView.Tab=} preferredTab
   */
  select(selection, preferredTab) {},

  /**
   * @param {number} time
   */
  selectEntryAtTime(time) {},

  /**
   * @param {?SDK.TracingModel.Event} event
   */
  highlightEvent(event) {}
};

/**
 * @unrestricted
 */
Timeline.TimelineCategoryFilter = class extends TimelineModel.TimelineModel.Filter {
  constructor() {
    super();
  }

  /**
   * @override
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  accept(event) {
    return !Timeline.TimelineUIUtils.eventStyle(event).category.hidden;
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineIsLongFilter = class extends TimelineModel.TimelineModel.Filter {
  constructor() {
    super();
    this._minimumRecordDuration = 0;
  }

  /**
   * @param {number} value
   */
  setMinimumRecordDuration(value) {
    this._minimumRecordDuration = value;
  }

  /**
   * @override
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  accept(event) {
    var duration = event.endTime ? event.endTime - event.startTime : 0;
    return duration >= this._minimumRecordDuration;
  }
};

Timeline.TimelineTextFilter = class extends TimelineModel.TimelineModel.Filter {
  /**
   * @param {!RegExp=} regExp
   */
  constructor(regExp) {
    super();
    /** @type {?RegExp} */
    this._regExp;
    this._setRegExp(regExp || null);
  }

  /**
   * @param {?RegExp} regExp
   */
  _setRegExp(regExp) {
    this._regExp = regExp;
  }

  /**
   * @override
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  accept(event) {
    return !this._regExp || Timeline.TimelineUIUtils.testContentMatching(event, this._regExp);
  }
};

/**
 * @unrestricted
 */
Timeline.TimelinePanel.StatusPane = class extends UI.VBox {
  /**
   * @param {boolean} showTimer
   * @param {function()} stopCallback
   */
  constructor(showTimer, stopCallback) {
    super(true);
    this.registerRequiredCSS('timeline/timelineStatusDialog.css');
    this.contentElement.classList.add('timeline-status-dialog');

    var statusLine = this.contentElement.createChild('div', 'status-dialog-line status');
    statusLine.createChild('div', 'label').textContent = Common.UIString('Status');
    this._status = statusLine.createChild('div', 'content');

    if (showTimer) {
      var timeLine = this.contentElement.createChild('div', 'status-dialog-line time');
      timeLine.createChild('div', 'label').textContent = Common.UIString('Time');
      this._time = timeLine.createChild('div', 'content');
    }
    var progressLine = this.contentElement.createChild('div', 'status-dialog-line progress');
    this._progressLabel = progressLine.createChild('div', 'label');
    this._progressBar = progressLine.createChild('div', 'indicator-container').createChild('div', 'indicator');

    this._stopButton = UI.createTextButton(Common.UIString('Stop'), stopCallback);
    this.contentElement.createChild('div', 'stop-button').appendChild(this._stopButton);
  }

  finish() {
    this._stopTimer();
    this._stopButton.disabled = true;
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
    this._updateTimer();
  }

  startTimer() {
    this._startTime = Date.now();
    this._timeUpdateTimer = setInterval(this._updateTimer.bind(this, false), 1000);
    this._updateTimer();
  }

  _stopTimer() {
    if (!this._timeUpdateTimer)
      return;
    clearInterval(this._timeUpdateTimer);
    this._updateTimer(true);
    delete this._timeUpdateTimer;
  }

  /**
   * @param {boolean=} precise
   */
  _updateTimer(precise) {
    if (!this._timeUpdateTimer)
      return;
    var elapsed = (Date.now() - this._startTime) / 1000;
    this._time.textContent = Common.UIString('%s\u2009sec', elapsed.toFixed(precise ? 1 : 0));
  }
};


/**
 * @implements {Common.QueryParamHandler}
 * @unrestricted
 */
Timeline.LoadTimelineHandler = class {
  /**
   * @override
   * @param {string} value
   */
  handleQueryParam(value) {
    UI.viewManager.showView('timeline').then(() => {
      Timeline.TimelinePanel.instance()._loadFromURL(window.decodeURIComponent(value));
    });
  }
};

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Timeline.TimelinePanel.ActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var panel = UI.context.flavor(Timeline.TimelinePanel);
    console.assert(panel && panel instanceof Timeline.TimelinePanel);
    switch (actionId) {
      case 'timeline.toggle-recording':
        panel._toggleRecording();
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
    }
    return false;
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineFilters = class extends Common.Object {
  constructor() {
    super();

    this._categoryFilter = new Timeline.TimelineCategoryFilter();
    this._durationFilter = new Timeline.TimelineIsLongFilter();
    this._textFilter = new Timeline.TimelineTextFilter();
    this._filters = [this._categoryFilter, this._durationFilter, this._textFilter];

    this._createFilterBar();
  }

  /**
   * @return {!Array<!TimelineModel.TimelineModel.Filter>}
   */
  filters() {
    return this._filters;
  }

  /**
   * @return {?RegExp}
   */
  searchRegExp() {
    return this._textFilter._regExp;
  }

  /**
   * @return {!UI.ToolbarItem}
   */
  filterButton() {
    return this._filterBar.filterButton();
  }

  /**
   * @return {!UI.Widget}
   */
  filtersWidget() {
    return this._filterBar;
  }

  _createFilterBar() {
    this._filterBar = new UI.FilterBar('timelinePanel');

    this._textFilterUI = new UI.TextFilterUI();
    this._textFilterUI.addEventListener(UI.FilterUI.Events.FilterChanged, textFilterChanged, this);
    this._filterBar.addFilter(this._textFilterUI);

    var durationOptions = [];
    for (var durationMs of Timeline.TimelineFilters._durationFilterPresetsMs) {
      var durationOption = {};
      if (!durationMs) {
        durationOption.label = Common.UIString('All');
        durationOption.title = Common.UIString('Show all records');
      } else {
        durationOption.label = Common.UIString('\u2265 %dms', durationMs);
        durationOption.title = Common.UIString('Hide records shorter than %dms', durationMs);
      }
      durationOption.value = durationMs;
      durationOptions.push(durationOption);
    }
    var durationFilterUI = new UI.ComboBoxFilterUI(durationOptions);
    durationFilterUI.addEventListener(UI.FilterUI.Events.FilterChanged, durationFilterChanged, this);
    this._filterBar.addFilter(durationFilterUI);

    var categoryFiltersUI = {};
    var categories = Timeline.TimelineUIUtils.categories();
    for (var categoryName in categories) {
      var category = categories[categoryName];
      if (!category.visible)
        continue;
      var filter = new UI.CheckboxFilterUI(category.name, category.title);
      filter.setColor(category.color, 'rgba(0, 0, 0, 0.2)');
      categoryFiltersUI[category.name] = filter;
      filter.addEventListener(UI.FilterUI.Events.FilterChanged, categoriesFilterChanged.bind(this, categoryName));
      this._filterBar.addFilter(filter);
    }
    return this._filterBar;

    /**
     * @this {Timeline.TimelineFilters}
     */
    function textFilterChanged() {
      var searchQuery = this._textFilterUI.value();
      this._textFilter._setRegExp(searchQuery ? createPlainTextSearchRegex(searchQuery, 'i') : null);
      this._notifyFiltersChanged();
    }

    /**
     * @this {Timeline.TimelineFilters}
     */
    function durationFilterChanged() {
      var duration = durationFilterUI.value();
      var minimumRecordDuration = parseInt(duration, 10);
      this._durationFilter.setMinimumRecordDuration(minimumRecordDuration);
      this._notifyFiltersChanged();
    }

    /**
     * @param {string} name
     * @this {Timeline.TimelineFilters}
     */
    function categoriesFilterChanged(name) {
      var categories = Timeline.TimelineUIUtils.categories();
      categories[name].hidden = !categoryFiltersUI[name].checked();
      this._notifyFiltersChanged();
    }
  }

  _notifyFiltersChanged() {
    this.dispatchEventToListeners(Timeline.TimelineFilters.Events.FilterChanged);
  }
};

Timeline.TimelinePanel._traceProviderSettingSymbol = Symbol('traceProviderSetting');

/** @enum {symbol} */
Timeline.TimelineFilters.Events = {
  FilterChanged: Symbol('FilterChanged')
};

Timeline.TimelineFilters._durationFilterPresetsMs = [0, 1, 15];
