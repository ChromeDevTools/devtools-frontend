import type { CLSCulpritsInsightModel } from '../../../../models/trace/insights/CLSCulprits.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class CLSCulprits extends BaseInsightComponent<CLSCulpritsInsightModel> {
    #private;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    createOverlays(): Trace.Types.Overlays.Overlay[];
    renderContent(): Lit.LitTemplate;
}
