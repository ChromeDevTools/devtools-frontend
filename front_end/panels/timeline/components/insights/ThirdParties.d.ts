import type { ThirdPartiesInsightModel } from '../../../../models/trace/insights/ThirdParties.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class ThirdParties extends BaseInsightComponent<ThirdPartiesInsightModel> {
    #private;
    static readonly litTagName: Lit.StaticHtml.StaticValue;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    renderContent(): Lit.LitTemplate;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-third-parties': ThirdParties;
    }
}
