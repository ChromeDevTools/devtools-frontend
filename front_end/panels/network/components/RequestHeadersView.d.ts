import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Lit from '../../../ui/lit/lit.js';
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
export declare class ToggleRawHeadersEvent extends Event {
    static readonly eventName = "togglerawevent";
    constructor();
}
export interface CategoryData {
    name: string;
    title: Common.UIString.LocalizedString;
    headerCount?: number;
    checked?: boolean;
    additionalContent?: Lit.LitTemplate;
    forceOpen?: boolean;
    loggingContext: string;
}
export declare class Category extends HTMLElement {
    #private;
    set data(data: CategoryData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-request-headers': RequestHeadersView;
        'devtools-request-headers-category': Category;
    }
}
