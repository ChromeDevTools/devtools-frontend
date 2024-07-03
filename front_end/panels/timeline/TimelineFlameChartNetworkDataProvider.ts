// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {NetworkTrackAppender, type NetworkTrackEvent} from './NetworkTrackAppender.js';
import timelineFlamechartPopoverStyles from './timelineFlamechartPopover.css.js';
import {FlameChartStyle, Selection} from './TimelineFlameChartView.js';
import {TimelineSelection} from './TimelineSelection.js';

export class TimelineFlameChartNetworkDataProvider implements PerfUI.FlameChart.FlameChartDataProvider {
  #minimumBoundaryInternal: number;
  #timeSpan: number;
  #events: NetworkTrackEvent[];
  #maxLevel: number;
  #networkTrackAppender: NetworkTrackAppender|null;

  #timelineDataInternal?: PerfUI.FlameChart.FlameChartTimelineData|null;
  #lastSelection?: Selection;
  #traceEngineData: TraceEngine.Handlers.Types.TraceParseData|null;
  #eventIndexByEvent: Map<NetworkTrackEvent, number|null> = new Map();
  #visualElementsParent: VisualLogging.Loggable|null = null;

  constructor() {
    this.#minimumBoundaryInternal = 0;
    this.#timeSpan = 0;
    this.#events = [];
    this.#maxLevel = 0;

    this.#networkTrackAppender = null;
    this.#traceEngineData = null;
  }

