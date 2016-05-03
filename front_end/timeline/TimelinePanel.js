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
 * @implements {WebInspector.TimelineLifecycleDelegate}
 * @implements {WebInspector.TimelineModeViewDelegate}
 * @implements {WebInspector.Searchable}
 */
WebInspector.TimelinePanel = function()
{
    WebInspector.Panel.call(this, "timeline");
    this.registerRequiredCSS("timeline/timelinePanel.css");
    this.element.addEventListener("contextmenu", this._contextMenu.bind(this), false);
    this._dropTarget = new WebInspector.DropTarget(this.element, [WebInspector.DropTarget.Types.Files, WebInspector.DropTarget.Types.URIList], WebInspector.UIString("Drop timeline file or URL here"), this._handleDrop.bind(this));

    this._state = WebInspector.TimelinePanel.State.Idle;
    this._detailsLinkifier = new WebInspector.Linkifier();
    this._windowStartTime = 0;
    this._windowEndTime = Infinity;
    this._millisecondsToRecordAfterLoadEvent = 3000;
    this._toggleRecordAction = WebInspector.actionRegistry.action("timeline.toggle-recording");

    /** @type {!Array<!WebInspector.TimelineModel.Filter>} */
    this._filters = [];
    if (!Runtime.experiments.isEnabled("timelineShowAllEvents")) {
        this._filters.push(WebInspector.TimelineUIUtils.visibleEventsFilter());
        this._filters.push(new WebInspector.ExcludeTopLevelFilter());
    }

    // Create models.
    this._tracingModelBackingStorage = new WebInspector.TempFileBackingStorage("tracing");
    this._tracingModel = new WebInspector.TracingModel(this._tracingModelBackingStorage);
    this._model = new WebInspector.TimelineModel(WebInspector.TimelineUIUtils.visibleEventsFilter());
    this._frameModel = new WebInspector.TracingTimelineFrameModel();
    this._irModel = new WebInspector.TimelineIRModel();

    if (Runtime.experiments.isEnabled("cpuThrottling"))
        this._cpuThrottlingManager = new WebInspector.CPUThrottlingManager();

    /** @type {!Array.<!WebInspector.TimelineModeView>} */
    this._currentViews = [];

    this._captureNetworkSetting = WebInspector.settings.createSetting("timelineCaptureNetwork", false);
    this._captureJSProfileSetting = WebInspector.settings.createSetting("timelineEnableJSSampling", true);
    this._captureMemorySetting = WebInspector.settings.createSetting("timelineCaptureMemory", false);
    this._captureLayersAndPicturesSetting = WebInspector.settings.createSetting("timelineCaptureLayersAndPictures", false);
    this._captureFilmStripSetting = WebInspector.settings.createSetting("timelineCaptureFilmStrip", false);

    this._panelToolbar = new WebInspector.Toolbar("", this.element);
    this._createToolbarItems();

    var timelinePane = new WebInspector.VBox();
    timelinePane.show(this.element);
    var topPaneElement = timelinePane.element.createChild("div", "hbox");
    topPaneElement.id = "timeline-overview-panel";

    // Create top overview component.
    this._overviewPane = new WebInspector.TimelineOverviewPane("timeline");
    this._overviewPane.addEventListener(WebInspector.TimelineOverviewPane.Events.WindowChanged, this._onWindowChanged.bind(this));
    this._overviewPane.show(topPaneElement);
    this._statusPaneContainer = timelinePane.element.createChild("div", "status-pane-container fill");

    this._createFileSelector();

    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.PageReloadRequested, this._pageReloadRequested, this);
    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.Load, this._loadEventFired, this);

    // Create top level properties splitter.
    this._detailsSplitWidget = new WebInspector.SplitWidget(false, true, "timelinePanelDetailsSplitViewState");
    this._detailsSplitWidget.element.classList.add("timeline-details-split");
    this._detailsView = new WebInspector.TimelineDetailsView(this._model, this._filters, this);
    this._detailsSplitWidget.installResizer(this._detailsView.headerElement());
    this._detailsSplitWidget.setSidebarWidget(this._detailsView);

    this._searchableView = new WebInspector.SearchableView(this);
    this._searchableView.setMinimumSize(0, 100);
    this._searchableView.element.classList.add("searchable-view");
    this._detailsSplitWidget.setMainWidget(this._searchableView);

    this._stackView = new WebInspector.StackView(false);
    this._stackView.element.classList.add("timeline-view-stack");

    this._stackView.show(this._searchableView.element);
    this._onModeChanged();

    this._detailsSplitWidget.show(timelinePane.element);
    this._detailsSplitWidget.hideSidebar();
    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.SuspendStateChanged, this._onSuspendStateChanged, this);
    this._showRecordingHelpMessage();
    this._locationPool = new WebInspector.LiveLocationPool();

    /** @type {!WebInspector.TracingModel.Event}|undefined */
    this._selectedSearchResult;
    /** @type {!Array<!WebInspector.TracingModel.Event>}|undefined */
    this._searchResults;
}

/**
 * @enum {string}
 */
WebInspector.TimelinePanel.Perspectives = {
    Load: "Load",
    Responsiveness: "Responsiveness",
    Custom: "Custom"
}

/**
 * @enum {string}
 */
WebInspector.TimelinePanel.DetailsTab = {
    Details: "Details",
    Events: "Events",
    CallTree: "CallTree",
    BottomUp: "BottomUp",
    PaintProfiler: "PaintProfiler",
    LayerViewer: "LayerViewer"
}

/**
 * @enum {symbol}
 */
WebInspector.TimelinePanel.State = {
    Idle: Symbol("Idle"),
    StartPending: Symbol("StartPending"),
    Recording: Symbol("Recording"),
    StopPending: Symbol("StopPending"),
    Loading: Symbol("Loading")
}

