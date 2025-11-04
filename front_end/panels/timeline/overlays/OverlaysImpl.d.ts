import * as Trace from '../../../models/trace/trace.js';
import type * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
/**
 * Represents which flamechart an entry is rendered in.
 * We need to know this because when we place an overlay for an entry we need
 * to adjust its Y value if it's in the main chart which is drawn below the
 * network chart
 */
export type EntryChartLocation = 'main' | 'network';
/**
 * Given a list of overlays, this method will calculate the smallest possible
 * trace window that will contain all of the overlays.
 * `overlays` is expected to be non-empty, and this will return `null` if it is empty.
 */
export declare function traceWindowContainingOverlays(overlays: Trace.Types.Overlays.Overlay[]): Trace.Types.Timing.TraceWindowMicro | null;
/**
 * Get a list of entries for a given overlay.
 */
export declare function entriesForOverlay(overlay: Trace.Types.Overlays.Overlay): readonly Trace.Types.Overlays.OverlayEntry[];
export declare function chartForEntry(entry: Trace.Types.Overlays.OverlayEntry): EntryChartLocation;
export interface TimelineOverlaySetOptions {
    /** Whether to update the trace window. Defaults to false. */
    updateTraceWindow?: boolean;
    /**
     * If updateTraceWindow is true, this is the total amount of space added as margins to the
     * side of the bounds represented by the overlays, represented as a percentage relative to
     * the width of the overlay bounds. The space is split evenly on either side of the overlay
     * bounds. The intention is to neatly center the overlays in the middle of the viewport, with
     * some additional context on either side.
     *
     * If 0, no margins will be added, and the precise bounds defined by the overlays will be used.
     *
     * If not provided, 100 is used (25% margin, 50% overlays, 25% margin).
     */
    updateTraceWindowPercentage?: number;
}
/**
 * Denotes overlays that are singletons; only one of these will be allowed to
 * exist at any given time. If one exists and the add() method is called, the
 * new overlay will replace the existing one.
 */
type SingletonOverlay = Trace.Types.Overlays.EntrySelected | Trace.Types.Overlays.TimestampMarker;
export declare function overlayIsSingleton(overlay: Trace.Types.Overlays.Overlay): overlay is SingletonOverlay;
export declare function overlayTypeIsSingleton(type: Trace.Types.Overlays.Overlay['type']): type is SingletonOverlay['type'];
/**
 * The dimensions each flame chart reports. Note that in the current UI they
 * will always have the same width, so theoretically we could only gather that
 * from one chart, but we gather it from both for simplicity and to cover us in
 * the future should the UI change and the charts have different widths.
 */
interface FlameChartDimensions {
    widthPixels: number;
    heightPixels: number;
    scrollOffsetPixels: number;
    allGroupsCollapsed: boolean;
}
export interface TimelineCharts {
    mainChart: PerfUI.FlameChart.FlameChart;
    mainProvider: PerfUI.FlameChart.FlameChartDataProvider;
    networkChart: PerfUI.FlameChart.FlameChart;
    networkProvider: PerfUI.FlameChart.FlameChartDataProvider;
}
export interface OverlayEntryQueries {
    parsedTrace: () => Trace.TraceModel.ParsedTrace | null;
    isEntryCollapsedByUser: (entry: Trace.Types.Events.Event) => boolean;
    firstVisibleParentForEntry: (entry: Trace.Types.Events.Event) => Trace.Types.Events.Event | null;
}
/**
 * An event dispatched when one of the Annotation Overlays (overlay created by the user,
 * ex. Trace.Types.Overlays.EntryLabel) is removed or updated. When one of the Annotation Overlays is removed or updated,
 * ModificationsManager listens to this event and updates the current annotations.
 **/
export type UpdateAction = 'Remove' | 'Update';
export declare class AnnotationOverlayActionEvent extends Event {
    overlay: Trace.Types.Overlays.Overlay;
    action: UpdateAction;
    static readonly eventName = "annotationoverlayactionsevent";
    constructor(overlay: Trace.Types.Overlays.Overlay, action: UpdateAction);
}
export declare class ConsentDialogVisibilityChange extends Event {
    isVisible: boolean;
    static readonly eventName = "consentdialogvisibilitychange";
    constructor(isVisible: boolean);
}
export declare class TimeRangeMouseOverEvent extends Event {
    overlay: Trace.Types.Overlays.TimeRangeLabel;
    static readonly eventName = "timerangemouseoverevent";
    constructor(overlay: Trace.Types.Overlays.TimeRangeLabel);
}
export declare class TimeRangeMouseOutEvent extends Event {
    static readonly eventName = "timerangemouseoutevent";
    constructor();
}
export declare class EntryLabelMouseClick extends Event {
    overlay: Trace.Types.Overlays.EntryLabel;
    static readonly eventName = "entrylabelmouseclick";
    constructor(overlay: Trace.Types.Overlays.EntryLabel);
}
export declare class EventReferenceClick extends Event {
    event: Trace.Types.Events.Event;
    static readonly eventName = "eventreferenceclick";
    constructor(event: Trace.Types.Events.Event);
}
/**
 * This class manages all the overlays that get drawn onto the performance
 * timeline. Overlays are DOM and are drawn above the network and main flame
 * chart.
 *
 * For more documentation, see `timeline/README.md` which has a section on overlays.
 */
