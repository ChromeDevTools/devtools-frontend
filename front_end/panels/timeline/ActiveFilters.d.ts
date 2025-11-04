import type * as Trace from '../../models/trace/trace.js';
/**
 * Singleton class that contains the set of active filters for the given trace
 * file.
 */
export declare class ActiveFilters {
    #private;
    static instance(opts?: {
        forceNew: boolean | null;
    }): ActiveFilters;
    static removeInstance(): void;
    activeFilters(): readonly Trace.Extras.TraceFilter.TraceFilter[];
    setFilters(newFilters: Trace.Extras.TraceFilter.TraceFilter[]): void;
    isVisible(event: Trace.Types.Events.Event): boolean;
}
