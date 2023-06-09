// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';

import timelineFlamechartPopoverStyles from './timelineFlamechartPopover.css.js';

import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import type * as TraceEngine from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import * as Protocol from '../../generated/protocol.js';

import {type PerformanceModel} from './PerformanceModel.js';
import {FlameChartStyle, Selection} from './TimelineFlameChartView.js';

import {TimelineSelection} from './TimelineSelection.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';

const UIStrings = {
  /**
   *@description Title of the Network tool
   */
  network: 'Network',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineFlameChartNetworkDataProvider.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineFlameChartNetworkDataProvider implements PerfUI.FlameChart.FlameChartDataProvider {
  readonly #font: string;
  readonly #style: {
    padding: number,
    height: number,
    collapsible: boolean,
    color: string,
    font: string,
    backgroundColor: string,
    nestingLevel: number,
    useFirstLineForOverview: boolean,
    useDecoratorsForOverview: boolean,
    shareHeaderLine: boolean,
  };
  #group: PerfUI.FlameChart.Group;
  #minimumBoundaryInternal: number;
  #maximumBoundary: number;
  #timeSpan: number;
  #requests: TimelineModel.TimelineModel.NetworkRequest[];
  #maxLevel: number;
  #legacyTimelineModel?: TimelineModel.TimelineModel.TimelineModelImpl|null;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #timelineDataInternal?: any;
  #startTime?: number;
  #endTime?: number;
  #lastSelection?: Selection;
  #priorityToValue?: Map<string, number>;
  // Ignored during the migration to new trace data engine.
  /* eslint-disable-next-line no-unused-private-class-members */
  #traceEngineData: TraceEngine.TraceModel.PartialTraceParseDataDuringMigration|null;
  constructor() {
    this.#font = `${PerfUI.Font.DEFAULT_FONT_SIZE} ${PerfUI.Font.getFontFamilyForCanvas()}`;
    this.#style = {
      padding: 4,
      height: 17,
      collapsible: true,
      color: ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary'),
      font: this.#font,
      backgroundColor: ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background'),
      nestingLevel: 0,
      useFirstLineForOverview: false,
      useDecoratorsForOverview: true,
      shareHeaderLine: false,
    };
    this.#group =
        ({startLevel: 0, name: i18nString(UIStrings.network), expanded: false, style: this.#style} as
         PerfUI.FlameChart.Group);
    this.#minimumBoundaryInternal = 0;
    this.#maximumBoundary = 0;
    this.#timeSpan = 0;
    this.#requests = [];
    this.#maxLevel = 0;

    this.#legacyTimelineModel = null;
    this.#traceEngineData = null;

    // In the event of a theme change, these colors must be recalculated.
    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      this.#style.color = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-text-primary');
      this.#style.backgroundColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background');
    });
  }

  setModel(
      performanceModel: PerformanceModel|null,
      traceEngineData: TraceEngine.TraceModel.PartialTraceParseDataDuringMigration|null): void {
    this.#timelineDataInternal = null;

    this.#legacyTimelineModel = performanceModel && performanceModel.timelineModel();
    this.#traceEngineData = traceEngineData;
  }

  isEmpty(): boolean {
    this.timelineData();
    return !this.#requests.length;
  }

  maxStackDepth(): number {
    return this.#maxLevel;
  }

  timelineData(): PerfUI.FlameChart.FlameChartTimelineData {
    if (this.#timelineDataInternal) {
      return this.#timelineDataInternal;
    }
    this.#requests = [];
    this.#timelineDataInternal = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    if (this.#legacyTimelineModel) {
      this.#appendTimelineData();
    }
    return this.#timelineDataInternal;
  }

  minimumBoundary(): number {
    return this.#minimumBoundaryInternal;
  }

  totalTime(): number {
    return this.#timeSpan;
  }

  setWindowTimes(startTime: number, endTime: number): void {
    this.#startTime = startTime;
    this.#endTime = endTime;
    this.#updateTimelineData();
  }

  createSelection(index: number): TimelineSelection|null {
    if (index === -1) {
      return null;
    }
    const request = this.#requests[index];
    this.#lastSelection = new Selection(TimelineSelection.fromNetworkRequest(request), index);
    return this.#lastSelection.timelineSelection;
  }

  entryIndexForSelection(selection: TimelineSelection|null): number {
    if (!selection) {
      return -1;
    }

    if (this.#lastSelection && this.#lastSelection.timelineSelection.object === selection.object) {
      return this.#lastSelection.entryIndex;
    }

    if (!TimelineSelection.isNetworkRequestSelection(selection.object)) {
      return -1;
    }
    const index = this.#requests.indexOf(selection.object);
    if (index !== -1) {
      this.#lastSelection = new Selection(TimelineSelection.fromNetworkRequest(selection.object), index);
    }
    return index;
  }

  entryColor(index: number): string {
    const request = (this.#requests[index] as TimelineModel.TimelineModel.NetworkRequest);
    const category = TimelineUIUtils.networkRequestCategory(request);
    return TimelineUIUtils.networkCategoryColor(category);
  }

  textColor(_index: number): string {
    return FlameChartStyle.textColor;
  }

  entryTitle(index: number): string|null {
    const request = (this.#requests[index] as TimelineModel.TimelineModel.NetworkRequest);
    const parsedURL = new Common.ParsedURL.ParsedURL(request.url || '');
    return parsedURL.isValid ? `${parsedURL.displayName} (${parsedURL.host})` : request.url || null;
  }

  entryFont(_index: number): string|null {
    return this.#font;
  }

  decorateEntry(
      index: number, context: CanvasRenderingContext2D, text: string|null, barX: number, barY: number, barWidth: number,
      barHeight: number, unclippedBarX: number, timeToPixelRatio: number): boolean {
    const request = (this.#requests[index] as TimelineModel.TimelineModel.NetworkRequest);
    if (!request.timing) {
      return false;
    }

    const beginTime = request.beginTime();
    const timeToPixel = (time: number): number => Math.floor(unclippedBarX + (time - beginTime) * timeToPixelRatio);
    const minBarWidthPx = 2;
    const startTime = request.getStartTime();
    const endTime = request.endTime;
    const {sendStartTime, headersEndTime} = request.getSendReceiveTiming();
    const sendStart = Math.max(timeToPixel(sendStartTime), unclippedBarX);
    const headersEnd = Math.max(timeToPixel(headersEndTime), sendStart);
    const finish = Math.max(timeToPixel(request.finishTime || endTime), headersEnd + minBarWidthPx);
    const start = timeToPixel(startTime);
    const end = Math.max(timeToPixel(endTime), finish);

    // Draw waiting time.
    context.fillStyle = 'hsla(0, 100%, 100%, 0.8)';
    context.fillRect(sendStart + 0.5, barY + 0.5, headersEnd - sendStart - 0.5, barHeight - 2);
    // Clear portions of initial rect to prepare for the ticks.
    context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background');
    context.fillRect(barX, barY - 0.5, sendStart - barX, barHeight);
    context.fillRect(finish, barY - 0.5, barX + barWidth - finish, barHeight);

    // Draws left and right whiskers
    function drawTick(begin: number, end: number, y: number): void {
      const /** @const */ tickHeightPx = 6;
      context.moveTo(begin, y - tickHeightPx / 2);
      context.lineTo(begin, y + tickHeightPx / 2);
      context.moveTo(begin, y);
      context.lineTo(end, y);
    }

    context.beginPath();
    context.lineWidth = 1;
    context.strokeStyle = '#ccc';
    const lineY = Math.floor(barY + barHeight / 2) + 0.5;
    const leftTick = start + 0.5;
    const rightTick = end - 0.5;
    drawTick(leftTick, sendStart, lineY);
    drawTick(rightTick, finish, lineY);
    context.stroke();

    if (typeof request.priority === 'string') {
      const color = this.#colorForPriority(request.priority);
      if (color) {
        context.fillStyle = color;
        context.fillRect(sendStart + 0.5, barY + 0.5, 3.5, 3.5);
      }
    }

    // Draw request URL as text
    const textStart = Math.max(sendStart, 0);
    const textWidth = finish - textStart;
    const /** @const */ minTextWidthPx = 20;
    if (textWidth >= minTextWidthPx) {
      text = this.entryTitle(index) || '';
      if (request.fromServiceWorker) {
        text = '⚙ ' + text;
      }
      if (text) {
        const /** @const */ textPadding = 4;
        const /** @const */ textBaseline = 5;
        const textBaseHeight = barHeight - textBaseline;
        const trimmedText = UI.UIUtils.trimTextEnd(context, text, textWidth - 2 * textPadding);
        context.fillStyle = '#333';
        context.fillText(trimmedText, textStart + textPadding, barY + textBaseHeight);
      }
    }

    return true;
  }

  forceDecoration(_index: number): boolean {
    return true;
  }

  prepareHighlightedEntryInfo(index: number): Element|null {
    const /** @const */ maxURLChars = 80;
    const request = (this.#requests[index] as TimelineModel.TimelineModel.NetworkRequest);
    if (!request.url) {
      return null;
    }
    const element = document.createElement('div');
    const root = UI.Utils.createShadowRootWithCoreStyles(element, {
      cssFile: [timelineFlamechartPopoverStyles],
      delegatesFocus: undefined,
    });
    const contents = root.createChild('div', 'timeline-flamechart-popover');
    const startTime = request.getStartTime();
    const duration = request.endTime - startTime;
    if (startTime && isFinite(duration)) {
      contents.createChild('span', 'timeline-info-network-time').textContent =
          i18n.TimeUtilities.millisToString(duration, true);
    }
    if (typeof request.priority === 'string') {
      const div = (contents.createChild('span') as HTMLElement);
      div.textContent =
          PerfUI.NetworkPriorities.uiLabelForNetworkPriority((request.priority as Protocol.Network.ResourcePriority));
      div.style.color = this.#colorForPriority(request.priority) || 'black';
    }
    contents.createChild('span').textContent = Platform.StringUtilities.trimMiddle(request.url, maxURLChars);
    return element;
  }

  #colorForPriority(priority: string): string|null {
    if (!this.#priorityToValue) {
      this.#priorityToValue = new Map([
        [Protocol.Network.ResourcePriority.VeryLow, 1],
        [Protocol.Network.ResourcePriority.Low, 2],
        [Protocol.Network.ResourcePriority.Medium, 3],
        [Protocol.Network.ResourcePriority.High, 4],
        [Protocol.Network.ResourcePriority.VeryHigh, 5],
      ]);
    }
    const value = this.#priorityToValue.get(priority);
    return value ? `hsla(214, 80%, 50%, ${value / 5})` : null;
  }

  #appendTimelineData(): void {
    if (this.#legacyTimelineModel) {
      this.#minimumBoundaryInternal = this.#legacyTimelineModel.minimumRecordTime();
      this.#maximumBoundary = this.#legacyTimelineModel.maximumRecordTime();
      this.#timeSpan =
          this.#legacyTimelineModel.isEmpty() ? 1000 : this.#maximumBoundary - this.#minimumBoundaryInternal;
      this.#legacyTimelineModel.networkRequests().forEach(this.#appendEntry.bind(this));
      this.#updateTimelineData();
    }
  }

  #updateTimelineData(): void {
    if (!this.#timelineDataInternal) {
      return;
    }
    const lastTimeByLevel = [];
    let maxLevel = 0;
    for (let i = 0; i < this.#requests.length; ++i) {
      const r = this.#requests[i];
      const beginTime = r.beginTime();
      const startTime = (this.#startTime as number);
      const endTime = (this.#endTime as number);
      const visible = beginTime < endTime && r.endTime > startTime;
      if (!visible) {
        this.#timelineDataInternal.entryLevels[i] = -1;
        continue;
      }
      while (lastTimeByLevel.length && lastTimeByLevel[lastTimeByLevel.length - 1] <= beginTime) {
        lastTimeByLevel.pop();
      }
      this.#timelineDataInternal.entryLevels[i] = lastTimeByLevel.length;
      lastTimeByLevel.push(r.endTime);
      maxLevel = Math.max(maxLevel, lastTimeByLevel.length);
    }
    for (let i = 0; i < this.#requests.length; ++i) {
      if (this.#timelineDataInternal.entryLevels[i] === -1) {
        this.#timelineDataInternal.entryLevels[i] = maxLevel;
      }
    }
    this.#timelineDataInternal = PerfUI.FlameChart.FlameChartTimelineData.create({
      entryLevels: this.#timelineDataInternal.entryLevels,
      entryTotalTimes: this.#timelineDataInternal.entryTotalTimes,
      entryStartTimes: this.#timelineDataInternal.entryStartTimes,
      groups: [this.#group],
    });
    this.#maxLevel = maxLevel;
  }

  #appendEntry(request: TimelineModel.TimelineModel.NetworkRequest): void {
    this.#requests.push(request);
    this.#timelineDataInternal.entryStartTimes.push(request.beginTime());
    this.#timelineDataInternal.entryTotalTimes.push(request.endTime - request.beginTime());
    this.#timelineDataInternal.entryLevels.push(this.#requests.length - 1);
  }

  preferredHeight(): number {
    return this.#style.height * (this.#group.expanded ? Platform.NumberUtilities.clamp(this.#maxLevel + 1, 4, 8.5) : 1);
  }

  isExpanded(): boolean {
    return this.#group && Boolean(this.#group.expanded);
  }

  formatValue(value: number, precision?: number): string {
    return i18n.TimeUtilities.preciseMillisToString(value, precision);
  }

  canJumpToEntry(_entryIndex: number): boolean {
    return false;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navStartTimes(): Map<any, any> {
    if (!this.#legacyTimelineModel) {
      return new Map();
    }

    return this.#legacyTimelineModel.navStartTimes();
  }
}
