import type { CharacterSetInsightModel } from '../../../../models/trace/insights/CharacterSet.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class CharacterSet extends BaseInsightComponent<CharacterSetInsightModel> {
    internalName: string;
    protected hasAskAiSupport(): boolean;
    getEstimatedSavingsTime(): Trace.Types.Timing.Milli | null;
    renderContent(): Lit.LitTemplate;
}
