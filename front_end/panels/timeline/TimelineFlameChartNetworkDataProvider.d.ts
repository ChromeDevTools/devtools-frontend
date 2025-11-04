import type * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type TimelineSelection } from './TimelineSelection.js';
export declare class TimelineFlameChartNetworkDataProvider implements PerfUI.FlameChart.FlameChartDataProvider {
    #private;
    constructor();
    reset(): void;
    setModel(parsedTrace: Trace.TraceModel.ParsedTrace, entityMapper: Trace.EntityMapper.EntityMapper): void;
    setEvents(parsedTrace: Trace.TraceModel.ParsedTrace): void;
    isEmpty(): boolean;
    maxStackDepth(): number;
    hasTrackConfigurationMode(): boolean;
    timelineData(): PerfUI.FlameChart.FlameChartTimelineData;
    minimumBoundary(): number;
    totalTime(): number;
    setWindowTimes(startTime: Trace.Types.Timing.Milli, endTime: Trace.Types.Timing.Milli): void;
    createSelection(index: number): TimelineSelection | null;
    customizedContextMenu(event: MouseEvent, eventIndex: number, _groupIndex: number): UI.ContextMenu.ContextMenu | undefined;
    indexForEvent(event: Trace.Types.Events.Event): number | null;
    eventByIndex(entryIndex: number): Trace.Types.Events.SyntheticNetworkRequest | Trace.Types.Events.WebSocketEvent | null;
    entryIndexForSelection(selection: TimelineSelection | null): number;
    groupForEvent(_entryIndex: number): PerfUI.FlameChart.Group | null;
    entryColor(index: number): string;
    textColor(_index: number): string;
    entryTitle(index: number): string | null;
    entryFont(_index: number): string | null;
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
    getDecorationPixels(event: Trace.Types.Events.SyntheticNetworkRequest, unclippedBarX: number, timeToPixelRatio: number): {
        sendStart: number;
        headersEnd: number;
        finish: number;
        start: number;
        end: number;
    };
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
    decorateEntry(index: number, context: CanvasRenderingContext2D, _text: string | null, barX: number, barY: number, barWidth: number, barHeight: number, unclippedBarX: number, timeToPixelRatio: number): boolean;
    forceDecoration(_index: number): boolean;
    /**
     *In the FlameChart.ts, when filtering through the events for a level, it starts
     * from the last event of that level and stops when it hit an event that has start
     * time greater than the filtering window.
     * For example, in this websocket level we have A(socket event), B, C, D. If C
     * event has start time greater than the window, the rest of the events (A and B)
     * wont be drawn. So if this level is the force Drawable level, we wont stop at
     * event C and will include the socket event A.
     * */
    forceDrawableLevel(levelIndex: number): boolean;
    preparePopoverElement(index: number): Element | null;
    /**
     * Note that although we use the same mechanism to track configuration
     * changes in the Network part of the timeline, we only really use it to track
     * the expanded state because the user cannot re-order or hide/show tracks in
     * here.
     */
    handleTrackConfigurationChange(groups: readonly PerfUI.FlameChart.Group[], indexesInVisualOrder: number[]): void;
    setPersistedGroupConfigSetting(setting: Common.Settings.Setting<PerfUI.FlameChart.PersistedGroupConfig[] | null>): void;
    preferredHeight(): number;
    isExpanded(): boolean;
    formatValue(value: number, precision?: number): string;
    canJumpToEntry(_entryIndex: number): boolean;
    /**
     * searches entries within the specified time and returns a list of entry
     * indexes
     */
    search(visibleWindow: Trace.Types.Timing.TraceWindowMicro, filter?: Trace.Extras.TraceFilter.TraceFilter): PerfUI.FlameChart.DataProviderSearchResult[];
    /**
     * Returns a map of navigations that happened in the main frame, ignoring any
     * that happened in other frames.
     * The map's key is the frame ID.
     **/
    mainFrameNavigationStartEvents(): readonly Trace.Types.Events.NavigationStart[];
    buildFlowForInitiator(entryIndex: number): boolean;
}
