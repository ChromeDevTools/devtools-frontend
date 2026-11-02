// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';
import type * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render, type TemplateResult} from '../../ui/lit/lit.js';

let colorGeneratorInstance: Common.Color.Generator|null = null;

export class ProfileFlameChartDataProvider implements PerfUI.FlameChart.FlameChartDataProvider {
  readonly #colorGenerator: Common.Color.Generator;
  maxStackDepthInternal: number;
  timelineDataInternal: PerfUI.FlameChart.FlameChartTimelineData|null;
  entryNodes: CPUProfile.ProfileTreeModel.ProfileNode[];
  #font: string;
  boldFont?: string;

  constructor() {
    this.#colorGenerator = ProfileFlameChartDataProvider.colorGenerator();
    this.maxStackDepthInternal = 0;
    this.timelineDataInternal = null;
    this.entryNodes = [];
    this.#font = `${PerfUI.Font.DEFAULT_FONT_SIZE} ${PerfUI.Font.getFontFamilyForCanvas()}`;
  }

  static colorGenerator(): Common.Color.Generator {
    if (!colorGeneratorInstance) {
      colorGeneratorInstance = new Common.Color.Generator(
          {
            min: 30,
            max: 330,
          },
          {
            min: 50,
            max: 80,
            count: 5,
          },
          {
            min: 80,
            max: 90,
            count: 3,
          });

      colorGeneratorInstance.setColorForID('(idle)', 'hsl(0, 0%, 94%)');
      colorGeneratorInstance.setColorForID('(program)', 'hsl(0, 0%, 80%)');
      colorGeneratorInstance.setColorForID('(garbage collector)', 'hsl(0, 0%, 80%)');
    }
    return colorGeneratorInstance;
  }

  minimumBoundary(): number {
    throw new Error('Not implemented');
  }

  totalTime(): number {
    throw new Error('Not implemented');
  }

  formatValue(value: number, precision?: number): string {
    return i18n.TimeUtilities.preciseMillisToString(value, precision);
  }

  maxStackDepth(): number {
    return this.maxStackDepthInternal;
  }

  hasTrackConfigurationMode(): boolean {
    return false;
  }

  timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
    return this.timelineDataInternal || this.calculateTimelineData();
  }

  calculateTimelineData(): PerfUI.FlameChart.FlameChartTimelineData {
    throw new Error('Not implemented');
  }

  preparePopoverElement(_entryIndex: number): Element|TemplateResult|null {
    throw new Error('Not implemented');
  }

  canJumpToEntry(entryIndex: number): boolean {
    return this.entryNodes[entryIndex].scriptId !== '0';
  }

  entryTitle(entryIndex: number): string {
    const node = this.entryNodes[entryIndex];
    return UI.UIUtils.beautifyFunctionName(node.functionName);
  }

  entryFont(entryIndex: number): string|null {
    const boldFont = 'bold ' + this.#font;
    return this.entryHasDeoptReason(entryIndex) ? boldFont : this.#font;
  }

  entryHasDeoptReason(_entryIndex: number): boolean {
    throw new Error('Not implemented');
  }

  entryColor(entryIndex: number): string {
    const node = this.entryNodes[entryIndex];
    // For idle and program, we want different 'shades of gray', so we fallback to functionName as scriptId = 0
    // For rest of nodes e.g eval scripts, if url is empty then scriptId will be guaranteed to be non-zero
    return this.#colorGenerator.colorForID(node.url || (node.scriptId !== '0' ? node.scriptId : node.functionName));
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

  entryNodesLength(): number {
    return this.entryNodes.length;
  }
}

export interface ProfileFlameChartViewInput {
  overviewPane: OverviewPane;
  mainPane: PerfUI.FlameChart.FlameChart;
}

export type ProfileFlameChartView = (input: ProfileFlameChartViewInput, output: undefined, target: HTMLElement) => void;

// clang-format off
export const DEFAULT_VIEW: ProfileFlameChartView = (input, _output, target) => {
  render(html`
    <devtools-widget class="cpu-profile-flame-chart-overview-pane">${input.overviewPane.element}</devtools-widget>
    <devtools-widget class="vbox flex-auto">${input.mainPane.element}</devtools-widget>
  `, target, {container: {attributes: {id: 'cpu-flame-chart'}}});
};
// clang-format on

const ProfileFlameChartBase: Common.ObjectWrapper.EventMixin<PerfUI.FlameChart.EventTypes, typeof UI.Widget.VBox> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.VBox,
    );

