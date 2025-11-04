import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import type * as Trace from '../../../models/trace/trace.js';
export type PhaseTable = Array<[string, Trace.Types.Timing.Milli, Trace.Types.Timing.Milli?]>;
export interface MetricCardData {
    metric: 'LCP' | 'CLS' | 'INP';
    localValue?: number;
    fieldValue?: number | string;
    histogram?: CrUXManager.MetricResponse['histogram'];
    tooltipContainer?: HTMLElement;
    phases?: PhaseTable;
    warnings?: string[];
}
export declare class MetricCard extends HTMLElement {
    #private;
    constructor();
    set data(data: MetricCardData);
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-metric-card': MetricCard;
    }
}
