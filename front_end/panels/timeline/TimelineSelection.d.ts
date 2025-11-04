import * as Trace from '../../models/trace/trace.js';
/**
 * We could add a `type` field here to distinguish them, but it is not needed
 * as we use the existence of "event" or "bounds" to do that.
 **/
export interface EventSelection {
    event: Trace.Types.Events.Event;
}
export interface TimeRangeSelection {
    bounds: Trace.Types.Timing.TraceWindowMicro;
}
export type TimelineSelection = EventSelection | TimeRangeSelection;
export declare function selectionFromEvent(event: Trace.Types.Events.Event): EventSelection;
export declare function selectionFromRangeMicroSeconds(min: Trace.Types.Timing.Micro, max: Trace.Types.Timing.Micro): TimeRangeSelection;
export declare function selectionFromRangeMilliSeconds(min: Trace.Types.Timing.Milli, max: Trace.Types.Timing.Milli): TimeRangeSelection;
export declare function selectionIsEvent(selection: TimelineSelection | null): selection is EventSelection;
export declare function selectionIsRange(selection: TimelineSelection | null): selection is TimeRangeSelection;
export declare function rangeForSelection(selection: TimelineSelection): Trace.Types.Timing.TraceWindowMicro;
export declare function selectionsEqual(s1: TimelineSelection, s2: TimelineSelection): boolean;