// Define row and header height, should be in sync with styles for timeline graphs.
WebInspector.TimelinePanel.rowHeight = 18;
WebInspector.TimelinePanel.headerHeight = 20;

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
        WebInspector.context.setFlavor(WebInspector.TimelinePanel, this);
    },

    willHide: function()
    {
        WebInspector.context.setFlavor(WebInspector.TimelinePanel, null);
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
    _onWindowChanged: function(event)
    {
        this._windowStartTime = event.data.startTime;
        this._windowEndTime = event.data.endTime;

        for (var i = 0; i < this._currentViews.length; ++i)
            this._currentViews[i].setWindowTimes(this._windowStartTime, this._windowEndTime);

        if (!this._selection || this._selection.type() === WebInspector.TimelineSelection.Type.Range)
            this.select(null);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onOverviewSelectionChanged: function(event)
    {
        var selection = /** @type {!WebInspector.TimelineSelection} */ (event.data);
        this.select(selection);
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
     * @return {!WebInspector.Widget}
     */
    _layersView: function()
    {
        if (this._lazyLayersView)
            return this._lazyLayersView;
        this._lazyLayersView = new WebInspector.TimelineLayersView(this._model, showPaintEventDetails.bind(this));
        return this._lazyLayersView;

        /**
         * @param {!WebInspector.TracingModel.Event} event
         * @this {WebInspector.TimelinePanel}
         */
        function showPaintEventDetails(event)
        {
            this._showEventInPaintProfiler(event, true);
            this._detailsView.selectTab(WebInspector.TimelinePanel.DetailsTab.PaintProfiler, true);
        }
    },

    _paintProfilerView: function()
    {
        if (this._lazyPaintProfilerView)
            return this._lazyPaintProfilerView;
        this._lazyPaintProfilerView = new WebInspector.TimelinePaintProfilerView(this._frameModel);
        return this._lazyPaintProfilerView;
    },

    /**
     * @param {!WebInspector.TimelineModeView} modeView
     */
    _addModeView: function(modeView)
    {
        modeView.setWindowTimes(this.windowStartTime(), this.windowEndTime());
        modeView.refreshRecords();
        var splitWidget = this._stackView.appendView(modeView.view(), "timelinePanelTimelineStackSplitViewState", undefined, 112);
        var resizer = modeView.resizerElement();
        if (splitWidget && resizer) {
            splitWidget.hideDefaultResizer();
            splitWidget.installResizer(resizer);
        }
        this._currentViews.push(modeView);
    },

    _removeAllModeViews: function()
    {
        this._currentViews.forEach(view => view.dispose());
        this._currentViews = [];
        this._stackView.detachChildWidgets();
    },

    /**
     * @param {!WebInspector.TimelinePanel.State} state
     */
    _setState: function(state)
    {
        this._state = state;
        this._updateTimelineControls();
    },

    /**
     * @param {string} name
     * @param {!WebInspector.Setting} setting
     * @param {string} tooltip
     * @return {!WebInspector.ToolbarItem}
     */
    _createSettingCheckbox: function(name, setting, tooltip)
    {
        if (!this._recordingOptionUIControls)
            this._recordingOptionUIControls = [];
        var checkboxItem = new WebInspector.ToolbarCheckbox(name, tooltip, setting);
        this._recordingOptionUIControls.push(checkboxItem);
        return checkboxItem;
    },

    _createToolbarItems: function()
    {
        this._panelToolbar.removeToolbarItems();

        var perspectiveSetting = WebInspector.settings.createSetting("timelinePerspective", WebInspector.TimelinePanel.Perspectives.Load);
        if (Runtime.experiments.isEnabled("timelineRecordingPerspectives")) {
            /**
             * @this {!WebInspector.TimelinePanel}
             */
            function onPerspectiveChanged()
            {
                perspectiveSetting.set(perspectiveCombobox.selectElement().value);
                this._createToolbarItems();
            }

            /**
             * @param {string} id
             * @param {string} title
             */
            function addPerspectiveOption(id, title)
            {
                var option = perspectiveCombobox.createOption(title, "", id);
                perspectiveCombobox.addOption(option);
                if (id === perspectiveSetting.get())
                    perspectiveCombobox.select(option);
            }

            var perspectiveCombobox = new WebInspector.ToolbarComboBox(onPerspectiveChanged.bind(this));
            addPerspectiveOption(WebInspector.TimelinePanel.Perspectives.Load, WebInspector.UIString("Page Load"));
            addPerspectiveOption(WebInspector.TimelinePanel.Perspectives.Responsiveness, WebInspector.UIString("Responsiveness"));
            addPerspectiveOption(WebInspector.TimelinePanel.Perspectives.Custom, WebInspector.UIString("Custom"));
            this._panelToolbar.appendToolbarItem(perspectiveCombobox);

            switch (perspectiveSetting.get()) {
            case WebInspector.TimelinePanel.Perspectives.Load:
                this._captureNetworkSetting.set(true);
                this._captureJSProfileSetting.set(true);
                this._captureMemorySetting.set(false);
                this._captureLayersAndPicturesSetting.set(false);
                this._captureFilmStripSetting.set(true);
                break;
            case WebInspector.TimelinePanel.Perspectives.Responsiveness:
                this._captureNetworkSetting.set(true);
                this._captureJSProfileSetting.set(true);
                this._captureMemorySetting.set(false);
                this._captureLayersAndPicturesSetting.set(false);
                this._captureFilmStripSetting.set(false);
                break;
            }
        }
        if (Runtime.experiments.isEnabled("timelineRecordingPerspectives") && perspectiveSetting.get() === WebInspector.TimelinePanel.Perspectives.Load) {
            this._reloadButton = new WebInspector.ToolbarButton(WebInspector.UIString("Record & Reload"), "refresh-toolbar-item");
            this._reloadButton.addEventListener("click", () => WebInspector.targetManager.reloadPage());
            this._panelToolbar.appendToolbarItem(this._reloadButton);
        } else {
            this._panelToolbar.appendToolbarItem(WebInspector.Toolbar.createActionButton(this._toggleRecordAction));
        }

        this._updateTimelineControls();
        var clearButton = new WebInspector.ToolbarButton(WebInspector.UIString("Clear recording"), "clear-toolbar-item");
        clearButton.addEventListener("click", this._clear, this);
        this._panelToolbar.appendToolbarItem(clearButton);

        this._panelToolbar.appendSeparator();

        this._panelToolbar.appendText(WebInspector.UIString("Capture:"));

        var screenshotCheckbox = this._createSettingCheckbox(
            WebInspector.UIString("Screenshots"), this._captureFilmStripSetting, WebInspector.UIString("Capture screenshots while recording. (Has small performance overhead)"));

        if (!Runtime.experiments.isEnabled("timelineRecordingPerspectives") || perspectiveSetting.get() === WebInspector.TimelinePanel.Perspectives.Custom) {
            this._panelToolbar.appendToolbarItem(this._createSettingCheckbox(
                WebInspector.UIString("Network"), this._captureNetworkSetting, WebInspector.UIString("Show network requests information")));
            this._panelToolbar.appendToolbarItem(this._createSettingCheckbox(
                WebInspector.UIString("JS Profile"), this._captureJSProfileSetting, WebInspector.UIString("Capture JavaScript stacks with sampling profiler. (Has small performance overhead)")));
            this._panelToolbar.appendToolbarItem(screenshotCheckbox);
            this._panelToolbar.appendToolbarItem(this._createSettingCheckbox(
                WebInspector.UIString("Memory"), this._captureMemorySetting, WebInspector.UIString("Capture memory information on every timeline event.")));
            this._panelToolbar.appendToolbarItem(this._createSettingCheckbox(
                WebInspector.UIString("Paint"), this._captureLayersAndPicturesSetting, WebInspector.UIString("Capture graphics layer positions and rasterization draw calls. (Has large performance overhead)")));
        } else {
            this._panelToolbar.appendToolbarItem(screenshotCheckbox);
        }

        this._captureNetworkSetting.addChangeListener(this._onNetworkChanged, this);
        this._captureMemorySetting.addChangeListener(this._onModeChanged, this);
        this._captureFilmStripSetting.addChangeListener(this._onModeChanged, this);

        this._panelToolbar.appendSeparator();
        var garbageCollectButton = new WebInspector.ToolbarButton(WebInspector.UIString("Collect garbage"), "garbage-collect-toolbar-item");
        garbageCollectButton.addEventListener("click", this._garbageCollectButtonClicked, this);
        this._panelToolbar.appendToolbarItem(garbageCollectButton);

        if (Runtime.experiments.isEnabled("cpuThrottling")) {
            this._panelToolbar.appendSeparator();
            this._cpuThrottlingCombobox = new WebInspector.ToolbarComboBox(this._onCPUThrottlingChanged.bind(this));
            /**
             * @param {string} name
             * @param {number} value
             * @this {WebInspector.TimelinePanel}
             */
            function addGroupingOption(name, value)
            {
                var option = this._cpuThrottlingCombobox.createOption(name, "", String(value));
                this._cpuThrottlingCombobox.addOption(option);
                if (value === this._cpuThrottlingManager.rate())
                    this._cpuThrottlingCombobox.select(option);
            }
            addGroupingOption.call(this, WebInspector.UIString("No CPU throttling"), 1);
            for (var rate of [1.2, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 30, 50])
                addGroupingOption.call(this, WebInspector.UIString("%fx slowdown", rate), rate);
            this._panelToolbar.appendToolbarItem(this._cpuThrottlingCombobox);
        }
    },

    _prepareToLoadTimeline: function()
    {
         console.assert(this._state === WebInspector.TimelinePanel.State.Idle);
         this._setState(WebInspector.TimelinePanel.State.Loading);
    },

    _createFileSelector: function()
    {
        if (this._fileSelectorElement)
            this._fileSelectorElement.remove();
        this._fileSelectorElement = WebInspector.createFileSelectorElement(this._loadFromFile.bind(this));
        this.element.appendChild(this._fileSelectorElement);
    },

    /**
     * @param {!Event} event
     */
    _contextMenu: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        var disabled = this._state !== WebInspector.TimelinePanel.State.Idle;
        contextMenu.appendItem(WebInspector.UIString.capitalize("Save Timeline ^data\u2026"), this._saveToFile.bind(this), disabled);
        contextMenu.appendItem(WebInspector.UIString.capitalize("Load Timeline ^data\u2026"), this._selectFileToLoad.bind(this), disabled);
        contextMenu.show();
    },

    /**
     * @return {boolean}
     */
    _saveToFile: function()
    {
        if (this._state !== WebInspector.TimelinePanel.State.Idle)
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
            var saver = new WebInspector.TracingTimelineSaver();
            this._tracingModelBackingStorage.writeToStream(stream, saver);
        }
        stream.open(fileName, callback.bind(this));
        return true;
    },

    /**
     * @return {boolean}
     */
    _selectFileToLoad: function()
    {
        this._fileSelectorElement.click();
        return true;
    },

    /**
     * @param {!File} file
     */
    _loadFromFile: function(file)
    {
        if (this._state !== WebInspector.TimelinePanel.State.Idle)
            return;
        this._prepareToLoadTimeline();
        this._loader = WebInspector.TimelineLoader.loadFromFile(this._tracingModel, file, this);
        this._createFileSelector();
    },

    /**
     * @param {string} url
     */
    _loadFromURL: function(url)
    {
        if (this._state !== WebInspector.TimelinePanel.State.Idle)
            return;
        this._prepareToLoadTimeline();
        this._loader = WebInspector.TimelineLoader.loadFromURL(this._tracingModel, url, this);
    },

    _refreshViews: function()
    {
        for (var i = 0; i < this._currentViews.length; ++i) {
            var view = this._currentViews[i];
            view.refreshRecords();
        }
        this._updateSelectionDetails();
    },

    _onModeChanged: function()
    {
        // Set up overview controls.
        this._overviewControls = [];
        this._overviewControls.push(new WebInspector.TimelineEventOverview.Responsiveness(this._model, this._frameModel));
        if (Runtime.experiments.isEnabled("inputEventsOnTimelineOverview"))
            this._overviewControls.push(new WebInspector.TimelineEventOverview.Input(this._model));
        this._overviewControls.push(new WebInspector.TimelineEventOverview.Frames(this._model, this._frameModel));
        this._overviewControls.push(new WebInspector.TimelineEventOverview.CPUActivity(this._model));
        this._overviewControls.push(new WebInspector.TimelineEventOverview.Network(this._model));
        if (this._captureFilmStripSetting.get())
            this._overviewControls.push(new WebInspector.TimelineFilmStripOverview(this._model, this._tracingModel));
        if (this._captureMemorySetting.get())
            this._overviewControls.push(new WebInspector.TimelineEventOverview.Memory(this._model));
        this._overviewPane.setOverviewControls(this._overviewControls);

        // Set up the main view.
        this._removeAllModeViews();
        this._flameChart = new WebInspector.TimelineFlameChartView(this, this._model, this._frameModel, this._irModel, this._filters);
        this._flameChart.enableNetworkPane(this._captureNetworkSetting.get());
        this._addModeView(this._flameChart);

        if (this._captureMemorySetting.get())
            this._addModeView(new WebInspector.MemoryCountersGraph(this, this._model, [WebInspector.TimelineUIUtils.visibleEventsFilter()]));

        this.doResize();
        this.select(null);
    },

    _onNetworkChanged: function()
    {
        if (this._flameChart)
            this._flameChart.enableNetworkPane(this._captureNetworkSetting.get(), true);
    },

    _onCPUThrottlingChanged: function()
    {
        if (!this._cpuThrottlingManager)
            return;
        var value = Number.parseFloat(this._cpuThrottlingCombobox.selectedOption().value);
        this._cpuThrottlingManager.setRate(value);
    },

    /**
     * @param {boolean} enabled
     */
    _setUIControlsEnabled: function(enabled)
    {
        /**
         * @param {!WebInspector.ToolbarButton} toolbarButton
         */
        function handler(toolbarButton)
        {
            toolbarButton.setEnabled(enabled);
        }
        this._recordingOptionUIControls.forEach(handler);
    },

    /**
     * @param {boolean} userInitiated
     */
    _startRecording: function(userInitiated)
    {
        console.assert(!this._statusPane, "Status pane is already opened.");
        var mainTarget = WebInspector.targetManager.mainTarget();
        if (!mainTarget)
            return;
        this._setState(WebInspector.TimelinePanel.State.StartPending);
        this._showRecordingStarted();

        this._autoRecordGeneration = userInitiated ? null : Symbol("Generation");
        this._controller = new WebInspector.TimelineController(mainTarget, this, this._tracingModel);
        this._controller.startRecording(true, this._captureJSProfileSetting.get(), this._captureMemorySetting.get(), this._captureLayersAndPicturesSetting.get(), this._captureFilmStripSetting && this._captureFilmStripSetting.get());

        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].timelineStarted();

        if (userInitiated)
            WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.TimelineStarted);
        this._setUIControlsEnabled(false);
        this._hideRecordingHelpMessage();
    },

    _stopRecording: function()
    {
        if (this._statusPane) {
            this._statusPane.finish();
            this._statusPane.updateStatus(WebInspector.UIString("Stopping timeline\u2026"));
            this._statusPane.updateProgressBar(WebInspector.UIString("Received"), 0);
        }
        this._setState(WebInspector.TimelinePanel.State.StopPending);
        this._autoRecordGeneration = null;
        this._controller.stopRecording();
        this._controller = null;
        this._setUIControlsEnabled(true);
    },

    _onSuspendStateChanged: function()
    {
        this._updateTimelineControls();
    },

    _updateTimelineControls: function()
    {
        var state = WebInspector.TimelinePanel.State;
        this._toggleRecordAction.setToggled(this._state === state.Recording);
        this._toggleRecordAction.setEnabled(this._state === state.Recording || this._state === state.Idle);
        this._panelToolbar.setEnabled(this._state !== state.Loading);
        this._dropTarget.setEnabled(this._state === state.Idle);
    },

    _toggleRecording: function()
    {
        if (this._state === WebInspector.TimelinePanel.State.Idle)
            this._startRecording(true);
        else if (this._state === WebInspector.TimelinePanel.State.Recording)
            this._stopRecording();
    },

    _garbageCollectButtonClicked: function()
    {
        var targets = WebInspector.targetManager.targets();
        for (var i = 0; i < targets.length; ++i)
            targets[i].heapProfilerAgent().collectGarbage();
    },

    _clear: function()
    {
        this._tracingModel.reset();
        this._model.reset();
        this._resetLineLevelCPUProfile();
        this._showRecordingHelpMessage();

        this.requestWindowTimes(0, Infinity);
        delete this._selection;
        this._frameModel.reset();
        this._overviewPane.reset();
        for (var i = 0; i < this._currentViews.length; ++i)
            this._currentViews[i].reset();
        for (var i = 0; i < this._overviewControls.length; ++i)
            this._overviewControls[i].reset();
        this.select(null);
        delete this._filmStripModel;
        this._detailsSplitWidget.hideSidebar();
    },

    /**
     * @override
     */
    recordingStarted: function()
    {
        this._clear();
        this._setState(WebInspector.TimelinePanel.State.Recording);
        this._showRecordingStarted();
        this._statusPane.updateStatus(WebInspector.UIString("Recording\u2026"));
        this._statusPane.updateProgressBar(WebInspector.UIString("Buffer usage"), 0)
        this._statusPane.startTimer();
        this._hideRecordingHelpMessage();
    },

    /**
     * @override
     * @param {number} usage
     */
    recordingProgress: function(usage)
    {
        this._statusPane.updateProgressBar(WebInspector.UIString("Buffer usage"), usage * 100);
    },

    _showRecordingHelpMessage: function()
    {
        /**
         * @param {string} tagName
         * @param {string} contents
         * @return {!Element}
         */
        function encloseWithTag(tagName, contents)
        {
            var e = createElement(tagName);
            e.textContent = contents;
            return e;
        }

        var recordNode = encloseWithTag("b", WebInspector.shortcutRegistry.shortcutDescriptorsForAction("timeline.toggle-recording")[0].name);
        var reloadNode = encloseWithTag("b", WebInspector.shortcutRegistry.shortcutDescriptorsForAction("main.reload")[0].name);
        var navigateNode = encloseWithTag("b", WebInspector.UIString("WASD"));
        var hintText = createElementWithClass("div");
        hintText.appendChild(WebInspector.formatLocalized("To capture a new timeline, click the record toolbar button or hit %s.", [recordNode]));
        hintText.createChild("br");
        hintText.appendChild(WebInspector.formatLocalized("To evaluate page load performance, hit %s to record the reload.", [reloadNode]));
        hintText.createChild("p");
        hintText.appendChild(WebInspector.formatLocalized("After recording, select an area of interest in the overview by dragging.", []));
        hintText.createChild("br");
        hintText.appendChild(WebInspector.formatLocalized("Then, zoom and pan the timeline with the mousewheel and %s keys.", [navigateNode]));
        this._hideRecordingHelpMessage();
        this._helpMessageElement = this._searchableView.element.createChild("div", "banner timeline-status-pane");
        this._helpMessageElement.appendChild(hintText);
    },

    _hideRecordingHelpMessage: function()
    {
        if (this._helpMessageElement)
            this._helpMessageElement.remove();
        delete this._helpMessageElement;
    },

    /**
     * @override
     */
    loadingStarted: function()
    {
        this._hideRecordingHelpMessage();

        if (this._statusPane)
            this._statusPane.hide();
        this._statusPane = new WebInspector.TimelinePanel.StatusPane(false, this._cancelLoading.bind(this));
        this._statusPane.showPane(this._statusPaneContainer);
        this._statusPane.updateStatus(WebInspector.UIString("Loading timeline\u2026"));
        // FIXME: make loading from backend cancelable as well.
        if (!this._loader)
            this._statusPane.finish();
        this.loadingProgress(0);
    },

    /**
     * @override
     * @param {number=} progress
     */
    loadingProgress: function(progress)
    {
        if (typeof progress === "number")
            this._statusPane.updateProgressBar(WebInspector.UIString("Received"), progress * 100);
    },

    /**
     * @override
     * @param {boolean} success
     */
    loadingComplete: function(success)
    {
        var loadedFromFile = !!this._loader;
        delete this._loader;
        this._setState(WebInspector.TimelinePanel.State.Idle);

        if (!success) {
            this._statusPane.hide();
            delete this._statusPane;
            this._clear();
            return;
        }

        if (this._statusPane)
            this._statusPane.updateStatus(WebInspector.UIString("Processing timeline\u2026"));
        this._model.setEvents(this._tracingModel, loadedFromFile);
        this._frameModel.reset();
        this._frameModel.addTraceEvents(this._model.target(), this._model.inspectedTargetEvents(), this._model.sessionId() || "");
        this._irModel.populate(this._model);
        this._setLineLevelCPUProfile(this._model.lineLevelCPUProfile());
        if (this._statusPane)
            this._statusPane.hide();
        delete this._statusPane;
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
    },

    _showRecordingStarted: function()
    {
        if (this._statusPane)
            return;
        this._statusPane = new WebInspector.TimelinePanel.StatusPane(true, this._stopRecording.bind(this));
        this._statusPane.showPane(this._statusPaneContainer);
        this._statusPane.updateStatus(WebInspector.UIString("Initializing recording\u2026"));
    },

    _cancelLoading: function()
    {
        if (this._loader)
            this._loader.cancel();
    },

    _setMarkers: function()
    {
        var markers = new Map();
        var recordTypes = WebInspector.TimelineModel.RecordType;
        var zeroTime = this._model.minimumRecordTime();
        for (var record of this._model.eventDividerRecords()) {
            if (record.type() === recordTypes.TimeStamp || record.type() === recordTypes.ConsoleTime)
                continue;
            markers.set(record.startTime(), WebInspector.TimelineUIUtils.createDividerForRecord(record, zeroTime, 0));
        }
        this._overviewPane.setMarkers(markers);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _pageReloadRequested: function(event)
    {
        if (this._state !== WebInspector.TimelinePanel.State.Idle || !this.isShowing())
            return;
        this._startRecording(false);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _loadEventFired: function(event)
    {
        if (this._state !== WebInspector.TimelinePanel.State.Recording || !this._autoRecordGeneration)
            return;
        setTimeout(stopRecordingOnReload.bind(this, this._autoRecordGeneration), this._millisecondsToRecordAfterLoadEvent);

        /**
         * @this {WebInspector.TimelinePanel}
         * @param {!Object} recordGeneration
         */
        function stopRecordingOnReload(recordGeneration)
        {
            // Check if we're still in the same recording session.
            if (this._state !== WebInspector.TimelinePanel.State.Recording || this._autoRecordGeneration !== recordGeneration)
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

    /**
     * @param {number} index
     */
    _jumpToSearchResult: function(index)
    {
        this._selectSearchResult((index + this._searchResults.length) % this._searchResults.length);
        this._currentViews[0].highlightSearchResult(this._selectedSearchResult, this._searchRegex, true);
    },

    /**
     * @param {number} index
     */
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
        if (!this._searchRegex) {
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
        if (!this._searchRegex)
            return;

        // FIXME: search on all threads.
        var events = this._model.mainThreadEvents();
        var filters = this._filters.concat([new WebInspector.TimelineTextFilter(this._searchRegex)]);
        var matches = [];
        for (var index = events.lowerBound(this._windowStartTime, (time, event) => time - event.startTime); index < events.length; ++index) {
            var event = events[index];
            if (event.startTime > this._windowEndTime)
                break;
            if (WebInspector.TimelineModel.isVisible(filters, event))
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
        switch (this._selection.type()) {
        case WebInspector.TimelineSelection.Type.TraceEvent:
            var event = /** @type {!WebInspector.TracingModel.Event} */ (this._selection.object());
            WebInspector.TimelineUIUtils.buildTraceEventDetails(event, this._model, this._detailsLinkifier, true, this._appendDetailsTabsForTraceEventAndShowDetails.bind(this, event));
            break;
        case WebInspector.TimelineSelection.Type.Frame:
            var frame = /** @type {!WebInspector.TimelineFrame} */ (this._selection.object());
            if (!this._filmStripModel)
                this._filmStripModel = new WebInspector.FilmStripModel(this._tracingModel);
            var screenshotTime = frame.idle ? frame.startTime : frame.endTime; // For idle frames, look at the state at the beginning of the frame.
            var filmStripFrame = this._filmStripModel && this._filmStripModel.frameByTimestamp(screenshotTime);
            if (filmStripFrame && filmStripFrame.timestamp - frame.endTime > 10)
                filmStripFrame = null;
            this.showInDetails(WebInspector.TimelineUIUtils.generateDetailsContentForFrame(this._frameModel, frame, filmStripFrame));
            if (frame.layerTree) {
                var layersView = this._layersView();
                layersView.showLayerTree(frame.layerTree, frame.paints);
                if (!this._detailsView.hasTab(WebInspector.TimelinePanel.DetailsTab.LayerViewer))
                    this._detailsView.appendTab(WebInspector.TimelinePanel.DetailsTab.LayerViewer, WebInspector.UIString("Layers"), layersView);
            }
            break;
        case WebInspector.TimelineSelection.Type.NetworkRequest:
            var request = /** @type {!WebInspector.TimelineModel.NetworkRequest} */ (this._selection.object());
            WebInspector.TimelineUIUtils.buildNetworkRequestDetails(request, this._model, this._detailsLinkifier)
                .then(this.showInDetails.bind(this));
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
        case WebInspector.TimelineSelection.Type.TraceEvent:
            return this._frameModel.filteredFrames(selection._endTime, selection._endTime)[0];
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
        var frames = this._frameModel.frames();
        var index = frames.indexOf(currentFrame);
        console.assert(index >= 0, "Can't find current frame in the frame list");
        index = Number.constrain(index + offset, 0, frames.length - 1);
        var frame = frames[index];
        this._revealTimeRange(frame.startTime, frame.endTime);
        this.select(WebInspector.TimelineSelection.fromFrame(frame));
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
     * @param {number} startTime
     * @param {number} endTime
     */
    _updateSelectedRangeStats: function(startTime, endTime)
    {
        this.showInDetails(WebInspector.TimelineUIUtils.buildRangeStats(this._model, startTime, endTime));
    },

    /**
     * @override
     * @param {?WebInspector.TimelineSelection} selection
     * @param {!WebInspector.TimelinePanel.DetailsTab=} preferredTab
     */
    select: function(selection, preferredTab)
    {
        if (!selection)
            selection = WebInspector.TimelineSelection.fromRange(this._windowStartTime, this._windowEndTime);
        this._selection = selection;
        this._detailsLinkifier.reset();
        if (preferredTab)
            this._detailsView.setPreferredTab(preferredTab);

        for (var view of this._currentViews)
            view.setSelection(selection);
        this._updateSelectionDetails();
    },

    /**
     * @override
     * @param {number} time
     */
    selectEntryAtTime: function(time)
    {
        var events = this._model.mainThreadEvents();
        // Find best match, then backtrack to the first visible entry.
        for (var index = events.upperBound(time, (time, event) => time - event.startTime) - 1; index >= 0; --index) {
            var event = events[index];
            var endTime = event.endTime || event.startTime;
            if (WebInspector.TracingModel.isTopLevelEvent(event) && endTime < time)
                break;
            if (WebInspector.TimelineModel.isVisible(this._filters, event) && endTime >= time) {
                this.select(WebInspector.TimelineSelection.fromTraceEvent(event));
                return;
            }
        }
        this.select(null);
    },

    /**
     * @override
     * @param {?WebInspector.TracingModel.Event} event
     */
    highlightEvent: function(event)
    {
        for (var view of this._currentViews)
            view.highlightEvent(event);
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    _revealTimeRange: function(startTime, endTime)
    {
        var timeShift = 0;
        if (this._windowEndTime < endTime)
            timeShift = endTime - this._windowEndTime;
        else if (this._windowStartTime > startTime)
            timeShift = startTime - this._windowStartTime;
        if (timeShift)
            this.requestWindowTimes(this._windowStartTime + timeShift, this._windowEndTime + timeShift);
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

    _setAutoWindowTimes: function()
    {
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
        function findLowUtilizationRegion(startIndex, stopIndex)
        {
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
    },

    /**
     * @param {!WebInspector.TimelineModel.LineLevelProfile} profile
     */
    _setLineLevelCPUProfile: function(profile)
    {
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(WebInspector.targetManager.mainTarget());
        if (!debuggerModel)
            return;
        for (var fileInfo of profile.files()) {
            var url = /** @type {string} */ (fileInfo[0]);
            var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(url);
            for (var lineInfo of fileInfo[1]) {
                var line = lineInfo[0] - 1;
                var time = lineInfo[1];
                var rawLocation = debuggerModel.createRawLocationByURL(url, line, 0);
                if (rawLocation)
                    new WebInspector.TimelineUIUtils.LineLevelProfilePresentation(rawLocation, time, this._locationPool);
                else if (uiSourceCode)
                    uiSourceCode.addLineDecoration(line, WebInspector.TimelineUIUtils.PerformanceLineDecorator.type, time);
            }
        }
    },

    _resetLineLevelCPUProfile: function()
    {
        this._locationPool.disposeAll();
        WebInspector.workspace.uiSourceCodes().forEach(uiSourceCode => uiSourceCode.removeAllLineDecorations(WebInspector.TimelineUIUtils.PerformanceLineDecorator.type));
    },

    __proto__: WebInspector.Panel.prototype
}

/**
 * @interface
 */
WebInspector.TimelineLifecycleDelegate = function()
{
}

WebInspector.TimelineLifecycleDelegate.prototype = {
    recordingStarted: function() {},

    /**
     * @param {number} usage
     */
    recordingProgress: function(usage) {},

    loadingStarted: function() {},

    /**
     * @param {number=} progress
     */
    loadingProgress: function(progress) {},

    /**
     * @param {boolean} success
     */
    loadingComplete: function(success) {},
};


/**
 * @constructor
 * @extends {WebInspector.TabbedPane}
 * @param {!WebInspector.TimelineModel} timelineModel
 * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
 * @param {!WebInspector.TimelineModeViewDelegate} delegate
 */
WebInspector.TimelineDetailsView = function(timelineModel, filters, delegate)
{
    WebInspector.TabbedPane.call(this);
    this.element.classList.add("timeline-details");

    var tabIds = WebInspector.TimelinePanel.DetailsTab;
    this._defaultDetailsWidget = new WebInspector.VBox();
    this._defaultDetailsWidget.element.classList.add("timeline-details-view");
    this._defaultDetailsContentElement = this._defaultDetailsWidget.element.createChild("div", "timeline-details-view-body vbox");
    this.appendTab(tabIds.Details, WebInspector.UIString("Summary"), this._defaultDetailsWidget);
    this.setPreferredTab(tabIds.Details);

    /** @type Map<string, WebInspector.TimelineTreeView> */
    this._rangeDetailViews = new Map();

    var bottomUpView = new WebInspector.BottomUpTimelineTreeView(timelineModel, filters);
    this.appendTab(tabIds.BottomUp, WebInspector.UIString("Bottom-Up"), bottomUpView);
    this._rangeDetailViews.set(tabIds.BottomUp, bottomUpView);

    var callTreeView = new WebInspector.CallTreeTimelineTreeView(timelineModel, filters);
    this.appendTab(tabIds.CallTree, WebInspector.UIString("Call Tree"), callTreeView);
    this._rangeDetailViews.set(tabIds.CallTree, callTreeView);

    var eventsView = new WebInspector.EventsTimelineTreeView(timelineModel, filters, delegate);
    this.appendTab(tabIds.Events, WebInspector.UIString("Event Log"), eventsView);
    this._rangeDetailViews.set(tabIds.Events, eventsView);

    this.addEventListener(WebInspector.TabbedPane.EventTypes.TabSelected, this._tabSelected, this);
}

WebInspector.TimelineDetailsView.prototype = {
    /**
     * @param {!Node} node
     */
    setContent: function(node)
    {
        var allTabs = this.otherTabs(WebInspector.TimelinePanel.DetailsTab.Details);
        for (var i = 0; i < allTabs.length; ++i) {
            if (!this._rangeDetailViews.has(allTabs[i]))
                this.closeTab(allTabs[i]);
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
        var view = this.selectedTabId ? this._rangeDetailViews.get(this.selectedTabId) : null;
        if (view)
            view.updateContents(selection);
    },

    /**
     * @override
     * @param {string} id
     * @param {string} tabTitle
     * @param {!WebInspector.Widget} view
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
 * @param {!WebInspector.TimelineSelection.Type} type
 * @param {number} startTime
 * @param {number} endTime
 * @param {!Object=} object
 */
WebInspector.TimelineSelection = function(type, startTime, endTime, object)
{
    this._type = type;
    this._startTime = startTime;
    this._endTime = endTime;
    this._object = object || null;
}

/**
 * @enum {string}
 */
WebInspector.TimelineSelection.Type = {
    Frame: "Frame",
    NetworkRequest: "NetworkRequest",
    TraceEvent: "TraceEvent",
    Range: "Range"
};

/**
 * @param {!WebInspector.TimelineFrame} frame
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromFrame = function(frame)
{
    return new WebInspector.TimelineSelection(
        WebInspector.TimelineSelection.Type.Frame,
        frame.startTime, frame.endTime,
        frame);
}

/**
 * @param {!WebInspector.TimelineModel.NetworkRequest} request
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromNetworkRequest = function(request)
{
    return new WebInspector.TimelineSelection(
        WebInspector.TimelineSelection.Type.NetworkRequest,
        request.startTime, request.endTime || request.startTime,
        request);
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromTraceEvent = function(event)
{
    return new WebInspector.TimelineSelection(
        WebInspector.TimelineSelection.Type.TraceEvent,
        event.startTime, event.endTime || (event.startTime + 1),
        event);
}

/**
 * @param {number} startTime
 * @param {number} endTime
 * @return {!WebInspector.TimelineSelection}
 */
WebInspector.TimelineSelection.fromRange = function(startTime, endTime)
{
    return new WebInspector.TimelineSelection(
        WebInspector.TimelineSelection.Type.Range,
        startTime, endTime);
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
     * @return {?Object}
     */
    object: function()
    {
        return this._object;
    },

    /**
     * @return {number}
     */
    startTime: function()
    {
        return this._startTime;
    },

    /**
     * @return {number}
     */
    endTime: function()
    {
        return this._endTime;
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
     * @return {!WebInspector.Widget}
     */
    view: function() {},

    dispose: function() {},

    /**
     * @return {?Element}
     */
    resizerElement: function() {},

    reset: function() {},

    refreshRecords: function() {},

    /**
     * @param {?WebInspector.TracingModel.Event} event
     * @param {string=} regex
     * @param {boolean=} select
     */
    highlightSearchResult: function(event, regex, select) {},

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime) {},

    /**
     * @param {?WebInspector.TimelineSelection} selection
     */
    setSelection: function(selection) {},

    /**
     * @param {?WebInspector.TracingModel.Event} event
     */
    highlightEvent: function(event) { }
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
     * @param {number} time
     */
    selectEntryAtTime: function(time) {},

    /**
     * @param {!Node} node
     */
    showInDetails: function(node) {},

    /**
     * @param {?WebInspector.TracingModel.Event} event
     */
    highlightEvent: function(event) {}
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
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        return !WebInspector.TimelineUIUtils.eventStyle(event).category.hidden;
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
    },

    /**
     * @override
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        var duration = event.endTime ? event.endTime - event.startTime : 0;
        return duration >= this._minimumRecordDuration;
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype

}

/**
 * @constructor
 * @extends {WebInspector.TimelineModel.Filter}
 * @param {!RegExp=} regExp
 */
WebInspector.TimelineTextFilter = function(regExp)
{
    WebInspector.TimelineModel.Filter.call(this);
    this._setRegExp(regExp || null);
}

WebInspector.TimelineTextFilter.prototype = {
    /**
     * @param {?RegExp} regExp
     */
    _setRegExp: function(regExp)
    {
        this._regExp = regExp;
    },

    /**
     * @override
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    accept: function(event)
    {
        return !this._regExp || WebInspector.TimelineUIUtils.testContentMatching(event, this._regExp);
    },

    __proto__: WebInspector.TimelineModel.Filter.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {boolean} showTimer
 * @param {function()} stopCallback
 */
WebInspector.TimelinePanel.StatusPane = function(showTimer, stopCallback)
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("timeline/timelineStatusDialog.css");
    this.contentElement.classList.add("timeline-status-dialog");

    var statusLine = this.contentElement.createChild("div", "status-dialog-line status");
    statusLine.createChild("div", "label").textContent = WebInspector.UIString("Status");
    this._status = statusLine.createChild("div", "content");

    if (showTimer) {
        var timeLine = this.contentElement.createChild("div", "status-dialog-line time");
        timeLine.createChild("div", "label").textContent = WebInspector.UIString("Time");
        this._time = timeLine.createChild("div", "content");
    }
    var progressLine = this.contentElement.createChild("div", "status-dialog-line progress");
    this._progressLabel = progressLine.createChild("div", "label");
    this._progressBar = progressLine.createChild("div", "indicator-container").createChild("div", "indicator");

    this._stopButton = createTextButton(WebInspector.UIString("Stop"), stopCallback);
    this.contentElement.createChild("div", "stop-button").appendChild(this._stopButton);
}

WebInspector.TimelinePanel.StatusPane.prototype = {
    finish: function()
    {
        this._stopTimer();
        this._stopButton.disabled = true;
    },

    hide: function()
    {
        this.element.parentNode.classList.remove("tinted");
        this.element.remove();
    },

    /**
     * @param {!Element} parent
     */
    showPane: function(parent)
    {
        this.show(parent);
        parent.classList.add("tinted");
    },

    /**
     * @param {string} text
     */
    updateStatus: function(text)
    {
        this._status.textContent = text;
    },

    /**
     * @param {string} activity
     * @param {number} percent
     */
    updateProgressBar: function(activity, percent)
    {
        this._progressLabel.textContent = activity;
        this._progressBar.style.width = percent.toFixed(1) + "%";
        this._updateTimer();
    },

    startTimer: function()
    {
        this._startTime = Date.now();
        this._timeUpdateTimer = setInterval(this._updateTimer.bind(this, false), 1000);
        this._updateTimer();
    },

    _stopTimer: function()
    {
        if (!this._timeUpdateTimer)
            return;
        clearInterval(this._timeUpdateTimer);
        this._updateTimer(true);
        delete this._timeUpdateTimer;
    },

    /**
     * @param {boolean=} precise
     */
    _updateTimer: function(precise)
    {
        if (!this._timeUpdateTimer)
            return;
        var elapsed = (Date.now() - this._startTime) / 1000;
        this._time.textContent = WebInspector.UIString("%s\u2009sec", elapsed.toFixed(precise ? 1 : 0));
    },

    __proto__: WebInspector.VBox.prototype
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

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.TimelinePanel.ActionDelegate = function()
{
}

WebInspector.TimelinePanel.ActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        var panel = WebInspector.context.flavor(WebInspector.TimelinePanel);
        console.assert(panel && panel instanceof WebInspector.TimelinePanel);
        switch (actionId) {
        case "timeline.toggle-recording":
            panel._toggleRecording();
            return true;
        case "timeline.save-to-file":
            panel._saveToFile();
            return true;
        case "timeline.load-from-file":
            panel._selectFileToLoad();
            return true;
        case "timeline.jump-to-previous-frame":
            panel._jumpToFrame(-1);
            return true;
        case "timeline.jump-to-next-frame":
            panel._jumpToFrame(1);
            return true;
        }
        return false;
    }
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
WebInspector.TimelineFilters = function()
{
    WebInspector.Object.call(this);

    this._categoryFilter = new WebInspector.TimelineCategoryFilter();
    this._durationFilter = new WebInspector.TimelineIsLongFilter();
    this._textFilter = new WebInspector.TimelineTextFilter();
    this._filters = [this._categoryFilter, this._durationFilter, this._textFilter];

    this._createFilterBar();
}

WebInspector.TimelineFilters.Events = {
    FilterChanged: Symbol("FilterChanged")
};

WebInspector.TimelineFilters._durationFilterPresetsMs = [0, 1, 15];

WebInspector.TimelineFilters.prototype = {
    /**
     * @return {!Array<!WebInspector.TimelineModel.Filter>}
     */
    filters: function()
    {
        return this._filters;
    },

    /**
     * @return {?RegExp}
     */
    searchRegExp: function()
    {
        return this._textFilter._regExp;
    },

    /**
     * @return {!WebInspector.ToolbarItem}
     */
    filterButton: function()
    {
        return this._filterBar.filterButton();
    },

    /**
     * @return {!WebInspector.Widget}
     */
    filtersWidget: function()
    {
        return this._filterBar;
    },

    _createFilterBar: function()
    {
        this._filterBar = new WebInspector.FilterBar("timelinePanel");

        this._textFilterUI = new WebInspector.TextFilterUI();
        this._textFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, textFilterChanged, this);
        this._filterBar.addFilter(this._textFilterUI);

        var durationOptions = [];
        for (var durationMs of WebInspector.TimelineFilters._durationFilterPresetsMs) {
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
        var durationFilterUI = new WebInspector.ComboBoxFilterUI(durationOptions);
        durationFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, durationFilterChanged, this);
        this._filterBar.addFilter(durationFilterUI);

        var categoryFiltersUI = {};
        var categories = WebInspector.TimelineUIUtils.categories();
        for (var categoryName in categories) {
            var category = categories[categoryName];
            if (!category.visible)
                continue;
            var filter = new WebInspector.CheckboxFilterUI(category.name, category.title);
            filter.setColor(category.color, "rgba(0, 0, 0, 0.2)");
            categoryFiltersUI[category.name] = filter;
            filter.addEventListener(WebInspector.FilterUI.Events.FilterChanged, categoriesFilterChanged.bind(this, categoryName));
            this._filterBar.addFilter(filter);
        }
        return this._filterBar;

        /**
         * @this {WebInspector.TimelineFilters}
         */
        function textFilterChanged()
        {
            var searchQuery = this._textFilterUI.value();
            this._textFilter._setRegExp(searchQuery ? createPlainTextSearchRegex(searchQuery, "i") : null);
            this._notifyFiltersChanged();
        }

        /**
         * @this {WebInspector.TimelineFilters}
         */
        function durationFilterChanged()
        {
            var duration = durationFilterUI.value();
            var minimumRecordDuration = parseInt(duration, 10);
            this._durationFilter.setMinimumRecordDuration(minimumRecordDuration);
            this._notifyFiltersChanged();
        }

        /**
         * @param {string} name
         * @this {WebInspector.TimelineFilters}
         */
        function categoriesFilterChanged(name)
        {
            var categories = WebInspector.TimelineUIUtils.categories();
            categories[name].hidden = !categoryFiltersUI[name].checked();
            this._notifyFiltersChanged();
        }
    },

    _notifyFiltersChanged: function()
    {
        this.dispatchEventToListeners(WebInspector.TimelineFilters.Events.FilterChanged);
    },

    __proto__: WebInspector.Object.prototype
};

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.CPUThrottlingManager = function()
{
    this._targets = [];
    this._throttlingRate = 1.; // No throttling
    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Type.Page);
}

WebInspector.CPUThrottlingManager.prototype = {
    /**
     * @param {number} value
     */
    setRate: function(value)
    {
        this._throttlingRate = value;
        this._targets.forEach(target => target.emulationAgent().setCPUThrottlingRate(value));
    },

    /**
     * @return {number}
     */
    rate: function()
    {
        return this._throttlingRate;
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        this._targets.push(target);
        target.emulationAgent().setCPUThrottlingRate(this._throttlingRate);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        this._targets.remove(target, true);
    },

    __proto__: WebInspector.Object.prototype
}
