import '../../../ui/components/report_view/report_view.js';
import '../../../ui/kit/kit.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
type Status = 'Success' | 'Failure';
export interface ViewInput {
    params?: Array<{
        name: string;
        value: string | string[];
        isCode?: boolean;
    }>;
    status?: Status;
    description?: string;
    issuedTokenCount?: number;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RequestTrustTokensView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    get request(): SDK.NetworkRequest.NetworkRequest | null;
    set request(request: SDK.NetworkRequest.NetworkRequest | null);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export declare function statusConsideredSuccess(status: Protocol.Network.TrustTokenOperationDoneEventStatus): boolean;
export {};
