import * as Trace from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import { AnimationsTrackAppender } from './AnimationsTrackAppender.js';
import { GPUTrackAppender } from './GPUTrackAppender.js';
import { InteractionsTrackAppender } from './InteractionsTrackAppender.js';
import { LayoutShiftsTrackAppender } from './LayoutShiftsTrackAppender.js';
import { ThreadAppender } from './ThreadAppender.js';
import { EntryType } from './TimelineFlameChartDataProvider.js';
import { TimingsTrackAppender } from './TimingsTrackAppender.js';
export interface PopoverInfo {
    title: string;
    formattedTime: string;
    url: string | null;
    warningElements: HTMLSpanElement[];
    additionalElements: HTMLElement[];
}
export declare function entryIsVisibleInTimeline(entry: Trace.Types.Events.Event, parsedTrace?: Trace.TraceModel.ParsedTrace): boolean;
/**
 * Track appenders add the data of each track into the timeline flame
 * chart. Each track appender also implements functions tha allow the
 * canvas renderer to gather more information about an event in a track,
 * like its display name or color.
 *
 * At the moment, tracks in the timeline flame chart are appended in
 * two locations: in the TimelineFlameChartDataProvider and in the track
 * appenders exported by this module. As part of the work to use a new
 * trace parsing engine, a track appender will be defined with this API
 * for each of the tracks in the timeline. With this implementation in
 * place its counterpart in the TimelineFlameChartDataProvider can be
 * removed. This processes of doing this for a track is referred to as
 * "migrating the track" to the new system.
 *
 * The migration implementation will result beneficial among other
 * things because the complexity of rendering the details of each track
 * is distributed among multiple standalone modules.
 * Read more at go/rpp-flamechart-arch
 */
export interface TrackAppender {
    /**
     * The unique name given to the track appender.
     */
    appenderName: TrackAppenderName;
    /**
     * Appends into the flame chart data the data corresponding to a track.
     * @param level the horizontal level of the flame chart events where the
     * track's events will start being appended.
     * @param expanded whether the track should be rendered expanded.
     * @returns the first available level to append more data after having
     * appended the track's events.
     */
    appendTrackAtLevel(level: number, expanded?: boolean): number;
    /**
     * Returns the color an event is shown with in the timeline.
     */
    colorForEvent(event: Trace.Types.Events.Event): string;
    /**
     * Returns the title an event is shown with in the timeline.
     */
    titleForEvent?(event: Trace.Types.Events.Event): string;
    /**
     * Updates the standard popover (AKA tooltip) some appender specific details.
     */
    setPopoverInfo?(event: Trace.Types.Events.Event, info: PopoverInfo): void;
    /**
     * Returns the a callback function to draw an event to overrides the normal rectangle draw operation.
     */
    getDrawOverride?(event: Trace.Types.Events.Event): DrawOverride | undefined;
}
export declare const TrackNames: readonly ["Animations", "Timings", "Interactions", "GPU", "LayoutShifts", "Thread", "Thread_AuctionWorklet", "Extension", "ServerTimings"];
/**
 * Network track will use TrackAppender interface, but it won't be shown in Main flamechart.
 * So manually add it to TrackAppenderName.
 **/
export type TrackAppenderName = typeof TrackNames[number] | 'Network';
export type DrawOverride = PerfUI.FlameChart.DrawOverride;
/**
 * Used as the context when a track (aka group) is selected and we log
 * something to the VE Logging framework.
 * This enum broadly corresponds with the list of TrackNames, but can be more
 * specific in some situations such as when we want to identify the thread type
 * rather than log "thread" - it is useful to know if the thread is the main
 * thread or not.
 * VE context needs to be kebab-case, and not contain any PII, which is why we
 * log this set list rather than full track names, which in the case of threads
 * can contain URLswhich we do not want to log.
 */
