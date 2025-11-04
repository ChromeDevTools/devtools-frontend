import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/components/menus/menus.js';
import * as SDK from '../../../core/sdk/sdk.js';
export declare class NetworkThrottlingSelector extends HTMLElement {
    #private;
    constructor();
    set recommendedConditions(recommendedConditions: SDK.NetworkManager.Conditions | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-network-throttling-selector': NetworkThrottlingSelector;
    }
}
