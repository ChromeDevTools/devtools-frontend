import type * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import { type CompatibilityTracksAppender, type PopoverInfo, type TrackAppender, type TrackAppenderName } from './CompatibilityTracksAppender.js';
export declare class InteractionsTrackAppender implements TrackAppender {
    #private;
    readonly appenderName: TrackAppenderName;
    constructor(compatibilityBuilder: CompatibilityTracksAppender, parsedTrace: Trace.TraceModel.ParsedTrace, colorGenerator: Common.Color.Generator);
    /**
     * Appends into the flame chart data the data corresponding to the
     * interactions track.
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
}
