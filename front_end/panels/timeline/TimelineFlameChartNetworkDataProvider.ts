// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import * as TimelineComponents from './components/components.js';
import {initiatorsDataToDrawForNetwork} from './Initiators.js';
import {NetworkTrackAppender, type NetworkTrackEvent} from './NetworkTrackAppender.js';
import timelineFlamechartPopoverStyles from './timelineFlamechartPopover.css.js';
import {FlameChartStyle, Selection} from './TimelineFlameChartView.js';
import {TimelineSelection} from './TimelineSelection.js';
import * as TimelineUtils from './utils/utils.js';

export class TimelineFlameChartNetworkDataProvider implements PerfUI.FlameChart.FlameChartDataProvider {
  #minimumBoundaryInternal: number;
  #timeSpan: number;
  #events: NetworkTrackEvent[];
  #maxLevel: number;
  #networkTrackAppender: NetworkTrackAppender|null;

  #timelineDataInternal?: PerfUI.FlameChart.FlameChartTimelineData|null;
  #lastSelection?: Selection;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null;
  #eventIndexByEvent: Map<NetworkTrackEvent, number|null> = new Map();
  // -1 means no entry is selected.
  #lastInitiatorEntry: number = -1;
  #lastInitiatorsData: PerfUI.FlameChart.FlameChartInitiatorData[] = [];

  constructor() {
    this.#minimumBoundaryInternal = 0;
    this.#timeSpan = 0;
    this.#events = [];
    this.#maxLevel = 0;

    this.#networkTrackAppender = null;
    this.#parsedTrace = null;
  }

