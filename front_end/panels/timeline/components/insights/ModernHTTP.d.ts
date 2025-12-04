import './Table.js';
import type { ModernHTTPInsightModel } from '../../../../models/trace/insights/ModernHTTP.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { type TableDataRow } from './Table.js';
export declare class ModernHTTP extends BaseInsightComponent<ModernHTTPInsightModel> {
    internalName: string;
    protected hasAskAiSupport(): boolean;
    getEstimatedSavingsTime(): Trace.Types.Timing.Milli | null;
    createOverlays(): Trace.Types.Overlays.Overlay[];
    mapToRow(req: Trace.Types.Events.SyntheticNetworkRequest): TableDataRow;
    createAggregatedTableRow(remaining: Trace.Types.Events.SyntheticNetworkRequest[]): TableDataRow;
    renderContent(): Lit.LitTemplate;
}
