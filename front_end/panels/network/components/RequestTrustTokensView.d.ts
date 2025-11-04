import '../../../ui/components/report_view/report_view.js';
import '../../../ui/components/icon_button/icon_button.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
export declare class RequestTrustTokensView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #private;
    constructor(request: SDK.NetworkRequest.NetworkRequest);
    wasShown(): void;
    willHide(): void;
    render(): Promise<void>;
}
export declare function statusConsideredSuccess(status: Protocol.Network.TrustTokenOperationDoneEventStatus): boolean;
declare global {
    interface HTMLElementTagNameMap {
        'devtools-trust-token-report': RequestTrustTokensView;
    }
}
