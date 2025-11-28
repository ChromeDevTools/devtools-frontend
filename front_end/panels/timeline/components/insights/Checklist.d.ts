/**
 * @file A list of pass/fail conditions for an insight.
 */
import '../../../../ui/kit/kit.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
type GenericChecklist = Trace.Insights.Types.Checklist<any>;
export interface ChecklistData {
    checklist: GenericChecklist;
}
export interface TableDataRow {
    values: Array<number | string | Lit.LitTemplate>;
    overlays?: Trace.Types.Overlays.Overlay[];
}
export declare class Checklist extends HTMLElement {
    #private;
    set checklist(checklist: GenericChecklist);
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-checklist': Checklist;
    }
}
export {};
