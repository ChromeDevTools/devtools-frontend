import type * as Trace from '../../../../models/trace/trace.js';
export interface ActiveInsight {
    name: string;
    insightSetKey: string;
    createOverlayFn: (() => Trace.Types.Overlays.Overlay[]);
}
