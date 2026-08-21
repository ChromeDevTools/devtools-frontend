import './Table.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { type TableDataRow } from './Table.js';
export declare class ForcedReflow extends BaseInsightComponent<Trace.Insights.Models.ForcedReflow.ForcedReflowInsightModel> {
    #private;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    mapToRow(data: Trace.Insights.Models.ForcedReflow.BottomUpCallStack): TableDataRow;
    createAggregatedTableRow(remaining: Trace.Insights.Models.ForcedReflow.BottomUpCallStack[]): TableDataRow;
    renderContent(): Lit.LitTemplate;
}
