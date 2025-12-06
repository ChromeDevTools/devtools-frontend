import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import type { ActiveInsight } from './Sidebar.js';
interface ViewInput {
    parsedTrace: Trace.TraceModel.ParsedTrace;
    labels: string[];
    activeInsightSet: Trace.Insights.Types.InsightSet | null;
    activeInsight: ActiveInsight | null;
    selectedCategory: Trace.Insights.Types.InsightCategory;
    onInsightSetToggled: (insightSet: Trace.Insights.Types.InsightSet) => void;
    onInsightSetHovered: (insightSet: Trace.Insights.Types.InsightSet) => void;
    onInsightSetUnhovered: () => void;
    onZoomClick: (insightSet: Trace.Insights.Types.InsightSet) => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class SidebarInsightsTab extends UI.Widget.Widget {
    #private;
    static createWidgetElement(): UI.Widget.WidgetElement<SidebarInsightsTab>;
    constructor(element?: HTMLElement, view?: View);
    set parsedTrace(data: Trace.TraceModel.ParsedTrace | null);
    get activeInsight(): ActiveInsight | null;
    set activeInsight(active: ActiveInsight | null);
    highlightActiveInsight(): void;
    performUpdate(): void;
}
export {};
