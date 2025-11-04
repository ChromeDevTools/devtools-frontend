import type * as Trace from '../../models/trace/trace.js';
/**
 * Generates a JSON representation of an array of objects with the objects
 * printed one per line for improved readability (but not *too* verbose).
 */
export declare function arrayOfObjectsJsonGenerator(arrayOfObjects: readonly Trace.Types.Events.Event[]): IterableIterator<string>;
/**
 * Generates a JSON representation of the TraceObject file line-by-line for a nicer printed
 * version with one trace event per line.
 */
export declare function traceJsonGenerator(traceEvents: readonly Trace.Types.Events.Event[], metadata: Readonly<Trace.Types.File.MetaData> | null): IterableIterator<string>;
