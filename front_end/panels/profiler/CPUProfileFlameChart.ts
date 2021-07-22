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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';

let colorGeneratorInstance: Common.Color.Generator|null = null;

export class ProfileFlameChartDataProvider implements PerfUI.FlameChart.FlameChartDataProvider {
  _colorGenerator: Common.Color.Generator;
  _maxStackDepth: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  timelineData_: PerfUI.FlameChart.TimelineData|null;
  entryNodes: SDK.ProfileTreeModel.ProfileNode[];
  _font?: string;
  _boldFont?: string;

  constructor() {
    this._colorGenerator = ProfileFlameChartDataProvider.colorGenerator();
    this._maxStackDepth = 0;
    this.timelineData_ = null;
    this.entryNodes = [];
  }

  static colorGenerator(): Common.Color.Generator {
    if (!colorGeneratorInstance) {
      colorGeneratorInstance = new Common.Color.Generator(
          {min: 30, max: 330, count: undefined}, {min: 50, max: 80, count: 5}, {min: 80, max: 90, count: 3});

      colorGeneratorInstance.setColorForID('(idle)', 'hsl(0, 0%, 94%)');
      colorGeneratorInstance.setColorForID('(program)', 'hsl(0, 0%, 80%)');
      colorGeneratorInstance.setColorForID('(garbage collector)', 'hsl(0, 0%, 80%)');
    }
    return colorGeneratorInstance;
  }

  minimumBoundary(): number {
    throw 'Not implemented.';
  }

  totalTime(): number {
    throw 'Not implemented.';
  }

  formatValue(value: number, precision?: number): string {
    return i18n.TimeUtilities.preciseMillisToString(value, precision);
  }

  maxStackDepth(): number {
    return this._maxStackDepth;
  }

  timelineData(): PerfUI.FlameChart.TimelineData|null {
    return this.timelineData_ || this._calculateTimelineData();
  }

  _calculateTimelineData(): PerfUI.FlameChart.TimelineData {
    throw 'Not implemented.';
  }

  prepareHighlightedEntryInfo(_entryIndex: number): Element|null {
    throw 'Not implemented.';
  }

  canJumpToEntry(entryIndex: number): boolean {
    return this.entryNodes[entryIndex].scriptId !== '0';
  }

  entryTitle(entryIndex: number): string {
    const node = this.entryNodes[entryIndex];
    return UI.UIUtils.beautifyFunctionName(node.functionName);
  }

  entryFont(entryIndex: number): string|null {
    if (!this._font) {
      this._font = '11px ' + Host.Platform.fontFamily();
      this._boldFont = 'bold ' + this._font;
    }
    return this.entryHasDeoptReason(entryIndex) ? this._boldFont as string : this._font;
  }

  entryHasDeoptReason(_entryIndex: number): boolean {
    throw 'Not implemented.';
  }

  entryColor(entryIndex: number): string {
    const node = this.entryNodes[entryIndex];
    // For idle and program, we want different 'shades of gray', so we fallback to functionName as scriptId = 0
    // For rest of nodes e.g eval scripts, if url is empty then scriptId will be guaranteed to be non-zero
    return this._colorGenerator.colorForID(node.url || (node.scriptId !== '0' ? node.scriptId : node.functionName));
  }

  decorateEntry(
      _entryIndex: number, _context: CanvasRenderingContext2D, _text: string|null, _barX: number, _barY: number,
      _barWidth: number, _barHeight: number): boolean {
    return false;
  }

  forceDecoration(_entryIndex: number): boolean {
    return false;
  }

  textColor(_entryIndex: number): string {
    return '#333';
  }

  navStartTimes(): Map<string, SDK.TracingModel.Event> {
    return new Map();
  }

  entryNodesLength(): number {
    return this.entryNodes.length;
  }
}

