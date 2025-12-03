import './Table.js';
import '../../../../ui/kit/kit.js';
import type { CriticalRequestNode, NetworkDependencyTreeInsightModel } from '../../../../models/trace/insights/NetworkDependencyTree.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { type TableDataRow } from './Table.js';
export declare const MAX_CHAINS_TO_SHOW = 5;
export declare class NetworkDependencyTree extends BaseInsightComponent<NetworkDependencyTreeInsightModel> {
    #private;
    static readonly litTagName: Lit.StaticHtml.StaticValue;
    internalName: string;
    protected hasAskAiSupport(): boolean;
    mapNetworkDependencyToRow(node: CriticalRequestNode): TableDataRow | null;
    renderContent(): Lit.LitTemplate;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-long-critical-network-tree': NetworkDependencyTree;
    }
}
