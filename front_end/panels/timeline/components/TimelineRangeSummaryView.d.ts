import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as TimelineSummary from './TimelineSummary.js';
export interface TimelineRangeSummaryViewData {
    rangeStart: number;
    rangeEnd: number;
    total: number;
    categories: TimelineSummary.CategoryData[];
    thirdPartyTreeTemplate?: Lit.LitTemplate;
}
type View = (input: TimelineRangeSummaryViewData, output: undefined, target: HTMLElement) => void;
export declare const TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW: View;
export declare class TimelineRangeSummaryView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: TimelineRangeSummaryViewData);
    performUpdate(): void;
}
export {};
