import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare function getFieldMetrics(parsedTrace: Trace.TraceModel.ParsedTrace | null, insightSetKey: string | null): Trace.Insights.Common.CrUXFieldMetricResults | null;
interface MetricsViewInput {
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
    insightSetKey: string | null;
    didDismissFieldMismatchNotice: boolean;
    onDismisFieldMismatchNotice: () => void;
    onClickMetric: (traceEvent: Trace.Types.Events.Event) => void;
}
type MetricsView = (input: MetricsViewInput, output: undefined, target: HTMLElement) => void;
export interface CWVMetricsData {
    insightSetKey: Trace.Types.Events.NavigationId | null;
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
}
export declare class CWVMetrics extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: MetricsView);
    set data(data: CWVMetricsData);
    performUpdate(): void;
}
export {};
