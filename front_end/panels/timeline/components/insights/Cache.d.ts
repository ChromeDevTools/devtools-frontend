import './Table.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { type TableDataRow } from './Table.js';
export declare class Cache extends BaseInsightComponent<Trace.Insights.Models.Cache.CacheInsightModel> {
    internalName: string;
    protected hasAskAiSupport(): boolean;
    mapToRow(req: Trace.Insights.Models.Cache.CacheableRequest): TableDataRow;
    createAggregatedTableRow(remaining: Trace.Insights.Models.Cache.CacheableRequest[]): TableDataRow;
    renderContent(): Lit.LitTemplate;
}
