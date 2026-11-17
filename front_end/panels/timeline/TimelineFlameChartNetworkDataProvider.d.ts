import type * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import { type TimelineSelection } from './TimelineSelection.js';
export declare class TimelineFlameChartNetworkDataProvider implements PerfUI.FlameChart.FlameChartDataProvider {
    #private;
    constructor();
    /**
     * Resets all per-trace data and caches while keeping cross-trace UI state
     * (such as `#persistedGroupConfigSetting`).
     */
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
    getDrawOverride(index: number): PerfUI.FlameChart.DrawOverride | undefined;
    /**
     * Decorates the entry depends on the type of the event.
     */
    decorateEntry(index: number, context: CanvasRenderingContext2D, _text: string | null, _barX: number, barY: number, _barWidth: number, barHeight: number, unclippedBarX: number, timeToPixelRatio: number): boolean;
    forceDecoration(index: number): boolean;
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
    preparePopoverElement(index: number): Lit.TemplateResult | null;
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
