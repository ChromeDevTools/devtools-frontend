import type * as Trace from '../../models/trace/trace.js';
export declare class TraceLoadEvent extends Event {
    duration: Trace.Types.Timing.Milli;
    static readonly eventName = "traceload";
    constructor(duration: Trace.Types.Timing.Milli);
}
declare global {
    interface HTMLElementEventMap {
        [TraceLoadEvent.eventName]: TraceLoadEvent;
    }
}
