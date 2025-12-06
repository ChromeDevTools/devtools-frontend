import type { LCPDiscoveryInsightModel } from '../../../../models/trace/insights/LCPDiscovery.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class LCPDiscovery extends BaseInsightComponent<LCPDiscoveryInsightModel> {
    #private;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    protected createOverlays(): Trace.Types.Overlays.Overlay[];
    getEstimatedSavingsTime(): Trace.Types.Timing.Milli | null;
    renderContent(): Lit.LitTemplate;
}
