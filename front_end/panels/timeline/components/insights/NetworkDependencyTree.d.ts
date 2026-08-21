import './Table.js';
import '../../../../ui/kit/kit.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { type TableDataRow } from './Table.js';
export declare const MAX_CHAINS_TO_SHOW = 5;
export declare class NetworkDependencyTree extends BaseInsightComponent<Trace.Insights.Models.NetworkDependencyTree.NetworkDependencyTreeInsightModel> {
    #private;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    mapNetworkDependencyToRow(node: Trace.Insights.Models.NetworkDependencyTree.CriticalRequestNode): TableDataRow | null;
    renderContent(): Lit.LitTemplate;
}
