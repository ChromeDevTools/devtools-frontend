import * as Trace from '../../../models/trace/trace.js';
export declare function isIgnoreListedEntry(entry: Trace.Types.Events.Event): boolean;
/**
 * Returns the ignore reason for the given entry.
 *
 * This function should be called when `isIgnoreListedEntry(entry)` is true
 */
export declare function getIgnoredReasonString(entry: Trace.Types.Events.Event): string;