export class ProfileFlameChart extends ProfileFlameChartBase implements UI.SearchableView.Searchable {
  readonly searchableView: UI.SearchableView.SearchableView;
  readonly overviewPane: OverviewPane;
  readonly mainPane: PerfUI.FlameChart.FlameChart;
  entrySelected: boolean;
  readonly dataProvider: ProfileFlameChartDataProvider;
  searchResults: number[];
  searchResultIndex = -1;
  readonly #view: ProfileFlameChartView;

  constructor(
      searchableView: UI.SearchableView.SearchableView,
      dataProvider: ProfileFlameChartDataProvider,
      element?: HTMLElement,
      view: ProfileFlameChartView = DEFAULT_VIEW,
  ) {
    super(element);
    this.#view = view;

    this.searchableView = searchableView;
    this.overviewPane = new OverviewPane(dataProvider);

    this.mainPane = new PerfUI.FlameChart.FlameChart(dataProvider, this.overviewPane);
    this.mainPane.setBarHeight(15);
    this.mainPane.setTextBaseline(4);
    this.mainPane.setTextPadding(2);
    this.mainPane.addEventListener(PerfUI.FlameChart.Events.ENTRY_SELECTED, this.onEntrySelected, this);
    this.mainPane.addEventListener(PerfUI.FlameChart.Events.ENTRY_INVOKED, this.onEntryInvoked, this);
    this.entrySelected = false;
    this.mainPane.addEventListener(PerfUI.FlameChart.Events.CANVAS_FOCUSED, this.onEntrySelected, this);
    this.overviewPane.addEventListener(OverviewPaneEvents.WINDOW_CHANGED, this.onWindowChanged, this);
    this.dataProvider = dataProvider;
    this.searchResults = [];
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          overviewPane: this.overviewPane,
          mainPane: this.mainPane,
        },
        undefined,
        this.contentElement,
    );
  }

  override focus(): void {
    this.mainPane.focus();
  }

  onWindowChanged(event: Common.EventTarget.EventTargetEvent<OverviewPaneWindowChangedEvent>): void {
    const {windowTimeLeft: windowLeft, windowTimeRight: windowRight} = event.data;
    this.mainPane.setWindowTimes(windowLeft, windowRight, /* animate */ true);
  }

  get range(): {left: number, right: number}|undefined {
    return {
      left: this.overviewPane.windowTimeLeft ?? 0,
      right: this.overviewPane.windowTimeRight ?? 0,
    };
  }

  set range(limits: {left: number, right: number}|undefined) {
    if (!limits) {
      return;
    }
    this.overviewPane.selectRange(limits.left, limits.right);
  }

  onEntrySelected(event: Common.EventTarget.EventTargetEvent<void|number>): void {
    if (event.data) {
      const eventIndex = event.data;
      this.mainPane.setSelectedEntry(eventIndex);
      if (eventIndex === -1) {
        this.entrySelected = false;
      } else {
        this.entrySelected = true;
      }
    } else if (!this.entrySelected) {
      this.mainPane.setSelectedEntry(0);
      this.entrySelected = true;
    }
  }

  onEntryInvoked(event: Common.EventTarget.EventTargetEvent<number>): void {
    this.onEntrySelected(event);
    this.dispatchEventToListeners(PerfUI.FlameChart.Events.ENTRY_INVOKED, event.data);
  }

  update(): void {
    this.overviewPane.update();
    this.mainPane.update();
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, _shouldJump: boolean, jumpBackwards?: boolean): void {
    const matcher =
        Platform.StringUtilities.createPlainTextSearchRegex(searchConfig.query, searchConfig.caseSensitive ? '' : 'i');

    const selectedEntryIndex: number = this.searchResultIndex !== -1 ? this.searchResults[this.searchResultIndex] : -1;
    this.searchResults = [];
    const entriesCount = this.dataProvider.entryNodesLength();
    for (let index = 0; index < entriesCount; ++index) {
      if (this.dataProvider.entryTitle(index).match(matcher)) {
        this.searchResults.push(index);
      }
    }

    if (this.searchResults.length) {
      this.searchResultIndex = this.searchResults.indexOf(selectedEntryIndex);
      if (this.searchResultIndex === -1) {
        this.searchResultIndex = jumpBackwards ? this.searchResults.length - 1 : 0;
      }
      this.mainPane.setSelectedEntry(this.searchResults[this.searchResultIndex]);
    } else {
      this.onSearchCanceled();
    }
    this.searchableView.updateSearchMatchesCount(this.searchResults.length);
    this.searchableView.updateCurrentMatchIndex(this.searchResultIndex);
  }

  onSearchCanceled(): void {
    this.mainPane.setSelectedEntry(-1);
    this.searchResults = [];
    this.searchResultIndex = -1;
  }

  jumpToNextSearchResult(): void {
    this.searchResultIndex = (this.searchResultIndex + 1) % this.searchResults.length;
    this.mainPane.setSelectedEntry(this.searchResults[this.searchResultIndex]);
    this.searchableView.updateCurrentMatchIndex(this.searchResultIndex);
  }

  jumpToPreviousSearchResult(): void {
    this.searchResultIndex = (this.searchResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    this.mainPane.setSelectedEntry(this.searchResults[this.searchResultIndex]);
    this.searchableView.updateCurrentMatchIndex(this.searchResultIndex);
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsWholeWordSearch(): boolean {
    return false;
  }

  supportsRegexSearch(): boolean {
    return false;
  }
}

export class OverviewCalculator implements NetworkTimeCalculator.Calculator {
  readonly formatter: (arg0: number, arg1?: number|undefined) => string;
  minimumBoundaries!: number;
  maximumBoundaries!: number;
  xScaleFactor!: number;
  constructor(formatter: (arg0: number, arg1?: number|undefined) => string) {
    this.formatter = formatter;
  }

  updateBoundaries(overviewPane: OverviewPane): void {
    this.minimumBoundaries = overviewPane.dataProvider.minimumBoundary();
    const totalTime = overviewPane.dataProvider.totalTime();
    this.maximumBoundaries = this.minimumBoundaries + totalTime;
    this.xScaleFactor = overviewPane.overviewContainer.clientWidth / totalTime;
  }

  computePosition(time: number): number {
    return (time - this.minimumBoundaries) * this.xScaleFactor;
  }

  formatValue(value: number, precision?: number): string {
    return this.formatter(value - this.minimumBoundaries, precision);
  }

  maximumBoundary(): number {
    return this.maximumBoundaries;
  }

  minimumBoundary(): number {
    return this.minimumBoundaries;
  }

  zeroTime(): number {
    return this.minimumBoundaries;
  }

  boundarySpan(): number {
    return this.maximumBoundaries - this.minimumBoundaries;
  }
}

export interface OverviewPaneViewInput {
  overviewGridElement: HTMLElement;
}

export interface OverviewPaneViewOutput {
  canvas?: HTMLCanvasElement;
  container?: HTMLElement;
}

export type OverviewPaneView = (input: OverviewPaneViewInput, output: OverviewPaneViewOutput, target: HTMLElement) =>
    void;

// clang-format off
export const DEFAULT_OVERVIEW_PANE_VIEW: OverviewPaneView = (input, output, target) => {
  render(html`
    <div class="cpu-profile-flame-chart-overview-container" ${Directives.ref(el => {
      output.container = el as HTMLElement | undefined;
    })}>
      <canvas class="cpu-profile-flame-chart-overview-canvas" ${Directives.ref(el => {
        output.canvas = el as HTMLCanvasElement | undefined;
      })}></canvas>
      ${input.overviewGridElement}
    </div>
  `, target, {container: {classes: ['cpu-profile-flame-chart-overview-pane']}});
};
// clang-format on

const OverviewPaneBase: Common.ObjectWrapper.EventMixin<OverviewPaneEventTypes, typeof UI.Widget.VBox> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.VBox,
    );

