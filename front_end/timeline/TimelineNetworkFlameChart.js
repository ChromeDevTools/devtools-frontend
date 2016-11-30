// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Timeline.TimelineFlameChartNetworkDataProvider = class extends Timeline.TimelineFlameChartDataProviderBase {
  /**
   * @param {!TimelineModel.TimelineModel} model
   */
  constructor(model) {
    super(model, []);
    var loadingCategory = Timeline.TimelineUIUtils.categories()['loading'];
    this._waitingColor = loadingCategory.childColor;
    this._processingColor = loadingCategory.color;

    this._style = {
      padding: 4,
      height: 17,
      collapsible: true,
      color: UI.themeSupport.patchColor('#222', UI.ThemeSupport.ColorUsage.Foreground),
      font: this._font,
      backgroundColor: UI.themeSupport.patchColor('white', UI.ThemeSupport.ColorUsage.Background),
      nestingLevel: 0,
      useFirstLineForOverview: false,
      shareHeaderLine: false
    };
    this._group = {startLevel: 0, name: Common.UIString('Network'), expanded: true, style: this._style};
  }

  /**
   * @override
   * @return {!UI.FlameChart.TimelineData}
   */
  timelineData() {
    if (this._timelineData)
      return this._timelineData;
    /** @type {!Array<!TimelineModel.TimelineModel.NetworkRequest>} */
    this._requests = [];
    this._timelineData = new UI.FlameChart.TimelineData([], [], [], []);
    this._appendTimelineData(this._model.mainThreadEvents());
    return this._timelineData;
  }

  /**
   * @override
   */
  reset() {
    super.reset();
    /** @type {!Array<!TimelineModel.TimelineModel.NetworkRequest>} */
    this._requests = [];
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  setWindowTimes(startTime, endTime) {
    this._startTime = startTime;
    this._endTime = endTime;
    this._updateTimelineData();
  }

  /**
   * @override
   * @param {number} index
   * @return {?Timeline.TimelineSelection}
   */
  createSelection(index) {
    if (index === -1)
      return null;
    var request = this._requests[index];
    this._lastSelection =
        new Timeline.TimelineFlameChartView.Selection(Timeline.TimelineSelection.fromNetworkRequest(request), index);
    return this._lastSelection.timelineSelection;
  }

  /**
   * @param {?Timeline.TimelineSelection} selection
   * @return {number}
   */
  entryIndexForSelection(selection) {
    if (!selection)
      return -1;

    if (this._lastSelection && this._lastSelection.timelineSelection.object() === selection.object())
      return this._lastSelection.entryIndex;

    if (selection.type() !== Timeline.TimelineSelection.Type.NetworkRequest)
      return -1;
    var request = /** @type{!TimelineModel.TimelineModel.NetworkRequest} */ (selection.object());
    var index = this._requests.indexOf(request);
    if (index !== -1) {
      this._lastSelection =
          new Timeline.TimelineFlameChartView.Selection(Timeline.TimelineSelection.fromNetworkRequest(request), index);
    }
    return index;
  }

  /**
   * @override
   * @param {number} index
   * @return {string}
   */
  entryColor(index) {
    var request = /** @type {!TimelineModel.TimelineModel.NetworkRequest} */ (this._requests[index]);
    var category = Timeline.TimelineUIUtils.networkRequestCategory(request);
    return Timeline.TimelineUIUtils.networkCategoryColor(category);
  }

  /**
   * @override
   * @param {number} index
   * @return {?string}
   */
  entryTitle(index) {
    var request = /** @type {!TimelineModel.TimelineModel.NetworkRequest} */ (this._requests[index]);
    return request.url || null;
  }

  /**
   * @override
   * @param {number} index
   * @param {!CanvasRenderingContext2D} context
   * @param {?string} text
   * @param {number} barX
   * @param {number} barY
   * @param {number} barWidth
   * @param {number} barHeight
   * @param {number} unclippedBarX
   * @param {number} timeToPixelRatio
   * @return {boolean}
   */
  decorateEntry(index, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixelRatio) {
    const request = /** @type {!TimelineModel.TimelineModel.NetworkRequest} */ (this._requests[index]);
    if (!request.timing)
      return false;

    /**
     * @param {number} time
     * @return {number}
     */
    function timeToPixel(time) {
      return Math.floor(unclippedBarX + (time - startTime) * timeToPixelRatio);
    }

    const minBarWidthPx = 2;
    const startTime = request.startTime;
    const endTime = request.endTime;
    const requestTime = request.timing.requestTime * 1000;
    const sendStart = Math.max(timeToPixel(requestTime + request.timing.sendStart), unclippedBarX);
    const headersEnd = Math.max(timeToPixel(requestTime + request.timing.receiveHeadersEnd), sendStart);
    const finish = Math.max(timeToPixel(request.finishTime || endTime), headersEnd + minBarWidthPx);
    const end = Math.max(timeToPixel(endTime), finish);

    context.fillStyle = 'hsla(0, 100%, 100%, 0.8)';
    context.fillRect(sendStart + 0.5, barY + 0.5, headersEnd - sendStart - 0.5, barHeight - 2);
    context.fillStyle = UI.themeSupport.patchColor('white', UI.ThemeSupport.ColorUsage.Background);
    context.fillRect(barX, barY - 0.5, sendStart - barX, barHeight);
    context.fillRect(finish, barY - 0.5, barX + barWidth - finish, barHeight);

    /**
     * @param {number} begin
     * @param {number} end
     * @param {number} y
     */
    function drawTick(begin, end, y) {
      const tickHeightPx = 6;
      context.moveTo(begin, y - tickHeightPx / 2);
      context.lineTo(begin, y + tickHeightPx / 2);
      context.moveTo(begin, y);
      context.lineTo(end, y);
    }

    context.lineWidth = 1;
    context.strokeStyle = '#ccc';
    const lineY = Math.floor(barY + barHeight / 2) + 0.5;
    const leftTick = Math.floor(unclippedBarX) + 0.5;
    const rightTick = end - 0.5;
    drawTick(leftTick, sendStart, lineY);
    drawTick(rightTick, finish, lineY);
    context.stroke();

    if (typeof request.priority === 'string') {
      const color = this._colorForPriority(request.priority);
      if (color) {
        context.fillStyle = color;
        context.fillRect(sendStart + 0.5, barY + 0.5, 3.5, 3.5);
      }
    }

    const textStart = Math.max(sendStart, 0);
    const textWidth = finish - textStart;
    const minTextWidthPx = 20;
    const textPadding = 6;
    if (textWidth >= minTextWidthPx) {
      const text = this.entryTitle(index);
      if (text && text.length) {
        context.fillStyle = '#333';
        const trimmedText = UI.trimTextMiddle(context, text, textWidth - 2 * textPadding);
        const textBaseHeight = barHeight - this.textBaseline();
        context.fillText(trimmedText, textStart + textPadding, barY + textBaseHeight);
      }
    }

    return true;
  }

  /**
   * @override
   * @param {number} index
   * @return {boolean}
   */
  forceDecoration(index) {
    return true;
  }

  /**
   * @override
   * @param {number} index
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(index) {
    var /** @const */ maxURLChars = 80;
    var request = /** @type {!TimelineModel.TimelineModel.NetworkRequest} */ (this._requests[index]);
    if (!request.url)
      return null;
    var element = createElement('div');
    var root = UI.createShadowRootWithCoreStyles(element, 'timeline/timelineFlamechartPopover.css');
    var contents = root.createChild('div', 'timeline-flamechart-popover');
    var duration = request.endTime - request.startTime;
    if (request.startTime && isFinite(duration))
      contents.createChild('span', 'timeline-info-network-time').textContent = Number.millisToString(duration);
    if (typeof request.priority === 'string') {
      var div = contents.createChild('span');
      div.textContent =
          Components.uiLabelForPriority(/** @type {!Protocol.Network.ResourcePriority} */ (request.priority));
      div.style.color = this._colorForPriority(request.priority) || 'black';
    }
    contents.createChild('span').textContent = request.url.trimMiddle(maxURLChars);
    return element;
  }

  /**
   * @param {string} priority
   * @return {?string}
   */
  _colorForPriority(priority) {
    switch (/** @type {!Protocol.Network.ResourcePriority} */ (priority)) {
      case Protocol.Network.ResourcePriority.VeryLow:
        return '#080';
      case Protocol.Network.ResourcePriority.Low:
        return '#6c0';
      case Protocol.Network.ResourcePriority.Medium:
        return '#fa0';
      case Protocol.Network.ResourcePriority.High:
        return '#f60';
      case Protocol.Network.ResourcePriority.VeryHigh:
        return '#f00';
    }
    return null;
  }

  /**
   * @param {!Array.<!SDK.TracingModel.Event>} events
   */
  _appendTimelineData(events) {
    this._minimumBoundary = this._model.minimumRecordTime();
    this._maximumBoundary = this._model.maximumRecordTime();
    this._timeSpan = this._model.isEmpty() ? 1000 : this._maximumBoundary - this._minimumBoundary;
    this._model.networkRequests().forEach(this._appendEntry.bind(this));
    this._updateTimelineData();
  }

  _updateTimelineData() {
    if (!this._timelineData)
      return;
    var lastTimeByLevel = [];
    var maxLevel = 0;
    for (var i = 0; i < this._requests.length; ++i) {
      const r = this._requests[i];
      const visible = r.startTime < this._endTime && r.endTime > this._startTime;
      if (!visible) {
        this._timelineData.entryLevels[i] = -1;
        continue;
      }
      while (lastTimeByLevel.length && lastTimeByLevel.peekLast() <= r.startTime)
        lastTimeByLevel.pop();
      this._timelineData.entryLevels[i] = lastTimeByLevel.length;
      lastTimeByLevel.push(r.endTime);
      maxLevel = Math.max(maxLevel, lastTimeByLevel.length);
    }
    for (var i = 0; i < this._requests.length; ++i) {
      if (this._timelineData.entryLevels[i] === -1)
        this._timelineData.entryLevels[i] = maxLevel;
    }
    this._timelineData = new UI.FlameChart.TimelineData(
        this._timelineData.entryLevels, this._timelineData.entryTotalTimes, this._timelineData.entryStartTimes,
        [this._group]);
    this._currentLevel = maxLevel;
  }


  /**
   * @param {!TimelineModel.TimelineModel.NetworkRequest} request
   */
  _appendEntry(request) {
    this._requests.push(request);
    this._timelineData.entryStartTimes.push(request.startTime);
    this._timelineData.entryTotalTimes.push(request.endTime - request.startTime);
    this._timelineData.entryLevels.push(this._requests.length - 1);
  }

  /**
   * @return {number}
   */
  preferredHeight() {
    return this._style.height * (this._group.expanded ? Number.constrain(this._currentLevel + 1, 4, 8) : 2) + 2;
  }
};
