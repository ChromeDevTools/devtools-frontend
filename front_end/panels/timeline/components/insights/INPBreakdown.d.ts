import './Table.js';
import type { INPBreakdownInsightModel } from '../../../../models/trace/insights/INPBreakdown.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class INPBreakdown extends BaseInsightComponent<INPBreakdownInsightModel> {
    static readonly litTagName: Lit.StaticHtml.StaticValue;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    renderContent(): Lit.LitTemplate;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-inp-breakdown': INPBreakdown;
    }
}