export class OverviewPane extends OverviewPaneBase implements PerfUI.FlameChart.FlameChartDelegate {
  readonly #view: OverviewPaneView;
  readonly #viewOutput: OverviewPaneViewOutput = {};
  readonly overviewCalculator: OverviewCalculator;
  readonly overviewGrid: PerfUI.OverviewGrid.OverviewGrid;
  dataProvider: PerfUI.FlameChart.FlameChartDataProvider;
  windowTimeLeft?: number;
  windowTimeRight?: number;
  updateTimerId?: number;

  constructor(
      dataProvider: PerfUI.FlameChart.FlameChartDataProvider,
      element?: HTMLElement,
      view: OverviewPaneView = DEFAULT_OVERVIEW_PANE_VIEW,
  ) {
    super(element);
    this.#view = view;
    this.overviewCalculator = new OverviewCalculator(dataProvider.formatValue);
    this.overviewGrid = new PerfUI.OverviewGrid.OverviewGrid('cpu-profile-flame-chart', this.overviewCalculator);
    this.overviewGrid.element.classList.add('fill');
    this.dataProvider = dataProvider;
    this.overviewGrid.addEventListener(
        PerfUI.OverviewGrid.Events.WINDOW_CHANGED_WITH_POSITION, this.onWindowChanged, this);
  }