export class CPUProfileFlameChart extends UI.Widget.VBox implements UI.SearchableView.Searchable {
  _searchableView: UI.SearchableView.SearchableView;
  _overviewPane: OverviewPane;
  _mainPane: PerfUI.FlameChart.FlameChart;
  _entrySelected: boolean;
  _dataProvider: ProfileFlameChartDataProvider;
  _searchResults: number[];
  _searchResultIndex: number = -1;

  constructor(searchableView: UI.SearchableView.SearchableView, dataProvider: ProfileFlameChartDataProvider) {
    super();
    this.element.id = 'cpu-flame-chart';

    this._searchableView = searchableView;
    this._overviewPane = new OverviewPane(dataProvider);
    this._overviewPane.show(this.element);

    this._mainPane = new PerfUI.FlameChart.FlameChart(dataProvider, this._overviewPane);
    this._mainPane.setBarHeight(15);
    this._mainPane.setTextBaseline(4);
    this._mainPane.setTextPadding(2);
    this._mainPane.show(this.element);
    this._mainPane.addEventListener(PerfUI.FlameChart.Events.EntrySelected, this._onEntrySelected, this);
    this._mainPane.addEventListener(PerfUI.FlameChart.Events.EntryInvoked, this._onEntryInvoked, this);
    this._entrySelected = false;
    this._mainPane.addEventListener(PerfUI.FlameChart.Events.CanvasFocused, this._onEntrySelected, this);
    this._overviewPane.addEventListener(PerfUI.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);
    this._dataProvider = dataProvider;
    this._searchResults = [];
  }

  focus(): void {
    this._mainPane.focus();
  }

  _onWindowChanged(event: Common.EventTarget.EventTargetEvent): void {
    const windowLeft = event.data.windowTimeLeft;
    const windowRight = event.data.windowTimeRight;
    this._mainPane.setWindowTimes(windowLeft, windowRight, /* animate */ true);
  }

  selectRange(timeLeft: number, timeRight: number): void {
    this._overviewPane._selectRange(timeLeft, timeRight);
  }

  _onEntrySelected(event: Common.EventTarget.EventTargetEvent): void {
    if (event.data) {
      const eventIndex = Number(event.data);
      this._mainPane.setSelectedEntry(eventIndex);
      if (eventIndex === -1) {
        this._entrySelected = false;
      } else {
        this._entrySelected = true;
      }
    } else if (!this._entrySelected) {
      this._mainPane.setSelectedEntry(0);
      this._entrySelected = true;
    }
  }

  _onEntryInvoked(event: Common.EventTarget.EventTargetEvent): void {
    this._onEntrySelected(event);
    this.dispatchEventToListeners(PerfUI.FlameChart.Events.EntryInvoked, event.data);
  }

  update(): void {
    this._overviewPane.update();
    this._mainPane.update();
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, _shouldJump: boolean, jumpBackwards?: boolean): void {
    const matcher = createPlainTextSearchRegex(searchConfig.query, searchConfig.caseSensitive ? '' : 'i');

    const selectedEntryIndex: number =
        this._searchResultIndex !== -1 ? this._searchResults[this._searchResultIndex] : -1;
    this._searchResults = [];
    const entriesCount = this._dataProvider.entryNodesLength();
    for (let index = 0; index < entriesCount; ++index) {
      if (this._dataProvider.entryTitle(index).match(matcher)) {
        this._searchResults.push(index);
      }
    }

    if (this._searchResults.length) {
      this._searchResultIndex = this._searchResults.indexOf(selectedEntryIndex);
      if (this._searchResultIndex === -1) {
        this._searchResultIndex = jumpBackwards ? this._searchResults.length - 1 : 0;
      }
      this._mainPane.setSelectedEntry(this._searchResults[this._searchResultIndex]);
    } else {
      this.searchCanceled();
    }
    this._searchableView.updateSearchMatchesCount(this._searchResults.length);
    this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);
  }

  searchCanceled(): void {
    this._mainPane.setSelectedEntry(-1);
    this._searchResults = [];
    this._searchResultIndex = -1;
  }

  jumpToNextSearchResult(): void {
    this._searchResultIndex = (this._searchResultIndex + 1) % this._searchResults.length;
    this._mainPane.setSelectedEntry(this._searchResults[this._searchResultIndex]);
    this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);
  }

  jumpToPreviousSearchResult(): void {
    this._searchResultIndex = (this._searchResultIndex - 1 + this._searchResults.length) % this._searchResults.length;
    this._mainPane.setSelectedEntry(this._searchResults[this._searchResultIndex]);
    this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return false;
  }
}

