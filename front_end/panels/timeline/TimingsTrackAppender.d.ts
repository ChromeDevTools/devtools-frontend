import type * as Common from '../../core/common/common.js';
import * as Trace from '../../models/trace/trace.js';
import { type CompatibilityTracksAppender, type PopoverInfo, type TrackAppender, type TrackAppenderName } from './CompatibilityTracksAppender.js';
import type { TimelineMarkerStyle } from './TimelineUIUtils.js';
/**
 * This defines the order these markers will be rendered if they are at the
 * same timestamp. The smaller number will be shown first - e.g. so if MarkFCP,
 * MarkDOMContent and MarkLCPCandidate have the same timestamp, visually we
 * will render [FCP][DCL][LCP] everytime.
 */
export declare const SORT_ORDER_PAGE_LOAD_MARKERS: Readonly<Record<string, number>>;
export declare class TimingsTrackAppender implements TrackAppender {
    #private;
    readonly appenderName: TrackAppenderName;
    constructor(compatibilityBuilder: CompatibilityTracksAppender, parsedTrace: Trace.TraceModel.ParsedTrace, colorGenerator: Common.Color.Generator);
    /**
     * Appends into the flame chart data the data corresponding to the
     * timings track.
     * @param trackStartLevel the horizontal level of the flame chart events where
     * the track's events will start being appended.
     * @param expanded whether the track should be rendered expanded.
     * @returns the first available level to append more data after having
     * appended the track's events.
     */
    appendTrackAtLevel(trackStartLevel: number, expanded?: boolean): number;
    /**
     * Gets the style for a page load marker event.
     */
    markerStyleForPageLoadEvent(markerEvent: Trace.Types.Events.PageLoadEvent): TimelineMarkerStyle;
    markerStyleForExtensionMarker(markerEvent: Trace.Types.Extensions.SyntheticExtensionMarker): TimelineMarkerStyle;
    /**
     * Gets the color an event added by this appender should be rendered with.
     */
    colorForEvent(event: Trace.Types.Events.Event): string;
    /**
     * Gets the title an event added by this appender should be rendered with.
     */
    titleForEvent(event: Trace.Types.Events.Event): string;
    setPopoverInfo(event: Trace.Types.Events.Event, info: PopoverInfo): void;
}
