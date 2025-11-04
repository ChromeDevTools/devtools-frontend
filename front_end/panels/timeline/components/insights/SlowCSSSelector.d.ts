import './Table.js';
import '../../../../ui/components/linkifier/linkifier.js';
import type { SlowCSSSelectorInsightModel } from '../../../../models/trace/insights/SlowCSSSelector.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class SlowCSSSelector extends BaseInsightComponent<SlowCSSSelectorInsightModel> {
    #private;
    static readonly litTagName: Lit.StaticHtml.StaticValue;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    private toSourceFileLocation;
    private getSelectorLinks;
    renderContent(): Lit.LitTemplate;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-slow-css-selector': SlowCSSSelector;
    }
}
