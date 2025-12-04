import '../../../../ui/kit/kit.js';
import './Table.js';
import type { DOMSizeInsightModel } from '../../../../models/trace/insights/DOMSize.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class DOMSize extends BaseInsightComponent<DOMSizeInsightModel> {
    #private;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    renderContent(): Lit.LitTemplate;
}
