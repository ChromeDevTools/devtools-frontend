/**
 * Copyright (C) 2013 Google Inc. All rights reserved.
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
 * @interface
 */
PerfUI.FlameChartDelegate = function() {};

PerfUI.FlameChartDelegate.prototype = {
  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  requestWindowTimes(startTime, endTime) {},

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  updateRangeSelection(startTime, endTime) {},
};

/**
 * @unrestricted
 * @implements {PerfUI.ChartViewportDelegate}
 */
PerfUI.FlameChart = class extends UI.VBox {
  /**
   * @param {!PerfUI.FlameChartDataProvider} dataProvider
   * @param {!PerfUI.FlameChartDelegate} flameChartDelegate
   * @param {!Common.Setting=} groupExpansionSetting
   */
  constructor(dataProvider, flameChartDelegate, groupExpansionSetting) {
    super(true);
    this.registerRequiredCSS('perf_ui/flameChart.css');
    this.contentElement.classList.add('flame-chart-main-pane');
    this._groupExpansionSetting = groupExpansionSetting;
    this._groupExpansionState = groupExpansionSetting && groupExpansionSetting.get() || {};
    this._flameChartDelegate = flameChartDelegate;

    this._chartViewport = new PerfUI.ChartViewport(this);
    this._chartViewport.show(this.contentElement);

    this._dataProvider = dataProvider;
    this._calculator = new PerfUI.FlameChart.Calculator(dataProvider);

    this._viewportElement = this._chartViewport.viewportElement;
    this._canvas = /** @type {!HTMLCanvasElement} */ (this._viewportElement.createChild('canvas'));

    this._canvas.tabIndex = 1;
    this.setDefaultFocusedElement(this._canvas);
    this._canvas.addEventListener('mousemove', this._onMouseMove.bind(this), false);
    this._canvas.addEventListener('mouseout', this._onMouseOut.bind(this), false);
    this._canvas.addEventListener('click', this._onClick.bind(this), false);
    this._canvas.addEventListener('keydown', this._onKeyDown.bind(this), false);

    this._entryInfo = this._viewportElement.createChild('div', 'flame-chart-entry-info');
    this._markerHighlighElement = this._viewportElement.createChild('div', 'flame-chart-marker-highlight-element');
    this._highlightElement = this._viewportElement.createChild('div', 'flame-chart-highlight-element');
    this._selectedElement = this._viewportElement.createChild('div', 'flame-chart-selected-element');

    UI.installDragHandle(
        this._viewportElement, this._startDragging.bind(this), this._dragging.bind(this), this._endDragging.bind(this),
        null);

    this._rulerEnabled = true;
    this._windowLeft = 0.0;
    this._windowRight = 1.0;
    this._timeWindowLeft = dataProvider.minimumBoundary();
    this._timeWindowRight = this._timeWindowLeft + dataProvider.totalTime();
    this._rangeSelectionStart = 0;
    this._rangeSelectionEnd = 0;
    this._barHeight = 17;
    this._textBaseline = 5;
    this._textPadding = 5;
    this._markerRadius = 6;
    this._chartViewport.setWindowTimes(this._timeWindowLeft, this._timeWindowRight);

    /** @const */
    this._headerLeftPadding = 6;
    /** @const */
    this._arrowSide = 8;
    /** @const */
    this._expansionArrowIndent = this._headerLeftPadding + this._arrowSide / 2;
    /** @const */
    this._headerLabelXPadding = 3;
    /** @const */
    this._headerLabelYPadding = 2;

    this._highlightedMarkerIndex = -1;
    this._highlightedEntryIndex = -1;
    this._selectedEntryIndex = -1;
    this._rawTimelineDataLength = 0;
    /** @type {!Map<string,!Map<string,number>>} */
    this._textWidth = new Map();

    this._lastMouseOffsetX = 0;
  }

  /**
   * @override
   */
  willHide() {
    this.hideHighlight();
  }

  /**
   * @param {number} value
   */
  setBarHeight(value) {
    this._barHeight = value;
  }

  /**
   * @param {number} value
   */
  setTextBaseline(value) {
    this._textBaseline = value;
  }

  /**
   * @param {number} value
   */
  setTextPadding(value) {
    this._textPadding = value;
  }

  /**
   * @param {boolean} enable
   */
  enableRuler(enable) {
    this._rulerEnabled = enable;
  }

  alwaysShowVerticalScroll() {
    this._chartViewport.alwaysShowVerticalScroll();
  }

  /**
   * @param {number} entryIndex
   */
  highlightEntry(entryIndex) {
    if (this._highlightedEntryIndex === entryIndex)
      return;
    if (!this._dataProvider.entryColor(entryIndex))
      return;
    this._highlightedEntryIndex = entryIndex;
    this._updateElementPosition(this._highlightElement, this._highlightedEntryIndex);
    this.dispatchEventToListeners(PerfUI.FlameChart.Events.EntryHighlighted, entryIndex);
  }

  hideHighlight() {
    this._entryInfo.removeChildren();
    this._highlightedEntryIndex = -1;
    this._updateElementPosition(this._highlightElement, this._highlightedEntryIndex);
    this.dispatchEventToListeners(PerfUI.FlameChart.Events.EntryHighlighted, -1);
  }

  _resetCanvas() {
    var ratio = window.devicePixelRatio;
    this._canvas.width = this._offsetWidth * ratio;
    this._canvas.height = this._offsetHeight * ratio;
    this._canvas.style.width = this._offsetWidth + 'px';
    this._canvas.style.height = this._offsetHeight + 'px';
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  requestWindowTimes(startTime, endTime) {
    this._flameChartDelegate.requestWindowTimes(startTime, endTime);
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  updateRangeSelection(startTime, endTime) {
    this._flameChartDelegate.updateRangeSelection(startTime, endTime);
  }

  /**
   * @override
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this._offsetWidth = width;
    this._offsetHeight = height;
  }

  /**
   * @param {!MouseEvent} event
   */
  _startDragging(event) {
    this.hideHighlight();
    this._maxDragOffset = 0;
    this._dragStartX = event.pageX;
    this._dragStartY = event.pageY;
    return true;
  }

  /**
   * @param {!MouseEvent} event
   */
  _dragging(event) {
    var dx = event.pageX - this._dragStartX;
    var dy = event.pageY - this._dragStartY;
    this._maxDragOffset = Math.max(this._maxDragOffset, Math.sqrt(dx * dx + dy * dy));
  }

  /**
   * @param {!MouseEvent} event
   */
  _endDragging(event) {
    this._updateHighlight();
  }

  /**
   * @return {?PerfUI.FlameChart.TimelineData}
   */
  _timelineData() {
    if (!this._dataProvider)
      return null;
    var timelineData = this._dataProvider.timelineData();
    if (timelineData !== this._rawTimelineData || timelineData.entryStartTimes.length !== this._rawTimelineDataLength)
      this._processTimelineData(timelineData);
    return this._rawTimelineData;
  }

  /**
   * @param {number} entryIndex
   */
  _revealEntry(entryIndex) {
    var timelineData = this._timelineData();
    if (!timelineData)
      return;
    var timeLeft = this._timeWindowLeft;
    var timeRight = this._timeWindowRight;
    var entryStartTime = timelineData.entryStartTimes[entryIndex];
    var entryTotalTime = timelineData.entryTotalTimes[entryIndex];
    var entryEndTime = entryStartTime + entryTotalTime;
    var minEntryTimeWindow = Math.min(entryTotalTime, timeRight - timeLeft);

    var level = timelineData.entryLevels[entryIndex];
    this._chartViewport.setScrollOffset(this._levelToOffset(level), this._levelHeight(level));

    var minVisibleWidthPx = 30;
    var futurePixelToTime = (timeRight - timeLeft) / this._offsetWidth;
    minEntryTimeWindow = Math.max(minEntryTimeWindow, futurePixelToTime * minVisibleWidthPx);
    if (timeLeft > entryEndTime) {
      var delta = timeLeft - entryEndTime + minEntryTimeWindow;
      this.requestWindowTimes(timeLeft - delta, timeRight - delta);
    } else if (timeRight < entryStartTime) {
      var delta = entryStartTime - timeRight + minEntryTimeWindow;
      this.requestWindowTimes(timeLeft + delta, timeRight + delta);
    }
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  setWindowTimes(startTime, endTime) {
    this._chartViewport.setWindowTimes(startTime, endTime);
    this._timeWindowLeft = startTime;
    this._timeWindowRight = endTime;
    this._updateHighlight();
  }

  /**
   * @param {!Event} event
   */
  _onMouseMove(event) {
    this._lastMouseOffsetX = event.offsetX;
    this._lastMouseOffsetY = event.offsetY;
    if (!this._enabled())
      return;
    if (this._chartViewport.isDragging())
      return;
    if (this._coordinatesToGroupIndex(event.offsetX, event.offsetY) >= 0) {
      this.hideHighlight();
      this._viewportElement.style.cursor = 'pointer';
      return;
    }
    this._updateHighlight();
  }

  _updateHighlight() {
    var inDividersBar = this._lastMouseOffsetY < PerfUI.FlameChart.HeaderHeight;
    this._highlightedMarkerIndex = inDividersBar ? this._markerIndexAtPosition(this._lastMouseOffsetX) : -1;
    this._updateMarkerHighlight();

    var entryIndex = this._highlightedMarkerIndex === -1 ?
        this._coordinatesToEntryIndex(this._lastMouseOffsetX, this._lastMouseOffsetY) :
        -1;
    if (entryIndex === -1) {
      this.hideHighlight();
      return;
    }
    if (this._chartViewport.isDragging())
      return;
    this._updatePopover(entryIndex);
    this._viewportElement.style.cursor = this._dataProvider.canJumpToEntry(entryIndex) ? 'pointer' : 'default';
    this.highlightEntry(entryIndex);
  }

  _onMouseOut() {
    this._lastMouseOffsetX = -1;
    this._lastMouseOffsetY = -1;
    this.hideHighlight();
  }

  /**
   * @param {number} entryIndex
   */
  _updatePopover(entryIndex) {
    if (entryIndex === this._highlightedEntryIndex) {
      this._updatePopoverOffset();
      return;
    }
    this._entryInfo.removeChildren();
    var popoverElement = this._dataProvider.prepareHighlightedEntryInfo(entryIndex);
    if (popoverElement) {
      this._entryInfo.appendChild(popoverElement);
      this._updatePopoverOffset();
    }
  }

  _updatePopoverOffset() {
    var mouseX = this._lastMouseOffsetX;
    var mouseY = this._lastMouseOffsetY;
    var parentWidth = this._entryInfo.parentElement.clientWidth;
    var parentHeight = this._entryInfo.parentElement.clientHeight;
    var infoWidth = this._entryInfo.clientWidth;
    var infoHeight = this._entryInfo.clientHeight;
    var /** @const */ offsetX = 10;
    var /** @const */ offsetY = 6;
    var x;
    var y;
    for (var quadrant = 0; quadrant < 4; ++quadrant) {
      var dx = quadrant & 2 ? -offsetX - infoWidth : offsetX;
      var dy = quadrant & 1 ? -offsetY - infoHeight : offsetY;
      x = Number.constrain(mouseX + dx, 0, parentWidth - infoWidth);
      y = Number.constrain(mouseY + dy, 0, parentHeight - infoHeight);
      if (x >= mouseX || mouseX >= x + infoWidth || y >= mouseY || mouseY >= y + infoHeight)
        break;
    }
    this._entryInfo.style.left = x + 'px';
    this._entryInfo.style.top = y + 'px';
  }

  /**
   * @param {!Event} event
   */
  _onClick(event) {
    this.focus();
    // onClick comes after dragStart and dragEnd events.
    // So if there was drag (mouse move) in the middle of that events
    // we skip the click. Otherwise we jump to the sources.
    var /** @const */ clickThreshold = 5;
    if (this._maxDragOffset > clickThreshold)
      return;
    var groupIndex = this._coordinatesToGroupIndex(event.offsetX, event.offsetY);
    if (groupIndex >= 0) {
      this._toggleGroupVisibility(groupIndex);
      return;
    }
    this._chartViewport.hideRangeSelection();
    this.dispatchEventToListeners(PerfUI.FlameChart.Events.EntrySelected, this._highlightedEntryIndex);
  }

  /**
   * @param {number} groupIndex
   */
  _toggleGroupVisibility(groupIndex) {
    if (!this._isGroupCollapsible(groupIndex))
      return;
    var groups = this._rawTimelineData.groups;
    var group = groups[groupIndex];
    group.expanded = !group.expanded;
    this._groupExpansionState[group.name] = group.expanded;
    if (this._groupExpansionSetting)
      this._groupExpansionSetting.set(this._groupExpansionState);
    this._updateLevelPositions();

    this._updateHighlight();
    if (!group.expanded) {
      var timelineData = this._timelineData();
      var level = timelineData.entryLevels[this._selectedEntryIndex];
      if (this._selectedEntryIndex >= 0 && level >= group.startLevel &&
          (groupIndex >= groups.length - 1 || groups[groupIndex + 1].startLevel > level))
        this._selectedEntryIndex = -1;
    }

    this._updateHeight();
    this._resetCanvas();
    this._draw(this._offsetWidth, this._offsetHeight);
  }

  /**
   * @param {!Event} e
   */
  _onKeyDown(e) {
    this._handleSelectionNavigation(e);
  }

  /**
   * @param {!Event} e
   */
  _handleSelectionNavigation(e) {
    if (!UI.KeyboardShortcut.hasNoModifiers(e))
      return;
    if (this._selectedEntryIndex === -1)
      return;
    var timelineData = this._timelineData();
    if (!timelineData)
      return;

    /**
     * @param {number} time
     * @param {number} entryIndex
     * @return {number}
     */
    function timeComparator(time, entryIndex) {
      return time - timelineData.entryStartTimes[entryIndex];
    }

    /**
     * @param {number} entry1
     * @param {number} entry2
     * @return {boolean}
     */
    function entriesIntersect(entry1, entry2) {
      var start1 = timelineData.entryStartTimes[entry1];
      var start2 = timelineData.entryStartTimes[entry2];
      var end1 = start1 + timelineData.entryTotalTimes[entry1];
      var end2 = start2 + timelineData.entryTotalTimes[entry2];
      return start1 < end2 && start2 < end1;
    }

    var keys = UI.KeyboardShortcut.Keys;
    if (e.keyCode === keys.Left.code || e.keyCode === keys.Right.code) {
      var level = timelineData.entryLevels[this._selectedEntryIndex];
      var levelIndexes = this._timelineLevels[level];
      var indexOnLevel = levelIndexes.lowerBound(this._selectedEntryIndex);
      indexOnLevel += e.keyCode === keys.Left.code ? -1 : 1;
      e.consume(true);
      if (indexOnLevel >= 0 && indexOnLevel < levelIndexes.length)
        this.dispatchEventToListeners(PerfUI.FlameChart.Events.EntrySelected, levelIndexes[indexOnLevel]);
      return;
    }
    if (e.keyCode === keys.Up.code || e.keyCode === keys.Down.code) {
      e.consume(true);
      var level = timelineData.entryLevels[this._selectedEntryIndex];
      level += e.keyCode === keys.Up.code ? -1 : 1;
      if (level < 0 || level >= this._timelineLevels.length)
        return;
      var entryTime = timelineData.entryStartTimes[this._selectedEntryIndex] +
          timelineData.entryTotalTimes[this._selectedEntryIndex] / 2;
      var levelIndexes = this._timelineLevels[level];
      var indexOnLevel = levelIndexes.upperBound(entryTime, timeComparator) - 1;
      if (!entriesIntersect(this._selectedEntryIndex, levelIndexes[indexOnLevel])) {
        ++indexOnLevel;
        if (indexOnLevel >= levelIndexes.length ||
            !entriesIntersect(this._selectedEntryIndex, levelIndexes[indexOnLevel]))
          return;
      }
      this.dispatchEventToListeners(PerfUI.FlameChart.Events.EntrySelected, levelIndexes[indexOnLevel]);
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @return {number}
   */
  _coordinatesToEntryIndex(x, y) {
    if (x < 0 || y < 0)
      return -1;
    var timelineData = this._timelineData();
    if (!timelineData)
      return -1;
    y += this._chartViewport.scrollOffset();
    var cursorLevel = this._visibleLevelOffsets.upperBound(y) - 1;
    if (cursorLevel < 0 || !this._visibleLevels[cursorLevel])
      return -1;
    var offsetFromLevel = y - this._visibleLevelOffsets[cursorLevel];
    if (offsetFromLevel > this._levelHeight(cursorLevel))
      return -1;
    var entryStartTimes = timelineData.entryStartTimes;
    var entryTotalTimes = timelineData.entryTotalTimes;
    var entryIndexes = this._timelineLevels[cursorLevel];
    if (!entryIndexes || !entryIndexes.length)
      return -1;

    /**
     * @param {number} time
     * @param {number} entryIndex
     * @return {number}
     */
    function comparator(time, entryIndex) {
      return time - entryStartTimes[entryIndex];
    }
    var cursorTime = this._chartViewport.pixelToTime(x);
    var indexOnLevel = Math.max(entryIndexes.upperBound(cursorTime, comparator) - 1, 0);

    /**
     * @this {PerfUI.FlameChart}
     * @param {number} entryIndex
     * @return {boolean}
     */
    function checkEntryHit(entryIndex) {
      if (entryIndex === undefined)
        return false;
      var startTime = entryStartTimes[entryIndex];
      var startX = this._chartViewport.timeToPosition(startTime);
      var duration = entryTotalTimes[entryIndex];
      if (isNaN(duration)) {
        var dx = startX - x;
        var dy = this._levelHeight(cursorLevel) / 2 - offsetFromLevel;
        return dx * dx + dy * dy < this._markerRadius * this._markerRadius;
      }
      var endX = this._chartViewport.timeToPosition(startTime + duration);
      var /** @const */ barThresholdPx = 3;
      return startX - barThresholdPx < x && x < endX + barThresholdPx;
    }

    var entryIndex = entryIndexes[indexOnLevel];
    if (checkEntryHit.call(this, entryIndex))
      return entryIndex;
    entryIndex = entryIndexes[indexOnLevel + 1];
    if (checkEntryHit.call(this, entryIndex))
      return entryIndex;
    return -1;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @return {number}
   */
  _coordinatesToGroupIndex(x, y) {
    if (x < 0 || y < 0)
      return -1;
    y += this._chartViewport.scrollOffset();
    var groups = this._rawTimelineData.groups || [];
    var group = this._groupOffsets.upperBound(y) - 1;

    if (group < 0 || group >= groups.length || y - this._groupOffsets[group] >= groups[group].style.height)
      return -1;
    var context = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    context.save();
    context.font = groups[group].style.font;
    var right = this._headerLeftPadding + this._labelWidthForGroup(context, groups[group]);
    context.restore();
    if (x > right)
      return -1;

    return group;
  }

  /**
   * @param {number} x
   * @return {number}
   */
  _markerIndexAtPosition(x) {
    var markers = this._timelineData().markers;
    if (!markers)
      return -1;
    var /** @const */ accurracyOffsetPx = 4;
    var time = this._chartViewport.pixelToTime(x);
    var leftTime = this._chartViewport.pixelToTime(x - accurracyOffsetPx);
    var rightTime = this._chartViewport.pixelToTime(x + accurracyOffsetPx);
    var left = this._markerIndexBeforeTime(leftTime);
    var markerIndex = -1;
    var distance = Infinity;
    for (var i = left; i < markers.length && markers[i].startTime() < rightTime; i++) {
      var nextDistance = Math.abs(markers[i].startTime() - time);
      if (nextDistance < distance) {
        markerIndex = i;
        distance = nextDistance;
      }
    }
    return markerIndex;
  }

  /**
   * @param {number} time
   * @return {number}
   */
  _markerIndexBeforeTime(time) {
    return this._timelineData().markers.lowerBound(
        time, (markerTimestamp, marker) => markerTimestamp - marker.startTime());
  }

  /**
   * @param {number} height
   * @param {number} width
   */
  _draw(width, height) {
    var timelineData = this._timelineData();
    if (!timelineData)
      return;

    var context = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    context.save();
    var ratio = window.devicePixelRatio;
    var top = this._chartViewport.scrollOffset();
    context.scale(ratio, ratio);
    context.translate(0, -top);
    var defaultFont = '11px ' + Host.fontFamily();
    context.font = defaultFont;

    var entryTotalTimes = timelineData.entryTotalTimes;
    var entryStartTimes = timelineData.entryStartTimes;
    var entryLevels = timelineData.entryLevels;
    var timeToPixel = this._chartViewport.timeToPixel();

    var titleIndices = [];
    var markerIndices = [];
    var textPadding = this._textPadding;
    var minTextWidth = 2 * textPadding + UI.measureTextWidth(context, '\u2026');
    var minVisibleBarLevel = Math.max(this._visibleLevelOffsets.upperBound(top) - 1, 0);

    /** @type {!Map<string, !Array<number>>} */
    var colorBuckets = new Map();
    for (var level = minVisibleBarLevel; level < this._dataProvider.maxStackDepth(); ++level) {
      if (this._levelToOffset(level) > top + height)
        break;
      if (!this._visibleLevels[level])
        continue;

      // Entries are ordered by start time within a level, so find the last visible entry.
      var levelIndexes = this._timelineLevels[level];
      var rightIndexOnLevel =
          levelIndexes.lowerBound(this._timeWindowRight, (time, entryIndex) => time - entryStartTimes[entryIndex]) - 1;
      var lastDrawOffset = Infinity;
      for (var entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
        var entryIndex = levelIndexes[entryIndexOnLevel];
        var entryStartTime = entryStartTimes[entryIndex];
        var entryOffsetRight = entryStartTime + (entryTotalTimes[entryIndex] || 0);
        if (entryOffsetRight <= this._timeWindowLeft)
          break;

        var barX = this._timeToPositionClipped(entryStartTime);
        // Check if the entry entirely fits into an already drawn pixel, we can just skip drawing it.
        if (barX >= lastDrawOffset)
          continue;
        lastDrawOffset = barX;

        var color = this._dataProvider.entryColor(entryIndex);
        var bucket = colorBuckets.get(color);
        if (!bucket) {
          bucket = [];
          colorBuckets.set(color, bucket);
        }
        bucket.push(entryIndex);
      }
    }

    var colors = colorBuckets.keysArray();
    // We don't use for-of here because it's slow.
    for (var c = 0; c < colors.length; ++c) {
      var color = colors[c];
      var indexes = colorBuckets.get(color);
      context.beginPath();
      for (var i = 0; i < indexes.length; ++i) {
        var entryIndex = indexes[i];
        var entryStartTime = entryStartTimes[entryIndex];
        var barX = this._timeToPositionClipped(entryStartTime);
        var duration = entryTotalTimes[entryIndex];
        var barLevel = entryLevels[entryIndex];
        var barHeight = this._levelHeight(barLevel);
        var barY = this._levelToOffset(barLevel);
        if (isNaN(duration)) {
          context.moveTo(barX + this._markerRadius, barY + barHeight / 2);
          context.arc(barX, barY + barHeight / 2, this._markerRadius, 0, Math.PI * 2);
          markerIndices.push(entryIndex);
          continue;
        }
        var barRight = this._timeToPositionClipped(entryStartTime + duration);
        var barWidth = Math.max(barRight - barX, 1);
        if (color)
          context.rect(barX, barY, barWidth - 0.4, barHeight - 1);
        if (barWidth > minTextWidth || this._dataProvider.forceDecoration(entryIndex))
          titleIndices.push(entryIndex);
      }
      if (!color)
        continue;
      context.fillStyle = color;
      context.fill();
    }

    context.beginPath();
    for (var m = 0; m < markerIndices.length; ++m) {
      var entryIndex = markerIndices[m];
      var entryStartTime = entryStartTimes[entryIndex];
      var barX = this._timeToPositionClipped(entryStartTime);
      var barLevel = entryLevels[entryIndex];
      var y = this._levelToOffset(barLevel) + this._levelHeight(barLevel) / 2;
      context.moveTo(barX + this._markerRadius, y);
      context.arc(barX, y, this._markerRadius, 0, Math.PI * 2);
    }
    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.stroke();

    context.textBaseline = 'alphabetic';
    for (var i = 0; i < titleIndices.length; ++i) {
      var entryIndex = titleIndices[i];
      var entryStartTime = entryStartTimes[entryIndex];
      var barX = this._timeToPositionClipped(entryStartTime);
      var barRight = Math.min(this._timeToPositionClipped(entryStartTime + entryTotalTimes[entryIndex]), width) + 1;
      var barWidth = barRight - barX;
      var barLevel = entryLevels[entryIndex];
      var barY = this._levelToOffset(barLevel);
      var text = this._dataProvider.entryTitle(entryIndex);
      if (text && text.length) {
        context.font = this._dataProvider.entryFont(entryIndex) || defaultFont;
        text = UI.trimTextMiddle(context, text, barWidth - 2 * textPadding);
      }
      var unclippedBarX = this._chartViewport.timeToPosition(entryStartTime);
      var barHeight = this._levelHeight(barLevel);
      if (this._dataProvider.decorateEntry(
              entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixel))
        continue;
      if (!text || !text.length)
        continue;
      context.fillStyle = this._dataProvider.textColor(entryIndex);
      context.fillText(text, barX + textPadding, barY + barHeight - this._textBaseline);
    }

    context.restore();

    this._drawGroupHeaders(width, height);
    this._drawFlowEvents(context, width, height);
    this._drawMarkers();
    var headerHeight = this._rulerEnabled ? PerfUI.FlameChart.HeaderHeight : 0;
    var dividersData = PerfUI.TimelineGrid.calculateDividerOffsets(this._calculator);
    PerfUI.TimelineGrid.drawCanvasGrid(context, dividersData);
    PerfUI.TimelineGrid.drawCanvasHeaders(
        context, dividersData, time => this._calculator.formatValue(time, dividersData.precision), 3, headerHeight);

    this._updateElementPosition(this._highlightElement, this._highlightedEntryIndex);
    this._updateElementPosition(this._selectedElement, this._selectedEntryIndex);
    this._updateMarkerHighlight();
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  _drawGroupHeaders(width, height) {
    var context = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    var top = this._chartViewport.scrollOffset();
    var ratio = window.devicePixelRatio;
    var groups = this._rawTimelineData.groups || [];
    if (!groups.length)
      return;

    var groupOffsets = this._groupOffsets;
    var lastGroupOffset = Array.prototype.peekLast.call(groupOffsets);
    var colorUsage = UI.ThemeSupport.ColorUsage;

    context.save();
    context.scale(ratio, ratio);
    context.translate(0, -top);
    var defaultFont = '11px ' + Host.fontFamily();
    context.font = defaultFont;

    context.fillStyle = UI.themeSupport.patchColorText('#fff', colorUsage.Background);
    forEachGroup.call(this, (offset, index, group) => {
      var paddingHeight = group.style.padding;
      if (paddingHeight < 5)
        return;
      context.fillRect(0, offset - paddingHeight + 2, width, paddingHeight - 4);
    });
    if (groups.length && lastGroupOffset < top + height)
      context.fillRect(0, lastGroupOffset + 2, width, top + height - lastGroupOffset);

    context.strokeStyle = UI.themeSupport.patchColorText('#eee', colorUsage.Background);
    context.beginPath();
    forEachGroup.call(this, (offset, index, group, isFirst) => {
      if (isFirst || group.style.padding < 4)
        return;
      hLine(offset - 2.5);
    });
    hLine(lastGroupOffset + 1.5);
    context.stroke();

    forEachGroup.call(this, (offset, index, group) => {
      if (group.style.useFirstLineForOverview)
        return;
      if (!this._isGroupCollapsible(index) || group.expanded) {
        if (!group.style.shareHeaderLine) {
          context.fillStyle = group.style.backgroundColor;
          context.fillRect(0, offset, width, group.style.height);
        }
        return;
      }
      var nextGroup = index + 1;
      while (nextGroup < groups.length && groups[nextGroup].style.nestingLevel > group.style.nestingLevel)
        nextGroup++;
      var endLevel = nextGroup < groups.length ? groups[nextGroup].startLevel : this._dataProvider.maxStackDepth();
      this._drawCollapsedOverviewForGroup(group, offset + 1, endLevel);
    });

    context.save();
    forEachGroup.call(this, (offset, index, group) => {
      context.font = group.style.font;
      if (this._isGroupCollapsible(index) && !group.expanded || group.style.shareHeaderLine) {
        var width = this._labelWidthForGroup(context, group) + 2;
        context.fillStyle = Common.Color.parse(group.style.backgroundColor).setAlpha(0.8).asString(null);
        context.fillRect(
            this._headerLeftPadding - this._headerLabelXPadding, offset + this._headerLabelYPadding, width,
            group.style.height - 2 * this._headerLabelYPadding);
      }
      context.fillStyle = group.style.color;
      context.fillText(
          group.name, Math.floor(this._expansionArrowIndent * (group.style.nestingLevel + 1) + this._arrowSide),
          offset + group.style.height - this._textBaseline);
    });
    context.restore();

    context.fillStyle = UI.themeSupport.patchColorText('#6e6e6e', colorUsage.Foreground);
    context.beginPath();
    forEachGroup.call(this, (offset, index, group) => {
      if (this._isGroupCollapsible(index)) {
        drawExpansionArrow.call(
            this, this._expansionArrowIndent * (group.style.nestingLevel + 1),
            offset + group.style.height - this._textBaseline - this._arrowSide / 2, !!group.expanded);
      }
    });
    context.fill();

    context.strokeStyle = UI.themeSupport.patchColorText('#ddd', colorUsage.Background);
    context.beginPath();
    context.stroke();

    context.restore();

    /**
     * @param {number} y
     */
    function hLine(y) {
      context.moveTo(0, y);
      context.lineTo(width, y);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {boolean} expanded
     * @this {PerfUI.FlameChart}
     */
    function drawExpansionArrow(x, y, expanded) {
      var arrowHeight = this._arrowSide * Math.sqrt(3) / 2;
      var arrowCenterOffset = Math.round(arrowHeight / 2);
      context.save();
      context.translate(x, y);
      context.rotate(expanded ? Math.PI / 2 : 0);
      context.moveTo(-arrowCenterOffset, -this._arrowSide / 2);
      context.lineTo(-arrowCenterOffset, this._arrowSide / 2);
      context.lineTo(arrowHeight - arrowCenterOffset, 0);
      context.restore();
    }

    /**
     * @param {function(number, number, !PerfUI.FlameChart.Group, boolean)} callback
     * @this {PerfUI.FlameChart}
     */
    function forEachGroup(callback) {
      /** @type !Array<{nestingLevel: number, visible: boolean}> */
      var groupStack = [{nestingLevel: -1, visible: true}];
      for (var i = 0; i < groups.length; ++i) {
        var groupTop = groupOffsets[i];
        var group = groups[i];
        if (groupTop - group.style.padding > top + height)
          break;
        var firstGroup = true;
        while (groupStack.peekLast().nestingLevel >= group.style.nestingLevel) {
          groupStack.pop();
          firstGroup = false;
        }
        var parentGroupVisible = groupStack.peekLast().visible;
        var thisGroupVisible = parentGroupVisible && (!this._isGroupCollapsible(i) || group.expanded);
        groupStack.push({nestingLevel: group.style.nestingLevel, visible: thisGroupVisible});
        if (!parentGroupVisible || groupTop + group.style.height < top)
          continue;
        callback(groupTop, i, group, firstGroup);
      }
    }
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   * @param {!PerfUI.FlameChart.Group} group
   * @return {number}
   */
  _labelWidthForGroup(context, group) {
    return UI.measureTextWidth(context, group.name) + this._expansionArrowIndent * (group.style.nestingLevel + 1) +
        2 * this._headerLabelXPadding;
  }

  /**
   * @param {!PerfUI.FlameChart.Group} group
   * @param {number} y
   * @param {number} endLevel
   */
  _drawCollapsedOverviewForGroup(group, y, endLevel) {
    var range = new Common.SegmentedRange(mergeCallback);
    var timeWindowRight = this._timeWindowRight;
    var timeWindowLeft = this._timeWindowLeft;
    var context = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    var barHeight = group.style.height;
    var entryStartTimes = this._rawTimelineData.entryStartTimes;
    var entryTotalTimes = this._rawTimelineData.entryTotalTimes;
    var timeToPixel = this._chartViewport.timeToPixel();

    for (var level = group.startLevel; level < endLevel; ++level) {
      var levelIndexes = this._timelineLevels[level];
      var rightIndexOnLevel =
          levelIndexes.lowerBound(timeWindowRight, (time, entryIndex) => time - entryStartTimes[entryIndex]) - 1;
      var lastDrawOffset = Infinity;

      for (var entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
        var entryIndex = levelIndexes[entryIndexOnLevel];
        var entryStartTime = entryStartTimes[entryIndex];
        var barX = this._timeToPositionClipped(entryStartTime);
        var entryEndTime = entryStartTime + entryTotalTimes[entryIndex];
        if (isNaN(entryEndTime) || barX >= lastDrawOffset)
          continue;
        if (entryEndTime <= timeWindowLeft)
          break;
        lastDrawOffset = barX;
        var color = this._dataProvider.entryColor(entryIndex);
        var endBarX = this._timeToPositionClipped(entryEndTime);
        if (group.style.useDecoratorsForOverview && this._dataProvider.forceDecoration(entryIndex)) {
          var unclippedBarX = this._chartViewport.timeToPosition(entryStartTime);
          var barWidth = endBarX - barX;
          context.beginPath();
          context.fillStyle = color;
          context.fillRect(barX, y, barWidth, barHeight - 1);
          this._dataProvider.decorateEntry(
              entryIndex, context, '', barX, y, barWidth, barHeight, unclippedBarX, timeToPixel);
          continue;
        }
        range.append(new Common.Segment(barX, endBarX, color));
      }
    }

    var segments = range.segments().slice().sort((a, b) => a.data.localeCompare(b.data));
    var lastColor;
    context.beginPath();
    for (var i = 0; i < segments.length; ++i) {
      var segment = segments[i];
      if (lastColor !== segments[i].data) {
        context.fill();
        context.beginPath();
        lastColor = segments[i].data;
        context.fillStyle = lastColor;
      }
      context.rect(segment.begin, y, segment.end - segment.begin, barHeight - 1);
    }
    context.fill();

    /**
     * @param {!Common.Segment} a
     * @param {!Common.Segment} b
     * @return {?Common.Segment}
     */
    function mergeCallback(a, b) {
      return a.data === b.data && a.end + 0.4 > b.end ? a : null;
    }
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   * @param {number} height
   * @param {number} width
   */
  _drawFlowEvents(context, width, height) {
    context.save();
    var ratio = window.devicePixelRatio;
    var top = this._chartViewport.scrollOffset();
    var arrowWidth = 6;
    context.scale(ratio, ratio);
    context.translate(0, -top);

    context.fillStyle = '#7f5050';
    context.strokeStyle = '#7f5050';
    var td = this._timelineData();
    var endIndex = td.flowStartTimes.lowerBound(this._timeWindowRight);

    context.lineWidth = 0.5;
    for (var i = 0; i < endIndex; ++i) {
      if (!td.flowEndTimes[i] || td.flowEndTimes[i] < this._timeWindowLeft)
        continue;
      var startX = this._chartViewport.timeToPosition(td.flowStartTimes[i]);
      var endX = this._chartViewport.timeToPosition(td.flowEndTimes[i]);
      var startLevel = td.flowStartLevels[i];
      var endLevel = td.flowEndLevels[i];
      var startY = this._levelToOffset(startLevel) + this._levelHeight(startLevel) / 2;
      var endY = this._levelToOffset(endLevel) + this._levelHeight(endLevel) / 2;


      var segment = Math.min((endX - startX) / 4, 40);
      var distanceTime = td.flowEndTimes[i] - td.flowStartTimes[i];
      var distanceY = (endY - startY) / 10;
      var spread = 30;
      var lineY = distanceTime < 1 ? startY : spread + Math.max(0, startY + distanceY * (i % spread));

      var p = [];
      p.push({x: startX, y: startY});
      p.push({x: startX + arrowWidth, y: startY});
      p.push({x: startX + segment + 2 * arrowWidth, y: startY});
      p.push({x: startX + segment, y: lineY});
      p.push({x: startX + segment * 2, y: lineY});
      p.push({x: endX - segment * 2, y: lineY});
      p.push({x: endX - segment, y: lineY});
      p.push({x: endX - segment - 2 * arrowWidth, y: endY});
      p.push({x: endX - arrowWidth, y: endY});

      context.beginPath();
      context.moveTo(p[0].x, p[0].y);
      context.lineTo(p[1].x, p[1].y);
      context.bezierCurveTo(p[2].x, p[2].y, p[3].x, p[3].y, p[4].x, p[4].y);
      context.lineTo(p[5].x, p[5].y);
      context.bezierCurveTo(p[6].x, p[6].y, p[7].x, p[7].y, p[8].x, p[8].y);
      context.stroke();

      context.beginPath();
      context.arc(startX, startY, 2, -Math.PI / 2, Math.PI / 2, false);
      context.fill();

      context.beginPath();
      context.moveTo(endX, endY);
      context.lineTo(endX - arrowWidth, endY - 3);
      context.lineTo(endX - arrowWidth, endY + 3);
      context.fill();
    }
    context.restore();
  }

  _drawMarkers() {
    var markers = this._timelineData().markers;
    var left = this._markerIndexBeforeTime(this._calculator.minimumBoundary());
    var rightBoundary = this._calculator.maximumBoundary();
    var timeToPixel = this._chartViewport.timeToPixel();

    var context = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    context.save();
    var ratio = window.devicePixelRatio;
    context.scale(ratio, ratio);
    context.translate(0, 3);
    var height = PerfUI.FlameChart.HeaderHeight - 1;
    for (var i = left; i < markers.length; i++) {
      var timestamp = markers[i].startTime();
      if (timestamp > rightBoundary)
        break;
      markers[i].draw(context, this._calculator.computePosition(timestamp), height, timeToPixel);
    }
    context.restore();
  }

  _updateMarkerHighlight() {
    var element = this._markerHighlighElement;
    if (element.parentElement)
      element.remove();
    var markerIndex = this._highlightedMarkerIndex;
    if (markerIndex === -1)
      return;
    var marker = this._timelineData().markers[markerIndex];
    var barX = this._timeToPositionClipped(marker.startTime());
    element.title = marker.title();
    var style = element.style;
    style.left = barX + 'px';
    style.backgroundColor = marker.color();
    this._viewportElement.appendChild(element);
  }

  /**
   * @param {?PerfUI.FlameChart.TimelineData} timelineData
   */
  _processTimelineData(timelineData) {
    if (!timelineData) {
      this._timelineLevels = null;
      this._visibleLevelOffsets = null;
      this._visibleLevels = null;
      this._groupOffsets = null;
      this._rawTimelineData = null;
      this._rawTimelineDataLength = 0;
      return;
    }

    this._rawTimelineData = timelineData;
    this._rawTimelineDataLength = timelineData.entryStartTimes.length;

    var entryCounters = new Uint32Array(this._dataProvider.maxStackDepth() + 1);
    for (var i = 0; i < timelineData.entryLevels.length; ++i)
      ++entryCounters[timelineData.entryLevels[i]];
    var levelIndexes = new Array(entryCounters.length);
    for (var i = 0; i < levelIndexes.length; ++i) {
      levelIndexes[i] = new Uint32Array(entryCounters[i]);
      entryCounters[i] = 0;
    }
    for (var i = 0; i < timelineData.entryLevels.length; ++i) {
      var level = timelineData.entryLevels[i];
      levelIndexes[level][entryCounters[level]++] = i;
    }
    this._timelineLevels = levelIndexes;
    var groups = this._rawTimelineData.groups || [];
    for (var i = 0; i < groups.length; ++i) {
      var expanded = this._groupExpansionState[groups[i].name];
      if (expanded !== undefined)
        groups[i].expanded = expanded;
    }
    this._updateLevelPositions();
    this._updateHeight();
  }

  _updateLevelPositions() {
    var levelCount = this._dataProvider.maxStackDepth();
    var groups = this._rawTimelineData.groups || [];
    this._visibleLevelOffsets = new Uint32Array(levelCount + 1);
    this._visibleLevelHeights = new Uint32Array(levelCount);
    this._visibleLevels = new Uint16Array(levelCount);
    this._groupOffsets = new Uint32Array(groups.length + 1);

    var groupIndex = -1;
    var currentOffset = this._rulerEnabled ? PerfUI.FlameChart.HeaderHeight : 2;
    var visible = true;
    /** @type !Array<{nestingLevel: number, visible: boolean}> */
    var groupStack = [{nestingLevel: -1, visible: true}];
    var lastGroupLevel = Math.max(levelCount, groups.length ? groups.peekLast().startLevel + 1 : 0);
    for (var level = 0; level < lastGroupLevel; ++level) {
      var parentGroupIsVisible = true;
      while (groupIndex < groups.length - 1 && level === groups[groupIndex + 1].startLevel) {
        ++groupIndex;
        var style = groups[groupIndex].style;
        var nextLevel = true;
        while (groupStack.peekLast().nestingLevel >= style.nestingLevel) {
          groupStack.pop();
          nextLevel = false;
        }
        var thisGroupIsVisible =
            groupIndex >= 0 && this._isGroupCollapsible(groupIndex) ? groups[groupIndex].expanded : true;
        parentGroupIsVisible = groupStack.peekLast().visible;
        visible = thisGroupIsVisible && parentGroupIsVisible;
        groupStack.push({nestingLevel: style.nestingLevel, visible: visible});
        if (parentGroupIsVisible)
          currentOffset += nextLevel ? 0 : style.padding;
        this._groupOffsets[groupIndex] = currentOffset;
        if (parentGroupIsVisible && !style.shareHeaderLine)
          currentOffset += style.height;
      }
      var isFirstOnLevel = groupIndex >= 0 && level === groups[groupIndex].startLevel;
      var thisLevelIsVisible =
          parentGroupIsVisible && (visible || isFirstOnLevel && groups[groupIndex].style.useFirstLineForOverview);
      if (level < levelCount) {
        var height;
        if (groupIndex >= 0) {
          var group = groups[groupIndex];
          var style = group.style;
          height = isFirstOnLevel && !style.shareHeaderLine || (style.collapsible && !group.expanded) ?
              style.height :
              (style.itemsHeight || this._barHeight);
        } else {
          height = this._barHeight;
        }
        this._visibleLevels[level] = thisLevelIsVisible;
        this._visibleLevelOffsets[level] = currentOffset;
        this._visibleLevelHeights[level] = height;
      }
      if (thisLevelIsVisible || (parentGroupIsVisible && style.shareHeaderLine && isFirstOnLevel))
        currentOffset += this._visibleLevelHeights[level];
    }
    if (groupIndex >= 0)
      this._groupOffsets[groupIndex + 1] = currentOffset;
    this._visibleLevelOffsets[level] = currentOffset;
  }

  /**
   * @param {number} index
   */
  _isGroupCollapsible(index) {
    var groups = this._rawTimelineData.groups || [];
    var style = groups[index].style;
    if (!style.shareHeaderLine || !style.collapsible)
      return !!style.collapsible;
    var isLastGroup = index + 1 >= groups.length;
    if (!isLastGroup && groups[index + 1].style.nestingLevel > style.nestingLevel)
      return true;
    var nextGroupLevel = isLastGroup ? this._dataProvider.maxStackDepth() : groups[index + 1].startLevel;
    if (nextGroupLevel !== groups[index].startLevel + 1)
      return true;
    // For groups that only have one line and share header line, pretend these are not collapsible
    // unless the itemsHeight does not match the headerHeight
    return style.height !== style.itemsHeight;
  }

  /**
   * @param {number} entryIndex
   */
  setSelectedEntry(entryIndex) {
    if (entryIndex === -1 && !this._chartViewport.isDragging())
      this._chartViewport.hideRangeSelection();
    if (this._selectedEntryIndex === entryIndex)
      return;
    this._selectedEntryIndex = entryIndex;
    this._revealEntry(entryIndex);
    this._updateElementPosition(this._selectedElement, this._selectedEntryIndex);
  }

  /**
   * @param {!Element} element
   * @param {number} entryIndex
   */
  _updateElementPosition(element, entryIndex) {
    var /** @const */ elementMinWidthPx = 2;
    if (element.parentElement)
      element.remove();
    if (entryIndex === -1)
      return;
    var timelineData = this._timelineData();
    var startTime = timelineData.entryStartTimes[entryIndex];
    var endTime = startTime + (timelineData.entryTotalTimes[entryIndex] || 0);
    var barX = this._timeToPositionClipped(startTime);
    var barRight = this._timeToPositionClipped(endTime);
    if (barRight === 0 || barX === this._offsetWidth)
      return;
    var barWidth = barRight - barX;
    var barCenter = barX + barWidth / 2;
    barWidth = Math.max(barWidth, elementMinWidthPx);
    barX = barCenter - barWidth / 2;
    var entryLevel = timelineData.entryLevels[entryIndex];
    var barY = this._levelToOffset(entryLevel) - this._chartViewport.scrollOffset();
    var barHeight = this._levelHeight(entryLevel);
    var style = element.style;
    style.left = barX + 'px';
    style.top = barY + 'px';
    style.width = barWidth + 'px';
    style.height = barHeight - 1 + 'px';
    this._viewportElement.appendChild(element);
  }

  /**
   * @param {number} time
   * @return {number}
   */
  _timeToPositionClipped(time) {
    return Number.constrain(this._chartViewport.timeToPosition(time), 0, this._offsetWidth);
  }

  /**
   * @param {number} level
   * @return {number}
   */
  _levelToOffset(level) {
    return this._visibleLevelOffsets[level];
  }

  /**
   * @param {number} level
   * @return {number}
   */
  _levelHeight(level) {
    return this._visibleLevelHeights[level];
  }

  _updateBoundaries() {
    this._totalTime = this._dataProvider.totalTime();
    this._minimumBoundary = this._dataProvider.minimumBoundary();

    var windowWidth = 1;
    if (this._timeWindowRight !== Infinity) {
      this._windowLeft = (this._timeWindowLeft - this._minimumBoundary) / this._totalTime;
      this._windowRight = (this._timeWindowRight - this._minimumBoundary) / this._totalTime;
      windowWidth = this._windowRight - this._windowLeft;
    } else if (this._timeWindowLeft === Infinity) {
      this._windowLeft = Infinity;
      this._windowRight = Infinity;
    } else {
      this._windowLeft = 0;
      this._windowRight = 1;
    }

    var totalPixels = Math.floor(this._offsetWidth / windowWidth);
    this._pixelWindowLeft = Math.floor(totalPixels * this._windowLeft);

    this._chartViewport.setBoundaries(this._minimumBoundary, this._totalTime);
  }

  _updateHeight() {
    var height = this._levelToOffset(this._dataProvider.maxStackDepth());
    this._chartViewport.setContentHeight(height);
  }

  /**
   * @override
   */
  onResize() {
    this.scheduleUpdate();
  }

  /**
   * @override
   */
  update() {
    if (!this._timelineData())
      return;
    this._resetCanvas();
    this._updateHeight();
    this._updateBoundaries();
    this._calculator._updateBoundaries(this);
    this._draw(this._offsetWidth, this._offsetHeight);
    if (!this._chartViewport.isDragging())
      this._updateHighlight();
  }

  reset() {
    this._chartViewport.reset();
    this._rawTimelineData = null;
    this._rawTimelineDataLength = 0;
    this._highlightedMarkerIndex = -1;
    this._highlightedEntryIndex = -1;
    this._selectedEntryIndex = -1;
    /** @type {!Map<string,!Map<string,number>>} */
    this._textWidth = new Map();
    this._chartViewport.scheduleUpdate();
  }

  scheduleUpdate() {
    this._chartViewport.scheduleUpdate();
  }

  _enabled() {
    return this._rawTimelineDataLength !== 0;
  }
};

PerfUI.FlameChart.HeaderHeight = 15;

PerfUI.FlameChart.MinimalTimeWindowMs = 0.5;

/**
 * @interface
 */
PerfUI.FlameChartDataProvider = function() {};

/**
 * @typedef {!{
 *     name: string,
 *     startLevel: number,
 *     expanded: (boolean|undefined),
 *     style: !PerfUI.FlameChart.GroupStyle
 * }}
 */
PerfUI.FlameChart.Group;

/**
 * @typedef {!{
 *     height: number,
 *     padding: number,
 *     collapsible: boolean,
 *     font: string,
 *     color: string,
 *     backgroundColor: string,
 *     nestingLevel: number,
 *     itemsHeight: (number|undefined),
 *     shareHeaderLine: (boolean|undefined),
 *     useFirstLineForOverview: (boolean|undefined),
 *     useDecoratorsForOverview: (boolean|undefined)
 * }}
 */
PerfUI.FlameChart.GroupStyle;

/**
 * @unrestricted
 */
PerfUI.FlameChart.TimelineData = class {
  /**
   * @param {!Array<number>|!Uint16Array} entryLevels
   * @param {!Array<number>|!Float32Array} entryTotalTimes
   * @param {!Array<number>|!Float64Array} entryStartTimes
   * @param {?Array<!PerfUI.FlameChart.Group>} groups
   */
  constructor(entryLevels, entryTotalTimes, entryStartTimes, groups) {
    this.entryLevels = entryLevels;
    this.entryTotalTimes = entryTotalTimes;
    this.entryStartTimes = entryStartTimes;
    this.groups = groups;
    /** @type {!Array.<!PerfUI.FlameChartMarker>} */
    this.markers = [];
    this.flowStartTimes = [];
    this.flowStartLevels = [];
    this.flowEndTimes = [];
    this.flowEndLevels = [];
  }
};

PerfUI.FlameChartDataProvider.prototype = {
  /**
   * @return {number}
   */
  minimumBoundary() {},

  /**
   * @return {number}
   */
  totalTime() {},

  /**
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {},

  /**
   * @return {number}
   */
  maxStackDepth() {},

  /**
   * @return {?PerfUI.FlameChart.TimelineData}
   */
  timelineData() {},

  /**
   * @param {number} entryIndex
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(entryIndex) {},

  /**
   * @param {number} entryIndex
   * @return {boolean}
   */
  canJumpToEntry(entryIndex) {},

  /**
   * @param {number} entryIndex
   * @return {?string}
   */
  entryTitle(entryIndex) {},

  /**
   * @param {number} entryIndex
   * @return {?string}
   */
  entryFont(entryIndex) {},

  /**
   * @param {number} entryIndex
   * @return {string}
   */
  entryColor(entryIndex) {},

  /**
   * @param {number} entryIndex
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
  decorateEntry(entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixelRatio) {},

  /**
   * @param {number} entryIndex
   * @return {boolean}
   */
  forceDecoration(entryIndex) {},

  /**
   * @param {number} entryIndex
   * @return {string}
   */
  textColor(entryIndex) {},
};

/**
 * @interface
 */
PerfUI.FlameChartMarker = function() {};

PerfUI.FlameChartMarker.prototype = {
  /**
   * @return {number}
   */
  startTime() {},

  /**
   * @return {string}
   */
  color() {},

  /**
   * @return {string}
   */
  title() {},

  /**
   * @param {!CanvasRenderingContext2D} context
   * @param {number} x
   * @param {number} height
   * @param {number} pixelsPerMillisecond
   */
  draw(context, x, height, pixelsPerMillisecond) {},
};

/** @enum {symbol} */
PerfUI.FlameChart.Events = {
  EntrySelected: Symbol('EntrySelected'),
  EntryHighlighted: Symbol('EntryHighlighted')
};

/**
 * @implements {PerfUI.TimelineGrid.Calculator}
 * @unrestricted
 */
PerfUI.FlameChart.Calculator = class {
  /**
   * @param {!PerfUI.FlameChartDataProvider} dataProvider
   */
  constructor(dataProvider) {
    this._dataProvider = dataProvider;
  }

  /**
   * @param {!PerfUI.FlameChart} mainPane
   */
  _updateBoundaries(mainPane) {
    this._totalTime = mainPane._dataProvider.totalTime();
    this._zeroTime = mainPane._dataProvider.minimumBoundary();
    this._minimumBoundaries = this._zeroTime + mainPane._windowLeft * this._totalTime;
    this._maximumBoundaries = this._zeroTime + mainPane._windowRight * this._totalTime;
    this._width = mainPane._offsetWidth;
    this._timeToPixel = this._width / this.boundarySpan();
  }

  /**
   * @override
   * @param {number} time
   * @return {number}
   */
  computePosition(time) {
    return Math.round((time - this._minimumBoundaries) * this._timeToPixel);
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return this._dataProvider.formatValue(value - this._zeroTime, precision);
  }

  /**
   * @override
   * @return {number}
   */
  maximumBoundary() {
    return this._maximumBoundaries;
  }

  /**
   * @override
   * @return {number}
   */
  minimumBoundary() {
    return this._minimumBoundaries;
  }

  /**
   * @override
   * @return {number}
   */
  zeroTime() {
    return this._zeroTime;
  }

  /**
   * @override
   * @return {number}
   */
  boundarySpan() {
    return this._maximumBoundaries - this._minimumBoundaries;
  }
};
