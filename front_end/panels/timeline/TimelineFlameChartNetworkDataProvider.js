// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import * as Lit from '../../ui/lit/lit.js';
import { drawWhiskers, WHISKER_STROKE_COLOR } from './AppenderUtils.js';
import * as TimelineComponents from './components/components.js';
import { initiatorsDataToDrawForNetwork } from './Initiators.js';
import { NetworkTrackAppender } from './NetworkTrackAppender.js';
import { FlameChartStyle, Selection } from './TimelineFlameChartView.js';
import { selectionFromEvent, selectionIsRange, selectionsEqual, } from './TimelineSelection.js';
import { buildPersistedConfig } from './TrackConfiguration.js';
const { html } = Lit;
export class TimelineFlameChartNetworkDataProvider {
    #minimumBoundary = 0;
    #timeSpan = 0;
    #events = [];
    #maxLevel = 0;
    #networkTrackAppender = null;
    #timelineData = null;
    #lastSelection = null;
    #parsedTrace = null;
    #eventIndexByEvent = new Map();
    // -1 means no entry is selected.
    #lastInitiatorEntry = -1;
    #lastInitiatorsData = [];
    #entityMapper = null;
    #persistedGroupConfigSetting = null;
    constructor() {
        this.reset();
    }
    /**
     * Resets all per-trace data and caches while keeping cross-trace UI state
     * (such as `#persistedGroupConfigSetting`).
     */
    reset() {
        this.#maxLevel = 0;
        this.#minimumBoundary = 0;
        this.#timeSpan = 0;
        this.#eventIndexByEvent.clear();
        this.#events = [];
        this.#timelineData = null;
        this.#parsedTrace = null;
        this.#networkTrackAppender = null;
        this.#entityMapper = null;
        this.#lastSelection = null;
        this.#lastInitiatorEntry = -1;
        this.#lastInitiatorsData = [];
    }
    setModel(parsedTrace, entityMapper) {
        this.reset();
        this.#parsedTrace = parsedTrace;
        this.#entityMapper = entityMapper;
        this.setEvents(this.#parsedTrace);
        this.#setTimingBoundsData(this.#parsedTrace);
    }
    setEvents(parsedTrace) {
        if (parsedTrace.data.NetworkRequests.webSocket) {
            parsedTrace.data.NetworkRequests.webSocket.forEach(webSocketData => {
                if (webSocketData.syntheticConnection) {
                    this.#events.push(webSocketData.syntheticConnection);
                }
                this.#events.push(...webSocketData.events);
            });
        }
        if (parsedTrace.data.NetworkRequests.byTime) {
            this.#events.push(...parsedTrace.data.NetworkRequests.byTime);
        }
    }
    isEmpty() {
        this.timelineData();
        return !this.#events.length;
    }
    maxStackDepth() {
        return this.#maxLevel;
    }
    hasTrackConfigurationMode() {
        return false;
    }
    timelineData() {
        if (this.#timelineData && this.#timelineData.entryLevels.length !== 0) {
            // The flame chart data is built already, so return the cached data.
            return this.#timelineData;
        }
        this.#timelineData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
        if (!this.#parsedTrace) {
            return this.#timelineData;
        }
        if (!this.#events.length) {
            this.setEvents(this.#parsedTrace);
        }
        this.#networkTrackAppender = new NetworkTrackAppender(this.#timelineData, this.#events);
        this.#maxLevel = this.#networkTrackAppender.appendTrackAtLevel(0);
        return this.#timelineData;
    }
    minimumBoundary() {
        return this.#minimumBoundary;
    }
    totalTime() {
        return this.#timeSpan;
    }
    setWindowTimes(startTime, endTime) {
        this.#updateTimelineData(startTime, endTime);
    }
    createSelection(index) {
        if (index === -1) {
            return null;
        }
        const event = this.#events[index];
        this.#lastSelection = new Selection(selectionFromEvent(event), index);
        return this.#lastSelection.timelineSelection;
    }
    customizedContextMenu(event, eventIndex, _groupIndex) {
        const networkRequest = this.eventByIndex(eventIndex);
        if (!networkRequest || !Trace.Types.Events.isSyntheticNetworkRequest(networkRequest)) {
            return;
        }
        const timelineNetworkRequest = SDK.TraceObject.RevealableNetworkRequest.create(SDK.TargetManager.TargetManager.instance(), networkRequest);
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.appendApplicableItems(timelineNetworkRequest);
        return contextMenu;
    }
    indexForEvent(event) {
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
    eventByIndex(entryIndex) {
        return this.#events.at(entryIndex) ?? null;
    }
    entryIndexForSelection(selection) {
        if (!selection || selectionIsRange(selection)) {
            return -1;
        }
        if (this.#lastSelection && selectionsEqual(this.#lastSelection.timelineSelection, selection)) {
            return this.#lastSelection.entryIndex;
        }
        if (!Trace.Types.Events.isNetworkTrackEntry(selection.event)) {
            return -1;
        }
        const index = this.#events.indexOf(selection.event);
        if (index !== -1) {
            this.#lastSelection = new Selection(selectionFromEvent(selection.event), index);
        }
        return index;
    }
    groupForEvent(_entryIndex) {
        // Because the network track only contains one group, we don't actually
        // need to do any lookups here.
        const group = this.#networkTrackAppender?.group() ?? null;
        return group;
    }
    entryColor(index) {
        if (!this.#networkTrackAppender) {
            throw new Error('networkTrackAppender should not be empty');
        }
        return this.#networkTrackAppender.colorForEvent(this.#events[index]);
    }
    textColor(_index) {
        return FlameChartStyle.textColor;
    }
    entryTitle(index) {
        const event = this.#events[index];
        return Trace.Name.forEntry(event);
    }
    entryFont(_index) {
        return this.#networkTrackAppender?.font() || null;
    }
    getDrawOverride(index) {
        const event = this.#events[index];
        if (!event || !Trace.Types.Events.isSyntheticNetworkRequest(event)) {
            return undefined;
        }
        return (context, x, y, width, height, timeToPosition, transformColor) => {
            /**
             *    |----------------[ (URL text)    waiting time   |   request  ]--------|
             *    ^start           ^sendStart                     ^headersEnd  ^Finish  ^end
             */
            const sendStartTime = Trace.Helpers.Timing.microToMilli(event.args.data.syntheticData.sendStartTime);
            const headersEndTime = Trace.Helpers.Timing.microToMilli(event.args.data.syntheticData.downloadStart);
            const finishTime = Trace.Helpers.Timing.microToMilli(event.args.data.syntheticData.finishTime);
            const sendStart = Math.max(timeToPosition(sendStartTime), x);
            const headersEnd = Math.max(timeToPosition(headersEndTime), sendStart);
            const finish = Math.max(timeToPosition(finishTime), headersEnd);
            const end = Math.max(x + width, finish);
            context.save();
            // Draw whiskers before the request box so the box covers zero-length whisker overlaps.
            drawWhiskers(context, x, sendStart, finish, end, y, height, transformColor(WHISKER_STROKE_COLOR));
            const boxWidth = Math.max(finish - sendStart, 1);
            context.fillStyle = transformColor(this.entryColor(index));
            context.fillRect(sendStart, y, boxWidth, height - 1);
            // Draw waiting time between |sendStart| and |headersEnd| using a translucent white overlay.
            if (headersEnd - sendStart > 0.5) {
                context.fillStyle = transformColor('hsla(0, 100%, 100%, 0.8)');
                context.fillRect(sendStart + 0.5, y + 0.5, headersEnd - sendStart - 0.5, height - 2);
            }
            // Draw request URL as text.
            const textStart = Math.max(sendStart, 0);
            const textWidth = finish - textStart;
            const /** @constant */ minTextWidthPx = 20;
            if (textWidth >= minTextWidthPx) {
                let title = this.entryTitle(index) || '';
                if (event.args.data.fromServiceWorker) {
                    title = '⚙ ' + title;
                }
                if (title) {
                    const /** @constant */ textPadding = 4;
                    const /** @constant */ textBaseline = 5;
                    const textBaseHeight = height - textBaseline;
                    const trimmedText = UI.UIUtils.trimTextEnd(context, title, textWidth - 2 * textPadding);
                    context.fillStyle = transformColor(this.textColor(index));
                    context.fillText(trimmedText, textStart + textPadding, y + textBaseHeight);
                }
            }
            context.restore();
            return { x, width: Math.max(width, 1) };
        };
    }
    /**
     * Decorates the entry depends on the type of the event.
     */
    decorateEntry(index, context, _text, _barX, barY, _barWidth, barHeight, unclippedBarX, timeToPixelRatio) {
        const event = this.#events[index];
        if (Trace.Types.Events.isSyntheticWebSocketConnection(event)) {
            return this.#decorateSyntheticWebSocketConnection(index, context, barY, barHeight, unclippedBarX, timeToPixelRatio);
        }
        return false;
    }
    /**
     * Decorates the synthetic websocket event entry with a whisk from the start to the end.
     *   ------------------------
     *   ^start                 ^end
     * */
    #decorateSyntheticWebSocketConnection(index, context, barY, barHeight, unclippedBarX, timeToPixelRatio) {
        context.save();
        const event = this.#events[index];
        const beginTime = Trace.Helpers.Timing.microToMilli(event.ts);
        const timeToPixel = (time) => Math.floor(unclippedBarX + (time - beginTime) * timeToPixelRatio);
        const endTime = Trace.Helpers.Timing.microToMilli((event.ts + event.dur));
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
    forceDecoration(index) {
        const event = this.#events[index];
        return Boolean(event && Trace.Types.Events.isSyntheticWebSocketConnection(event));
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
    forceDrawableLevel(levelIndex) {
        return this.#networkTrackAppender?.webSocketIdToLevel.values().some(l => l === levelIndex) ?? false;
    }
    preparePopoverElement(index) {
        const event = this.#events[index];
        if (!event || !Trace.Types.Events.isSyntheticNetworkRequest(event)) {
            return null;
        }
        return html `
      <div class="timeline-flamechart-popover">
        ${TimelineComponents.NetworkRequestTooltip.NetworkRequestTooltip.createWidgetElement(event, this.#entityMapper || undefined)}
      </div>`;
    }
    /**
     * Sets the minimum time and total time span of a trace using the
     * new engine data.
     */
    #setTimingBoundsData(newParsedTrace) {
        const { traceBounds } = newParsedTrace.data.Meta;
        const minTime = Trace.Helpers.Timing.microToMilli(traceBounds.min);
        const maxTime = Trace.Helpers.Timing.microToMilli(traceBounds.max);
        this.#minimumBoundary = minTime;
        this.#timeSpan = minTime === maxTime ? 1000 : maxTime - this.#minimumBoundary;
    }
    /**
     * When users zoom in the flamechart, we only want to show them the network
     * requests between startTime and endTime.
     */
    #updateTimelineData(startTime, endTime) {
        if (!this.#networkTrackAppender || !this.#timelineData) {
            return;
        }
        // This also has the side-effect of updating this.#timelineData with new
        // information.
        this.#maxLevel = this.#networkTrackAppender.relayoutEntriesWithinBounds(this.#events, startTime, endTime);
    }
    /**
     * Note that although we use the same mechanism to track configuration
     * changes in the Network part of the timeline, we only really use it to track
     * the expanded state because the user cannot re-order or hide/show tracks in
     * here.
     */
    handleTrackConfigurationChange(groups, indexesInVisualOrder) {
        if (!this.#persistedGroupConfigSetting) {
            return;
        }
        if (!this.#parsedTrace) {
            return;
        }
        const persistedDataForTrace = buildPersistedConfig(groups, indexesInVisualOrder);
        this.#persistedGroupConfigSetting.set(persistedDataForTrace);
    }
    setPersistedGroupConfigSetting(setting) {
        this.#persistedGroupConfigSetting = setting;
    }
    preferredHeight() {
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
    isExpanded() {
        return Boolean(this.#networkTrackAppender?.group()?.expanded);
    }
    formatValue(value, precision) {
        return i18n.TimeUtilities.preciseMillisToString(value, precision);
    }
    canJumpToEntry(_entryIndex) {
        return false;
    }
    /**
     * searches entries within the specified time and returns a list of entry
     * indexes
     */
    search(visibleWindow, filter) {
        const results = [];
        for (let i = 0; i < this.#events.length; i++) {
            const entry = this.#events.at(i);
            if (!entry) {
                continue;
            }
            if (!Trace.Helpers.Timing.eventIsInBounds(entry, visibleWindow)) {
                continue;
            }
            if (!filter || filter.accept(entry, this.#parsedTrace?.data ?? undefined)) {
                const startTimeMilli = Trace.Helpers.Timing.microToMilli(entry.ts);
                results.push({ startTimeMilli, index: i, provider: 'network' });
            }
        }
        return results;
    }
    /**
     * Returns a map of navigations that happened in the main frame, ignoring any
     * that happened in other frames.
     * The map's key is the frame ID.
     **/
    mainFrameNavigationStartEvents() {
        if (!this.#parsedTrace) {
            return [];
        }
        return this.#parsedTrace.data.Meta.mainFrameNavigations;
    }
    buildFlowForInitiator(entryIndex) {
        if (!this.#parsedTrace) {
            return false;
        }
        if (!this.#timelineData) {
            return false;
        }
        if (entryIndex > -1 && this.#lastInitiatorEntry === entryIndex) {
            if (this.#lastInitiatorsData) {
                this.#timelineData.initiatorsData = this.#lastInitiatorsData;
            }
            return true;
        }
        if (!this.#networkTrackAppender) {
            return false;
        }
        // Remove all previously assigned decorations indicating that the flow event entries are hidden
        const previousInitiatorsDataLength = this.#timelineData.initiatorsData.length;
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
            this.#timelineData.emptyInitiators();
            return true;
        }
        const event = this.#events[entryIndex];
        // Reset to clear any previous arrows from the last event.
        this.#timelineData.emptyInitiators();
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
            this.#timelineData.initiatorsData.push({
                initiatorIndex,
                eventIndex,
            });
        }
        this.#lastInitiatorsData = this.#timelineData.initiatorsData;
        return true;
    }
}
//# sourceMappingURL=TimelineFlameChartNetworkDataProvider.js.map