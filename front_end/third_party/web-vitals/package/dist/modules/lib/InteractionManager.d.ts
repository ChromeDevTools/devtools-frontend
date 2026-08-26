import type { Metric } from '../types.js';
export interface Interaction {
    _latency: number;
    id: number;
    entries: PerformanceEventTiming[];
}
export declare class InteractionManager {
    /**
     * The interaction count at the start of the current navigation, so p98
     * interaction latencies only consider interactions since then.
     *
     * This is per-instance rather than module state: `initUnique()` gives every
     * `onINP()` call its own manager, and a shared counter would let whichever
     * instance resets first hide the interactions from all the others.
     */
    _prevInteractionCount: number;
    /**
     * A list of longest interactions on the page (by latency) sorted so the
     * longest one is first. The list is at most MAX_INTERACTIONS_TO_CONSIDER
     * long.
     */
    _longestInteractionList: Interaction[];
    /**
     * A mapping of longest interactions by their interaction ID.
     * This is used for faster lookup.
     */
    _longestInteractionMap: Map<number, Interaction>;
    _onBeforeProcessingEntry?: (entry: PerformanceEventTiming) => void;
    _onAfterProcessingINPCandidate?: (interaction: Interaction) => void;
    /**
     * Returns the interaction count since the start of the current navigation
     * (or the full page lifecycle if there were no soft navs / bfcache restores).
     */
    _getInteractionCountForNavigation(): number;
    _resetInteractions(): void;
    /**
     * Returns the estimated p98 longest interaction based on the stored
     * interaction candidates and the interaction count for the current page.
     */
    _estimateP98LongestInteraction(navigationType: Metric['navigationType']): Interaction;
    /**
     * Takes a performance entry and adds it to the list of worst interactions
     * if its duration is long enough to make it among the worst. If the
     * entry is part of an existing interaction, it is merged and the latency
     * and entries list is updated as needed.
     */
    _processEntry(entry: PerformanceEventTiming): void;
}
