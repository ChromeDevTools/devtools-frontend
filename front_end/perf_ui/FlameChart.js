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
   * @param {boolean} animate
   */
  windowChanged(startTime, endTime, animate) {},

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  updateRangeSelection(startTime, endTime) {},

  /**
   * @param {!PerfUI.FlameChart} flameChart
   * @param {?PerfUI.FlameChart.Group} group
   */
  updateSelectedGroup(flameChart, group) {},
};

/**
 * @unrestricted
 * @implements {PerfUI.TimelineGrid.Calculator}
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

    this._useWebGL = Runtime.experiments.isEnabled('timelineWebGL');
    this._chartViewport = new PerfUI.ChartViewport(this);
    this._chartViewport.show(this.contentElement);

    this._dataProvider = dataProvider;

    this._viewportElement = this._chartViewport.viewportElement;
    if (this._useWebGL) {
      this._canvasGL = /** @type {!HTMLCanvasElement} */ (this._viewportElement.createChild('canvas', 'fill'));
      this._initWebGL();
    }
    this._canvas = /** @type {!HTMLCanvasElement} */ (this._viewportElement.createChild('canvas', 'fill'));

    this._canvas.tabIndex = 0;
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
    this._rangeSelectionStart = 0;
    this._rangeSelectionEnd = 0;
    this._barHeight = 17;
    this._textBaseline = 5;
    this._textPadding = 5;
    this._markerRadius = 6;
    this._chartViewport.setWindowTimes(
        dataProvider.minimumBoundary(), dataProvider.minimumBoundary() + dataProvider.totalTime());

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
    this._selectedGroup = -1;
    this._selectedGroupBackroundColor = UI.themeSupport.patchColorText(
        PerfUI.FlameChart.Colors.SelectedGroupBackground, UI.ThemeSupport.ColorUsage.Background);
    this._selectedGroupBorderColor = UI.themeSupport.patchColorText(
        PerfUI.FlameChart.Colors.SelectedGroupBorder, UI.ThemeSupport.ColorUsage.Background);
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

  disableRangeSelection() {
    this._chartViewport.disableRangeSelection();
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
    const ratio = window.devicePixelRatio;
    const width = Math.round(this._offsetWidth * ratio);
    const height = Math.round(this._offsetHeight * ratio);
    this._canvas.width = width;
    this._canvas.height = height;
    this._canvas.style.width = `${width / ratio}px`;
    this._canvas.style.height = `${height / ratio}px`;
    if (this._useWebGL) {
      this._canvasGL.width = width;
      this._canvasGL.height = height;
      this._canvasGL.style.width = `${width / ratio}px`;
      this._canvasGL.style.height = `${height / ratio}px`;
    }
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   * @param {boolean} animate
   */
  windowChanged(startTime, endTime, animate) {
    this._flameChartDelegate.windowChanged(startTime, endTime, animate);
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
    const dx = event.pageX - this._dragStartX;
    const dy = event.pageY - this._dragStartY;
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
    const timelineData = this._dataProvider.timelineData();
    if (timelineData !== this._rawTimelineData || timelineData.entryStartTimes.length !== this._rawTimelineDataLength)
      this._processTimelineData(timelineData);
    return this._rawTimelineData;
  }

  /**
   * @param {number} entryIndex
   */
  _revealEntry(entryIndex) {
    const timelineData = this._timelineData();
    if (!timelineData)
      return;
    const timeLeft = this._chartViewport.windowLeftTime();
    const timeRight = this._chartViewport.windowRightTime();
    const entryStartTime = timelineData.entryStartTimes[entryIndex];
    const entryTotalTime = timelineData.entryTotalTimes[entryIndex];
    const entryEndTime = entryStartTime + entryTotalTime;
    let minEntryTimeWindow = Math.min(entryTotalTime, timeRight - timeLeft);

    const level = timelineData.entryLevels[entryIndex];
    this._chartViewport.setScrollOffset(this._levelToOffset(level), this._levelHeight(level));

    const minVisibleWidthPx = 30;
    const futurePixelToTime = (timeRight - timeLeft) / this._offsetWidth;
    minEntryTimeWindow = Math.max(minEntryTimeWindow, futurePixelToTime * minVisibleWidthPx);
    if (timeLeft > entryEndTime) {
      const delta = timeLeft - entryEndTime + minEntryTimeWindow;
      this.windowChanged(timeLeft - delta, timeRight - delta, /* animate */ true);
    } else if (timeRight < entryStartTime) {
      const delta = entryStartTime - timeRight + minEntryTimeWindow;
      this.windowChanged(timeLeft + delta, timeRight + delta, /* animate */ true);
    }
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   * @param {boolean=} animate
   */
  setWindowTimes(startTime, endTime, animate) {
    this._chartViewport.setWindowTimes(startTime, endTime, animate);
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
    if (this._coordinatesToGroupIndex(event.offsetX, event.offsetY, true /* headerOnly */) >= 0) {
      this.hideHighlight();
      this._viewportElement.style.cursor = 'pointer';
      return;
    }
    this._updateHighlight();
  }

  _updateHighlight() {
    const inDividersBar = this._lastMouseOffsetY < PerfUI.FlameChart.HeaderHeight;
    this._highlightedMarkerIndex = inDividersBar ? this._markerIndexAtPosition(this._lastMouseOffsetX) : -1;
    this._updateMarkerHighlight();

    const entryIndex = this._highlightedMarkerIndex === -1 ?
        this._coordinatesToEntryIndex(this._lastMouseOffsetX, this._lastMouseOffsetY) :
        -1;
    if (entryIndex === -1) {
      this.hideHighlight();
      const group =
          this._coordinatesToGroupIndex(this._lastMouseOffsetX, this._lastMouseOffsetY, false /* headerOnly */);
      if (group >= 0 && this._rawTimelineData.groups[group].selectable)
        this._viewportElement.style.cursor = 'pointer';
      else
        this._viewportElement.style.cursor = 'default';
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
    const popoverElement = this._dataProvider.prepareHighlightedEntryInfo(entryIndex);
    if (popoverElement) {
      this._entryInfo.appendChild(popoverElement);
      this._updatePopoverOffset();
    }
  }

  _updatePopoverOffset() {
    const mouseX = this._lastMouseOffsetX;
    const mouseY = this._lastMouseOffsetY;
    const parentWidth = this._entryInfo.parentElement.clientWidth;
    const parentHeight = this._entryInfo.parentElement.clientHeight;
    const infoWidth = this._entryInfo.clientWidth;
    const infoHeight = this._entryInfo.clientHeight;
    const /** @const */ offsetX = 10;
    const /** @const */ offsetY = 6;
    let x;
    let y;
    for (let quadrant = 0; quadrant < 4; ++quadrant) {
      const dx = quadrant & 2 ? -offsetX - infoWidth : offsetX;
      const dy = quadrant & 1 ? -offsetY - infoHeight : offsetY;
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
    const /** @const */ clickThreshold = 5;
    if (this._maxDragOffset > clickThreshold)
      return;

    this._selectGroup(this._coordinatesToGroupIndex(event.offsetX, event.offsetY, false /* headerOnly */));
    this._toggleGroupVisibility(this._coordinatesToGroupIndex(event.offsetX, event.offsetY, true /* headerOnly */));
    const timelineData = this._timelineData();
    if (event.shiftKey && this._highlightedEntryIndex !== -1 && timelineData) {
      const start = timelineData.entryStartTimes[this._highlightedEntryIndex];
      const end = start + timelineData.entryTotalTimes[this._highlightedEntryIndex];
      this._chartViewport.setRangeSelection(start, end);
    } else {
      this._chartViewport.onClick(event);
      this.dispatchEventToListeners(PerfUI.FlameChart.Events.EntrySelected, this._highlightedEntryIndex);
    }
  }

  /**
   * @param {number} groupIndex
   */
  _selectGroup(groupIndex) {
    const groups = this._rawTimelineData.groups;
    if (groupIndex < 0 || !groups[groupIndex].selectable || this._selectedGroup === groupIndex)
      return;

    this._selectedGroup = groupIndex;
    this._flameChartDelegate.updateSelectedGroup(this, groups[groupIndex]);
    this._resetCanvas();
    this._draw();
  }

  /**
   * @param {number} groupIndex
   */
  _toggleGroupVisibility(groupIndex) {
    if (groupIndex < 0 || !this._isGroupCollapsible(groupIndex))
      return;

    const groups = this._rawTimelineData.groups;
    const group = groups[groupIndex];
    group.expanded = !group.expanded;
    this._groupExpansionState[group.name] = group.expanded;
    if (this._groupExpansionSetting)
      this._groupExpansionSetting.set(this._groupExpansionState);
    this._updateLevelPositions();

    this._updateHighlight();
    if (!group.expanded) {
      const timelineData = this._timelineData();
      const level = timelineData.entryLevels[this._selectedEntryIndex];
      if (this._selectedEntryIndex >= 0 && level >= group.startLevel &&
          (groupIndex >= groups.length - 1 || groups[groupIndex + 1].startLevel > level))
        this._selectedEntryIndex = -1;
    }

    this._updateHeight();
    this._resetCanvas();
    this._draw();
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
    const timelineData = this._timelineData();
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
      const start1 = timelineData.entryStartTimes[entry1];
      const start2 = timelineData.entryStartTimes[entry2];
      const end1 = start1 + timelineData.entryTotalTimes[entry1];
      const end2 = start2 + timelineData.entryTotalTimes[entry2];
      return start1 < end2 && start2 < end1;
    }

    const keys = UI.KeyboardShortcut.Keys;
    if (e.keyCode === keys.Left.code || e.keyCode === keys.Right.code) {
      const level = timelineData.entryLevels[this._selectedEntryIndex];
      const levelIndexes = this._timelineLevels[level];
      let indexOnLevel = levelIndexes.lowerBound(this._selectedEntryIndex);
      indexOnLevel += e.keyCode === keys.Left.code ? -1 : 1;
      e.consume(true);
      if (indexOnLevel >= 0 && indexOnLevel < levelIndexes.length)
        this.dispatchEventToListeners(PerfUI.FlameChart.Events.EntrySelected, levelIndexes[indexOnLevel]);
      return;
    }
    if (e.keyCode === keys.Up.code || e.keyCode === keys.Down.code) {
      e.consume(true);
      let level = timelineData.entryLevels[this._selectedEntryIndex];
      level += e.keyCode === keys.Up.code ? -1 : 1;
      if (level < 0 || level >= this._timelineLevels.length)
        return;
      const entryTime = timelineData.entryStartTimes[this._selectedEntryIndex] +
          timelineData.entryTotalTimes[this._selectedEntryIndex] / 2;
      const levelIndexes = this._timelineLevels[level];
      let indexOnLevel = levelIndexes.upperBound(entryTime, timeComparator) - 1;
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
    const timelineData = this._timelineData();
    if (!timelineData)
      return -1;
    y += this._chartViewport.scrollOffset();
    const cursorLevel = this._visibleLevelOffsets.upperBound(y) - 1;
    if (cursorLevel < 0 || !this._visibleLevels[cursorLevel])
      return -1;
    const offsetFromLevel = y - this._visibleLevelOffsets[cursorLevel];
    if (offsetFromLevel > this._levelHeight(cursorLevel))
      return -1;
    const entryStartTimes = timelineData.entryStartTimes;
    const entryTotalTimes = timelineData.entryTotalTimes;
    const entryIndexes = this._timelineLevels[cursorLevel];
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
    const cursorTime = this._chartViewport.pixelToTime(x);
    const indexOnLevel = Math.max(entryIndexes.upperBound(cursorTime, comparator) - 1, 0);

    /**
     * @this {PerfUI.FlameChart}
     * @param {number} entryIndex
     * @return {boolean}
     */
    function checkEntryHit(entryIndex) {
      if (entryIndex === undefined)
        return false;
      const startTime = entryStartTimes[entryIndex];
      const startX = this._chartViewport.timeToPosition(startTime);
      const duration = entryTotalTimes[entryIndex];
      if (isNaN(duration)) {
        const dx = startX - x;
        const dy = this._levelHeight(cursorLevel) / 2 - offsetFromLevel;
        return dx * dx + dy * dy < this._markerRadius * this._markerRadius;
      }
      const endX = this._chartViewport.timeToPosition(startTime + duration);
      const /** @const */ barThresholdPx = 3;
      return startX - barThresholdPx < x && x < endX + barThresholdPx;
    }

    let entryIndex = entryIndexes[indexOnLevel];
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
   * @param {boolean} headerOnly
   * @return {number}
   */
  _coordinatesToGroupIndex(x, y, headerOnly) {
    if (x < 0 || y < 0)
      return -1;
    y += this._chartViewport.scrollOffset();
    const groups = this._rawTimelineData.groups || [];
    const group = this._groupOffsets.upperBound(y) - 1;
    if (group < 0 || group >= groups.length)
      return -1;
    const height = headerOnly ? groups[group].style.height : this._groupOffsets[group + 1] - this._groupOffsets[group];
    if (y - this._groupOffsets[group] >= height)
      return -1;
    if (!headerOnly)
      return group;

    const context = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    context.save();
    context.font = groups[group].style.font;
    const right = this._headerLeftPadding + this._labelWidthForGroup(context, groups[group]);
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
    const markers = this._timelineData().markers;
    if (!markers)
      return -1;
    const /** @const */ accurracyOffsetPx = 4;
    const time = this._chartViewport.pixelToTime(x);
    const leftTime = this._chartViewport.pixelToTime(x - accurracyOffsetPx);
    const rightTime = this._chartViewport.pixelToTime(x + accurracyOffsetPx);
    const left = this._markerIndexBeforeTime(leftTime);
    let markerIndex = -1;
    let distance = Infinity;
    for (let i = left; i < markers.length && markers[i].startTime() < rightTime; i++) {
      const nextDistance = Math.abs(markers[i].startTime() - time);
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

  _draw() {
    const timelineData = this._timelineData();
    if (!timelineData)
      return;

    const width = this._offsetWidth;
    const height = this._offsetHeight;
    const context = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    context.save();
    const ratio = window.devicePixelRatio;
    const top = this._chartViewport.scrollOffset();
    context.scale(ratio, ratio);
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, width, height);
    context.translate(0, -top);
    const defaultFont = '11px ' + Host.fontFamily();
    context.font = defaultFont;

    const entryTotalTimes = timelineData.entryTotalTimes;
    const entryStartTimes = timelineData.entryStartTimes;
    const entryLevels = timelineData.entryLevels;
    const timeToPixel = this._chartViewport.timeToPixel();

    const titleIndices = [];
    const markerIndices = [];
    const textPadding = this._textPadding;
    const minTextWidth = 2 * textPadding + UI.measureTextWidth(context, '\u2026');
    const minTextWidthDuration = this._chartViewport.pixelToTimeOffset(minTextWidth);
    const minVisibleBarLevel = Math.max(this._visibleLevelOffsets.upperBound(top) - 1, 0);

    /** @type {!Map<string, !Array<number>>} */
    const colorBuckets = new Map();
    for (let level = minVisibleBarLevel; level < this._dataProvider.maxStackDepth(); ++level) {
      if (this._levelToOffset(level) > top + height)
        break;
      if (!this._visibleLevels[level])
        continue;

      // Entries are ordered by start time within a level, so find the last visible entry.
      const levelIndexes = this._timelineLevels[level];
      const rightIndexOnLevel =
          levelIndexes.lowerBound(
              this._chartViewport.windowRightTime(), (time, entryIndex) => time - entryStartTimes[entryIndex]) -
          1;
      let lastDrawOffset = Infinity;
      for (let entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
        const entryIndex = levelIndexes[entryIndexOnLevel];
        let duration = entryTotalTimes[entryIndex];
        if (isNaN(duration))
          markerIndices.push(entryIndex);
        duration = duration || 0;
        if (duration >= minTextWidthDuration || this._forceDecorationCache[entryIndex])
          titleIndices.push(entryIndex);

        const entryStartTime = entryStartTimes[entryIndex];
        const entryOffsetRight = entryStartTime + duration;
        if (entryOffsetRight <= this._chartViewport.windowLeftTime())
          break;
        if (this._useWebGL)
          continue;

        const barX = this._timeToPositionClipped(entryStartTime);
        // Check if the entry entirely fits into an already drawn pixel, we can just skip drawing it.
        if (barX >= lastDrawOffset)
          continue;
        lastDrawOffset = barX;

        const color = this._dataProvider.entryColor(entryIndex);
        let bucket = colorBuckets.get(color);
        if (!bucket) {
          bucket = [];
          colorBuckets.set(color, bucket);
        }
        bucket.push(entryIndex);
      }
    }

    if (this._useWebGL) {
      this._drawGL();
    } else {
      context.save();
      this._forEachGroup((offset, index, group, isFirst, groupHeight) => {
        if (index === this._selectedGroup) {
          context.fillStyle = this._selectedGroupBackroundColor;
          context.fillRect(0, offset, width, groupHeight - group.style.padding);
        }
      });
      context.restore();

      const colors = colorBuckets.keysArray();
      // We don't use for-of here because it's slow.
      for (let c = 0; c < colors.length; ++c) {
        const color = colors[c];
        const indexes = colorBuckets.get(color);
        context.beginPath();
        for (let i = 0; i < indexes.length; ++i) {
          const entryIndex = indexes[i];
          const entryStartTime = entryStartTimes[entryIndex];
          const barX = this._timeToPositionClipped(entryStartTime);
          const duration = entryTotalTimes[entryIndex];
          const barLevel = entryLevels[entryIndex];
          const barHeight = this._levelHeight(barLevel);
          const barY = this._levelToOffset(barLevel);
          if (isNaN(duration)) {
            context.moveTo(barX + this._markerRadius, barY + barHeight / 2);
            context.arc(barX, barY + barHeight / 2, this._markerRadius, 0, Math.PI * 2);
            continue;
          }
          const barRight = this._timeToPositionClipped(entryStartTime + duration);
          const barWidth = Math.max(barRight - barX, 1);
          if (color)
            context.rect(barX, barY, barWidth - 0.4, barHeight - 1);
        }
        if (!color)
          continue;
        context.fillStyle = color;
        context.fill();
      }
    }

    context.beginPath();
    for (let m = 0; m < markerIndices.length; ++m) {
      const entryIndex = markerIndices[m];
      const entryStartTime = entryStartTimes[entryIndex];
      const barX = this._timeToPositionClipped(entryStartTime);
      const barLevel = entryLevels[entryIndex];
      const y = this._levelToOffset(barLevel) + this._levelHeight(barLevel) / 2;
      context.moveTo(barX + this._markerRadius, y);
      context.arc(barX, y, this._markerRadius, 0, Math.PI * 2);
    }
    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.stroke();

    context.textBaseline = 'alphabetic';
    for (let i = 0; i < titleIndices.length; ++i) {
      const entryIndex = titleIndices[i];
      const entryStartTime = entryStartTimes[entryIndex];
      const barX = this._timeToPositionClipped(entryStartTime);
      const barRight = Math.min(this._timeToPositionClipped(entryStartTime + entryTotalTimes[entryIndex]), width) + 1;
      const barWidth = barRight - barX;
      const barLevel = entryLevels[entryIndex];
      const barY = this._levelToOffset(barLevel);
      let text = this._dataProvider.entryTitle(entryIndex);
      if (text && text.length) {
        context.font = this._dataProvider.entryFont(entryIndex) || defaultFont;
        text = UI.trimTextMiddle(context, text, barWidth - 2 * textPadding);
      }
      const unclippedBarX = this._chartViewport.timeToPosition(entryStartTime);
      const barHeight = this._levelHeight(barLevel);
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
    const dividersData = PerfUI.TimelineGrid.calculateGridOffsets(this);
    PerfUI.TimelineGrid.drawCanvasGrid(context, dividersData);
    if (this._rulerEnabled) {
      PerfUI.TimelineGrid.drawCanvasHeaders(
          context, dividersData, time => this.formatValue(time, dividersData.precision), 3,
          PerfUI.FlameChart.HeaderHeight);
    }

    this._updateElementPosition(this._highlightElement, this._highlightedEntryIndex);
    this._updateElementPosition(this._selectedElement, this._selectedEntryIndex);
    this._updateMarkerHighlight();
  }

  _initWebGL() {
    const gl = /** @type {?WebGLRenderingContext} */ (this._canvasGL.getContext('webgl'));
    if (!gl) {
      console.error('Failed to obtain WebGL context.');
      this._useWebGL = false;  // Fallback to use canvas.
      return;
    }

    const vertexShaderSource = `
      attribute vec2 aVertexPosition;
      attribute vec4 aVertexColor;

      uniform vec2 uScalingFactor;
      uniform vec2 uShiftVector;

      varying lowp vec4 vColor;

      void main() {
        vec2 shiftedPosition = aVertexPosition - uShiftVector;
        gl_Position = vec4(shiftedPosition * uScalingFactor + vec2(-1.0, 1.0), 0.0, 1.0);
        vColor = aVertexColor;
      }`;

    const fragmentShaderSource = `
      varying lowp vec4 vColor;

      void main() {
        gl_FragColor = vColor;
      }`;

    /**
     * @param {!WebGLRenderingContext} gl
     * @param {number} type
     * @param {string} source
     * @return {?WebGLShader}
     */
    function loadShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        return shader;
      console.error('Shader compile error: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      this._shaderProgram = shaderProgram;
      gl.useProgram(shaderProgram);
    } else {
      console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      this._shaderProgram = null;
    }
  }

  _setupGLGeometry() {
    const gl = /** @type {?WebGLRenderingContext} */ (this._canvasGL.getContext('webgl'));
    if (!gl)
      return;

    const timelineData = this._timelineData();
    if (!timelineData)
      return;

    const entryTotalTimes = timelineData.entryTotalTimes;
    const entryStartTimes = timelineData.entryStartTimes;
    const entryLevels = timelineData.entryLevels;

    // 2 triangles per bar x 3 points x 2 coordinates = 12.
    const vertexArray = new Float32Array(entryTotalTimes.length * 12);
    // 2 triangles x 3 points x 4 color values (RGBA) = 24.
    const colorArray = new Uint8Array(entryTotalTimes.length * 24);
    let vertex = 0;
    /** @type {!Map<string, !Array<number>>} */
    const parsedColorCache = new Map();
    for (let i = 0; i < entryTotalTimes.length; ++i) {
      const level = entryLevels[i];
      if (!this._visibleLevels[level])
        continue;
      const color = this._dataProvider.entryColor(i);
      if (!color)
        continue;
      let rgba = parsedColorCache.get(color);
      if (!rgba) {
        rgba = Common.Color.parse(color).canonicalRGBA();
        rgba[3] = Math.round(rgba[3] * 255);
        parsedColorCache.set(color, rgba);
      }
      const cpos = vertex * 4;
      for (let j = 0; j < 6; ++j) {  // All of the bar vertices have the same color.
        colorArray[cpos + j * 4 + 0] = rgba[0];
        colorArray[cpos + j * 4 + 1] = rgba[1];
        colorArray[cpos + j * 4 + 2] = rgba[2];
        colorArray[cpos + j * 4 + 3] = rgba[3];
      }

      const vpos = vertex * 2;
      const x0 = entryStartTimes[i] - this._minimumBoundary;
      const x1 = x0 + entryTotalTimes[i];
      const y0 = this._levelToOffset(level);
      const y1 = y0 + this._levelHeight(level) - 1;
      vertexArray[vpos + 0] = x0;
      vertexArray[vpos + 1] = y0;
      vertexArray[vpos + 2] = x1;
      vertexArray[vpos + 3] = y0;
      vertexArray[vpos + 4] = x0;
      vertexArray[vpos + 5] = y1;
      vertexArray[vpos + 6] = x0;
      vertexArray[vpos + 7] = y1;
      vertexArray[vpos + 8] = x1;
      vertexArray[vpos + 9] = y0;
      vertexArray[vpos + 10] = x1;
      vertexArray[vpos + 11] = y1;

      vertex += 6;  // vertices per bar.
    }

    this._vertexCount = vertex;

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
    const aVertexPosition = gl.getAttribLocation(this._shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, /* vertexComponents*/ 2, gl.FLOAT, false, 0, 0);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colorArray, gl.STATIC_DRAW);
    const aVertexColor = gl.getAttribLocation(this._shaderProgram, 'aVertexColor');
    gl.enableVertexAttribArray(aVertexColor);
    gl.vertexAttribPointer(aVertexColor, /* colorComponents*/ 4, gl.UNSIGNED_BYTE, true, 0, 0);

    this._uScalingFactor = gl.getUniformLocation(this._shaderProgram, 'uScalingFactor');
    this._uShiftVector = gl.getUniformLocation(this._shaderProgram, 'uShiftVector');
  }

  _drawGL() {
    const gl = /** @type {?WebGLRenderingContext} */ (this._canvasGL.getContext('webgl'));
    if (!gl)
      return;
    const timelineData = this._timelineData();
    if (!timelineData)
      return;

    if (!this._prevTimelineData || timelineData.entryTotalTimes !== this._prevTimelineData.entryTotalTimes) {
      this._prevTimelineData = timelineData;
      this._setupGLGeometry();
    }

    gl.viewport(0, 0, this._canvasGL.width, this._canvasGL.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this._vertexCount)
      return;

    const viewportScale = [2.0 / this.boundarySpan(), -2.0 * window.devicePixelRatio / this._canvasGL.height];
    const viewportShift = [this.minimumBoundary() - this.zeroTime(), this._chartViewport.scrollOffset()];
    gl.uniform2fv(this._uScalingFactor, viewportScale);
    gl.uniform2fv(this._uShiftVector, viewportShift);

    gl.drawArrays(gl.TRIANGLES, 0, this._vertexCount);
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  _drawGroupHeaders(width, height) {
    const context = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    const top = this._chartViewport.scrollOffset();
    const ratio = window.devicePixelRatio;
    const groups = this._rawTimelineData.groups || [];
    if (!groups.length)
      return;

    const groupOffsets = this._groupOffsets;
    const lastGroupOffset = Array.prototype.peekLast.call(groupOffsets);
    const colorUsage = UI.ThemeSupport.ColorUsage;

    context.save();
    context.scale(ratio, ratio);
    context.translate(0, -top);
    const defaultFont = '11px ' + Host.fontFamily();
    context.font = defaultFont;

    context.fillStyle = UI.themeSupport.patchColorText('#fff', colorUsage.Background);
    this._forEachGroup((offset, index, group) => {
      const paddingHeight = group.style.padding;
      if (paddingHeight < 5)
        return;
      context.fillRect(0, offset - paddingHeight + 2, width, paddingHeight - 4);
    });
    if (groups.length && lastGroupOffset < top + height)
      context.fillRect(0, lastGroupOffset + 2, width, top + height - lastGroupOffset);

    context.strokeStyle = UI.themeSupport.patchColorText('#eee', colorUsage.Background);
    context.beginPath();
    this._forEachGroup((offset, index, group, isFirst) => {
      if (isFirst || group.style.padding < 4)
        return;
      hLine(offset - 2.5);
    });
    hLine(lastGroupOffset + 1.5);
    context.stroke();

    this._forEachGroup((offset, index, group) => {
      if (group.style.useFirstLineForOverview)
        return;
      if (!this._isGroupCollapsible(index) || group.expanded) {
        if (!group.style.shareHeaderLine && index !== this._selectedGroup) {
          context.fillStyle = group.style.backgroundColor;
          context.fillRect(0, offset, width, group.style.height);
        }
        return;
      }
      let nextGroup = index + 1;
      while (nextGroup < groups.length && groups[nextGroup].style.nestingLevel > group.style.nestingLevel)
        nextGroup++;
      const endLevel = nextGroup < groups.length ? groups[nextGroup].startLevel : this._dataProvider.maxStackDepth();
      this._drawCollapsedOverviewForGroup(group, offset, endLevel);
    });

    context.save();
    this._forEachGroup((offset, index, group) => {
      context.font = group.style.font;
      if (this._isGroupCollapsible(index) && !group.expanded || group.style.shareHeaderLine) {
        const width = this._labelWidthForGroup(context, group) + 2;
        if (index === this._selectedGroup)
          context.fillStyle = this._selectedGroupBackroundColor;
        else
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
    this._forEachGroup((offset, index, group) => {
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

    this._forEachGroup((offset, index, group, isFirst, groupHeight) => {
      if (index === this._selectedGroup) {
        const lineWidth = 2;
        const bracketLength = 10;
        context.fillStyle = this._selectedGroupBorderColor;
        context.fillRect(0, offset - lineWidth, lineWidth, groupHeight - group.style.padding + 2 * lineWidth);
        context.fillRect(0, offset - lineWidth, bracketLength, lineWidth);
        context.fillRect(0, offset + groupHeight - group.style.padding, bracketLength, lineWidth);
      }
    });

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
      const arrowHeight = this._arrowSide * Math.sqrt(3) / 2;
      const arrowCenterOffset = Math.round(arrowHeight / 2);
      context.save();
      context.translate(x, y);
      context.rotate(expanded ? Math.PI / 2 : 0);
      context.moveTo(-arrowCenterOffset, -this._arrowSide / 2);
      context.lineTo(-arrowCenterOffset, this._arrowSide / 2);
      context.lineTo(arrowHeight - arrowCenterOffset, 0);
      context.restore();
    }
  }

  /**
   * @param {function(number, number, !PerfUI.FlameChart.Group, boolean, number)} callback
   */
  _forEachGroup(callback) {
    const top = this._chartViewport.scrollOffset();
    const groups = this._rawTimelineData.groups || [];
    if (!groups.length)
      return;
    const groupOffsets = this._groupOffsets;
    /** @type !Array<{nestingLevel: number, visible: boolean}> */
    const groupStack = [{nestingLevel: -1, visible: true}];
    for (let i = 0; i < groups.length; ++i) {
      const groupTop = groupOffsets[i];
      const group = groups[i];
      if (groupTop - group.style.padding > top + this._offsetHeight)
        break;
      let firstGroup = true;
      while (groupStack.peekLast().nestingLevel >= group.style.nestingLevel) {
        groupStack.pop();
        firstGroup = false;
      }
      const parentGroupVisible = groupStack.peekLast().visible;
      const thisGroupVisible = parentGroupVisible && (!this._isGroupCollapsible(i) || group.expanded);
      groupStack.push({nestingLevel: group.style.nestingLevel, visible: thisGroupVisible});
      const nextOffset = i === groups.length - 1 ? groupOffsets[i + 1] + group.style.padding : groupOffsets[i + 1];
      if (!parentGroupVisible || nextOffset < top)
        continue;
      callback(groupTop, i, group, firstGroup, nextOffset - groupTop);
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
    const range = new Common.SegmentedRange(mergeCallback);
    const timeWindowLeft = this._chartViewport.windowLeftTime();
    const timeWindowRight = this._chartViewport.windowRightTime();
    const context = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    const barHeight = group.style.height;
    const entryStartTimes = this._rawTimelineData.entryStartTimes;
    const entryTotalTimes = this._rawTimelineData.entryTotalTimes;
    const timeToPixel = this._chartViewport.timeToPixel();

    for (let level = group.startLevel; level < endLevel; ++level) {
      const levelIndexes = this._timelineLevels[level];
      const rightIndexOnLevel =
          levelIndexes.lowerBound(timeWindowRight, (time, entryIndex) => time - entryStartTimes[entryIndex]) - 1;
      let lastDrawOffset = Infinity;

      for (let entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
        const entryIndex = levelIndexes[entryIndexOnLevel];
        const entryStartTime = entryStartTimes[entryIndex];
        const barX = this._timeToPositionClipped(entryStartTime);
        const entryEndTime = entryStartTime + entryTotalTimes[entryIndex];
        if (isNaN(entryEndTime) || barX >= lastDrawOffset)
          continue;
        if (entryEndTime <= timeWindowLeft)
          break;
        lastDrawOffset = barX;
        const color = this._dataProvider.entryColor(entryIndex);
        const endBarX = this._timeToPositionClipped(entryEndTime);
        if (group.style.useDecoratorsForOverview && this._dataProvider.forceDecoration(entryIndex)) {
          const unclippedBarX = this._chartViewport.timeToPosition(entryStartTime);
          const barWidth = endBarX - barX;
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

    const segments = range.segments().slice().sort((a, b) => a.data.localeCompare(b.data));
    let lastColor;
    context.beginPath();
    for (let i = 0; i < segments.length; ++i) {
      const segment = segments[i];
      if (lastColor !== segments[i].data) {
        context.fill();
        context.beginPath();
        lastColor = segments[i].data;
        context.fillStyle = lastColor;
      }
      context.rect(segment.begin, y, segment.end - segment.begin, barHeight);
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
    const ratio = window.devicePixelRatio;
    const top = this._chartViewport.scrollOffset();
    const arrowWidth = 6;
    context.scale(ratio, ratio);
    context.translate(0, -top);

    context.fillStyle = '#7f5050';
    context.strokeStyle = '#7f5050';
    const td = this._timelineData();
    const endIndex = td.flowStartTimes.lowerBound(this._chartViewport.windowRightTime());

    context.lineWidth = 0.5;
    for (let i = 0; i < endIndex; ++i) {
      if (!td.flowEndTimes[i] || td.flowEndTimes[i] < this._chartViewport.windowLeftTime())
        continue;
      const startX = this._chartViewport.timeToPosition(td.flowStartTimes[i]);
      const endX = this._chartViewport.timeToPosition(td.flowEndTimes[i]);
      const startLevel = td.flowStartLevels[i];
      const endLevel = td.flowEndLevels[i];
      const startY = this._levelToOffset(startLevel) + this._levelHeight(startLevel) / 2;
      const endY = this._levelToOffset(endLevel) + this._levelHeight(endLevel) / 2;


      const segment = Math.min((endX - startX) / 4, 40);
      const distanceTime = td.flowEndTimes[i] - td.flowStartTimes[i];
      const distanceY = (endY - startY) / 10;
      const spread = 30;
      const lineY = distanceTime < 1 ? startY : spread + Math.max(0, startY + distanceY * (i % spread));

      const p = [];
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
    const markers = this._timelineData().markers;
    const left = this._markerIndexBeforeTime(this.minimumBoundary());
    const rightBoundary = this.maximumBoundary();
    const timeToPixel = this._chartViewport.timeToPixel();

    const context = /** @type {!CanvasRenderingContext2D} */ (this._canvas.getContext('2d'));
    context.save();
    const ratio = window.devicePixelRatio;
    context.scale(ratio, ratio);
    context.translate(0, 3);
    const height = PerfUI.FlameChart.HeaderHeight - 1;
    for (let i = left; i < markers.length; i++) {
      const timestamp = markers[i].startTime();
      if (timestamp > rightBoundary)
        break;
      markers[i].draw(context, this._chartViewport.timeToPosition(timestamp), height, timeToPixel);
    }
    context.restore();
  }

  _updateMarkerHighlight() {
    const element = this._markerHighlighElement;
    if (element.parentElement)
      element.remove();
    const markerIndex = this._highlightedMarkerIndex;
    if (markerIndex === -1)
      return;
    const marker = this._timelineData().markers[markerIndex];
    const barX = this._timeToPositionClipped(marker.startTime());
    element.title = marker.title();
    const style = element.style;
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
      this._forceDecorationCache = null;
      this._rawTimelineDataLength = 0;
      this._selectedGroup = -1;
      this._flameChartDelegate.updateSelectedGroup(this, null);
      return;
    }

    this._rawTimelineData = timelineData;
    this._rawTimelineDataLength = timelineData.entryStartTimes.length;
    this._forceDecorationCache = new Int8Array(this._rawTimelineDataLength);
    for (let i = 0; i < this._forceDecorationCache.length; ++i)
      this._forceDecorationCache[i] = this._dataProvider.forceDecoration(i) ? 1 : 0;

    const entryCounters = new Uint32Array(this._dataProvider.maxStackDepth() + 1);
    for (let i = 0; i < timelineData.entryLevels.length; ++i)
      ++entryCounters[timelineData.entryLevels[i]];
    const levelIndexes = new Array(entryCounters.length);
    for (let i = 0; i < levelIndexes.length; ++i) {
      levelIndexes[i] = new Uint32Array(entryCounters[i]);
      entryCounters[i] = 0;
    }
    for (let i = 0; i < timelineData.entryLevels.length; ++i) {
      const level = timelineData.entryLevels[i];
      levelIndexes[level][entryCounters[level]++] = i;
    }
    this._timelineLevels = levelIndexes;
    const groups = this._rawTimelineData.groups || [];
    for (let i = 0; i < groups.length; ++i) {
      const expanded = this._groupExpansionState[groups[i].name];
      if (expanded !== undefined)
        groups[i].expanded = expanded;
    }
    this._updateLevelPositions();
    this._updateHeight();

    this._selectedGroup = timelineData.selectedGroup ? groups.indexOf(timelineData.selectedGroup) : -1;
    this._flameChartDelegate.updateSelectedGroup(this, timelineData.selectedGroup);
  }

  _updateLevelPositions() {
    const levelCount = this._dataProvider.maxStackDepth();
    const groups = this._rawTimelineData.groups || [];
    this._visibleLevelOffsets = new Uint32Array(levelCount + 1);
    this._visibleLevelHeights = new Uint32Array(levelCount);
    this._visibleLevels = new Uint16Array(levelCount);
    this._groupOffsets = new Uint32Array(groups.length + 1);

    let groupIndex = -1;
    let currentOffset = this._rulerEnabled ? PerfUI.FlameChart.HeaderHeight + 2 : 2;
    let visible = true;
    /** @type !Array<{nestingLevel: number, visible: boolean}> */
    const groupStack = [{nestingLevel: -1, visible: true}];
    const lastGroupLevel = Math.max(levelCount, groups.length ? groups.peekLast().startLevel + 1 : 0);
    let level;
    for (level = 0; level < lastGroupLevel; ++level) {
      let parentGroupIsVisible = true;
      let style;
      while (groupIndex < groups.length - 1 && level === groups[groupIndex + 1].startLevel) {
        ++groupIndex;
        style = groups[groupIndex].style;
        let nextLevel = true;
        while (groupStack.peekLast().nestingLevel >= style.nestingLevel) {
          groupStack.pop();
          nextLevel = false;
        }
        const thisGroupIsVisible =
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
      const isFirstOnLevel = groupIndex >= 0 && level === groups[groupIndex].startLevel;
      const thisLevelIsVisible =
          parentGroupIsVisible && (visible || isFirstOnLevel && groups[groupIndex].style.useFirstLineForOverview);
      if (level < levelCount) {
        let height;
        if (groupIndex >= 0) {
          const group = groups[groupIndex];
          const styleB = group.style;
          height = isFirstOnLevel && !styleB.shareHeaderLine || (styleB.collapsible && !group.expanded) ?
              styleB.height :
              (styleB.itemsHeight || this._barHeight);
        } else {
          height = this._barHeight;
        }
        this._visibleLevels[level] = thisLevelIsVisible;
        this._visibleLevelOffsets[level] = currentOffset;
        this._visibleLevelHeights[level] = height;
      }
      if (thisLevelIsVisible || (parentGroupIsVisible && style && style.shareHeaderLine && isFirstOnLevel))
        currentOffset += this._visibleLevelHeights[level];
    }
    if (groupIndex >= 0)
      this._groupOffsets[groupIndex + 1] = currentOffset;
    this._visibleLevelOffsets[level] = currentOffset;
    if (this._useWebGL)
      this._setupGLGeometry();
  }

  /**
   * @param {number} index
   */
  _isGroupCollapsible(index) {
    const groups = this._rawTimelineData.groups || [];
    const style = groups[index].style;
    if (!style.shareHeaderLine || !style.collapsible)
      return !!style.collapsible;
    const isLastGroup = index + 1 >= groups.length;
    if (!isLastGroup && groups[index + 1].style.nestingLevel > style.nestingLevel)
      return true;
    const nextGroupLevel = isLastGroup ? this._dataProvider.maxStackDepth() : groups[index + 1].startLevel;
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
    if (this._selectedEntryIndex === entryIndex)
      return;
    if (entryIndex !== -1)
      this._chartViewport.hideRangeSelection();
    this._selectedEntryIndex = entryIndex;
    this._revealEntry(entryIndex);
    this._updateElementPosition(this._selectedElement, this._selectedEntryIndex);
  }

  /**
   * @param {!Element} element
   * @param {number} entryIndex
   */
  _updateElementPosition(element, entryIndex) {
    const /** @const */ elementMinWidthPx = 2;
    if (element.parentElement)
      element.remove();
    if (entryIndex === -1)
      return;
    const timelineData = this._timelineData();
    const startTime = timelineData.entryStartTimes[entryIndex];
    const endTime = startTime + (timelineData.entryTotalTimes[entryIndex] || 0);
    let barX = this._timeToPositionClipped(startTime);
    const barRight = this._timeToPositionClipped(endTime);
    if (barRight === 0 || barX === this._offsetWidth)
      return;
    let barWidth = barRight - barX;
    const barCenter = barX + barWidth / 2;
    barWidth = Math.max(barWidth, elementMinWidthPx);
    barX = barCenter - barWidth / 2;
    const entryLevel = timelineData.entryLevels[entryIndex];
    const barY = this._levelToOffset(entryLevel) - this._chartViewport.scrollOffset();
    const barHeight = this._levelHeight(entryLevel);
    const style = element.style;
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
    this._chartViewport.setBoundaries(this._minimumBoundary, this._totalTime);
  }

  _updateHeight() {
    const height = this._levelToOffset(this._dataProvider.maxStackDepth()) + 2;
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
    this._draw();
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

  /**
   * @override
   * @param {number} time
   * @return {number}
   */
  computePosition(time) {
    return this._chartViewport.timeToPosition(time);
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return this._dataProvider.formatValue(value - this.zeroTime(), precision);
  }

  /**
   * @override
   * @return {number}
   */
  maximumBoundary() {
    return this._chartViewport.windowRightTime();
  }

  /**
   * @override
   * @return {number}
   */
  minimumBoundary() {
    return this._chartViewport.windowLeftTime();
  }

  /**
   * @override
   * @return {number}
   */
  zeroTime() {
    return this._dataProvider.minimumBoundary();
  }

  /**
   * @override
   * @return {number}
   */
  boundarySpan() {
    return this.maximumBoundary() - this.minimumBoundary();
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
 *     selectable: (boolean|undefined),
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
    /** @type {?PerfUI.FlameChart.Group} */
    this.selectedGroup = null;
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

PerfUI.FlameChart.Colors = {
  SelectedGroupBackground: 'hsl(215, 85%, 98%)',
  SelectedGroupBorder: 'hsl(216, 68%, 54%)',
};