export declare const enum VisualLoggingTrackName {
    ANIMATIONS = "animations",
    TIMINGS = "timings",
    INTERACTIONS = "interactions",
    GPU = "gpu",
    LAYOUT_SHIFTS = "layout-shifts",
    SERVER_TIMINGS = "server.timings",
    THREAD_CPU_PROFILE = "thread.cpu-profile",
    THREAD_MAIN = "thread.main",
    THREAD_FRAME = "thread.frame",
    THREAD_WORKER = "thread.worker",
    THREAD_AUCTION_WORKLET = "thread.auction-worklet",
    THREAD_RASTERIZER = "thread.rasterizer",
    THREAD_POOL = "thread.pool",
    THREAD_OTHER = "thread.other",
    EXTENSION = "extension",
    ANGULAR_TRACK = "angular-track",
    NETWORK = "network"
}
export declare class CompatibilityTracksAppender {
    #private;
    /**
     * @param flameChartData the data used by the flame chart renderer on
     * which the track data will be appended.
     * @param parsedTrace the trace parsing engines output.
     * @param entryData the array containing all event to be rendered in
     * the flamechart.
     * @param legacyEntryTypeByLevel an array containing the type of
     * each entry in the entryData array. Indexed by the position the
     * corresponding entry occupies in the entryData array. This reference
     * is needed only for compatibility with the legacy flamechart
     * architecture and should be removed once all tracks use the new
     * system.
     * @param entityMapper 3P entity data for the trace.
     */
    constructor(flameChartData: PerfUI.FlameChart.FlameChartTimelineData, parsedTrace: Trace.TraceModel.ParsedTrace, entryData: Trace.Types.Events.Event[], legacyEntryTypeByLevel: EntryType[], entityMapper: Trace.EntityMapper.EntityMapper | null);
    reset(): void;
    setFlameChartDataAndEntryData(flameChartData: PerfUI.FlameChart.FlameChartTimelineData, entryData: Trace.Types.Events.Event[], legacyEntryTypeByLevel: EntryType[]): void;
    getFlameChartTimelineData(): PerfUI.FlameChart.FlameChartTimelineData;
    private onThemeChange;
    timingsTrackAppender(): TimingsTrackAppender;
    animationsTrackAppender(): AnimationsTrackAppender;
    interactionsTrackAppender(): InteractionsTrackAppender;
    gpuTrackAppender(): GPUTrackAppender;
    layoutShiftsTrackAppender(): LayoutShiftsTrackAppender;
    threadAppenders(): ThreadAppender[];
    eventsInTrack(trackAppender: TrackAppender): Trace.Types.Events.Event[];
    /**
     * Gets the events to be shown in the tree views of the details pane
     * (Bottom-up, Call tree, etc.). These are the events from the track
     * that can be arranged in a tree shape.
     */
    eventsForTreeView(trackAppender: TrackAppender): Trace.Types.Events.Event[];
    /**
     * Caches the track appender that owns a flame chart group. FlameChart
     * groups are created for each track in the timeline. When an user
     * selects a track in the UI, the track's group is passed to the model
     * layer to inform about the selection.
     */
    registerTrackForGroup(group: PerfUI.FlameChart.Group, appender: TrackAppender): void;
    /**
     * Returns number of tracks of given type already appended.
     * Used to name the "Raster Thread 6" tracks, etc
     */
    getCurrentTrackCountForThreadType(threadType: Trace.Handlers.Threads.ThreadType.RASTERIZER | Trace.Handlers.Threads.ThreadType.THREAD_POOL): number;
    /**
     * Looks up a FlameChart group for a given appender.
     */
    groupForAppender(targetAppender: TrackAppender): PerfUI.FlameChart.Group | null;
    /**
     * Given a FlameChart group, gets the events to be shown in the tree
     * views if that group was registered by the appender system.
     */
    groupEventsForTreeView(group: PerfUI.FlameChart.Group): Trace.Types.Events.Event[] | null;
    groupForLevel(level: number): PerfUI.FlameChart.Group | null;
    /**
     * Adds an event to the flame chart data at a defined level.
     * @param event the event to be appended,
     * @param level the level to append the event,
     * @param appender the track which the event belongs to.
     * @returns the index of the event in all events to be rendered in the flamechart.
     */
    appendEventAtLevel(event: Trace.Types.Events.Event, level: number, appender: TrackAppender): number;
    /**
     * Adds into the flame chart data a list of trace events.
     * @param events the trace events that will be appended to the flame chart.
     * The events should be taken straight from the trace handlers. The handlers
     * should sort the events by start time, and the parent event is before the
     * child.
     * @param trackStartLevel the flame chart level from which the events will
     * be appended.
     * @param appender the track that the trace events belong to.
     * @param eventAppendedCallback an optional function called after the
     * event has been added to the timeline data. This allows the caller
     * to know f.e. the position of the event in the entry data. Use this
     * hook to customize the data after it has been appended, f.e. to add
     * decorations to a set of the entries.
     * @returns the next level after the last occupied by the appended these
     * trace events (the first available level to append next track).
     */
    appendEventsAtLevel<T extends Trace.Types.Events.Event>(events: readonly T[], trackStartLevel: number, appender: TrackAppender, eventAppendedCallback?: (event: T, index: number) => void): number;
    /**
     * Gets the all track appenders that have been set to be visible.
     */
    allVisibleTrackAppenders(): TrackAppender[];
    allThreadAppendersByProcess(): Map<Trace.Types.Events.ProcessID, ThreadAppender[]>;
    getDrawOverride(event: Trace.Types.Events.Event, level: number): DrawOverride | undefined;
    /**
     * Returns the color an event is shown with in the timeline.
     */
    colorForEvent(event: Trace.Types.Events.Event, level: number): string;
    /**
     * Returns the title an event is shown with in the timeline.
     */
    titleForEvent(event: Trace.Types.Events.Event, level: number): string;
    /**
     * Returns the info shown when an event in the timeline is hovered.
     */
    popoverInfo(event: Trace.Types.Events.Event, level: number): PopoverInfo;
}