export class OverviewCalculator implements PerfUI.TimelineGrid.Calculator {
  _formatter: (arg0: number, arg1?: number|undefined) => string;
  _minimumBoundaries!: number;
  _maximumBoundaries!: number;
  _xScaleFactor!: number;
  constructor(formatter: (arg0: number, arg1?: number|undefined) => string) {
    this._formatter = formatter;
  }

  _updateBoundaries(overviewPane: OverviewPane): void {
    this._minimumBoundaries = overviewPane._dataProvider.minimumBoundary();
    const totalTime = overviewPane._dataProvider.totalTime();
    this._maximumBoundaries = this._minimumBoundaries + totalTime;
    this._xScaleFactor = overviewPane._overviewContainer.clientWidth / totalTime;
  }

  computePosition(time: number): number {
    return (time - this._minimumBoundaries) * this._xScaleFactor;
  }

  formatValue(value: number, precision?: number): string {
    return this._formatter(value - this._minimumBoundaries, precision);
  }

  maximumBoundary(): number {
    return this._maximumBoundaries;
  }

  minimumBoundary(): number {
    return this._minimumBoundaries;
  }

  zeroTime(): number {
    return this._minimumBoundaries;
  }

  boundarySpan(): number {
    return this._maximumBoundaries - this._minimumBoundaries;
  }
}

export class OverviewPane extends UI.Widget.VBox implements PerfUI.FlameChart.FlameChartDelegate {
  _overviewContainer: HTMLElement;
  _overviewCalculator: OverviewCalculator;
  _overviewGrid: PerfUI.OverviewGrid.OverviewGrid;
  _overviewCanvas: HTMLCanvasElement;
  _dataProvider: PerfUI.FlameChart.FlameChartDataProvider;
  _windowTimeLeft?: number;
  _windowTimeRight?: number;
  _updateTimerId?: number;

  constructor(dataProvider: PerfUI.FlameChart.FlameChartDataProvider) {
    super();
    this.element.classList.add('cpu-profile-flame-chart-overview-pane');
    this._overviewContainer = this.element.createChild('div', 'cpu-profile-flame-chart-overview-container');
    this._overviewCalculator = new OverviewCalculator(dataProvider.formatValue);
    this._overviewGrid = new PerfUI.OverviewGrid.OverviewGrid('cpu-profile-flame-chart', this._overviewCalculator);
    this._overviewGrid.element.classList.add('fill');
    this._overviewCanvas =
        (this._overviewContainer.createChild('canvas', 'cpu-profile-flame-chart-overview-canvas') as HTMLCanvasElement);
    this._overviewContainer.appendChild(this._overviewGrid.element);
    this._dataProvider = dataProvider;
    this._overviewGrid.addEventListener(PerfUI.OverviewGrid.Events.WindowChanged, this._onWindowChanged, this);
  }

  windowChanged(windowStartTime: number, windowEndTime: number): void {
    this._selectRange(windowStartTime, windowEndTime);
  }

  updateRangeSelection(_startTime: number, _endTime: number): void {
  }

  updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group|null): void {
  }

  _selectRange(timeLeft: number, timeRight: number): void {
    const startTime = this._dataProvider.minimumBoundary();
    const totalTime = this._dataProvider.totalTime();
    this._overviewGrid.setWindow((timeLeft - startTime) / totalTime, (timeRight - startTime) / totalTime);
  }

  _onWindowChanged(event: Common.EventTarget.EventTargetEvent): void {
    const windowPosition = {windowTimeLeft: event.data.rawStartValue, windowTimeRight: event.data.rawEndValue};
    this._windowTimeLeft = windowPosition.windowTimeLeft;
    this._windowTimeRight = windowPosition.windowTimeRight;

    this.dispatchEventToListeners(PerfUI.OverviewGrid.Events.WindowChanged, windowPosition);
  }

  _timelineData(): PerfUI.FlameChart.TimelineData|null {
    return this._dataProvider.timelineData();
  }

  onResize(): void {
    this._scheduleUpdate();
  }

  _scheduleUpdate(): void {
    if (this._updateTimerId) {
      return;
    }
    this._updateTimerId = this.element.window().requestAnimationFrame(this.update.bind(this));
  }

  update(): void {
    this._updateTimerId = 0;
    const timelineData = this._timelineData();
    if (!timelineData) {
      return;
    }
    this._resetCanvas(
        this._overviewContainer.clientWidth, this._overviewContainer.clientHeight - PerfUI.FlameChart.HeaderHeight);
    this._overviewCalculator._updateBoundaries(this);
    this._overviewGrid.updateDividers(this._overviewCalculator);
    this._drawOverviewCanvas();
  }

  _drawOverviewCanvas(): void {
    const canvasWidth = this._overviewCanvas.width;
    const canvasHeight = this._overviewCanvas.height;
    const drawData = this._calculateDrawData(canvasWidth);
    const context = this._overviewCanvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    const ratio = window.devicePixelRatio;
    const offsetFromBottom = ratio;
    const lineWidth = 1;
    const yScaleFactor = canvasHeight / (this._dataProvider.maxStackDepth() * 1.1);
    context.lineWidth = lineWidth;
    context.translate(0.5, 0.5);
    context.strokeStyle = 'rgba(20,0,0,0.4)';
    context.fillStyle = 'rgba(214,225,254,0.8)';
    context.moveTo(-lineWidth, canvasHeight + lineWidth);
    context.lineTo(-lineWidth, Math.round(canvasHeight - drawData[0] * yScaleFactor - offsetFromBottom));
    let value = 0;
    for (let x = 0; x < canvasWidth; ++x) {
      value = Math.round(canvasHeight - drawData[x] * yScaleFactor - offsetFromBottom);
      context.lineTo(x, value);
    }
    context.lineTo(canvasWidth + lineWidth, value);
    context.lineTo(canvasWidth + lineWidth, canvasHeight + lineWidth);
    context.fill();
    context.stroke();
    context.closePath();
  }

  _calculateDrawData(width: number): Uint8Array {
    const dataProvider = this._dataProvider;
    const timelineData = (this._timelineData() as PerfUI.FlameChart.TimelineData);
    const entryStartTimes = timelineData.entryStartTimes;
    const entryTotalTimes = timelineData.entryTotalTimes;
    const entryLevels = timelineData.entryLevels;
    const length = entryStartTimes.length;
    const minimumBoundary = this._dataProvider.minimumBoundary();

    const drawData = new Uint8Array(width);
    const scaleFactor = width / dataProvider.totalTime();

    for (let entryIndex = 0; entryIndex < length; ++entryIndex) {
      const start = Math.floor((entryStartTimes[entryIndex] - minimumBoundary) * scaleFactor);
      const finish =
          Math.floor((entryStartTimes[entryIndex] - minimumBoundary + entryTotalTimes[entryIndex]) * scaleFactor);
      for (let x = start; x <= finish; ++x) {
        drawData[x] = Math.max(drawData[x], entryLevels[entryIndex] + 1);
      }
    }
    return drawData;
  }

  _resetCanvas(width: number, height: number): void {
    const ratio = window.devicePixelRatio;
    this._overviewCanvas.width = width * ratio;
    this._overviewCanvas.height = height * ratio;
    this._overviewCanvas.style.width = width + 'px';
    this._overviewCanvas.style.height = height + 'px';
  }
}
