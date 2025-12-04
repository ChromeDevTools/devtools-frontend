import './Table.js';
import type { DuplicatedJavaScriptInsightModel } from '../../../../models/trace/insights/DuplicatedJavaScript.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class DuplicatedJavaScript extends BaseInsightComponent<DuplicatedJavaScriptInsightModel> {
    #private;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    getEstimatedSavingsTime(): Trace.Types.Timing.Milli | null;
    renderContent(): Lit.LitTemplate;
}