  setModel(parsedTrace: Trace.Handlers.Types.ParsedTrace|null): void {
    this.#timelineDataInternal = null;
    this.#events = [];
    this.#parsedTrace = parsedTrace;
    this.#eventIndexByEvent.clear();

    if (this.#parsedTrace) {
      this.setEvents(this.#parsedTrace);
      this.#setTimingBoundsData(this.#parsedTrace);
    }
  }

  setEvents(parsedTrace: Trace.Handlers.Types.ParsedTrace): void {
    if (parsedTrace.NetworkRequests.webSocket) {
      parsedTrace.NetworkRequests.webSocket.forEach(webSocketData => {
        if (webSocketData.syntheticConnection) {
          this.#events.push(webSocketData.syntheticConnection);
        }
        this.#events.push(...webSocketData.events);
      });
    }
    if (parsedTrace.NetworkRequests.byTime) {
      this.#events.push(...parsedTrace.NetworkRequests.byTime);
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
    if (!this.#parsedTrace) {
      return this.#timelineDataInternal;
    }

    if (!this.#events.length) {
      this.setEvents(this.#parsedTrace);
    }
    this.#networkTrackAppender = new NetworkTrackAppender(this.#timelineDataInternal, this.#events);
    this.#maxLevel = this.#networkTrackAppender.appendTrackAtLevel(0);

    return this.#timelineDataInternal;
  }

  minimumBoundary(): number {
    return this.#minimumBoundaryInternal;
  }

  totalTime(): number {
    return this.#timeSpan;
  }

  setWindowTimes(startTime: Trace.Types.Timing.MilliSeconds, endTime: Trace.Types.Timing.MilliSeconds): void {
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

  customizedContextMenu(event: MouseEvent, eventIndex: number, _groupIndex: number): UI.ContextMenu.ContextMenu
      |undefined {
    const networkRequest = this.eventByIndex(eventIndex);
    if (!networkRequest || !Trace.Types.Events.isSyntheticNetworkRequest(networkRequest)) {
      return;
    }
    const timelineNetworkRequest = TimelineUtils.NetworkRequest.createTimelineNetworkRequest(networkRequest);
    const contextMenu = new UI.ContextMenu.ContextMenu(event, {useSoftMenu: true});
    contextMenu.appendApplicableItems(timelineNetworkRequest);
    return contextMenu;
  }

  indexForEvent(event: Trace.Types.Events.Event|Trace.Handlers.ModelHandlers.Frames.TimelineFrame): number|null {
    // In the NetworkDataProvider we will never be dealing with frames, but we need to satisfy the interface for a DataProvider.
    if (event instanceof Trace.Handlers.ModelHandlers.Frames.TimelineFrame) {
      return null;
    }
    if (!Trace.Types.Events.isNetworkTrackEntry(event)) {
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

  eventByIndex(entryIndex: number): Trace.Types.Events.SyntheticNetworkRequest|Trace.Types.Events.WebSocketEvent|null {
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

  groupForEvent(_entryIndex: number): PerfUI.FlameChart.Group|null {
    // Because the network track only contains one group, we don't actually
    // need to do any lookups here.
    const group = this.#networkTrackAppender?.group() ?? null;
    return group;
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
    return TimelineComponents.EntryName.nameForEntry(event);
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
      event: Trace.Types.Events.SyntheticNetworkRequest, unclippedBarX: number,
      timeToPixelRatio: number): {sendStart: number, headersEnd: number, finish: number, start: number, end: number} {
    const beginTime = Trace.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const timeToPixel = (time: number): number => unclippedBarX + (time - beginTime) * timeToPixelRatio;
    const startTime = Trace.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const endTime =
        Trace.Helpers.Timing.microSecondsToMilliseconds((event.ts + event.dur) as Trace.Types.Timing.MicroSeconds);
    const sendStartTime = Trace.Helpers.Timing.microSecondsToMilliseconds(event.args.data.syntheticData.sendStartTime);
    const headersEndTime = Trace.Helpers.Timing.microSecondsToMilliseconds(event.args.data.syntheticData.downloadStart);
    const sendStart = Math.max(timeToPixel(sendStartTime), unclippedBarX);
    const headersEnd = Math.max(timeToPixel(headersEndTime), sendStart);
    const finish = Math.max(
        timeToPixel(Trace.Helpers.Timing.microSecondsToMilliseconds(event.args.data.syntheticData.finishTime)),
        headersEnd);
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
    if (Trace.Types.Events.isSyntheticWebSocketConnection(event)) {
      return this.#decorateSyntheticWebSocketConnection(
          index, context, barY, barHeight, unclippedBarX, timeToPixelRatio);
    }
    if (!Trace.Types.Events.isSyntheticNetworkRequest(event)) {
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
    const event = this.#events[index];
    if (!Trace.Types.Events.isSyntheticNetworkRequest(event)) {
      return false;
    }
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
  #decorateSyntheticWebSocketConnection(
      index: number, context: CanvasRenderingContext2D, barY: number, barHeight: number, unclippedBarX: number,
      timeToPixelRatio: number): boolean {
    context.save();
    const event = this.#events[index] as Trace.Types.Events.SyntheticWebSocketConnection;
    const beginTime = Trace.Helpers.Timing.microSecondsToMilliseconds(event.ts);
    const timeToPixel = (time: number): number => Math.floor(unclippedBarX + (time - beginTime) * timeToPixelRatio);
    const endTime =
        Trace.Helpers.Timing.microSecondsToMilliseconds((event.ts + event.dur) as Trace.Types.Timing.MicroSeconds);
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
    const event = this.#events[index];
    if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
      const element = document.createElement('div');
      const root = UI.UIUtils.createShadowRootWithCoreStyles(element, {
        cssFile: [timelineFlamechartPopoverStyles],
        delegatesFocus: undefined,
      });

      const contents = root.createChild('div', 'timeline-flamechart-popover');
      const infoElement = new TimelineComponents.NetworkRequestTooltip.NetworkRequestTooltip();
      infoElement.networkRequest = event;
      contents.appendChild(infoElement);
      return element;
    }
    return null;
  }

  /**
   * Sets the minimum time and total time span of a trace using the
   * new engine data.
   */
  #setTimingBoundsData(newParsedTrace: Trace.Handlers.Types.ParsedTrace): void {
    const {traceBounds} = newParsedTrace.Meta;
    const minTime = Trace.Helpers.Timing.microSecondsToMilliseconds(traceBounds.min);
    const maxTime = Trace.Helpers.Timing.microSecondsToMilliseconds(traceBounds.max);
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
  #updateTimelineData(startTime: Trace.Types.Timing.MilliSeconds, endTime: Trace.Types.Timing.MilliSeconds): void {
    if (!this.#networkTrackAppender || !this.#timelineDataInternal) {
      return;
    }
    this.#maxLevel = this.#networkTrackAppender.relayoutEntriesWithinBounds(this.#events, startTime, endTime);

    // TODO(crbug.com/1459225): Remove this recreating code.
    // Force to create a new PerfUI.FlameChart.FlameChartTimelineData instance
    // to force the flamechart to re-render. This also causes crbug.com/1459225.
    this.#timelineDataInternal = PerfUI.FlameChart.FlameChartTimelineData.create({
      entryLevels: this.#timelineDataInternal?.entryLevels,
      entryTotalTimes: this.#timelineDataInternal?.entryTotalTimes,
      entryStartTimes: this.#timelineDataInternal?.entryStartTimes,
      groups: this.#timelineDataInternal?.groups,
      initiatorsData: this.#timelineDataInternal.initiatorsData,
      entryDecorations: this.#timelineDataInternal.entryDecorations,
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
    // Bump up to 7 because the tooltip is around 7 rows' height.
    return group.style.height * (this.isExpanded() ? Platform.NumberUtilities.clamp(this.#maxLevel + 1, 7, 8.5) : 1);
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
   * searches entries within the specified time and returns a list of entry
   * indexes
   */
  search(
      visibleWindow: Trace.Types.Timing.TraceWindowMicroSeconds,
      filter: TimelineModel.TimelineModelFilter.TimelineModelFilter,
      ): PerfUI.FlameChart.DataProviderSearchResult[] {
    const results: PerfUI.FlameChart.DataProviderSearchResult[] = [];
    for (let i = 0; i < this.#events.length; i++) {
      const entry = this.#events.at(i);
      if (!entry) {
        continue;
      }

      if (!Trace.Helpers.Timing.eventIsInBounds(entry, visibleWindow)) {
        continue;
      }

      if (filter.accept(entry, this.#parsedTrace ?? undefined)) {
        const startTimeMilli = Trace.Helpers.Timing.microSecondsToMilliseconds(entry.ts);
        results.push({startTimeMilli, index: i, provider: 'network'});
      }
    }
    return results;
  }

  /**
   * Returns a map of navigations that happened in the main frame, ignoring any
   * that happened in other frames.
   * The map's key is the frame ID.
   **/
  mainFrameNavigationStartEvents(): readonly Trace.Types.Events.NavigationStart[] {
    if (!this.#parsedTrace) {
      return [];
    }
    return this.#parsedTrace.Meta.mainFrameNavigations;
  }

  buildFlowForInitiator(entryIndex: number): boolean {
    if (!this.#parsedTrace) {
      return false;
    }
    if (!this.#timelineDataInternal) {
      return false;
    }
    if (this.#lastInitiatorEntry === entryIndex) {
      if (this.#lastInitiatorsData) {
        this.#timelineDataInternal.initiatorsData = this.#lastInitiatorsData;
      }
      return true;
    }
    if (!this.#networkTrackAppender) {
      return false;
    }

    // Remove all previously assigned decorations indicating that the flow event entries are hidden
    const previousInitiatorsDataLength = this.#timelineDataInternal.initiatorsData.length;
    // |entryIndex| equals -1 means there is no entry selected, just clear the
    // initiator cache if there is any previous arrow and return true to
    // re-render.
    if (entryIndex === -1) {
      this.#lastInitiatorEntry = entryIndex;
      if (previousInitiatorsDataLength === 0) {
        // This means there is no arrow before, so we don't need to re-render.
        return false;
      }
      // Reset to clear any previous arrows from the last event.
      this.#timelineDataInternal.resetFlowData();
      return true;
    }

    const event = this.#events[entryIndex];
    // Reset to clear any previous arrows from the last event.
    this.#timelineDataInternal.resetFlowData();
    this.#lastInitiatorEntry = entryIndex;

    const initiatorsData = initiatorsDataToDrawForNetwork(this.#parsedTrace, event);
    // This means there is no change for arrows.
    if (previousInitiatorsDataLength === 0 && initiatorsData.length === 0) {
      return false;
    }
    for (const initiatorData of initiatorsData) {
      const eventIndex = this.indexForEvent(initiatorData.event);
      const initiatorIndex = this.indexForEvent(initiatorData.initiator);
      if (eventIndex === null || initiatorIndex === null) {
        continue;
      }
      this.#timelineDataInternal.initiatorsData.push({
        initiatorIndex,
        eventIndex,
      });
    }
    this.#lastInitiatorsData = this.#timelineDataInternal.initiatorsData;
    return true;
  }
}
