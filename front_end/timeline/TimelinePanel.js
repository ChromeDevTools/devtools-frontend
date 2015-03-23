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
 * @constructor
 * @extends {WebInspector.Panel}
 * @implements {WebInspector.TimelineModeViewDelegate}
 * @implements {WebInspector.Searchable}
 */
WebInspector.TimelinePanel = function()
{
    WebInspector.Panel.call(this, "timeline");
    this.registerRequiredCSS("timeline/timelinePanel.css");
    this.registerRequiredCSS("ui/filter.css");
    this.element.addEventListener("contextmenu", this._contextMenu.bind(this), false);
    this._dropTarget = new WebInspector.DropTarget(this.element, [WebInspector.DropTarget.Types.Files, WebInspector.DropTarget.Types.URIList], WebInspector.UIString("Drop timeline file or URL here"), this._handleDrop.bind(this));

    this._detailsLinkifier = new WebInspector.Linkifier();
    this._windowStartTime = 0;
    this._windowEndTime = Infinity;
    this._millisecondsToRecordAfterLoadEvent = 3000;

    // Create model.
    this._tracingModelBackingStorage = new WebInspector.TempFileBackingStorage("tracing");
    this._tracingModel = new WebInspector.TracingModel(this._tracingModelBackingStorage);
    this._model = new WebInspector.TimelineModel(this._tracingModel, WebInspector.TimelineUIUtils.visibleRecordsFilter());

    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStarted, this._onRecordingStarted, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordingStopped, this._onRecordingStopped, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordsCleared, this._onRecordsCleared, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RecordFilterChanged, this._refreshViews, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.BufferUsage, this._onTracingBufferUsage, this);
    this._model.addEventListener(WebInspector.TimelineModel.Events.RetrieveEventsProgress, this._onRetrieveEventsProgress, this);

    this._categoryFilter = new WebInspector.TimelineCategoryFilter();
    this._durationFilter = new WebInspector.TimelineIsLongFilter();
    this._textFilter = new WebInspector.TimelineTextFilter();
    this._model.addFilter(this._categoryFilter);
    this._model.addFilter(this._durationFilter);
    this._model.addFilter(this._textFilter);
    this._model.addFilter(new WebInspector.TimelineStaticFilter());

    /** @type {!Array.<!WebInspector.TimelineModeView>} */
    this._currentViews = [];

    this._overviewModeSetting = WebInspector.settings.createSetting("timelineOverviewMode", WebInspector.TimelinePanel.OverviewMode.Frames);
    this._flameChartEnabledSetting = WebInspector.settings.createSetting("timelineFlameChartEnabled", true);
    this._createStatusBarItems();

    var topPaneElement = this.element.createChild("div", "hbox");
    topPaneElement.id = "timeline-overview-panel";

    // Create top overview component.
    this._overviewPane = new WebInspector.TimelineOverviewPane(this._model);
    this._overviewPane.addEventListener(WebInspector.TimelineOverviewPane.Events.WindowChanged, this._onWindowChanged.bind(this));
    this._overviewPane.show(topPaneElement);

    this._createFileSelector();
    this._registerShortcuts();

    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.WillReloadPage, this._willReloadPage, this);
    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.Load, this._loadEventFired, this);

    // Create top level properties splitter.
    this._detailsSplitView = new WebInspector.SplitView(false, true, "timelinePanelDetailsSplitViewState");
    this._detailsSplitView.element.classList.add("timeline-details-split");
    this._detailsView = new WebInspector.TimelineDetailsView(this._model);
    this._detailsSplitView.installResizer(this._detailsView.headerElement());
    this._detailsSplitView.setSidebarView(this._detailsView);

    this._searchableView = new WebInspector.SearchableView(this);
    this._searchableView.setMinimumSize(0, 25);
    this._searchableView.element.classList.add("searchable-view");
    this._detailsSplitView.setMainView(this._searchableView);

    this._stackView = new WebInspector.StackView(false);
    this._stackView.show(this._searchableView.element);
    this._stackView.element.classList.add("timeline-view-stack");

    this._onModeChanged();
    this._detailsSplitView.show(this.element);
    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.SuspendStateChanged, this._onSuspendStateChanged, this);
}

WebInspector.TimelinePanel.OverviewMode = {
    Events: "Events",
    Frames: "Frames"
};

/**
 * @enum {string}
 */
WebInspector.TimelinePanel.DetailsTab = {
    Details: "Details",
    BottomUpChart: "BottomUpChart",
    PaintProfiler: "PaintProfiler",
    LayerViewer: "LayerViewer"
};

// Define row and header height, should be in sync with styles for timeline graphs.
WebInspector.TimelinePanel.rowHeight = 18;
WebInspector.TimelinePanel.headerHeight = 20;

WebInspector.TimelinePanel._aggregatedStatsKey = Symbol("aggregatedStats");

WebInspector.TimelinePanel.durationFilterPresetsMs = [0, 1, 15];

