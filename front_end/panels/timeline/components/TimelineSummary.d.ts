import type * as Trace from '../../../models/trace/trace.js';
export interface CategoryData {
    value: number;
    color: string;
    title: string;
}
export interface SummaryTableData {
    total: number;
    rangeStart: number;
    rangeEnd: number;
    categories: CategoryData[];
    selectedEvents: Trace.Types.Events.Event[];
}
export declare class CategorySummary extends HTMLElement {
    #private;
    set data(data: SummaryTableData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-timeline-summary': CategorySummary;
    }
}
