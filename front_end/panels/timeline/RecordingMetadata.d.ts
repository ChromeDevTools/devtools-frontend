import type * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import * as Trace from '../../models/trace/trace.js';
export interface DataFromController {
    recordingStartTime?: number;
    cruxFieldData?: CrUXManager.PageResult[] | null;
}
/**
 * We do not track any custom metadata for CPU Profiles.
 */
export declare function forCPUProfile(): Trace.Types.File.MetaData;
/**
 * Calculates and returns the Metadata for the last trace recording.
 * Wrapped in a try/catch because if anything goes wrong, we don't want to
 * break DevTools; we would rather just store no metadata.
 */
export declare function forTrace(dataFromController?: DataFromController): Promise<Trace.Types.File.MetaData>;
