import '../../ui/kit/kit.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
export declare class RequestHeadersView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #private;
    constructor(request: SDK.NetworkRequest.NetworkRequest);
    wasShown(): void;
    willHide(): void;
    revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): Promise<void>;
    getHeaderElementById(id: string): Element | null;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-request-headers': RequestHeadersView;
    }
}
