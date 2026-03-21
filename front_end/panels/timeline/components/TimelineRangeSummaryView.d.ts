import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
export interface TimelineRangeSummaryViewData {
    events: Trace.Types.Events.Event[];
    startTime: Trace.Types.Timing.Milli;
    endTime: Trace.Types.Timing.Milli;
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
    thirdPartyTreeTemplate: Lit.TemplateResult | null;
}
type View = (input: TimelineRangeSummaryViewData, output: undefined, target: HTMLElement) => void;
type TimeRangeCategoryStats = Record<string, number>;
export declare const TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW: View;
export declare class TimelineRangeSummaryView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: TimelineRangeSummaryViewData);
    performUpdate(): void;
}
export declare function statsForTimeRange(events: Trace.Types.Events.Event[], startTime: Trace.Types.Timing.Milli, endTime: Trace.Types.Timing.Milli): TimeRangeCategoryStats;
export {};