  setModel(traceEngineData: TraceEngine.Handlers.Types.TraceParseData|null): void {
    this.#timelineDataInternal = null;
    this.#traceEngineData = traceEngineData;
    this.#eventIndexByEvent.clear();

    if (this.#traceEngineData) {
      this.setEvents(this.#traceEngineData);
      this.#setTimingBoundsData(this.#traceEngineData);
    }
  }

  setVisualElementLoggingParent(parent: VisualLogging.Loggable|null): void {
    this.#visualElementsParent = parent;
  }

  setEvents(traceEngineData: TraceEngine.Handlers.Types.TraceParseData): void {
    if (traceEngineData.NetworkRequests.webSocket) {
      traceEngineData.NetworkRequests.webSocket.forEach(webSocketData => {
        if (webSocketData.syntheticConnectionEvent) {
          this.#events.push(webSocketData.syntheticConnectionEvent);
        }
        this.#events.push(...webSocketData.events);
      });
    }
    if (traceEngineData.NetworkRequests.byTime) {
      this.#events.push(...traceEngineData.NetworkRequests.byTime);
    }
  }

  isEmpty(): boolean {
    this.timelineData();
    return !this.#events.length;
  }

  maxStackDepth(): number {
    return this.#maxLevel;
  }

  hasTrackConfigurationMode(): boolean {
    return false;
  }

  timelineData(): PerfUI.FlameChart.FlameChartTimelineData {
    if (this.#timelineDataInternal && this.#timelineDataInternal.entryLevels.length !== 0) {
      // The flame chart data is built already, so return the cached data.
      return this.#timelineDataInternal;
    }

    this.#timelineDataInternal = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    if (!this.#traceEngineData) {
      return this.#timelineDataInternal;
    }

    if (!this.#events.length) {
      this.setEvents(this.#traceEngineData);
    }
    this.#networkTrackAppender = new NetworkTrackAppender(this.#timelineDataInternal, this.#events);
    this.#maxLevel = this.#networkTrackAppender.appendTrackAtLevel(0);

    for (const group of this.#timelineDataInternal.groups) {
      if (group.jslogContext) {
        VisualLogging.registerLoggable(
            group, `${VisualLogging.section().context(group.jslogContext)}`, this.#visualElementsParent);
      }
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
    this.#updateTimelineData(startTime, endTime);
  }

  createSelection(index: number): TimelineSelection|null {
    if (index === -1) {
      return null;
    }
    const event = this.#events[index];
    this.#lastSelection = new Selection(TimelineSelection.fromTraceEvent(event), index);
    return this.#lastSelection.timelineSelection;
  }

  indexForEvent(event: TraceEngine.Types.TraceEvents.TraceEventData|
                TraceEngine.Handlers.ModelHandlers.Frames.TimelineFrame): number|null {
    // In the NetworkDataProvider we will never be dealing with frames, but we need to satisfy the interface for a DataProvider.
    if (event instanceof TraceEngine.Handlers.ModelHandlers.Frames.TimelineFrame) {
      return null;
    }
    if (!TraceEngine.Types.TraceEvents.isNetworkTrackEntry(event)) {
      return null;
    }
    const fromCache = this.#eventIndexByEvent.get(event);
    // Cached value might be null, which is OK.
    if (fromCache !== undefined) {
      return fromCache;
    }
    const index = this.#events.indexOf(event);
    const result = index > -1 ? index : null;
    this.#eventIndexByEvent.set(event, result);
    return result;
  }

  eventByIndex(entryIndex: number): TraceEngine.Types.TraceEvents.SyntheticNetworkRequest
      |TraceEngine.Types.TraceEvents.WebSocketEvent|null {
    return this.#events.at(entryIndex) ?? null;
  }

  entryIndexForSelection(selection: TimelineSelection|null): number {
    if (!selection) {
      return -1;
    }

    if (this.#lastSelection && this.#lastSelection.timelineSelection.object === selection.object) {
      return this.#lastSelection.entryIndex;
    }

    if (!TimelineSelection.isNetworkEventSelection(selection.object)) {
      return -1;
    }

    const index = this.#events.indexOf(selection.object);
    if (index !== -1) {
      this.#lastSelection = new Selection(TimelineSelection.fromTraceEvent(selection.object), index);
    }
    return index;
  }

  entryColor(index: number): string {
    if (!this.#networkTrackAppender) {
      throw new Error('networkTrackAppender should not be empty');
    }
    return this.#networkTrackAppender.colorForEvent(this.#events[index]);
  }

  textColor(_index: number): string {
    return FlameChartStyle.textColor;
  }

  entryTitle(index: number): string|null {
    const event = this.#events[index];
    if (TraceEngine.Types.TraceEvents.isWebSocketTraceEvent(event) ||
        TraceEngine.Types.TraceEvents.isSyntheticWebSocketConnectionEvent(event)) {
      return this.#networkTrackAppender?.titleForWebSocketEvent(event) || '';
    }
    const parsedURL = new Common.ParsedURL.ParsedURL(event.args.data.url);
    return parsedURL.isValid ? `${parsedURL.displayName} (${parsedURL.host})` : event.args.data.url || null;
  }

  entryFont(_index: number): string|null {
    return this.#networkTrackAppender?.font() || null;
  }

  /**
   * Returns the pixels needed to decorate the event.
   * The pixels compare to the start of the earliest event of the request.
   *
   * Request.beginTime(), which is used in FlameChart to calculate the unclippedBarX
   * v
   *    |----------------[ (URL text)    waiting time   |   request  ]--------|
   *    ^start           ^sendStart                     ^headersEnd  ^Finish  ^end
   * @param request
   * @param unclippedBarX The start pixel of the request. It is calculated with request.beginTime() in FlameChart.
   * @param timeToPixelRatio
   * @returns the pixels to draw waiting time and left and right whiskers and url text
   */
  getDecorationPixels(
      event: TraceEngine.Types.TraceEvents.SyntheticNetworkRequest, unclippedBarX: number,
      timeToPixelRatio: number): {sendStart: number, headersEnd: number, finish: number, start: number, end: number} {
    const beginTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const timeToPixel = (time: number): number => Math.floor(unclippedBarX + (time - beginTime) * timeToPixelRatio);
    const minBarWidthPx = 2;
    const startTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const endTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(
        (event.ts + event.dur) as TraceEngine.Types.Timing.MicroSeconds);
    const sendStartTime =
        TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.args.data.syntheticData.sendStartTime);
    const headersEndTime =
        TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.args.data.syntheticData.downloadStart);
    const sendStart = Math.max(timeToPixel(sendStartTime), unclippedBarX);
    const headersEnd = Math.max(timeToPixel(headersEndTime), sendStart);
    const finish = Math.max(
        timeToPixel(TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.args.data.syntheticData.finishTime)),
        headersEnd + minBarWidthPx);
    const start = timeToPixel(startTime);
    const end = Math.max(timeToPixel(endTime), finish);

    return {sendStart, headersEnd, finish, start, end};
  }

