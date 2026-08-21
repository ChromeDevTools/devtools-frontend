import '../../../../ui/components/linkifier/linkifier.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class SlowCSSSelector extends BaseInsightComponent<Trace.Insights.Models.SlowCSSSelector.SlowCSSSelectorInsightModel> {
    #private;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    private toSourceFileLocation;
    private getSelectorLinks;
    renderContent(): Lit.LitTemplate;
}
