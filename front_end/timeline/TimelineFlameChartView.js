// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Timeline.TimelineModeView}
 * @implements {PerfUI.FlameChartDelegate}
 * @implements {UI.Searchable}
 * @unrestricted
 */
Timeline.TimelineFlameChartView = class extends UI.VBox {
  /**
   * @param {!Timeline.TimelineModeViewDelegate} delegate
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   */
  constructor(delegate, filters) {
    super();
    this.element.classList.add('timeline-flamechart');
    this._delegate = delegate;
    /** @type {?Timeline.PerformanceModel} */
    this._model = null;
    /** @type {!Array<number>|undefined} */
    this._searchResults;
    this._filters = filters;

    this._showMemoryGraphSetting = Common.settings.createSetting('timelineShowMemory', false);

    // Create main and network flamecharts.
    this._networkSplitWidget = new UI.SplitWidget(false, false, 'timelineFlamechartMainView', 150);

    const mainViewGroupExpansionSetting = Common.settings.createSetting('timelineFlamechartMainViewGroupExpansion', {});
    this._mainDataProvider = new Timeline.TimelineFlameChartDataProvider(filters);
    this._mainDataProvider.addEventListener(
        Timeline.TimelineFlameChartDataProvider.Events.DataChanged, () => this._mainFlameChart.scheduleUpdate());
    this._mainFlameChart = new PerfUI.FlameChart(this._mainDataProvider, this, mainViewGroupExpansionSetting);
    this._mainFlameChart.alwaysShowVerticalScroll();
    this._mainFlameChart.enableRuler(false);

    this._networkFlameChartGroupExpansionSetting =
        Common.settings.createSetting('timelineFlamechartNetworkViewGroupExpansion', {});
    this._networkDataProvider = new Timeline.TimelineFlameChartNetworkDataProvider();
    this._networkFlameChart = new PerfUI.FlameChart(
        this._networkDataProvider, this, this._networkFlameChartGroupExpansionSetting);
    this._networkFlameChart.alwaysShowVerticalScroll();
    this._networkFlameChart.disableRangeSelection();

    this._networkPane = new UI.VBox();
    this._networkPane.setMinimumSize(23, 23);
    this._networkFlameChart.show(this._networkPane.element);
    this._splitResizer = this._networkPane.element.createChild('div', 'timeline-flamechart-resizer');
    this._networkSplitWidget.hideDefaultResizer(true);
    this._networkSplitWidget.installResizer(this._splitResizer);

    this._networkSplitWidget.setMainWidget(this._mainFlameChart);
    this._networkSplitWidget.setSidebarWidget(this._networkPane);

    // Create counters chart splitter.
    this._chartSplitWidget = new UI.SplitWidget(false, true, 'timelineCountersSplitViewState');
    this._countersView = new Timeline.CountersGraph(this._delegate);
    this._chartSplitWidget.setMainWidget(this._networkSplitWidget);
    this._chartSplitWidget.setSidebarWidget(this._countersView);
    this._chartSplitWidget.hideDefaultResizer();
    this._chartSplitWidget.installResizer(/** @type {!Element} */ (this._countersView.resizerElement()));
    this._updateCountersGraphToggle();

    // Create top level properties splitter.
    this._detailsSplitWidget = new UI.SplitWidget(false, true, 'timelinePanelDetailsSplitViewState');
    this._detailsSplitWidget.element.classList.add('timeline-details-split');
    this._detailsView = new Timeline.TimelineDetailsView(filters, delegate);
    this._detailsSplitWidget.installResizer(this._detailsView.headerElement());
    this._detailsSplitWidget.setMainWidget(this._chartSplitWidget);
    this._detailsSplitWidget.setSidebarWidget(this._detailsView);
    this._detailsSplitWidget.show(this.element);

    this._onMainEntrySelected = this._onEntrySelected.bind(this, this._mainDataProvider);
    this._onNetworkEntrySelected = this._onEntrySelected.bind(this, this._networkDataProvider);
    this._mainFlameChart.addEventListener(PerfUI.FlameChart.Events.EntrySelected, this._onMainEntrySelected, this);
    this._networkFlameChart.addEventListener(PerfUI.FlameChart.Events.EntrySelected, this._onNetworkEntrySelected, this);
    this._mainFlameChart.addEventListener(PerfUI.FlameChart.Events.EntryHighlighted, this._onEntryHighlighted, this);
    this._nextExtensionIndex = 0;

    this._boundRefresh = this._refresh.bind(this);
    this._selectedEventsTrack = null;

    this._mainDataProvider.setEventColorMapping(Timeline.TimelineUIUtils.eventColor);
    this._groupBySetting =
        Common.settings.createSetting('timelineTreeGroupBy', Timeline.AggregatedTimelineTreeView.GroupBy.None);
    this._groupBySetting.addChangeListener(this._updateColorMapper, this);
    this._updateColorMapper();
    ProductRegistry.instance().then(registry => this._productRegistry = registry);
  }

  _updateColorMapper() {
    /** @type {!Map<string, string>} */
    this._urlToColorCache = new Map();
    if (!this._model)
      return;
    const colorByProduct = this._groupBySetting.get() === Timeline.AggregatedTimelineTreeView.GroupBy.Product;
    this._mainDataProvider.setEventColorMapping(
        colorByProduct ? this._colorByProductForEvent.bind(this) : Timeline.TimelineUIUtils.eventColor);
    this._mainFlameChart.update();
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {string}
   */
  _colorByProductForEvent(event) {
    return Timeline.TimelineUIUtils.eventColorByProduct(
        this._productRegistry, this._model.timelineModel(), this._urlToColorCache, event);
  }

  /**
   * @override
   * @return {?Element}
   */
  resizerElement() {
    return null;
  }

  /**
   * @override
   * @param {number} windowStartTime
   * @param {number} windowEndTime
   */
  requestWindowTimes(windowStartTime, windowEndTime) {
    this._delegate.requestWindowTimes(windowStartTime, windowEndTime);
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  updateRangeSelection(startTime, endTime) {
    this._delegate.select(Timeline.TimelineSelection.fromRange(startTime, endTime));
  }

  /**
   * @override
   * @param {!PerfUI.FlameChart} flameChart
   * @param {?PerfUI.FlameChart.Group} group
   */
  updateSelectedGroup(flameChart, group) {
    if (flameChart !== this._mainFlameChart)
      return;
    const events = group ? this._mainDataProvider.groupEvents(group) : null;
    this._selectedEventsTrack = events;
    this._updateEventsTrack();
  }

  /**
   * @override
   * @param {?Timeline.PerformanceModel} model
   */
  setModel(model) {
    if (model === this._model)
      return;
    const extensionDataAdded = Timeline.PerformanceModel.Events.ExtensionDataAdded;
    if (this._model)
      this._model.removeEventListener(extensionDataAdded, this._appendExtensionData, this);
    this._model = model;
    this._selectedEventsTrack = null;
    if (this._model)
      this._model.addEventListener(extensionDataAdded, this._appendExtensionData, this);
    this._mainDataProvider.setModel(this._model);
    this._networkDataProvider.setModel(this._model);
    this._updateColorMapper();
    this._updateEventsTrack();
    this._nextExtensionIndex = 0;
    this._appendExtensionData();
    this._refresh();
  }

  _updateEventsTrack() {
    this._countersView.setModel(this._model, this._selectedEventsTrack);
    this._detailsView.setModel(this._model, this._selectedEventsTrack);
  }

  _refresh() {
    if (this._networkDataProvider.isEmpty()) {
      this._mainFlameChart.enableRuler(true);
      this._networkSplitWidget.hideSidebar();
    } else {
      this._mainFlameChart.enableRuler(false);
      this._networkSplitWidget.showBoth();
      this.resizeToPreferredHeights();
    }
    this._mainFlameChart.reset();
    this._networkFlameChart.reset();
    this._updateSearchResults(false, false);
  }

  _appendExtensionData() {
    if (!this._model)
      return;
    const extensions = this._model.extensionInfo();
    while (this._nextExtensionIndex < extensions.length)
      this._mainDataProvider.appendExtensionEvents(extensions[this._nextExtensionIndex++]);
    this._mainFlameChart.scheduleUpdate();
  }

  /**
   * @param {!Common.Event} commonEvent
   */
  _onEntryHighlighted(commonEvent) {
    SDK.OverlayModel.hideDOMNodeHighlight();
    const entryIndex = /** @type {number} */ (commonEvent.data);
    const event = this._mainDataProvider.eventByIndex(entryIndex);
    if (!event)
      return;
    const target = this._model && this._model.timelineModel().targetByEvent(event);
    if (!target)
      return;
    const timelineData = TimelineModel.TimelineData.forEvent(event);
    const backendNodeId = timelineData.backendNodeId;
    if (!backendNodeId)
      return;
    new SDK.DeferredDOMNode(target, backendNodeId).highlight();
  }

  /**
   * @override
   * @param {?SDK.TracingModel.Event} event
   */
  highlightEvent(event) {
    const entryIndex =
        event ? this._mainDataProvider.entryIndexForSelection(Timeline.TimelineSelection.fromTraceEvent(event)) : -1;
    if (entryIndex >= 0)
      this._mainFlameChart.highlightEntry(entryIndex);
    else
      this._mainFlameChart.hideHighlight();
  }

  /**
   * @override
   */
  willHide() {
    this._networkFlameChartGroupExpansionSetting.removeChangeListener(this.resizeToPreferredHeights, this);
    this._showMemoryGraphSetting.removeChangeListener(this._updateCountersGraphToggle, this);
    Bindings.blackboxManager.removeChangeListener(this._boundRefresh);
  }

  /**
   * @override
   */
  wasShown() {
    this._networkFlameChartGroupExpansionSetting.addChangeListener(this.resizeToPreferredHeights, this);
    this._showMemoryGraphSetting.addChangeListener(this._updateCountersGraphToggle, this);
    Bindings.blackboxManager.addChangeListener(this._boundRefresh);
    if (this._needsResizeToPreferredHeights)
      this.resizeToPreferredHeights();
    this._mainFlameChart.scheduleUpdate();
    this._networkFlameChart.scheduleUpdate();
  }

  _updateCountersGraphToggle() {
    if (this._showMemoryGraphSetting.get())
      this._chartSplitWidget.showBoth();
    else
      this._chartSplitWidget.hideSidebar();
  }

  /**
   * @override
   * @return {!UI.Widget}
   */
  view() {
    return this;
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  setWindowTimes(startTime, endTime) {
    this._mainFlameChart.setWindowTimes(startTime, endTime);
    this._networkFlameChart.setWindowTimes(startTime, endTime);
    this._networkDataProvider.setWindowTimes(startTime, endTime);
    this._countersView.setWindowTimes(startTime, endTime);
    this._windowStartTime = startTime;
    this._windowEndTime = endTime;
    this._updateSearchResults(false, false);
  }

  /**
   * @override
   * @param {!Timeline.TimelineSelection} selection
   */
  setSelection(selection) {
    let index = this._mainDataProvider.entryIndexForSelection(selection);
    this._mainFlameChart.setSelectedEntry(index);
    index = this._networkDataProvider.entryIndexForSelection(selection);
    this._networkFlameChart.setSelectedEntry(index);
    if (this._detailsView)
      this._detailsView.setSelection(selection);
  }

  /**
   * @param {!PerfUI.FlameChartDataProvider} dataProvider
   * @param {!Common.Event} event
   */
  _onEntrySelected(dataProvider, event) {
    const entryIndex = /** @type{number} */ (event.data);
    if (Runtime.experiments.isEnabled('timelineEventInitiators') && dataProvider === this._mainDataProvider) {
      if (this._mainDataProvider.buildFlowForInitiator(entryIndex))
        this._mainFlameChart.scheduleUpdate();
    }
    this._delegate.select(dataProvider.createSelection(entryIndex));
  }

  resizeToPreferredHeights() {
    if (!this.isShowing()) {
      this._needsResizeToPreferredHeights = true;
      return;
    }
    this._needsResizeToPreferredHeights = false;
    this._networkPane.element.classList.toggle(
        'timeline-network-resizer-disabled', !this._networkDataProvider.isExpanded());
    this._networkSplitWidget.setSidebarSize(
        this._networkDataProvider.preferredHeight() + this._splitResizer.clientHeight + PerfUI.FlameChart.HeaderHeight +
        2);
  }

  /**
   * @param {!UI.SearchableView} searchableView
   */
  setSearchableView(searchableView) {
    this._searchableView = searchableView;
  }

  // UI.Searchable implementation

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._searchResults || !this._searchResults.length)
      return;
    const index = typeof this._selectedSearchResult !== 'undefined' ?
        this._searchResults.indexOf(this._selectedSearchResult) :
        -1;
    this._selectSearchResult(mod(index + 1, this._searchResults.length));
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchResults || !this._searchResults.length)
      return;
    const index =
        typeof this._selectedSearchResult !== 'undefined' ? this._searchResults.indexOf(this._selectedSearchResult) : 0;
    this._selectSearchResult(mod(index - 1, this._searchResults.length));
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return true;
  }

  /**
   * @param {number} index
   */
  _selectSearchResult(index) {
    this._searchableView.updateCurrentMatchIndex(index);
    this._selectedSearchResult = this._searchResults[index];
    this._delegate.select(this._mainDataProvider.createSelection(this._selectedSearchResult));
  }

  /**
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  _updateSearchResults(shouldJump, jumpBackwards) {
    const oldSelectedSearchResult = this._selectedSearchResult;
    delete this._selectedSearchResult;
    this._searchResults = [];
    if (!this._searchRegex)
      return;

    const regExpFilter = new Timeline.TimelineFilters.RegExp(this._searchRegex);
    this._searchResults = this._mainDataProvider.search(this._windowStartTime, this._windowEndTime, regExpFilter);
    this._searchableView.updateSearchMatchesCount(this._searchResults.length);
    if (!shouldJump || !this._searchResults.length)
      return;
    let selectedIndex = this._searchResults.indexOf(oldSelectedSearchResult);
    if (selectedIndex === -1)
      selectedIndex = jumpBackwards ? this._searchResults.length - 1 : 0;
    this._selectSearchResult(selectedIndex);
  }

  /**
   * @override
   */
  searchCanceled() {
    if (typeof this._selectedSearchResult !== 'undefined')
      this._delegate.select(null);
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
    this._searchRegex = searchConfig.toSearchRegex();
    this._updateSearchResults(shouldJump, jumpBackwards);
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineFlameChartView.Selection = class {
  /**
   * @param {!Timeline.TimelineSelection} selection
   * @param {number} entryIndex
   */
  constructor(selection, entryIndex) {
    this.timelineSelection = selection;
    this.entryIndex = entryIndex;
  }
};

Timeline.FlameChartStyle = {
  textColor: '#333'
};

/**
 * @implements {PerfUI.FlameChartMarker}
 * @unrestricted
 */
Timeline.TimelineFlameChartMarker = class {
  /**
   * @param {number} startTime
   * @param {number} startOffset
   * @param {!Timeline.TimelineMarkerStyle} style
   */
  constructor(startTime, startOffset, style) {
    this._startTime = startTime;
    this._startOffset = startOffset;
    this._style = style;
  }

  /**
   * @override
   * @return {number}
   */
  startTime() {
    return this._startTime;
  }

  /**
   * @override
   * @return {string}
   */
  color() {
    return this._style.color;
  }

  /**
   * @override
   * @return {string}
   */
  title() {
    const startTime = Number.millisToString(this._startOffset);
    return Common.UIString('%s at %s', this._style.title, startTime);
  }

  /**
   * @override
   * @param {!CanvasRenderingContext2D} context
   * @param {number} x
   * @param {number} height
   * @param {number} pixelsPerMillisecond
   */
  draw(context, x, height, pixelsPerMillisecond) {
    const lowPriorityVisibilityThresholdInPixelsPerMs = 4;

    if (this._style.lowPriority && pixelsPerMillisecond < lowPriorityVisibilityThresholdInPixelsPerMs)
      return;
    context.save();

    if (!this._style.lowPriority) {
      context.strokeStyle = this._style.color;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    if (this._style.tall) {
      context.strokeStyle = this._style.color;
      context.lineWidth = this._style.lineWidth;
      context.translate(this._style.lineWidth < 1 || (this._style.lineWidth & 1) ? 0.5 : 0, 0.5);
      context.beginPath();
      context.moveTo(x, height);
      context.setLineDash(this._style.dashStyle);
      context.lineTo(x, context.canvas.height);
      context.stroke();
    }
    context.restore();
  }
};

/** @enum {string} */
Timeline.TimelineFlameChartView._ColorBy = {
  URL: 'URL',
  Product: 'Product'
};
