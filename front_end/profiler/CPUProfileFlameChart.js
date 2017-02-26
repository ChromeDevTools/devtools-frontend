/**
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
 * @implements {PerfUI.FlameChartDataProvider}
 * @unrestricted
 */
Profiler.ProfileFlameChartDataProvider = class {
  constructor() {
    PerfUI.FlameChartDataProvider.call(this);
    this._colorGenerator = Profiler.ProfileFlameChartDataProvider.colorGenerator();
  }

  /**
   * @return {!PerfUI.FlameChart.ColorGenerator}
   */
  static colorGenerator() {
    if (!Profiler.ProfileFlameChartDataProvider._colorGenerator) {
      var colorGenerator = new PerfUI.FlameChart.ColorGenerator(
          {min: 30, max: 330}, {min: 50, max: 80, count: 5}, {min: 80, max: 90, count: 3});

      colorGenerator.setColorForID('(idle)', 'hsl(0, 0%, 94%)');
      colorGenerator.setColorForID('(program)', 'hsl(0, 0%, 80%)');
      colorGenerator.setColorForID('(garbage collector)', 'hsl(0, 0%, 80%)');
      Profiler.ProfileFlameChartDataProvider._colorGenerator = colorGenerator;
    }
    return Profiler.ProfileFlameChartDataProvider._colorGenerator;
  }

  /**
   * @override
   * @return {number}
   */
  minimumBoundary() {
    return this._cpuProfile.profileStartTime;
  }

  /**
   * @override
   * @return {number}
   */
  totalTime() {
    return this._cpuProfile.profileHead.total;
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
    return this._maxStackDepth;
  }

  /**
   * @override
   * @return {?PerfUI.FlameChart.TimelineData}
   */
  timelineData() {
    return this._timelineData || this._calculateTimelineData();
  }

  /**
   * @return {!PerfUI.FlameChart.TimelineData}
   */
  _calculateTimelineData() {
    throw 'Not implemented.';
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(entryIndex) {
    throw 'Not implemented.';
  }

  /**
   * @override
   * @param {number} entryIndex
   */
  highlightEntry(entryIndex) {
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {boolean}
   */
  canJumpToEntry(entryIndex) {
    return this._entryNodes[entryIndex].scriptId !== '0';
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {string}
   */
  entryTitle(entryIndex) {
    var node = this._entryNodes[entryIndex];
    return UI.beautifyFunctionName(node.functionName);
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {?string}
   */
  entryFont(entryIndex) {
    if (!this._font) {
      this._font = '11px ' + Host.fontFamily();
      this._boldFont = 'bold ' + this._font;
    }
    const node = this._entryNodes[entryIndex];
    return node.deoptReason ? this._boldFont : this._font;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {string}
   */
  entryColor(entryIndex) {
    var node = this._entryNodes[entryIndex];
    // For idle and program, we want different 'shades of gray', so we fallback to functionName as scriptId = 0
    // For rest of nodes e.g eval scripts, if url is empty then scriptId will be guaranteed to be non-zero
    return this._colorGenerator.colorForID(node.url || (node.scriptId !== '0' ? node.scriptId : node.functionName));
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
   * @return {boolean}
   */
  decorateEntry(entryIndex, context, text, barX, barY, barWidth, barHeight) {
    return false;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {boolean}
   */
  forceDecoration(entryIndex) {
    return false;
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {string}
   */
  textColor(entryIndex) {
    return '#333';
  }
};


/**
 * @implements {UI.Searchable}
 * @unrestricted
 */
Profiler.CPUProfileFlameChart = class extends UI.VBox {
  /**
   * @param {!UI.SearchableView} searchableView
   * @param {!PerfUI.FlameChartDataProvider} dataProvider
   */
  constructor(searchableView, dataProvider) {
    super();
    this.element.id = 'cpu-flame-chart';

    this._searchableView = searchableView;
    this._overviewPane = new Profiler.CPUProfileFlameChart.OverviewPane(dataProvider);
    this._overviewPane.show(this.element);

    this._mainPane = new PerfUI.FlameChart(dataProvider, this._overviewPane);
    this._mainPane.setBarHeight(15);
    this._mainPane.setTextBaseline(4);
    this._mainPane.setTextPadding(2);
    this._mainPane.show(this.element);
    this._mainPane.addEventListener(PerfUI.FlameChart.Events.EntrySelected, this._onEntrySelected, this);
    this._overviewPane.addEventListener(PerfUI.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);
    this._dataProvider = dataProvider;
    this._searchResults = [];
  }

  /**
   * @override
   */
  focus() {
    this._mainPane.focus();
  }

  /**
   * @param {!Common.Event} event
   */
  _onWindowChanged(event) {
    var windowLeft = event.data.windowTimeLeft;
    var windowRight = event.data.windowTimeRight;
    this._mainPane.setWindowTimes(windowLeft, windowRight);
  }

  /**
   * @param {number} timeLeft
   * @param {number} timeRight
   */
  selectRange(timeLeft, timeRight) {
    this._overviewPane._selectRange(timeLeft, timeRight);
  }

  /**
   * @param {!Common.Event} event
   */
  _onEntrySelected(event) {
    this.dispatchEventToListeners(PerfUI.FlameChart.Events.EntrySelected, event.data);
  }

  update() {
    this._overviewPane.update();
    this._mainPane.update();
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    var matcher = createPlainTextSearchRegex(searchConfig.query, searchConfig.caseSensitive ? '' : 'i');

    var selectedEntryIndex = this._searchResultIndex !== -1 ? this._searchResults[this._searchResultIndex] : -1;
    this._searchResults = [];
    var entriesCount = this._dataProvider._entryNodes.length;
    for (var index = 0; index < entriesCount; ++index) {
      if (this._dataProvider.entryTitle(index).match(matcher))
        this._searchResults.push(index);
    }

    if (this._searchResults.length) {
      this._searchResultIndex = this._searchResults.indexOf(selectedEntryIndex);
      if (this._searchResultIndex === -1)
        this._searchResultIndex = jumpBackwards ? this._searchResults.length - 1 : 0;
      this._mainPane.setSelectedEntry(this._searchResults[this._searchResultIndex]);
    } else {
      this.searchCanceled();
    }
    this._searchableView.updateSearchMatchesCount(this._searchResults.length);
    this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);
  }

  /**
   * @override
   */
  searchCanceled() {
    this._mainPane.setSelectedEntry(-1);
    this._searchResults = [];
    this._searchResultIndex = -1;
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    this._searchResultIndex = (this._searchResultIndex + 1) % this._searchResults.length;
    this._mainPane.setSelectedEntry(this._searchResults[this._searchResultIndex]);
    this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    this._searchResultIndex = (this._searchResultIndex - 1 + this._searchResults.length) % this._searchResults.length;
    this._mainPane.setSelectedEntry(this._searchResults[this._searchResultIndex]);
    this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);
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
    return false;
  }
};

/**
 * @implements {PerfUI.TimelineGrid.Calculator}
 * @unrestricted
 */
Profiler.CPUProfileFlameChart.OverviewCalculator = class {
  constructor(dataProvider) {
    this._dataProvider = dataProvider;
  }

  /**
   * @param {!Profiler.CPUProfileFlameChart.OverviewPane} overviewPane
   */
  _updateBoundaries(overviewPane) {
    this._minimumBoundaries = overviewPane._dataProvider.minimumBoundary();
    var totalTime = overviewPane._dataProvider.totalTime();
    this._maximumBoundaries = this._minimumBoundaries + totalTime;
    this._xScaleFactor = overviewPane._overviewContainer.clientWidth / totalTime;
  }

  /**
   * @override
   * @param {number} time
   * @return {number}
   */
  computePosition(time) {
    return (time - this._minimumBoundaries) * this._xScaleFactor;
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    return this._dataProvider.formatValue(value - this._minimumBoundaries, precision);
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
    return this._minimumBoundaries;
  }

  /**
   * @override
   * @return {number}
   */
  boundarySpan() {
    return this._maximumBoundaries - this._minimumBoundaries;
  }
};

/**
 * @implements {PerfUI.FlameChartDelegate}
 * @unrestricted
 */
Profiler.CPUProfileFlameChart.OverviewPane = class extends UI.VBox {
  /**
   * @param {!PerfUI.FlameChartDataProvider} dataProvider
   */
  constructor(dataProvider) {
    super();
    this.element.classList.add('cpu-profile-flame-chart-overview-pane');
    this._overviewContainer = this.element.createChild('div', 'cpu-profile-flame-chart-overview-container');
    this._overviewGrid = new PerfUI.OverviewGrid('cpu-profile-flame-chart');
    this._overviewGrid.element.classList.add('fill');
    this._overviewCanvas = this._overviewContainer.createChild('canvas', 'cpu-profile-flame-chart-overview-canvas');
    this._overviewContainer.appendChild(this._overviewGrid.element);
    this._overviewCalculator = new Profiler.CPUProfileFlameChart.OverviewCalculator(dataProvider);
    this._dataProvider = dataProvider;
    this._overviewGrid.addEventListener(PerfUI.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);
  }

  /**
   * @override
   * @param {number} windowStartTime
   * @param {number} windowEndTime
   */
  requestWindowTimes(windowStartTime, windowEndTime) {
    this._selectRange(windowStartTime, windowEndTime);
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  updateRangeSelection(startTime, endTime) {
  }

  /**
   * @param {number} timeLeft
   * @param {number} timeRight
   */
  _selectRange(timeLeft, timeRight) {
    var startTime = this._dataProvider.minimumBoundary();
    var totalTime = this._dataProvider.totalTime();
    this._overviewGrid.setWindow((timeLeft - startTime) / totalTime, (timeRight - startTime) / totalTime);
  }

  /**
   * @param {!Common.Event} event
   */
  _onWindowChanged(event) {
    var startTime = this._dataProvider.minimumBoundary();
    var totalTime = this._dataProvider.totalTime();
    var data = {
      windowTimeLeft: startTime + this._overviewGrid.windowLeft() * totalTime,
      windowTimeRight: startTime + this._overviewGrid.windowRight() * totalTime
    };
    this.dispatchEventToListeners(PerfUI.OverviewGrid.Events.WindowChanged, data);
  }

  /**
   * @return {?PerfUI.FlameChart.TimelineData}
   */
  _timelineData() {
    return this._dataProvider.timelineData();
  }

  /**
   * @override
   */
  onResize() {
    this._scheduleUpdate();
  }

  _scheduleUpdate() {
    if (this._updateTimerId)
      return;
    this._updateTimerId = this.element.window().requestAnimationFrame(this.update.bind(this));
  }

  update() {
    this._updateTimerId = 0;
    var timelineData = this._timelineData();
    if (!timelineData)
      return;
    this._resetCanvas(
        this._overviewContainer.clientWidth, this._overviewContainer.clientHeight - PerfUI.FlameChart.HeaderHeight);
    this._overviewCalculator._updateBoundaries(this);
    this._overviewGrid.updateDividers(this._overviewCalculator);
    this._drawOverviewCanvas();
  }

  _drawOverviewCanvas() {
    var canvasWidth = this._overviewCanvas.width;
    var canvasHeight = this._overviewCanvas.height;
    var drawData = this._calculateDrawData(canvasWidth);
    var context = this._overviewCanvas.getContext('2d');
    var ratio = window.devicePixelRatio;
    var offsetFromBottom = ratio;
    var lineWidth = 1;
    var yScaleFactor = canvasHeight / (this._dataProvider.maxStackDepth() * 1.1);
    context.lineWidth = lineWidth;
    context.translate(0.5, 0.5);
    context.strokeStyle = 'rgba(20,0,0,0.4)';
    context.fillStyle = 'rgba(214,225,254,0.8)';
    context.moveTo(-lineWidth, canvasHeight + lineWidth);
    context.lineTo(-lineWidth, Math.round(canvasHeight - drawData[0] * yScaleFactor - offsetFromBottom));
    var value;
    for (var x = 0; x < canvasWidth; ++x) {
      value = Math.round(canvasHeight - drawData[x] * yScaleFactor - offsetFromBottom);
      context.lineTo(x, value);
    }
    context.lineTo(canvasWidth + lineWidth, value);
    context.lineTo(canvasWidth + lineWidth, canvasHeight + lineWidth);
    context.fill();
    context.stroke();
    context.closePath();
  }

  /**
   * @param {number} width
   * @return {!Uint8Array}
   */
  _calculateDrawData(width) {
    var dataProvider = this._dataProvider;
    var timelineData = this._timelineData();
    var entryStartTimes = timelineData.entryStartTimes;
    var entryTotalTimes = timelineData.entryTotalTimes;
    var entryLevels = timelineData.entryLevels;
    var length = entryStartTimes.length;
    var minimumBoundary = this._dataProvider.minimumBoundary();

    var drawData = new Uint8Array(width);
    var scaleFactor = width / dataProvider.totalTime();

    for (var entryIndex = 0; entryIndex < length; ++entryIndex) {
      var start = Math.floor((entryStartTimes[entryIndex] - minimumBoundary) * scaleFactor);
      var finish =
          Math.floor((entryStartTimes[entryIndex] - minimumBoundary + entryTotalTimes[entryIndex]) * scaleFactor);
      for (var x = start; x <= finish; ++x)
        drawData[x] = Math.max(drawData[x], entryLevels[entryIndex] + 1);
    }
    return drawData;
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  _resetCanvas(width, height) {
    var ratio = window.devicePixelRatio;
    this._overviewCanvas.width = width * ratio;
    this._overviewCanvas.height = height * ratio;
    this._overviewCanvas.style.width = width + 'px';
    this._overviewCanvas.style.height = height + 'px';
  }
};
