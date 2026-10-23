import * as Trace from '../../models/trace/trace.js';
/**
 * Describes a flame chart entry for the AI agent that receives comments on
 * it. The entry title is already sent as the anchor's text signature, so the
 * lines add what identifies the entry in the trace and where its code is: the
 * trace event name, the entry's timing, its track, its source location, its
 * call path, its warnings and the page that was traced.
 *
 * Times are relative to the start of the trace, which is where the
 * Performance panel's time ruler starts.
 *
 * Lines without a value are omitted.
 */
export declare function agentContextForEntry(event: Trace.Types.Events.Event, trackName: string | null, parsedTrace: Trace.TraceModel.ParsedTrace): string[];