WebInspector.TimelinePanel.prototype = {
    /**
     * @override
     * @return {?WebInspector.SearchableView}
     */
    searchableView: function()
    {
        return this._searchableView;
    },

    wasShown: function()
    {
        if (!WebInspector.TimelinePanel._categoryStylesInitialized) {
            WebInspector.TimelinePanel._categoryStylesInitialized = true;
            var style = createElement("style");
            var categories = WebInspector.TimelineUIUtils.categories();
            style.textContent = Object.values(categories).map(WebInspector.TimelineUIUtils.createStyleRuleForCategory).join("\n");
            this.element.ownerDocument.head.appendChild(style);
        }
    },

    /**
     * @return {number}
     */
    windowStartTime: function()
    {
        if (this._windowStartTime)
            return this._windowStartTime;
        return this._model.minimumRecordTime();
    },

    /**
     * @return {number}
     */
    windowEndTime: function()
    {
        if (this._windowEndTime < Infinity)
            return this._windowEndTime;
        return this._model.maximumRecordTime() || Infinity;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _sidebarResized: function(event)
    {
        var width = /** @type {number} */ (event.data);
        for (var i = 0; i < this._currentViews.length; ++i)
            this._currentViews[i].setSidebarSize(width);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onWindowChanged: function(event)
    {
        this._windowStartTime = event.data.startTime;
        this._windowEndTime = event.data.endTime;

        for (var i = 0; i < this._currentViews.length; ++i)
            this._currentViews[i].setWindowTimes(this._windowStartTime, this._windowEndTime);
    },

    /**
     * @override
     * @param {number} windowStartTime
     * @param {number} windowEndTime
     */
    requestWindowTimes: function(windowStartTime, windowEndTime)
    {
        this._overviewPane.requestWindowTimes(windowStartTime, windowEndTime);
    },

    /**
     * @return {!WebInspector.TimelineFrameModelBase}
     */
    _frameModel: function()
    {
        if (!this._lazyFrameModel) {
            var tracingFrameModel = new WebInspector.TracingTimelineFrameModel();
            tracingFrameModel.addTraceEvents(this._model.target(), this._model.inspectedTargetEvents(), this._tracingModel.sessionId() || "");
            this._lazyFrameModel = tracingFrameModel;
        }
        return this._lazyFrameModel;
    },

    /**
     * @return {!WebInspector.TimelineView}
     */
    _timelineView: function()
    {
        if (!this._lazyTimelineView)
            this._lazyTimelineView = new WebInspector.TimelineView(this, this._model);
        return this._lazyTimelineView;
    },

    /**
     * @return {!WebInspector.View}
     */
    _layersView: function()
    {
        if (this._lazyLayersView)
            return this._lazyLayersView;
        this._lazyLayersView = new WebInspector.TimelineLayersView();
        this._lazyLayersView.setTimelineModelAndDelegate(this._model, this);
        return this._lazyLayersView;
    },

    _paintProfilerView: function()
    {
        if (this._lazyPaintProfilerView)
            return this._lazyPaintProfilerView;
        this._lazyPaintProfilerView = new WebInspector.TimelinePaintProfilerView(/** @type {!WebInspector.TracingTimelineFrameModel} */(this._frameModel()));
        return this._lazyPaintProfilerView;
    },

    /**
     * @param {!WebInspector.TimelineModeView} modeView
     */
    _addModeView: function(modeView)
    {
        modeView.setWindowTimes(this.windowStartTime(), this.windowEndTime());
        modeView.refreshRecords(this._textFilter._regex);
        this._stackView.appendView(modeView.view(), "timelinePanelTimelineStackSplitViewState");
        modeView.view().addEventListener(WebInspector.SplitView.Events.SidebarSizeChanged, this._sidebarResized, this);
        this._currentViews.push(modeView);
    },

    _removeAllModeViews: function()
    {
        for (var i = 0; i < this._currentViews.length; ++i) {
            this._currentViews[i].removeEventListener(WebInspector.SplitView.Events.SidebarSizeChanged, this._sidebarResized, this);
            this._currentViews[i].dispose();
        }
        this._currentViews = [];
        this._stackView.detachChildViews();
    },

    /**
     * @param {string} name
     * @param {!WebInspector.Setting} setting
     * @param {string} tooltip
     * @return {!WebInspector.StatusBarItem}
     */
    _createSettingCheckbox: function(name, setting, tooltip)
    {
        if (!this._recordingOptionUIControls)
            this._recordingOptionUIControls = [];
        var checkboxItem = new WebInspector.StatusBarCheckbox(name, tooltip, setting);
        this._recordingOptionUIControls.push(checkboxItem);
        return checkboxItem;
    },

    _createStatusBarItems: function()
    {
        this._panelToolbar = new WebInspector.StatusBar(this.element);

        this.toggleTimelineButton = new WebInspector.StatusBarButton("Record timeline", "record-status-bar-item");
        this.toggleTimelineButton.addEventListener("click", this._toggleTimelineButtonClicked, this);
        this._panelToolbar.appendStatusBarItem(this.toggleTimelineButton);
        this._updateToggleTimelineButton(false);

        var clearButton = new WebInspector.StatusBarButton(WebInspector.UIString("Clear recording"), "clear-status-bar-item");
        clearButton.addEventListener("click", this._onClearButtonClick, this);
        this._panelToolbar.appendStatusBarItem(clearButton);

        this._filterBar = this._createFilterBar();
        this._panelToolbar.appendStatusBarItem(this._filterBar.filterButton());

        var garbageCollectButton = new WebInspector.StatusBarButton(WebInspector.UIString("Collect garbage"), "garbage-collect-status-bar-item");
        garbageCollectButton.addEventListener("click", this._garbageCollectButtonClicked, this);
        this._panelToolbar.appendStatusBarItem(garbageCollectButton);

        var viewModeLabel = new WebInspector.StatusBarText(WebInspector.UIString("View Mode:"), "timeline-status-bar-group-label");
        this._panelToolbar.appendStatusBarItem(viewModeLabel);

        var framesToggleButton = new WebInspector.StatusBarButton(WebInspector.UIString("Frames view. (Activity split into frames)"), "histogram-status-bar-item");
        framesToggleButton.setToggled(this._overviewModeSetting.get() === WebInspector.TimelinePanel.OverviewMode.Frames);
        framesToggleButton.addEventListener("click", this._overviewModeChanged.bind(this, framesToggleButton));
        this._panelToolbar.appendStatusBarItem(framesToggleButton);

        this._flameChartToggleButton = new WebInspector.StatusBarButton(WebInspector.UIString("Flame chart view. (Use WASD or time selection to navigate)"), "flame-chart-status-bar-item");
        this._flameChartToggleButton.setToggled(this._flameChartEnabledSetting.get());
        this._flameChartToggleButton.addEventListener("click", this._flameChartEnabledChanged.bind(this));
        this._panelToolbar.appendStatusBarItem(this._flameChartToggleButton);

        var captureSettingsLabel = new WebInspector.StatusBarText(WebInspector.UIString("Capture Details:"), "timeline-status-bar-group-label");
        this._panelToolbar.appendStatusBarItem(captureSettingsLabel);

        this._captureNetworkSetting = WebInspector.settings.createSetting("timelineCaptureNetwork", false);
        this._captureNetworkSetting.addChangeListener(this._onNetworkChanged, this);
        if (Runtime.experiments.isEnabled("networkRequestsOnTimeline")) {
            this._panelToolbar.appendStatusBarItem(this._createSettingCheckbox(WebInspector.UIString("Network"),
                                                                          this._captureNetworkSetting,
                                                                          WebInspector.UIString("Capture network requests information")));
        }
        this._captureCausesSetting = WebInspector.settings.createSetting("timelineCaptureCauses", true);
        this._captureCausesSetting.addChangeListener(this._refreshViews, this);
        this._panelToolbar.appendStatusBarItem(this._createSettingCheckbox(WebInspector.UIString("Causes"),
                                                                      this._captureCausesSetting,
                                                                      WebInspector.UIString("Capture causes (e.g., stack traces) for timeline events. (Has performance overhead)")));
        this._enableJSSamplingSettingSetting = WebInspector.settings.createSetting("timelineEnableJSSampling", false);
        this._panelToolbar.appendStatusBarItem(this._createSettingCheckbox(WebInspector.UIString("JS Profiler"),
                                                                      this._enableJSSamplingSettingSetting,
                                                                      WebInspector.UIString("Enable JavaScript sampling profiler. (Has performance overhead)")));

        this._captureMemorySetting = WebInspector.settings.createSetting("timelineCaptureMemory", false);
        this._panelToolbar.appendStatusBarItem(this._createSettingCheckbox(WebInspector.UIString("Memory"),
                                                                      this._captureMemorySetting,
                                                                      WebInspector.UIString("Capture memory information on every timeline event")));
        this._captureMemorySetting.addChangeListener(this._onModeChanged, this);
        this._captureLayersAndPicturesSetting = WebInspector.settings.createSetting("timelineCaptureLayersAndPictures", false);
        this._panelToolbar.appendStatusBarItem(this._createSettingCheckbox(WebInspector.UIString("Paint"),
                                                                      this._captureLayersAndPicturesSetting,
                                                                      WebInspector.UIString("Capture graphics layer positions and painted pictures.  (Has performance overhead)")));

        this._progressStatusBarItem = new WebInspector.StatusBarItem(createElement("div"));
        this._progressStatusBarItem.setVisible(false);
        this._panelToolbar.appendStatusBarItem(this._progressStatusBarItem);

        this._filtersContainer = this.element.createChild("div", "timeline-filters-header hidden");
        this._filtersContainer.appendChild(this._filterBar.filtersElement());
        this._filterBar.addEventListener(WebInspector.FilterBar.Events.FiltersToggled, this._onFiltersToggled, this);
        this._filterBar.setName("timelinePanel");
    },

    /**
     * @return {!WebInspector.FilterBar}
     */
    _createFilterBar: function()
    {
        this._filterBar = new WebInspector.FilterBar();
        this._filters = {};
        this._filters._textFilterUI = new WebInspector.TextFilterUI();
        this._filters._textFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._textFilterChanged, this);
        this._filterBar.addFilter(this._filters._textFilterUI);

        var durationOptions = [];
        for (var presetIndex = 0; presetIndex < WebInspector.TimelinePanel.durationFilterPresetsMs.length; ++presetIndex) {
            var durationMs = WebInspector.TimelinePanel.durationFilterPresetsMs[presetIndex];
            var durationOption = {};
            if (!durationMs) {
                durationOption.label = WebInspector.UIString("All");
                durationOption.title = WebInspector.UIString("Show all records");
            } else {
                durationOption.label = WebInspector.UIString("\u2265 %dms", durationMs);
                durationOption.title = WebInspector.UIString("Hide records shorter than %dms", durationMs);
            }
            durationOption.value = durationMs;
            durationOptions.push(durationOption);
        }
        this._filters._durationFilterUI = new WebInspector.ComboBoxFilterUI(durationOptions);
        this._filters._durationFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._durationFilterChanged, this);
        this._filterBar.addFilter(this._filters._durationFilterUI);

        this._filters._categoryFiltersUI = {};
        var categories = WebInspector.TimelineUIUtils.categories();
        for (var categoryName in categories) {
            var category = categories[categoryName];
            if (!category.visible)
                continue;
            var filter = new WebInspector.CheckboxFilterUI(category.name, category.title);
            this._filters._categoryFiltersUI[category.name] = filter;
            filter.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._categoriesFilterChanged.bind(this, categoryName), this);
            this._filterBar.addFilter(filter);
        }
        return this._filterBar;
    },

    _textFilterChanged: function(event)
    {
        var searchQuery = this._filters._textFilterUI.value();
        this.searchCanceled();
        this._textFilter.setRegex(searchQuery ? createPlainTextSearchRegex(searchQuery, "i") : null);
    },

    _durationFilterChanged: function()
    {
        var duration = this._filters._durationFilterUI.value();
        var minimumRecordDuration = parseInt(duration, 10);
        this._durationFilter.setMinimumRecordDuration(minimumRecordDuration);
    },

    _categoriesFilterChanged: function(name, event)
    {
        var categories = WebInspector.TimelineUIUtils.categories();
        categories[name].hidden = !this._filters._categoryFiltersUI[name].checked();
        this._categoryFilter.notifyFilterChanged();
    },

    _onFiltersToggled: function(event)
    {
        var toggled = /** @type {boolean} */ (event.data);
        this._filtersContainer.classList.toggle("hidden", !toggled);
        this.doResize();
    },

    /**
     * @return {!WebInspector.ProgressIndicator}
     */
    _prepareToLoadTimeline: function()
    {
        if (this._recordingInProgress()) {
            this._updateToggleTimelineButton(false);
            this._stopRecording();
        }

        /**
         * @this {!WebInspector.TimelinePanel}
         */
        function finishLoading()
        {
            this._setOperationInProgress(null);
            this._updateToggleTimelineButton(false);
            this._hideProgressPane();
        }
        var progressIndicator = new WebInspector.ProgressIndicator();
        progressIndicator.addEventListener(WebInspector.Progress.Events.Done, finishLoading.bind(this));
        this._setOperationInProgress(progressIndicator);
        return progressIndicator;
    },

    /**
     * @param {?WebInspector.ProgressIndicator} indicator
     */
    _setOperationInProgress: function(indicator)
    {
        this._operationInProgress = !!indicator;
        this._panelToolbar.setEnabled(!this._operationInProgress);
        this._dropTarget.setEnabled(!this._operationInProgress);

        this._progressStatusBarItem.setVisible(this._operationInProgress);
        this._progressStatusBarItem.element.removeChildren();
        if (indicator)
            this._progressStatusBarItem.element.appendChild(indicator.element);
    },

    _registerShortcuts: function()
    {
        this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.StartStopRecording, this._toggleTimelineButtonClicked.bind(this));
        this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.SaveToFile, this._saveToFile.bind(this));
        this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.LoadFromFile, this._selectFileToLoad.bind(this));
        this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.JumpToPreviousFrame, this._jumpToFrame.bind(this, -1));
        this.registerShortcuts(WebInspector.ShortcutsScreen.TimelinePanelShortcuts.JumpToNextFrame, this._jumpToFrame.bind(this, 1));
    },

    _createFileSelector: function()
    {
        if (this._fileSelectorElement)
            this._fileSelectorElement.remove();

        this._fileSelectorElement = WebInspector.createFileSelectorElement(this._loadFromFile.bind(this));
        this.element.appendChild(this._fileSelectorElement);
    },

    _contextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendItem(WebInspector.UIString.capitalize("Save Timeline ^data\u2026"), this._saveToFile.bind(this), this._operationInProgress);
        contextMenu.appendItem(WebInspector.UIString.capitalize("Load Timeline ^data\u2026"), this._selectFileToLoad.bind(this), this._operationInProgress);
        contextMenu.show();
    },

    /**
     * @return {boolean}
     */
    _saveToFile: function()
    {
        if (this._operationInProgress)
            return true;

        var now = new Date();
        var fileName = "TimelineRawData-" + now.toISO8601Compact() + ".json";
        var stream = new WebInspector.FileOutputStream();

        /**
         * @param {boolean} accepted
         * @this {WebInspector.TimelinePanel}
         */
        function callback(accepted)
        {
            if (!accepted)
                return;
            var saver = new WebInspector.TracingTimelineSaver(stream);
            this._tracingModelBackingStorage.writeToStream(stream, saver);
        }
        stream.open(fileName, callback.bind(this));
        return true;
    },

    /**
     * @return {boolean}
     */
    _selectFileToLoad: function() {
        this._fileSelectorElement.click();
        return true;
    },

    /**
     * @param {!File} file
     */
    _loadFromFile: function(file)
    {
        if (this._operationInProgress)
            return;
        this._model.loadFromFile(file, this._prepareToLoadTimeline());
        this._createFileSelector();
    },

    /**
     * @param {string} url
     */
    _loadFromURL: function(url)
    {
        console.assert(!this._operationInProgress);
        this._model.loadFromURL(url, this._prepareToLoadTimeline());
    },

    _refreshViews: function()
    {
        for (var i = 0; i < this._currentViews.length; ++i) {
            var view = this._currentViews[i];
            view.refreshRecords(this._textFilter._regex);
        }
        this._updateSelectionDetails();
    },

    /**
     * @param {!WebInspector.StatusBarButton} button
     */
    _overviewModeChanged: function(button)
    {
        var oldMode = this._overviewModeSetting.get();
        if (oldMode === WebInspector.TimelinePanel.OverviewMode.Events) {
            this._overviewModeSetting.set(WebInspector.TimelinePanel.OverviewMode.Frames);
            button.setToggled(true);
        } else {
            this._overviewModeSetting.set(WebInspector.TimelinePanel.OverviewMode.Events);
            button.setToggled(false);
        }
        this._onModeChanged();
    },

    _flameChartEnabledChanged: function()
    {
        var oldValue = this._flameChartEnabledSetting.get();
        var newValue = !oldValue;
        this._flameChartEnabledSetting.set(newValue);
        this._flameChartToggleButton.setToggled(newValue);
        this._onModeChanged();
    },

    _onModeChanged: function()
    {
        this._stackView.detach();

        var isFrameMode = this._overviewModeSetting.get() === WebInspector.TimelinePanel.OverviewMode.Frames;
        this._removeAllModeViews();
        this._overviewControls = [];

        if (isFrameMode)
            this._overviewControls.push(new WebInspector.TimelineFrameOverview(this._model, this._frameModel()));
        else
            this._overviewControls.push(new WebInspector.TimelineEventOverview(this._model));

        if (this._flameChartEnabledSetting.get()) {
            this._filterBar.filterButton().setEnabled(false);
            this._filtersContainer.classList.toggle("hidden", true);
            this._flameChart = new WebInspector.TimelineFlameChartView(this, this._model, this._frameModel());
            this._onNetworkChanged();
            this._addModeView(this._flameChart);
        } else {
            this._flameChart = null;
            this._filterBar.filterButton().setEnabled(true);
            this._filtersContainer.classList.toggle("hidden", !this._filterBar.filtersToggled());
            this._addModeView(this._timelineView());
        }

        if (this._captureMemorySetting.get()) {
            if (!isFrameMode)  // Frame mode skews time, don't render aux overviews.
                this._overviewControls.push(new WebInspector.TimelineMemoryOverview(this._model));
            this._addModeView(new WebInspector.MemoryCountersGraph(this, this._model));
        }

        var mainTarget = WebInspector.targetManager.mainTarget();
        if (this._lazyTimelineView)
            this._lazyTimelineView.setFrameModel(isFrameMode ? this._frameModel() : null);

        this._overviewPane.setOverviewControls(this._overviewControls);
        this.doResize();
        this._selection = null;
        this._updateSelectionDetails();

        this._stackView.show(this._searchableView.element);
    },

    _onNetworkChanged: function()
    {
        if (this._flameChart)
            this._flameChart.enableNetworkPane(this._captureNetworkSetting.get());
    },

    /**
     * @param {boolean} enabled
     */
    _setUIControlsEnabled: function(enabled) {
        /**
         * @param {!WebInspector.StatusBarButton} statusBarItem
         */
        function handler(statusBarItem)
        {
            statusBarItem.setEnabled(enabled);
        }
        this._recordingOptionUIControls.forEach(handler);
    },

    /**
     * @param {boolean} userInitiated
     */
    _startRecording: function(userInitiated)
    {
        this._autoRecordGeneration = userInitiated ? null : {};
        var enableJSSampling = this._enableJSSamplingSettingSetting && this._enableJSSamplingSettingSetting.get();
        this._model.startRecording(this._captureCausesSetting.get(), enableJSSampling, this._captureMemorySetting.get(), this._captureLayersAndPicturesSetting && this._captureLayersAndPicturesSetting.get());
        if (this._lazyFrameModel)
            this._lazyFrameModel.setMergeRecords(false);

        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].timelineStarted();

        if (userInitiated)
            WebInspector.userMetrics.TimelineStarted.record();
        this._setUIControlsEnabled(false);
    },

    _stopRecording: function()
    {
        this._stopPending = true;
        this._updateToggleTimelineButton(false);
        this._autoRecordGeneration = null;
        this._model.stopRecording();
        if (this._progressElement)
            this._updateProgress(WebInspector.UIString("Retrieving events\u2026"));

        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].timelineStopped();
        this._setUIControlsEnabled(true);
    },

    _onSuspendStateChanged: function()
    {
        this._updateToggleTimelineButton(this.toggleTimelineButton.toggled());
    },

    /**
     * @param {boolean} toggled
     */
    _updateToggleTimelineButton: function(toggled)
    {
        this.toggleTimelineButton.setToggled(toggled);
        if (toggled) {
            this.toggleTimelineButton.setTitle(WebInspector.UIString("Stop"));
            this.toggleTimelineButton.setEnabled(true);
        } else if (this._stopPending) {
            this.toggleTimelineButton.setTitle(WebInspector.UIString("Stop pending"));
            this.toggleTimelineButton.setEnabled(false);
        } else if (WebInspector.targetManager.allTargetsSuspended()) {
            this.toggleTimelineButton.setTitle(WebInspector.anotherProfilerActiveLabel());
            this.toggleTimelineButton.setEnabled(false);
        } else {
            this.toggleTimelineButton.setTitle(WebInspector.UIString("Record"));
            this.toggleTimelineButton.setEnabled(true);
        }
    },

    /**
     * @return {boolean}
     */
    _toggleTimelineButtonClicked: function()
    {
        if (!this.toggleTimelineButton.enabled())
            return true;
        if (this._operationInProgress)
            return true;
        if (this._recordingInProgress())
            this._stopRecording();
        else
            this._startRecording(true);
        return true;
    },

    _garbageCollectButtonClicked: function()
    {
        var targets = WebInspector.targetManager.targets();
        for (var i = 0; i < targets.length; ++i)
            targets[i].heapProfilerAgent().collectGarbage();
    },

    _onClearButtonClick: function()
    {
        this._tracingModel.reset();
        this._model.reset();
    },

    _onRecordsCleared: function()
    {
        this.requestWindowTimes(0, Infinity);
        delete this._selection;
        if (this._lazyFrameModel)
            this._lazyFrameModel.reset();
        for (var i = 0; i < this._currentViews.length; ++i)
            this._currentViews[i].reset();
        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].reset();
        this._selection = null;
        this._updateSelectionDetails();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRecordingStarted: function(event)
    {
        this._updateToggleTimelineButton(true);
        if (event.data && event.data.fromFile)
            this._updateProgress(WebInspector.UIString("Loading..."));
        else
            this._updateProgress(WebInspector.UIString("%d events collected", 0));
    },

    _recordingInProgress: function()
    {
        return this.toggleTimelineButton.toggled();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onTracingBufferUsage: function(event)
    {
        var usage = /** @type {number} */ (event.data);
        this._updateProgress(WebInspector.UIString("Buffer usage %d%", Math.round(usage * 100)));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRetrieveEventsProgress: function(event)
    {
        var progress = /** @type {number} */ (event.data);
        this._updateProgress(WebInspector.UIString("Retrieving events\u2026 %d%", Math.round(progress * 100)));
    },

    /**
     * @param {string} progressMessage
     */
    _updateProgress: function(progressMessage)
    {
        if (!this._progressElement)
            this._showProgressPane();
        this._progressElement.textContent = progressMessage;
    },

    _showProgressPane: function()
    {
        this._hideProgressPane();
        this._progressElement = this._searchableView.element.createChild("div", "timeline-progress-pane fill");
    },

    _hideProgressPane: function()
    {
        if (this._progressElement)
            this._progressElement.remove();
        delete this._progressElement;
    },

    _onRecordingStopped: function()
    {
        this._stopPending = false;
        this._updateToggleTimelineButton(false);
        if (this._lazyFrameModel) {
            this._lazyFrameModel.reset();
            this._lazyFrameModel.addTraceEvents(this._model.target(), this._model.inspectedTargetEvents(), this._tracingModel.sessionId());
        }
        this.requestWindowTimes(this._model.minimumRecordTime(), this._model.maximumRecordTime());
        this._refreshViews();
        this._hideProgressPane();
        this._overviewPane.update();
        this._updateSearchHighlight(false, true);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _willReloadPage: function(event)
    {
        if (this._operationInProgress || this._recordingInProgress() || !this.isShowing())
            return;
        this._startRecording(false);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _loadEventFired: function(event)
    {
        if (!this._recordingInProgress() || !this._autoRecordGeneration)
            return;
        setTimeout(stopRecordingOnReload.bind(this, this._autoRecordGeneration), this._millisecondsToRecordAfterLoadEvent);

        /**
         * @this {WebInspector.TimelinePanel}
         * @param {!Object} recordGeneration
         */
        function stopRecordingOnReload(recordGeneration)
        {
            // Check if we're still in the same recording session.
            if (this._autoRecordGeneration !== recordGeneration)
                return;
            this._stopRecording();
        }
    },

    // WebInspector.Searchable implementation

    /**
     * @override
     */
    jumpToNextSearchResult: function()
    {
        if (!this._searchResults || !this._searchResults.length)
            return;
        var index = this._selectedSearchResult ? this._searchResults.indexOf(this._selectedSearchResult) : -1;
        this._jumpToSearchResult(index + 1);
    },

    /**
     * @override
     */
    jumpToPreviousSearchResult: function()
    {
        if (!this._searchResults || !this._searchResults.length)
            return;
        var index = this._selectedSearchResult ? this._searchResults.indexOf(this._selectedSearchResult) : 0;
        this._jumpToSearchResult(index - 1);
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsCaseSensitiveSearch: function()
    {
        return false;
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsRegexSearch: function()
    {
        return false;
    },

    _jumpToSearchResult: function(index)
    {
        this._selectSearchResult((index + this._searchResults.length) % this._searchResults.length);
        this._currentViews[0].highlightSearchResult(this._selectedSearchResult, this._searchRegex, true);
    },

    _selectSearchResult: function(index)
    {
        this._selectedSearchResult = this._searchResults[index];
        this._searchableView.updateCurrentMatchIndex(index);
    },

    _clearHighlight: function()
    {
        this._currentViews[0].highlightSearchResult(null);
    },

    /**
     * @param {boolean} revealRecord
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    _updateSearchHighlight: function(revealRecord, shouldJump, jumpBackwards)
    {
        if (!this._textFilter.isEmpty() || !this._searchRegex) {
            this._clearHighlight();
            return;
        }

        if (!this._searchResults)
            this._updateSearchResults(shouldJump, jumpBackwards);
        this._currentViews[0].highlightSearchResult(this._selectedSearchResult, this._searchRegex, revealRecord);
    },

    /**
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    _updateSearchResults: function(shouldJump, jumpBackwards)
    {
        var searchRegExp = this._searchRegex;
        if (!searchRegExp)
            return;

        var matches = [];

        /**
         * @param {!WebInspector.TimelineModel.Record} record
         * @this {WebInspector.TimelinePanel}
         */
        function processRecord(record)
        {
            if (record.endTime() < this._windowStartTime ||
                record.startTime() > this._windowEndTime)
                return;
            if (WebInspector.TimelineUIUtils.testContentMatching(record, searchRegExp))
                matches.push(record);
        }
        this._model.forAllFilteredRecords(processRecord.bind(this));

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
    },

    /**
     * @override
     */
    searchCanceled: function()
    {
        this._clearHighlight();
        delete this._searchResults;
        delete this._selectedSearchResult;
        delete this._searchRegex;
    },

    /**
     * @override
     * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    performSearch: function(searchConfig, shouldJump, jumpBackwards)
    {
        var query = searchConfig.query;
        this._searchRegex = createPlainTextSearchRegex(query, "i");
        delete this._searchResults;
        this._updateSearchHighlight(true, shouldJump, jumpBackwards);
    },

    _updateSelectionDetails: function()
    {
        if (!this._selection)
            this._selection = WebInspector.TimelineSelection.fromRange(this._windowStartTime, this._windowEndTime);

        switch (this._selection.type()) {
        case WebInspector.TimelineSelection.Type.Record:
            var record = /** @type {!WebInspector.TimelineModel.Record} */ (this._selection.object());
            var event = record.traceEvent();
            WebInspector.TimelineUIUtils.buildTraceEventDetails(event, this._model, this._detailsLinkifier, this._appendDetailsTabsForTraceEventAndShowDetails.bind(this, event));
            break;
        case WebInspector.TimelineSelection.Type.TraceEvent:
            var event = /** @type {!WebInspector.TracingModel.Event} */ (this._selection.object());
            WebInspector.TimelineUIUtils.buildTraceEventDetails(event, this._model, this._detailsLinkifier, this._appendDetailsTabsForTraceEventAndShowDetails.bind(this, event));
            break;
        case WebInspector.TimelineSelection.Type.Frame:
            var frame = /** @type {!WebInspector.TimelineFrame} */ (this._selection.object());
            this.showInDetails(WebInspector.TimelineUIUtils.generateDetailsContentForFrame(this._lazyFrameModel, frame));
            if (frame.layerTree) {
                var layersView = this._layersView();
                layersView.showLayerTree(frame.layerTree, frame.paints);
                if (!this._detailsView.hasTab(WebInspector.TimelinePanel.DetailsTab.LayerViewer))
                    this._detailsView.appendTab(WebInspector.TimelinePanel.DetailsTab.LayerViewer, WebInspector.UIString("Layers"), layersView);
            }
            break;
        case WebInspector.TimelineSelection.Type.Range:
            this._updateSelectedRangeStats(this._selection._startTime, this._selection._endTime);
            break;
        }

        this._detailsView.updateContents(this._selection);
    },

    /**
     * @param {!WebInspector.TimelineSelection} selection
     * @return {?WebInspector.TimelineFrame}
     */
    _frameForSelection: function(selection)
    {
        switch (selection.type()) {
        case WebInspector.TimelineSelection.Type.Frame:
            return /** @type {!WebInspector.TimelineFrame} */ (selection.object());
        case WebInspector.TimelineSelection.Type.Range:
            return null;
        case WebInspector.TimelineSelection.Type.Record:
        case WebInspector.TimelineSelection.Type.TraceEvent:
            return this._frameModel().filteredFrames(selection._endTime, selection._endTime)[0];
        default:
            console.assert(false, "Should never be reached");
            return null;
        }
    },

    /**
     * @param {number} offset
     */
    _jumpToFrame: function(offset)
    {
        var currentFrame = this._frameForSelection(this._selection);
        if (!currentFrame)
            return;
        var frames = this._frameModel().frames();
        var index = frames.indexOf(currentFrame);
        console.assert(index >= 0, "Can't find current frame in the frame list");
        index = Number.constrain(index + offset, 0, frames.length - 1);
        var newFrame = frames[index];
        var timeShift = 0;
        if (this._windowEndTime < newFrame.endTime)
            timeShift = newFrame.endTime - this._windowEndTime;
        else if (this._windowStartTime > newFrame.startTime)
            timeShift = newFrame.startTime - this._windowStartTime;
        if (timeShift)
            this.requestWindowTimes(this._windowStartTime + timeShift, this._windowEndTime + timeShift);
        this.select(WebInspector.TimelineSelection.fromFrame(newFrame));
        return true;
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @param {!Node} content
     */
    _appendDetailsTabsForTraceEventAndShowDetails: function(event, content)
    {
        this.showInDetails(content);
        if (event.name === WebInspector.TimelineModel.RecordType.Paint || event.name === WebInspector.TimelineModel.RecordType.RasterTask)
            this._showEventInPaintProfiler(event);
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @param {boolean=} isCloseable
     */
    _showEventInPaintProfiler: function(event, isCloseable)
    {
        var target = this._model.target();
        if (!target)
            return;
        var paintProfilerView = this._paintProfilerView();
        var hasProfileData = paintProfilerView.setEvent(target, event);
        if (!hasProfileData)
            return;
        if (!this._detailsView.hasTab(WebInspector.TimelinePanel.DetailsTab.PaintProfiler))
            this._detailsView.appendTab(WebInspector.TimelinePanel.DetailsTab.PaintProfiler, WebInspector.UIString("Paint Profiler"), paintProfilerView, undefined, undefined, isCloseable);
    },

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     * @param {number} startTime
     * @param {number} endTime
     * @param {!Object} aggregatedStats
     */
    _collectAggregatedStatsForRecord: function(record, startTime, endTime, aggregatedStats)
    {
        var records = [];

        if (!record.endTime() || record.endTime() < startTime || record.startTime() > endTime)
            return;

        var childrenTime = 0;
        var children = record.children() || [];
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            if (!child.endTime() || child.endTime() < startTime || child.startTime() > endTime)
                continue;
            childrenTime += Math.min(endTime, child.endTime()) - Math.max(startTime, child.startTime());
            this._collectAggregatedStatsForRecord(child, startTime, endTime, aggregatedStats);
        }
        var categoryName = WebInspector.TimelineUIUtils.categoryForRecord(record).name;
        var ownTime = Math.min(endTime, record.endTime()) - Math.max(startTime, record.startTime()) - childrenTime;
        aggregatedStats[categoryName] = (aggregatedStats[categoryName] || 0) + ownTime;
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    _updateSelectedRangeStats: function(startTime, endTime)
    {
        // Return early in case 0 selection window.
        if (startTime < 0)
            return;

        var aggregatedStats = {};

        /**
         * @param {number} value
         * @param {!WebInspector.TimelineModel.Record} task
         * @return {number}
         */
        function compareEndTime(value, task)
        {
            return value < task.endTime() ? -1 : 1;
        }
        var mainThreadTasks = this._model.mainThreadTasks();
        var taskIndex = insertionIndexForObjectInListSortedByFunction(startTime, mainThreadTasks, compareEndTime);
        for (; taskIndex < mainThreadTasks.length; ++taskIndex) {
            var task = mainThreadTasks[taskIndex];
            if (task.startTime() > endTime)
                break;
            if (task.startTime() > startTime && task.endTime() < endTime) {
                // cache stats for top-level entries that fit the range entirely.
                var taskStats = task[WebInspector.TimelinePanel._aggregatedStatsKey];
                if (!taskStats) {
                    taskStats = {};
                    this._collectAggregatedStatsForRecord(task, startTime, endTime, taskStats);
                    task[WebInspector.TimelinePanel._aggregatedStatsKey] = taskStats;
                }
                for (var key in taskStats)
                    aggregatedStats[key] = (aggregatedStats[key] || 0) + taskStats[key];
                continue;
            }
            this._collectAggregatedStatsForRecord(task, startTime, endTime, aggregatedStats);
        }

        var aggregatedTotal = 0;
        for (var categoryName in aggregatedStats)
            aggregatedTotal += aggregatedStats[categoryName];
        aggregatedStats["idle"] = Math.max(0, endTime - startTime - aggregatedTotal);

        var contentHelper = new WebInspector.TimelineDetailsContentHelper(null, null, null, true);
        var pieChart = WebInspector.TimelineUIUtils.generatePieChart(aggregatedStats);

        var startOffset = startTime - this._model.minimumRecordTime();
        var endOffset = endTime - this._model.minimumRecordTime();
        contentHelper.appendTextRow(WebInspector.UIString("Range"), WebInspector.UIString("%s \u2013 %s", Number.millisToString(startOffset), Number.millisToString(endOffset)));
        contentHelper.appendElementRow(WebInspector.UIString("Aggregated Time"), pieChart);

        this.showInDetails(contentHelper.element);
    },

    /**
     * @override
     * @param {?WebInspector.TimelineSelection} selection
     * @param {!WebInspector.TimelinePanel.DetailsTab=} preferredTab
     */
    select: function(selection, preferredTab)
    {
        this._detailsLinkifier.reset();
        this._selection = selection;
        if (preferredTab)
            this._detailsView.setPreferredTab(preferredTab);

        for (var i = 0; i < this._currentViews.length; ++i) {
            var view = this._currentViews[i];
            view.setSelection(selection);
        }
        this._updateSelectionDetails();
    },

    /**
     * @override
     * @param {!WebInspector.TimelineModel.Record} record
     */
    showNestedRecordDetails: function(record)
    {
        var event = record.traceEvent();
        this._showEventInPaintProfiler(event, true);
        this._detailsView.selectTab(WebInspector.TimelinePanel.DetailsTab.PaintProfiler, true);
    },

    /**
     * @override
     * @param {!Node} node
     */
    showInDetails: function(node)
    {
        this._detailsView.setContent(node);
    },

    /**
     * @param {!DataTransfer} dataTransfer
     */
    _handleDrop: function(dataTransfer)
    {
        var items = dataTransfer.items;
        if (!items.length)
            return;
        var item = items[0];
        if (item.kind === "string") {
            var url = dataTransfer.getData("text/uri-list");
            if (new WebInspector.ParsedURL(url).isValid)
                this._loadFromURL(url);
        } else if (item.kind === "file") {
            var entry = items[0].webkitGetAsEntry();
            if (!entry.isFile)
                return;
            entry.file(this._loadFromFile.bind(this));
        }
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TabbedPane}
 * @param {!WebInspector.TimelineModel} timelineModel
 */
WebInspector.TimelineDetailsView = function(timelineModel)
{
    WebInspector.TabbedPane.call(this);
    this.element.classList.add("timeline-details");

    this._defaultDetailsView = new WebInspector.VBox();
    this._defaultDetailsView.element.classList.add("timeline-details-view");
    this._defaultDetailsContentElement = this._defaultDetailsView.element.createChild("div", "timeline-details-view-body vbox");
    this.appendTab(WebInspector.TimelinePanel.DetailsTab.Details, WebInspector.UIString("Summary"), this._defaultDetailsView);
    this.setPreferredTab(WebInspector.TimelinePanel.DetailsTab.Details);

    if (Runtime.experiments.isEnabled("timelineDetailsChart")) {
        this._heavyChartView = new WebInspector.TimelineDetailsView.BottomUpChartView(timelineModel);
        this.appendTab(WebInspector.TimelinePanel.DetailsTab.BottomUpChart, WebInspector.UIString("Costly Functions"), this._heavyChartView);
    }

    this._staticTabs = [
        WebInspector.TimelinePanel.DetailsTab.Details,
        WebInspector.TimelinePanel.DetailsTab.BottomUpChart
    ];

    this.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
}

WebInspector.TimelineDetailsView.prototype = {
    /**
     * @param {!Node} node
     */
    setContent: function(node)
    {
        var allTabs = this.allTabs();
        for (var i = 0; i < allTabs.length; ++i) {
            var tabId = allTabs[i].id;
            if (this._staticTabs.indexOf(tabId) !== -1)
                this.closeTab(tabId);
        }
        this._defaultDetailsContentElement.removeChildren();
        this._defaultDetailsContentElement.appendChild(node);
    },

    /**
     * @param {!WebInspector.TimelineSelection} selection
     */
    updateContents: function(selection)
    {
        this._selection = selection;
        if (this.selectedTabId === WebInspector.TimelinePanel.DetailsTab.BottomUpChart && this._heavyChartView)
            this._heavyChartView.updateContents(selection);
    },

    /**
     * @override
     * @param {string} id
     * @param {string} tabTitle
     * @param {!WebInspector.View} view
     * @param {string=} tabTooltip
     * @param {boolean=} userGesture
     * @param {boolean=} isCloseable
     */
    appendTab: function(id, tabTitle, view, tabTooltip, userGesture, isCloseable)
    {
        WebInspector.TabbedPane.prototype.appendTab.call(this, id, tabTitle, view, tabTooltip, userGesture, isCloseable);
        if (this._preferredTabId !== this.selectedTabId)
            this.selectTab(id);
    },

    /**
     * @param {string} tabId
     */
    setPreferredTab: function(tabId)
    {
        this._preferredTabId = tabId;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _tabSelected: function(event)
    {
        if (!event.data.isUserGesture)
            return;
        this.setPreferredTab(event.data.tabId);
        this.updateContents(this._selection);
    },

    __proto__: WebInspector.TabbedPane.prototype
}

/**
 * @constructor
 * @implements {WebInspector.TimelineModeViewDelegate}
 * @implements {WebInspector.FlameChartDelegate}
 * @extends {WebInspector.VBox}
 */
WebInspector.TimelineDetailsView.BottomUpChartView = function(model) {
    WebInspector.VBox.call(this);
    this._model = model;
}

WebInspector.TimelineDetailsView.BottomUpChartView.prototype = {
    _init: function()
    {
        if (this._heavyChart)
            return;
        this._dataProvider = new WebInspector.TimelineFlameChartBottomUpDataProvider(this._model);
        this._heavyChart = new WebInspector.FlameChart(this._dataProvider, this, true);
        this._heavyChart.show(this.element);
    },

    /**
     * @param {!WebInspector.TimelineSelection} selection
     */
    updateContents: function(selection)
    {
        this._init();
        this._heavyChart.reset();
        this._dataProvider.setWindowTimes(selection._startTime, selection._endTime);
        this._dataProvider.timelineData();
        this._heavyChart.setWindowTimes(0, this._dataProvider.totalTime());
    },

    /**
     * @override
     * @param {number} startTime
     * @param {number} endTime
     */
    requestWindowTimes: function(startTime, endTime)
    {
        this._heavyChart.setWindowTimes(startTime, endTime);
    },

    /**
     * @override
     * @param {?WebInspector.TimelineSelection} selection
     * @param {!WebInspector.TimelinePanel.DetailsTab=} preferredTab
     */
    select: function(selection, preferredTab) {},

    /**
     * @override
     * @param {!WebInspector.TimelineModel.Record} record
     */
    showNestedRecordDetails: function(record) {},

    /**
     * @override
     * @param {!Node} node
     */
    showInDetails: function(node) {},

    /**
     * @override
     * @param {number} startTime
     * @param {number} endTime
     */
    updateBoxSelection: function(startTime, endTime)
    {
    },

    __proto__: WebInspector.VBox.prototype
}


/**
 * @constructor
 */
WebInspector.TimelineSelection = function()
{
}

/**
 * @enum {string}
 */
WebInspector.TimelineSelection.Type = {
    Record: "Record",
    Frame: "Frame",
    TraceEvent: "TraceEvent",
    Range: "Range"
};

/**
 * @param {!WebInspector.TimelineModel.Record} record
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromRecord = function(record)
{
    var selection = new WebInspector.TimelineSelection();
    selection._type = WebInspector.TimelineSelection.Type.Record;
    selection._object = record;
    return selection;
}

/**
 * @param {!WebInspector.TimelineFrame} frame
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromFrame = function(frame)
{
    var selection = new WebInspector.TimelineSelection();
    selection._type = WebInspector.TimelineSelection.Type.Frame;
    selection._object = frame;
    selection._startTime = frame.startTime;
    selection._endTime = frame.endTime;
    return selection;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromTraceEvent = function(event)
{
    var selection = new WebInspector.TimelineSelection();
    selection._type = WebInspector.TimelineSelection.Type.TraceEvent;
    selection._object = event;
    selection._startTime = event.startTime;
    selection._endTime = event.endTime || (event.startTime + 1);
    return selection;
}

/**
 * @param {number} startTime
 * @param {number} endTime
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromRange = function(startTime, endTime)
{
    var selection = new WebInspector.TimelineSelection();
    selection._type = WebInspector.TimelineSelection.Type.Range;
    selection._startTime = startTime;
    selection._endTime = endTime;
    return selection;
}

WebInspector.TimelineSelection.prototype = {
    /**
     * @return {!WebInspector.TimelineSelection.Type}
     */
    type: function()
    {
        return this._type;
    },

    /**
     * @return {!Object}
     */
    object: function()
    {
        return this._object;
    }
};

/**
 * @interface
 * @extends {WebInspector.EventTarget}
 */
WebInspector.TimelineModeView = function()
{
}

WebInspector.TimelineModeView.prototype = {
    /**
     * @return {!WebInspector.View}
     */
    view: function() {},

    dispose: function() {},

    reset: function() {},

    /**
     * @param {?RegExp} textFilter
     */
    refreshRecords: function(textFilter) {},

    /**
     * @param {?WebInspector.TimelineModel.Record} record
     * @param {string=} regex
     * @param {boolean=} selectRecord
     */
    highlightSearchResult: function(record, regex, selectRecord) {},

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime) {},

    /**
     * @param {number} width
     */
    setSidebarSize: function(width) {},

    /**
     * @param {?WebInspector.TimelineSelection} selection
     */
    setSelection: function(selection) {},
}

/**
 * @interface
 */
WebInspector.TimelineModeViewDelegate = function() {}

WebInspector.TimelineModeViewDelegate.prototype = {
    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    requestWindowTimes: function(startTime, endTime) {},

    /**
     * @param {?WebInspector.TimelineSelection} selection
     * @param {!WebInspector.TimelinePanel.DetailsTab=} preferredTab
     */
    select: function(selection, preferredTab) {},

    /**
     * @param {!WebInspector.TimelineModel.Record} record
     */
    showNestedRecordDetails: function(record) {},

    /**
     * @param {!Node} node
     */
    showInDetails: function(node) {},
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 */
WebInspector.TimelineCategoryFilter = function()
{
    WebInspector.TimelineModel.Filter.call(this);
}

WebInspector.TimelineCategoryFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return !WebInspector.TimelineUIUtils.categoryForRecord(record).hidden;
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 */
WebInspector.TimelineIsLongFilter = function()
{
    WebInspector.TimelineModel.Filter.call(this);
    this._minimumRecordDuration = 0;
}

WebInspector.TimelineIsLongFilter.prototype = {
    /**
     * @param {number} value
     */
    setMinimumRecordDuration: function(value)
    {
        this._minimumRecordDuration = value;
        this.notifyFilterChanged();
    },

    /**
     * @override
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return this._minimumRecordDuration ? ((record.endTime() - record.startTime()) >= this._minimumRecordDuration) : true;
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype

}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 */
WebInspector.TimelineTextFilter = function()
{
    WebInspector.TimelineModel.Filter.call(this);
}

WebInspector.TimelineTextFilter.prototype = {
    /**
     * @return {boolean}
     */
    isEmpty: function()
    {
        return !this._regex;
    },

    /**
     * @param {?RegExp} regex
     */
    setRegex: function(regex)
    {
        this._regex = regex;
        this.notifyFilterChanged();
    },

    /**
     * @override
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        return !this._regex || WebInspector.TimelineUIUtils.testContentMatching(record, this._regex);
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 */
WebInspector.TimelineStaticFilter = function()
{
    WebInspector.TimelineModel.Filter.call(this);
}

WebInspector.TimelineStaticFilter.prototype = {
    /**
     * @override
     * @param {!WebInspector.TimelineModel.Record} record
     * @return {boolean}
     */
    accept: function(record)
    {
        switch(record.type()) {
        case WebInspector.TimelineModel.RecordType.EventDispatch:
            return record.children().length !== 0;
        case WebInspector.TimelineModel.RecordType.JSFrame:
            return false;
        default:
            return true;
        }
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}

WebInspector.TimelinePanel.show = function()
{
    WebInspector.inspectorView.setCurrentPanel(WebInspector.TimelinePanel.instance());
}

/**
 * @return {!WebInspector.TimelinePanel}
 */
WebInspector.TimelinePanel.instance = function()
{
    if (!WebInspector.TimelinePanel._instanceObject)
        WebInspector.TimelinePanel._instanceObject = new WebInspector.TimelinePanel();
    return WebInspector.TimelinePanel._instanceObject;
}

/**
 * @constructor
 * @implements {WebInspector.PanelFactory}
 */
WebInspector.TimelinePanelFactory = function()
{
}

WebInspector.TimelinePanelFactory.prototype = {
    /**
     * @override
     * @return {!WebInspector.Panel}
     */
    createPanel: function()
    {
        return WebInspector.TimelinePanel.instance();
    }
}

/**
 * @constructor
 * @implements {WebInspector.QueryParamHandler}
 */
WebInspector.LoadTimelineHandler = function()
{
}

WebInspector.LoadTimelineHandler.prototype = {
    /**
     * @override
     * @param {string} value
     */
    handleQueryParam: function(value)
    {
        WebInspector.TimelinePanel.show();
        WebInspector.TimelinePanel.instance()._loadFromURL(value);
    }
}