  /**
   * Decorates the entry depends on the type of the event:
   * @param index
   * @param context
   * @param barX The x pixel of the visible part request
   * @param barY The y pixel of the visible part request
   * @param barWidth The width of the visible part request
   * @param barHeight The height of the visible part request
   * @param unclippedBarX The start pixel of the request compare to the visible area. It is calculated with request.beginTime() in FlameChart.
   * @param timeToPixelRatio
   * @returns if the entry needs to be decorate, which is alway true if the request has "timing" field
   */
  decorateEntry(
      index: number, context: CanvasRenderingContext2D, _text: string|null, barX: number, barY: number,
      barWidth: number, barHeight: number, unclippedBarX: number, timeToPixelRatio: number): boolean {
    const event = this.#events[index];
    if (TraceEngine.Types.TraceEvents.isSyntheticWebSocketConnectionEvent(event)) {
      return this.#decorateSyntheticWebSocketConnectionEvent(
          index, context, barY, barHeight, unclippedBarX, timeToPixelRatio);
    }
    if (!TraceEngine.Types.TraceEvents.isSyntheticNetworkRequestEvent(event)) {
      return false;
    }
    return this.#decorateNetworkRequest(
        index, context, _text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixelRatio);
  }

  /**
   * Decorates the Network Request entry with the following steps:
   *   Draw a waiting time between |sendStart| and |headersEnd|
   *     By adding a extra transparent white layer
   *   Draw a whisk between |start| and |sendStart|
   *   Draw a whisk between |finish| and |end|
   *     By draw another layer of background color to "clear" the area
   *     Then draw the whisk
   *   Draw the URL after the |sendStart|
   *
   *   |----------------[ (URL text)    waiting time   |   request  ]--------|
   *   ^start           ^sendStart                     ^headersEnd  ^Finish  ^end
   * */
  #decorateNetworkRequest(
      index: number, context: CanvasRenderingContext2D, _text: string|null, barX: number, barY: number,
      barWidth: number, barHeight: number, unclippedBarX: number, timeToPixelRatio: number): boolean {
    const event = this.#events[index] as TraceEngine.Types.TraceEvents.SyntheticNetworkRequest;
    const {sendStart, headersEnd, finish, start, end} =
        this.getDecorationPixels(event, unclippedBarX, timeToPixelRatio);

    // Draw waiting time.
    context.fillStyle = 'hsla(0, 100%, 100%, 0.8)';
    context.fillRect(sendStart + 0.5, barY + 0.5, headersEnd - sendStart - 0.5, barHeight - 2);
    // Clear portions of initial rect to prepare for the ticks.
    context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-cdt-base-container');
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

    const color = this.#colorForPriority(event.args.data.priority);
    if (color) {
      context.fillStyle = color;
      context.fillRect(sendStart + 0.5, barY + 0.5, 3.5, 3.5);
    }

    // Draw request URL as text
    const textStart = Math.max(sendStart, 0);
    const textWidth = finish - textStart;
    const /** @const */ minTextWidthPx = 20;
    if (textWidth >= minTextWidthPx) {
      let title = this.entryTitle(index) || '';
      if (event.args.data.fromServiceWorker) {
        title = '⚙ ' + title;
      }
      if (title) {
        const /** @const */ textPadding = 4;
        const /** @const */ textBaseline = 5;
        const textBaseHeight = barHeight - textBaseline;
        const trimmedText = UI.UIUtils.trimTextEnd(context, title, textWidth - 2 * textPadding);
        context.fillStyle = '#333';
        context.fillText(trimmedText, textStart + textPadding, barY + textBaseHeight);
      }
    }

    return true;
  }

  /**
   * Decorates the synthetic websocket event entry with a whisk from the start to the end.
   *   ------------------------
   *   ^start                 ^end
   * */
  #decorateSyntheticWebSocketConnectionEvent(
      index: number, context: CanvasRenderingContext2D, barY: number, barHeight: number, unclippedBarX: number,
      timeToPixelRatio: number): boolean {
    context.save();
    const event = this.#events[index] as TraceEngine.Types.TraceEvents.SyntheticWebSocketConnectionEvent;
    const beginTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const timeToPixel = (time: number): number => Math.floor(unclippedBarX + (time - beginTime) * timeToPixelRatio);
    const endTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(
        (event.ts + event.dur) as TraceEngine.Types.Timing.MicroSeconds);
    const start = timeToPixel(beginTime) + 0.5;
    const end = timeToPixel(endTime) - 0.5;
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue('--app-color-rendering');

    const lineY = Math.floor(barY + barHeight / 2) + 0.5;
    context.setLineDash([3, 2]);
    context.moveTo(start, lineY - 1);
    context.lineTo(end, lineY - 1);
    context.moveTo(start, lineY + 1);
    context.lineTo(end, lineY + 1);
    context.stroke();
    context.restore();
    return true;
  }

  forceDecoration(_index: number): boolean {
    return true;
  }

  /**
   *In the FlameChart.ts, when filtering through the events for a level, it starts
   * from the last event of that level and stops when it hit an event that has start
   * time greater than the filtering window.
   * For example, in this websocket level we have A(socket event), B, C, D. If C
   * event has start time greater than the window, the rest of the events (A and B)
   * wont be drawn. So if this level is the force Drawable level, we wont stop at
   * event C and will include the socket event A.
   * */
  forceDrawableLevel(levelIndex: number): boolean {
    return this.#networkTrackAppender?.webSocketIdToLevel.has(levelIndex) || false;
  }

  prepareHighlightedEntryInfo(index: number): Element|null {
    const /** @const */ maxURLChars = 80;
    const event = this.#events[index];
    if (TraceEngine.Types.TraceEvents.isSyntheticWebSocketConnectionEvent(event)) {
      return null;
    }
    const element = document.createElement('div');
    const root = UI.UIUtils.createShadowRootWithCoreStyles(element, {
      cssFile: [timelineFlamechartPopoverStyles],
      delegatesFocus: undefined,
    });
    const contents = root.createChild('div', 'timeline-flamechart-popover');
    const startTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const duration = event.dur ? TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.dur) : 0;
    if (startTime && isFinite(duration)) {
      contents.createChild('span', 'timeline-info-network-time').textContent =
          i18n.TimeUtilities.millisToString(duration, true);
    }
    const div = (contents.createChild('span') as HTMLElement);
    const priority = TraceEngine.Types.TraceEvents.isWebSocketTraceEvent(event) ?
        Protocol.Network.ResourcePriority.Low :
        event.args.data.priority;
    div.style.color = this.#colorForPriority(priority) || 'black';
    if (TraceEngine.Types.TraceEvents.isWebSocketTraceEvent(event)) {
      const title = this.#networkTrackAppender?.titleForWebSocketEvent(event) || '';
      contents.createChild('span').textContent = Platform.StringUtilities.trimMiddle(title, maxURLChars);
    } else {
      div.textContent = PerfUI.NetworkPriorities.uiLabelForNetworkPriority(priority);
      contents.createChild('span').textContent = Platform.StringUtilities.trimMiddle(event.args.data.url, maxURLChars);
    }

    return element;
  }

  #colorForPriority(priority: Protocol.Network.ResourcePriority): string|null {
    const value = PerfUI.NetworkPriorities.networkPriorityWeight(priority);
    return value ? `hsla(214, 80%, 50%, ${value / 5})` : null;
  }

  /**
   * Sets the minimum time and total time span of a trace using the
   * new engine data.
   */
  #setTimingBoundsData(newTraceEngineData: TraceEngine.Handlers.Types.TraceParseData): void {
    const {traceBounds} = newTraceEngineData.Meta;
    const minTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceBounds.min);
    const maxTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(traceBounds.max);
    this.#minimumBoundaryInternal = minTime;
    this.#timeSpan = minTime === maxTime ? 1000 : maxTime - this.#minimumBoundaryInternal;
  }

  /**
   * When users zoom in the flamechart, we only want to show them the network
   * requests between startTime and endTime. This function will call the
   * trackAppender to update the timeline data, and then force to create a new
   * PerfUI.FlameChart.FlameChartTimelineData instance to force the flamechart
   * to re-render.
   */
  #updateTimelineData(startTime: number, endTime: number): void {
    if (!this.#networkTrackAppender || !this.#timelineDataInternal) {
      return;
    }
    this.#maxLevel = this.#networkTrackAppender.filterTimelineDataBetweenTimes(
        this.#events, TraceEngine.Types.Timing.MilliSeconds(startTime), TraceEngine.Types.Timing.MilliSeconds(endTime));

    // TODO(crbug.com/1459225): Remove this recreating code.
    // Force to create a new PerfUI.FlameChart.FlameChartTimelineData instance
    // to force the flamechart to re-render. This also causes crbug.com/1459225.
    this.#timelineDataInternal = PerfUI.FlameChart.FlameChartTimelineData.create({
      entryLevels: this.#timelineDataInternal?.entryLevels,
      entryTotalTimes: this.#timelineDataInternal?.entryTotalTimes,
      entryStartTimes: this.#timelineDataInternal?.entryStartTimes,
      groups: this.#timelineDataInternal?.groups,
    });
  }

  preferredHeight(): number {
    if (!this.#networkTrackAppender || this.#maxLevel === 0) {
      return 0;
    }
    const group = this.#networkTrackAppender.group();
    if (!group) {
      return 0;
    }
    return group.style.height * (this.isExpanded() ? Platform.NumberUtilities.clamp(this.#maxLevel + 1, 4, 8.5) : 1);
  }

  isExpanded(): boolean {
    return Boolean(this.#networkTrackAppender?.group()?.expanded);
  }

  formatValue(value: number, precision?: number): string {
    return i18n.TimeUtilities.preciseMillisToString(value, precision);
  }

  canJumpToEntry(_entryIndex: number): boolean {
    return false;
  }

  /**
   * Returns a map of navigations that happened in the main frame, ignoring any
   * that happened in other frames.
   * The map's key is the frame ID.
   **/
  mainFrameNavigationStartEvents(): readonly TraceEngine.Types.TraceEvents.TraceEventNavigationStart[] {
    if (!this.#traceEngineData) {
      return [];
    }
    return this.#traceEngineData.Meta.mainFrameNavigations;
  }
}
