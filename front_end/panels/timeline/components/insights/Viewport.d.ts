import './NodeLink.js';
import type { ViewportInsightModel } from '../../../../models/trace/insights/Viewport.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class Viewport extends BaseInsightComponent<ViewportInsightModel> {
    static readonly litTagName: Lit.StaticHtml.StaticValue;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    getEstimatedSavingsTime(): Trace.Types.Timing.Milli | null;
    renderContent(): Lit.LitTemplate;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-viewport': Viewport;
    }
}
