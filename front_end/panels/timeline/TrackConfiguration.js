/**
 * Builds an array of group configs that we persist in memory and to disk when
 * the trace is saved. The order of the final array represents the user visible
 * order of the groups on the timeline.
 * The groups will be supplied in their original order; once they are defined
 * they do not change the order. What changes is the array of indexes that
 * represents the order in the UI. For example, this might be [1, 2, 0], which
 * means the group that was first (index 0) is now last.
 */
export function buildPersistedConfig(groups, indexesInVisualOrder) {
    return groups.map((group, index) => {
        // indexesInVisualOrder will look like [0, 2, 3, 4, 1];
        // In this case the group originally at index 1 should now be last.
        // So to get the new index, we look up the position of the old index in the indexesInVisualOrder array.
        const newVisualIndex = indexesInVisualOrder.indexOf(index);
        return {
            expanded: Boolean(group.expanded),
            hidden: Boolean(group.hidden),
            originalIndex: index,
            visualIndex: newVisualIndex,
            trackName: group.name,
        };
    });
}
/**
 * Defines the key that is used when storing trace group configs into memory.
 * We store them with a key to ensure that if the user has >1 active traces, the configs are persisted but do not clash.
 * There is no guaranteed uuid for a trace file; but given that the timestamps
 * are monotonic microseconds, the chances of the user having more than one
 * trace with the exact same start time is very unlikely.
 * It's not impossible, but unlikely enough that we think the min trace bounds time is a good enough value to use as a uuid.
 */
export function keyForTraceConfig(trace) {
    return trace.Meta.traceBounds.min;
}
//# sourceMappingURL=TrackConfiguration.js.map