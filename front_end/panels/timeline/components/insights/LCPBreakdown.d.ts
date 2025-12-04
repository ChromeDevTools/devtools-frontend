import './Table.js';
import type { LCPBreakdownInsightModel } from '../../../../models/trace/insights/LCPBreakdown.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
export declare class LCPBreakdown extends BaseInsightComponent<LCPBreakdownInsightModel> {
    #private;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    protected createOverlays(): Trace.Types.Overlays.Overlay[];
    toggleTemporaryOverlays(overlays: Trace.Types.Overlays.Overlay[] | null, options: Overlays.Overlays.TimelineOverlaySetOptions): void;
    getOverlayOptionsForInitialOverlays(): Overlays.Overlays.TimelineOverlaySetOptions;
    renderContent(): Lit.LitTemplate;
}
