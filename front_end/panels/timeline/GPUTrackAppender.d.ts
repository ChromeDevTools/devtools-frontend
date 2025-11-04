import * as Trace from '../../models/trace/trace.js';
import { type CompatibilityTracksAppender, type TrackAppender, type TrackAppenderName } from './CompatibilityTracksAppender.js';
export declare class GPUTrackAppender implements TrackAppender {
    #private;
    readonly appenderName: TrackAppenderName;
    constructor(compatibilityBuilder: CompatibilityTracksAppender, parsedTrace: Trace.TraceModel.ParsedTrace);
    /**
     * Appends into the flame chart data the data corresponding to the
     * GPU track.
     * @param trackStartLevel the horizontal level of the flame chart events where
     * the track's events will start being appended.
     * @param expanded whether the track should be rendered expanded.
     * @returns the first available level to append more data after having
     * appended the track's events.
     */
    appendTrackAtLevel(trackStartLevel: number, expanded?: boolean | undefined): number;
    /**
     * Gets the color an event added by this appender should be rendered with.
     */
    colorForEvent(event: Trace.Types.Events.Event): string;
}
