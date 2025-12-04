import type { RenderBlockingInsightModel } from '../../../../models/trace/insights/RenderBlocking.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { type TableDataRow } from './Table.js';
export declare class RenderBlocking extends BaseInsightComponent<RenderBlockingInsightModel> {
    internalName: string;
    mapToRow(request: Trace.Types.Events.SyntheticNetworkRequest): TableDataRow;
    createAggregatedTableRow(remaining: Trace.Types.Events.SyntheticNetworkRequest[]): TableDataRow;
    protected hasAskAiSupport(): boolean;
    getEstimatedSavingsTime(): Trace.Types.Timing.Milli | null;
    renderContent(): Lit.LitTemplate;
}
