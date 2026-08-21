import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class LegacyJavaScript extends BaseInsightComponent<Trace.Insights.Models.LegacyJavaScript.LegacyJavaScriptInsightModel> {
    #private;
    internalName: string;
    getEstimatedSavingsTime(): Trace.Types.Timing.Milli | null;
    protected hasAskAiSupport(): boolean;
    renderContent(): Lit.LitTemplate;
}
