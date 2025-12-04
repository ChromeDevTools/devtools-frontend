import type { ThirdPartiesInsightModel } from '../../../../models/trace/insights/ThirdParties.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class ThirdParties extends BaseInsightComponent<ThirdPartiesInsightModel> {
    #private;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    renderContent(): Lit.LitTemplate;
}
