import * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { CompatibilityTracksAppender, type DrawOverride } from './CompatibilityTracksAppender.js';
import { type TimelineSelection } from './TimelineSelection.js';
export declare class TimelineFlameChartDataProvider extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements PerfUI.FlameChart.FlameChartDataProvider {
    #private;
    private droppedFramePattern;
    private partialFramePattern;
    private currentLevel;
    private compatibilityTracksAppender;
    private parsedTrace;
    private timeSpan;
    private readonly framesGroupStyle;
    private readonly screenshotsGroupStyle;
    private entryData;
    private entryTypeByLevel;
    private entryIndexToTitle;
    private lastSelection;
    constructor();
    handleTrackConfigurationChange(groups: readonly PerfUI.FlameChart.Group[], indexesInVisualOrder: number[]): void;
    setPersistedGroupConfigSetting(setting: Common.Settings.Setting<PerfUI.FlameChart.PersistedGroupConfig[] | null>): void;
    hasTrackConfigurationMode(): boolean;
    getPossibleActions(entryIndex: number, groupIndex: number): PerfUI.FlameChart.PossibleFilterActions | void;
    customizedContextMenu(mouseEvent: MouseEvent, entryIndex: number, groupIndex: number): UI.ContextMenu.ContextMenu | undefined;
    modifyTree(action: PerfUI.FlameChart.FilterAction, entryIndex: number): void;
    findPossibleContextMenuActions(entryIndex: number): PerfUI.FlameChart.PossibleFilterActions | void;
    handleFlameChartTransformKeyboardEvent(event: KeyboardEvent, entryIndex: number, groupIndex: number): void;
    private buildGroupStyle;
    setModel(parsedTrace: Trace.TraceModel.ParsedTrace, entityMapper: Trace.EntityMapper.EntityMapper): void;
    /**
     * Instances and caches a CompatibilityTracksAppender using the
     * internal flame chart data and the trace parsed data coming from the
     * trace engine.
     * The model data must have been set to the data provider instance before
     * attempting to instance the CompatibilityTracksAppender.
     */
    compatibilityTracksAppenderInstance(forceNew?: boolean): CompatibilityTracksAppender;
    /**
     * Builds the flame chart data whilst allowing for a custom filtering of track appenders.
     * This is ONLY to be used in test environments.
     */
    buildWithCustomTracksForTest(options?: {
        /**
         * Filters the track by the given name. Only tracks that match this filter will be drawn.
         */
        filterTracks?: (name: string, trackIndex: number) => boolean;
        /**
         * Choose if a given track is expanded based on the name
         */
        expandTracks?: (name: string, trackIndex: number) => boolean;
    }): void;
    groupTreeEvents(group: PerfUI.FlameChart.Group): Trace.Types.Events.Event[] | null;
    mainFrameNavigationStartEvents(): readonly Trace.Types.Events.NavigationStart[];
    entryTitle(entryIndex: number): string | null;
    textColor(index: number): string;
    entryFont(_index: number): string | null;
    /**
     * Clear the cache and rebuild the timeline data This should be called
     * when the trace file is the same but we want to rebuild the timeline
     * data. Some possible example: when we hide/unhide an event, or the
     * ignore list is changed etc.
     */
    rebuildTimelineData(): void;
    /**
     * Reset all data other than the UI elements.
     * This should be called when
     * - initialized the data provider
     * - a new trace file is coming (when `setModel()` is called)
     * etc.
     */
    reset(): void;
    maxStackDepth(): number;
    /**
     * Builds the flame chart data using the tracks appender (which use
     * the new trace engine). The result built data is cached and returned.
     */
    timelineData(rebuild?: boolean): PerfUI.FlameChart.FlameChartTimelineData;
    minimumBoundary(): number;
    totalTime(): number;
    search(visibleWindow: Trace.Types.Timing.TraceWindowMicro, filter?: Trace.Extras.TraceFilter.TraceFilter): PerfUI.FlameChart.DataProviderSearchResult[];
    getEntryTypeForLevel(level: number): EntryType;
    preparePopoverElement(entryIndex: number): Element | null;
    preparePopoverForCollapsedArrow(entryIndex: number): Element | null;
    getDrawOverride(entryIndex: number): DrawOverride | undefined;
    entryColor(entryIndex: number): string;
    private preparePatternCanvas;
    private drawFrame;
    private drawScreenshot;
    decorateEntry(entryIndex: number, context: CanvasRenderingContext2D, text: string | null, barX: number, barY: number, barWidth: number, barHeight: number, unclippedBarX: number, timeToPixelRatio: number, transformColor: (color: string) => string): boolean;
    forceDecoration(entryIndex: number): boolean;
    private appendHeader;
    createSelection(entryIndex: number): TimelineSelection | null;
    formatValue(value: number, precision?: number): string;
    groupForEvent(entryIndex: number): PerfUI.FlameChart.Group | null;
    canJumpToEntry(_entryIndex: number): boolean;
    entryIndexForSelection(selection: TimelineSelection | null): number;
    /**
     * Return the index for the given entry. Note that this method assumes that
     * timelineData() has been generated. If it hasn't, this method will return
     * null.
     */
    indexForEvent(targetEvent: Trace.Types.Events.Event): number | null;
    /**
     * Build the data for initiators and initiated entries.
     * @param entryIndex
     * @returns if we should re-render the flame chart (canvas)
     */
    buildFlowForInitiator(entryIndex: number): boolean;
    eventByIndex(entryIndex: number): Trace.Types.Events.Event | null;
}
export declare const InstantEventVisibleDurationMs: Trace.Types.Timing.Milli;
export declare const enum Events {
    DATA_CHANGED = "DataChanged",
    FLAME_CHART_ITEM_HOVERED = "FlameChartItemHovered",
    ENTRY_LABEL_ANNOTATION_ADDED = "EntryLabelAnnotationAdded"
}
export interface EventTypes {
    [Events.DATA_CHANGED]: void;
    [Events.FLAME_CHART_ITEM_HOVERED]: Trace.Types.Events.Event | null;
    [Events.ENTRY_LABEL_ANNOTATION_ADDED]: {
        entryIndex: number;
        withLinkCreationButton: boolean;
    };
}
/**
 * an entry is a trace event, they are classified into "entry types"
 * because some events are rendered differently. For example, screenshot
 * events are rendered as images. Checks for entry types allow to have
 * different styles, names, etc. for events that look differently.
 * In the future we won't have this checks: instead we will forward
 * the event to the corresponding "track appender" and it will determine
 * how the event shall be rendered.
 **/
export declare const enum EntryType {
    FRAME = "Frame",
    TRACK_APPENDER = "TrackAppender",
    SCREENSHOT = "Screenshot"
}