  get overviewContainer(): HTMLElement {
    if (!this.#viewOutput.container) {
      this.performUpdate();
    }
    return this.#viewOutput.container ?? this.contentElement;
  }

  get overviewCanvas(): HTMLCanvasElement|undefined {
    if (!this.#viewOutput.canvas) {
      this.performUpdate();
    }
    return this.#viewOutput.canvas;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          overviewGridElement: this.overviewGrid.element,
        },
        this.#viewOutput,
        this.contentElement,
    );
  }

  windowChanged(windowStartTime: number, windowEndTime: number): void {
    this.selectRange(windowStartTime, windowEndTime);
  }

  updateRangeSelection(_startTime: number, _endTime: number): void {
  }

  updateSelectedGroup(_flameChart: PerfUI.FlameChart.FlameChart, _group: PerfUI.FlameChart.Group|null): void {
  }

  selectRange(timeLeft: number, timeRight: number): void {
    const startTime = this.dataProvider.minimumBoundary();
    const totalTime = this.dataProvider.totalTime();
    this.overviewGrid.setWindowRatio((timeLeft - startTime) / totalTime, (timeRight - startTime) / totalTime);
  }

  onWindowChanged(event: Common.EventTarget.EventTargetEvent<PerfUI.OverviewGrid.WindowChangedWithPositionEvent>):
      void {
    const windowPosition = {windowTimeLeft: event.data.rawStartValue, windowTimeRight: event.data.rawEndValue};
    this.windowTimeLeft = windowPosition.windowTimeLeft;
    this.windowTimeRight = windowPosition.windowTimeRight;

    this.dispatchEventToListeners(OverviewPaneEvents.WINDOW_CHANGED, windowPosition);
  }

  timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
    return this.dataProvider.timelineData();
  }

  override onResize(): void {
    this.scheduleUpdate();
  }

  scheduleUpdate(): void {
    if (this.updateTimerId) {
      return;
    }
    this.updateTimerId = this.element.window().requestAnimationFrame(this.update.bind(this));
  }

  update(): void {
    this.updateTimerId = 0;
    const timelineData = this.timelineData();
    if (!timelineData || !this.overviewCanvas) {
      return;
    }
    this.resetCanvas(
        this.overviewContainer.clientWidth, this.overviewContainer.clientHeight - PerfUI.FlameChart.RulerHeight);
    this.overviewCalculator.updateBoundaries(this);
    this.overviewGrid.updateDividers(this.overviewCalculator);
    this.drawOverviewCanvas();
  }

  drawOverviewCanvas(): void {
    if (!this.overviewCanvas) {
      return;
    }
    const canvasWidth = this.overviewCanvas.width;
    const canvasHeight = this.overviewCanvas.height;
    const drawData = this.calculateDrawData(canvasWidth);
    const context = this.overviewCanvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    const ratio = window.devicePixelRatio;
    const offsetFromBottom = ratio;
    const lineWidth = 1;
    const yScaleFactor = canvasHeight / (this.dataProvider.maxStackDepth() * 1.1);
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

  calculateDrawData(width: number): Uint8Array {
    const dataProvider = this.dataProvider;
    const timelineData = (this.timelineData() as PerfUI.FlameChart.FlameChartTimelineData);
    const entryStartTimes = timelineData.entryStartTimes;
    const entryTotalTimes = timelineData.entryTotalTimes;
    const entryLevels = timelineData.entryLevels;
    const length = entryStartTimes.length;
    const minimumBoundary = this.dataProvider.minimumBoundary();

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

  resetCanvas(width: number, height: number): void {
    if (!this.overviewCanvas) {
      return;
    }
    const ratio = window.devicePixelRatio;
    this.overviewCanvas.width = width * ratio;
    this.overviewCanvas.height = height * ratio;
    this.overviewCanvas.style.width = width + 'px';
    this.overviewCanvas.style.height = height + 'px';
  }
}

export const enum OverviewPaneEvents {
  WINDOW_CHANGED = 'WindowChanged',
}

export interface OverviewPaneWindowChangedEvent {
  windowTimeLeft: number;
  windowTimeRight: number;
}

export interface OverviewPaneEventTypes {
  [OverviewPaneEvents.WINDOW_CHANGED]: OverviewPaneWindowChangedEvent;
}
