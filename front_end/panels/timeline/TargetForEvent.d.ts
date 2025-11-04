import * as SDK from '../../core/sdk/sdk.js';
import type * as Trace from '../../models/trace/trace.js';
/**
 * If the event's thread was identified as belonging to a worker, this will
 * return the target representing that worker. Otherwise, we return the primary
 * page's target.
 **/
export declare function targetForEvent(parsedTrace: Trace.TraceModel.ParsedTrace, event: Trace.Types.Events.Event): SDK.Target.Target | null;
