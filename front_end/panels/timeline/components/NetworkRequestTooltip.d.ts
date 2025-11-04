import '../../../ui/components/icon_button/icon_button.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Lit from '../../../ui/lit/lit.js';
export interface NetworkTooltipData {
    networkRequest: Trace.Types.Events.SyntheticNetworkRequest | null;
    entityMapper: Trace.EntityMapper.EntityMapper | null;
}
export declare class NetworkRequestTooltip extends HTMLElement {
    #private;
    connectedCallback(): void;
    set data(data: NetworkTooltipData);
    static renderPriorityValue(networkRequest: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult;
    static renderTimings(networkRequest: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult | null;
    static renderRedirects(networkRequest: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult | null;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-network-request-tooltip': NetworkRequestTooltip;
    }
}