export declare class Overlays extends EventTarget {
    #private;
    constructor(init: {
        container: HTMLElement;
        flameChartsContainers: {
            main: HTMLElement;
            network: HTMLElement;
        };
        charts: TimelineCharts;
        entryQueries: OverlayEntryQueries;
    });
    toggleAllOverlaysDisplayed(allOverlaysDisplayed: boolean): void;
    /**
     * Add a new overlay to the view.
     */
    add<T extends Trace.Types.Overlays.Overlay>(newOverlay: T): T;
    /**
     * Update an existing overlay without destroying and recreating its
     * associated DOM.
     *
     * This is useful if you need to rapidly update an overlay's data - e.g.
     * dragging to create time ranges - without the thrashing of destroying the
     * old overlay and re-creating the new one.
     */
    updateExisting<T extends Trace.Types.Overlays.Overlay>(existingOverlay: T, newData: Partial<T>): void;
    enterLabelEditMode(overlay: Trace.Types.Overlays.EntryLabel): void;
    bringLabelForward(overlay: Trace.Types.Overlays.EntryLabel): void;
    /**
     * @returns the list of overlays associated with a given entry.
     */
    overlaysForEntry(entry: Trace.Types.Overlays.OverlayEntry): Trace.Types.Overlays.Overlay[];
    /**
     * Used for debugging and testing. Do not mutate the element directly using
     * this method.
     */
    elementForOverlay(overlay: Trace.Types.Overlays.Overlay): HTMLElement | null;
    /**
     * Removes any active overlays that match the provided type.
     * @returns the number of overlays that were removed.
     */
    removeOverlaysOfType(type: Trace.Types.Overlays.Overlay['type']): number;
    /**
     * @returns all overlays that match the provided type.
     */
    overlaysOfType<T extends Trace.Types.Overlays.Overlay>(type: T['type']): Array<NoInfer<T>>;
    /**
     * @returns all overlays.
     */
    allOverlays(): Trace.Types.Overlays.Overlay[];
    /**
     * Removes the provided overlay from the list of overlays and destroys any
     * DOM associated with it.
     */
    remove(overlay: Trace.Types.Overlays.Overlay): void;
    /**
     * Update the dimensions of a chart.
     * IMPORTANT: this does not trigger a re-draw. You must call the render() method manually.
     */
    updateChartDimensions(chart: EntryChartLocation, dimensions: FlameChartDimensions): void;
    /**
     * Update the visible window of the UI.
     * IMPORTANT: this does not trigger a re-draw. You must call the render() method manually.
     */
    updateVisibleWindow(visibleWindow: Trace.Types.Timing.TraceWindowMicro): void;
    /**
     * Clears all overlays and all data. Call this when the trace is changing
     * (e.g. the user has imported/recorded a new trace) and we need to start from
     * scratch and remove all overlays relating to the previous trace.
     */
    reset(): void;
    /**
     * Updates the Overlays UI: new overlays will be rendered onto the view, and
     * existing overlays will have their positions changed to ensure they are
     * rendered in the right place.
     */
    update(): Promise<void>;
    highlightOverlay(overlay: Trace.Types.Overlays.EntryLabel): void;
    undimAllEntryLabels(): void;
    /**
     * @returns true if the entry is visible on chart, which means that both
     * horizontally and vertically it is at least partially in view.
     */
    entryIsVisibleOnChart(entry: Trace.Types.Overlays.OverlayEntry): boolean;
    /**
     * Calculate the X pixel position for an event start on the timeline.
     * @param chartName the chart that the event is on. It is expected that both
     * charts have the same width so this doesn't make a difference - but it might
     * in the future if the UI changes, hence asking for it.
     * @param event the trace event you want to get the pixel position of
     */
    xPixelForEventStartOnChart(event: Trace.Types.Overlays.OverlayEntry): number | null;
    /**
     * Calculate the X pixel position for an event end on the timeline.
     * @param chartName the chart that the event is on. It is expected that both
     * charts have the same width so this doesn't make a difference - but it might
     * in the future if the UI changes, hence asking for it.
     * @param event the trace event you want to get the pixel position of
     */
    xPixelForEventEndOnChart(event: Trace.Types.Overlays.OverlayEntry): number | null;
    /**
     * Calculate the Y pixel position for the event on the timeline relative to
     * the entire window.
     * This means if the event is in the main flame chart and below the network,
     * we add the height of the network chart to the Y value to position it
     * correctly.
     * This can return null if any data was missing, or if the event is not
     * visible (if the level it's on is hidden because the track is collapsed,
     * for example)
     */
    yPixelForEventOnChart(event: Trace.Types.Overlays.OverlayEntry): number | null;
    /**
     * Calculate the height of the event on the timeline.
     */
    pixelHeightForEventOnChart(event: Trace.Types.Overlays.OverlayEntry): number | null;
    /**
     * Calculate the height of the network chart. If the network chart has
     * height, we also allow for the size of the resize handle shown between the
     * two charts.
     *
     * Note that it is possible for the chart to have 0 height if the user is
     * looking at a trace with no network requests.
     */
    networkChartOffsetHeight(): number;
}
/**
 * Because entries can be a TimelineFrame, which is not a trace event, this
 * helper exists to return a consistent set of timings regardless of the type
 * of entry.
 */
export declare function timingsForOverlayEntry(entry: Trace.Types.Overlays.OverlayEntry): Trace.Helpers.Timing.EventTimingsData<Trace.Types.Timing.Micro>;
/**
 * Defines if the overlay container `div` should have a jslog context attached.
 * Note that despite some of the overlays being used currently exclusively
 * for annotations, we log here with `overlays` to be generic as overlays can
 * be used for insights, annotations or in the future, who knows...
 */
export declare function jsLogContext(overlay: Trace.Types.Overlays.Overlay): string | null;
export {};
