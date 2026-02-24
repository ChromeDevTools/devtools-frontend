import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
interface ViewInput {
    showRequestHeadersText: boolean;
    showResponseHeadersText: boolean;
    request: SDK.NetworkRequest.NetworkRequest;
    toggleShowRawResponseHeaders: () => void;
    toggleShowRawRequestHeaders: () => void;
    revealHeadersFile?: () => void;
    toReveal?: {
        section: NetworkForward.UIRequestLocation.UIHeaderSection;
        header?: string;
    };
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RequestHeadersView extends UI.Widget.Widget {
    #private;
    get request(): SDK.NetworkRequest.NetworkRequest | undefined;
    set request(val: SDK.NetworkRequest.NetworkRequest | undefined);
    constructor(target?: HTMLElement, view?: View);
    wasShown(): void;
    willHide(): void;
    revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header?: string): void;
    performUpdate(): void;
}
export declare function renderCategory(data: {
    name: string;
    title: Common.UIString.LocalizedString;
    contents: Lit.LitTemplate;
    loggingContext: string;
    headerCount?: number;
    checked?: boolean;
    additionalContent?: Lit.LitTemplate;
    forceOpen?: boolean;
    onToggleRawHeaders?: () => void;
}): Lit.LitTemplate;
export {};
