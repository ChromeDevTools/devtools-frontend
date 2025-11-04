import type * as Trace from '../../models/trace/trace.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
/**
 * Builds an array of group configs that we persist in memory and to disk when
 * the trace is saved. The order of the final array represents the user visible
 * order of the groups on the timeline.
 * The groups will be supplied in their original order; once they are defined
 * they do not change the order. What changes is the array of indexes that
 * represents the order in the UI. For example, this might be [1, 2, 0], which
 * means the group that was first (index 0) is now last.
 */
export declare function buildPersistedConfig(groups: readonly PerfUI.FlameChart.Group[], indexesInVisualOrder: number[]): PerfUI.FlameChart.PersistedGroupConfig[];
/**
 * Defines the key that is used when storing trace group configs into memory.
 * We store them with a key to ensure that if the user has >1 active traces, the configs are persisted but do not clash.
 * There is no guaranteed uuid for a trace file; but given that the timestamps
 * are monotonic microseconds, the chances of the user having more than one
 * trace with the exact same start time is very unlikely.
 * It's not impossible, but unlikely enough that we think the min trace bounds time is a good enough value to use as a uuid.
 */
export declare function keyForTraceConfig(trace: Trace.Handlers.Types.HandlerData): Trace.Types.Timing.Micro;
