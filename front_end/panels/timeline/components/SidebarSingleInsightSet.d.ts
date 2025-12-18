import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import type { ActiveInsight } from './Sidebar.js';
export interface SidebarSingleInsightSetData {
    insightSetKey: Trace.Types.Events.NavigationId | null;
    activeCategory: Trace.Insights.Types.InsightCategory;
    activeInsight: ActiveInsight | null;
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
}
interface InsightData {
    insightName: string;
    model: Trace.Insights.Types.InsightModel;
}
interface LocalMetrics {
    lcp: {
        value: Trace.Types.Timing.Micro;
        event: Trace.Types.Events.AnyLargestContentfulPaintCandidate;
    } | null;
    cls: {
        value: number;
        worstClusterEvent: Trace.Types.Events.Event | null;
    };
    inp: {
        value: Trace.Types.Timing.Micro;
        event: Trace.Types.Events.SyntheticInteractionPair;
    } | null;
}
interface ViewInput {
    shownInsights: InsightData[];
    passedInsights: InsightData[];
    local: LocalMetrics | null;
    field: Trace.Insights.Common.CrUXFieldMetricResults | null;
    activeCategory: Trace.Insights.Types.InsightCategory;
    showFieldMismatchNotice: boolean;
    onDismisFieldMismatchNotice: () => void;
    onClickMetric: (traceEvent: Trace.Types.Events.Event) => void;
    renderInsightComponent: (insightData: InsightData) => Lit.LitTemplate;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class SidebarSingleInsightSet extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: SidebarSingleInsightSetData);
    willHide(): void;
    highlightActiveInsight(): void;
    static categorizeInsights(insightSets: Trace.Insights.Types.TraceInsightSets | null, insightSetKey: string, activeCategory: Trace.Insights.Types.InsightCategory): {
        shownInsights: InsightData[];
        passedInsights: InsightData[];
    };
    performUpdate(): void;
}
export {};
