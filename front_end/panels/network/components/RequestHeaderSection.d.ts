import '../../../ui/legacy/legacy.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as NetworkForward from '../forward/forward.js';
export interface RequestHeaderSectionData {
    request: SDK.NetworkRequest.NetworkRequest;
    toReveal?: {
        section: NetworkForward.UIRequestLocation.UIHeaderSection;
        header?: string;
    };
}
export declare class RequestHeaderSection extends HTMLElement {
    #private;
    set data(data: RequestHeaderSectionData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-request-header-section': RequestHeaderSection;
    }
}
