import * as Trace from '../../../models/trace/trace.js';
import type { ActiveInsight } from './Sidebar.js';
export interface SidebarSingleInsightSetData {
    insightSetKey: Trace.Types.Events.NavigationId | null;
    activeCategory: Trace.Insights.Types.InsightCategory;
    activeInsight: ActiveInsight | null;
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
}
interface CategorizedInsightData {
    insightName: string;
    model: Trace.Insights.Types.InsightModel;
}
export declare class SidebarSingleInsightSet extends HTMLElement {
    #private;
    set data(data: SidebarSingleInsightSetData);
    connectedCallback(): void;
    disconnectedCallback(): void;
    highlightActiveInsight(): void;
    static categorizeInsights(insightSets: Trace.Insights.Types.TraceInsightSets | null, insightSetKey: string, activeCategory: Trace.Insights.Types.InsightCategory): {
        shownInsights: CategorizedInsightData[];
        passedInsights: CategorizedInsightData[];
    };
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-sidebar-single-navigation': SidebarSingleInsightSet;
    }
}
export {};
