// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.FlameChartDataProvider}
 * @unrestricted
 */
Timeline.TimelineFlameChartDataProviderBase = class {
  /**
   * @param {!TimelineModel.TimelineModel} model
   * @param {!Array<!TimelineModel.TimelineModel.Filter>} filters
   */
  constructor(model, filters) {
    UI.FlameChartDataProvider.call(this);
    this.reset();
    this._model = model;
    /** @type {?UI.FlameChart.TimelineData} */
    this._timelineData;
    this._font = '11px ' + Host.fontFamily();
    this._filters = filters;
  }

  /**
   * @override
   * @return {number}
   */
  barHeight() {
    return 17;
  }

  /**
   * @override
   * @return {number}
   */
  textBaseline() {
    return 5;
  }

  /**
   * @override
   * @return {number}
   */
  textPadding() {
    return 4;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {string}
   */
  entryFont(entryIndex) {
    return this._font;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?string}
   */
  entryTitle(entryIndex) {
    return null;
  }

  reset() {
    this._timelineData = null;
  }

  /**
   * @override
   * @return {number}
   */
  minimumBoundary() {
    return this._minimumBoundary;
  }

  /**
   * @override
   * @return {number}
   */
  totalTime() {
    return this._timeSpan;
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return Number.preciseMillisToString(value, precision);
  }

  /**
   * @override
   * @return {number}
   */
  maxStackDepth() {
    return this._currentLevel;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(entryIndex) {
    return null;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {boolean}
   */
  canJumpToEntry(entryIndex) {
    return false;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {string}
   */
  entryColor(entryIndex) {
    return 'red';
  }

  /**
   * @override
   * @param {number} index
   * @return {boolean}
   */
  forceDecoration(index) {
    return false;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @param {!CanvasRenderingContext2D} context
   * @param {?string} text
   * @param {number} barX
   * @param {number} barY
   * @param {number} barWidth
   * @param {number} barHeight
   * @param {number} unclippedBarX
   * @param {number} timeToPixels
   * @return {boolean}
   */
  decorateEntry(entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixels) {
    return false;
  }

  /**
   * @override
   * @return {number}
   */
  paddingLeft() {
    return 0;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {string}
   */
  textColor(entryIndex) {
    return '#333';
  }

  /**
   * @param {number} entryIndex
   * @return {?Timeline.TimelineSelection}
   */
  createSelection(entryIndex) {
    return null;
  }

  /**
   * @override
   * @return {!UI.FlameChart.TimelineData}
   */
  timelineData() {
    throw new Error('Not implemented');
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {boolean}
   */
  _isVisible(event) {
    return this._filters.every(function(filter) {
      return filter.accept(event);
    });
  }
};

/**
 * @enum {symbol}
 */
Timeline.TimelineFlameChartEntryType = {
  Frame: Symbol('Frame'),
  Event: Symbol('Event'),
  InteractionRecord: Symbol('InteractionRecord'),
};

/**
 * @implements {UI.FlameChartMarker}
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
    var startTime = Number.millisToString(this._startOffset);
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
    var lowPriorityVisibilityThresholdInPixelsPerMs = 4;

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

/**
 * @implements {Timeline.TimelineModeView}
 * @implements {UI.FlameChartDelegate}
 * @unrestricted
 */
Timeline.TimelineFlameChartView = class extends UI.VBox {
  /**
   * @param {!Timeline.TimelineModeViewDelegate} delegate
   * @param {!TimelineModel.TimelineModel} timelineModel
   * @param {!TimelineModel.TimelineFrameModel} frameModel
   * @param {!TimelineModel.TimelineIRModel} irModel
   * @param {!Array<!TimelineModel.TimelineModel.Filter>} filters
   */
  constructor(delegate, timelineModel, frameModel, irModel, filters) {
    super();
    this.element.classList.add('timeline-flamechart');
    this._delegate = delegate;
    this._model = timelineModel;

    this._splitWidget = new UI.SplitWidget(false, false, 'timelineFlamechartMainView', 150);

    this._dataProvider = new Timeline.TimelineFlameChartDataProvider(this._model, frameModel, irModel, filters);
    var mainViewGroupExpansionSetting = Common.settings.createSetting('timelineFlamechartMainViewGroupExpansion', {});
    this._mainView = new UI.FlameChart(this._dataProvider, this, mainViewGroupExpansionSetting);

    var networkViewGroupExpansionSetting =
        Common.settings.createSetting('timelineFlamechartNetworkViewGroupExpansion', {});
    this._networkDataProvider = new Timeline.TimelineFlameChartNetworkDataProvider(this._model);
    this._networkView = new UI.FlameChart(this._networkDataProvider, this, networkViewGroupExpansionSetting);
    networkViewGroupExpansionSetting.addChangeListener(this.resizeToPreferredHeights.bind(this));

    this._splitWidget.setMainWidget(this._mainView);
    this._splitWidget.setSidebarWidget(this._networkView);
    this._splitWidget.show(this.element);

    this._onMainEntrySelected = this._onEntrySelected.bind(this, this._dataProvider);
    this._onNetworkEntrySelected = this._onEntrySelected.bind(this, this._networkDataProvider);
    this._mainView.addEventListener(UI.FlameChart.Events.EntrySelected, this._onMainEntrySelected, this);
    this._networkView.addEventListener(UI.FlameChart.Events.EntrySelected, this._onNetworkEntrySelected, this);
    Bindings.blackboxManager.addChangeListener(this.refreshRecords, this);
  }

  /**
   * @override
   */
  dispose() {
    this._mainView.removeEventListener(UI.FlameChart.Events.EntrySelected, this._onMainEntrySelected, this);
    this._networkView.removeEventListener(UI.FlameChart.Events.EntrySelected, this._onNetworkEntrySelected, this);
    Bindings.blackboxManager.removeChangeListener(this.refreshRecords, this);
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
   */
  refreshRecords() {
    this._dataProvider.reset();
    this._mainView.scheduleUpdate();
    this._networkDataProvider.reset();
    this._networkView.scheduleUpdate();
  }

  /**
   * @override
   * @param {?SDK.TracingModel.Event} event
   */
  highlightEvent(event) {
    var entryIndex =
        event ? this._dataProvider.entryIndexForSelection(Timeline.TimelineSelection.fromTraceEvent(event)) : -1;
    if (entryIndex >= 0)
      this._mainView.highlightEntry(entryIndex);
    else
      this._mainView.hideHighlight();
  }

  /**
   * @override
   */
  wasShown() {
    this._mainView.scheduleUpdate();
    this._networkView.scheduleUpdate();
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
   */
  reset() {
    this._dataProvider.reset();
    this._mainView.reset();
    this._mainView.setWindowTimes(0, Infinity);
    this._networkDataProvider.reset();
    this._networkView.reset();
    this._networkView.setWindowTimes(0, Infinity);
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  setWindowTimes(startTime, endTime) {
    this._mainView.setWindowTimes(startTime, endTime);
    this._networkView.setWindowTimes(startTime, endTime);
    this._networkDataProvider.setWindowTimes(startTime, endTime);
  }

  /**
   * @override
   * @param {?SDK.TracingModel.Event} event
   * @param {string=} regex
   * @param {boolean=} select
   */
  highlightSearchResult(event, regex, select) {
    if (!event) {
      this._delegate.select(null);
      return;
    }
    var timelineSelection = this._dataProvider.selectionForEvent(event);
    if (timelineSelection)
      this._delegate.select(timelineSelection);
  }

  /**
   * @override
   * @param {?Timeline.TimelineSelection} selection
   */
  setSelection(selection) {
    var index = this._dataProvider.entryIndexForSelection(selection);
    this._mainView.setSelectedEntry(index);
    index = this._networkDataProvider.entryIndexForSelection(selection);
    this._networkView.setSelectedEntry(index);
  }

  /**
   * @param {!UI.FlameChartDataProvider} dataProvider
   * @param {!Common.Event} event
   */
  _onEntrySelected(dataProvider, event) {
    var entryIndex = /** @type{number} */ (event.data);
    this._delegate.select(dataProvider.createSelection(entryIndex));
  }

  /**
   * @param {boolean} enable
   * @param {boolean=} animate
   */
  enableNetworkPane(enable, animate) {
    if (enable)
      this._splitWidget.showBoth(animate);
    else
      this._splitWidget.hideSidebar(animate);
  }

  resizeToPreferredHeights() {
    this._splitWidget.setSidebarSize(this._networkDataProvider.preferredHeight());
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
