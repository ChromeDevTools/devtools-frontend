import * as Trace from '../../models/trace/trace.js';
import * as Geometry from '../../ui/geometry/geometry.js';
import { type CompatibilityTracksAppender, type DrawOverride, type PopoverInfo, type TrackAppender, type TrackAppenderName } from './CompatibilityTracksAppender.js';
export declare class LayoutShiftsTrackAppender implements TrackAppender {
    #private;
    readonly appenderName: TrackAppenderName;
    constructor(compatibilityBuilder: CompatibilityTracksAppender, parsedTrace: Trace.TraceModel.ParsedTrace);
    /**
     * Appends into the flame chart data the data corresponding to the
     * layout shifts track.
     * @param trackStartLevel the horizontal level of the flame chart events where
     * the track's events will start being appended.
     * @param expanded whether the track should be rendered expanded.
     * @returns the first available level to append more data after having
     * appended the track's events.
     */
    appendTrackAtLevel(trackStartLevel: number, expanded?: boolean): number;
    /**
     * Gets the color an event added by this appender should be rendered with.
     */
    colorForEvent(event: Trace.Types.Events.Event): string;
    setPopoverInfo(event: Trace.Types.Events.Event, info: PopoverInfo): void;
    getDrawOverride(event: Trace.Types.Events.Event): DrawOverride | undefined;
    preloadScreenshots(events: Trace.Types.Events.SyntheticLayoutShift[]): Promise<Array<void | undefined>>;
    titleForEvent(_event: Trace.Types.Events.Event): string;
    static createShiftViz(event: Trace.Types.Events.SyntheticLayoutShift, parsedTrace: Trace.TraceModel.ParsedTrace, maxSize: Geometry.Size): HTMLElement | undefined;
}
