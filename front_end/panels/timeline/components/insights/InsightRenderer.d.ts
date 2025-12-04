import type * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import type { BaseInsightComponent } from './BaseInsightComponent.js';
type InsightWidgetElement = UI.Widget.WidgetElement<BaseInsightComponent<Trace.Insights.Types.InsightModel>>;
export declare class InsightRenderer {
    #private;
    renderInsightToWidgetElement(parsedTrace: Trace.TraceModel.ParsedTrace, insightSet: Trace.Insights.Types.InsightSet, model: Trace.Insights.Types.InsightModel, insightName: string, options: Partial<BaseInsightComponent<Trace.Insights.Types.InsightModel>>): InsightWidgetElement;
}
export {};
