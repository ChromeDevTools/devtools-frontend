import * as Geometry from '../../models/geometry/geometry.js';
import * as Trace from '../../models/trace/trace.js';
import { type CompatibilityTracksAppender, type DrawOverride, type PopoverInfo, type TrackAppender, type TrackAppenderName } from './CompatibilityTracksAppender.js';
/**
 * Bit of a hack: LayoutShifts are instant events, so have no duration. But
 * OPP doesn't do well at making tiny events easy to spot and click. So we
 * set it to a small duration so that the user is able to see and click
 * them more easily. Long term we will explore a better UI solution to
 * allow us to do this properly and not hack around it.
 * TODO: Delete this once the new Layout Shift UI ships out of the TIMELINE_LAYOUT_SHIFT_DETAILS experiment
 **/
export declare const LAYOUT_SHIFT_SYNTHETIC_DURATION: Trace.Types.Timing.Micro;
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
