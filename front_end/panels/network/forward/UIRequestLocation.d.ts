import type * as SDK from '../../../core/sdk/sdk.js';
import type * as TextUtils from '../../../models/text_utils/text_utils.js';
export declare const enum UIHeaderSection {
    GENERAL = "General",
    REQUEST = "Request",
    RESPONSE = "Response",
    EARLY_HINTS = "EarlyHints"
}
interface UIHeaderLocation {
    section: UIHeaderSection;
    header: SDK.NetworkRequest.NameValue | null;
}
export declare const enum UIRequestTabs {
    COOKIES = "cookies",
    EVENT_SOURCE = "eventSource",
    HEADERS_COMPONENT = "headers-component",
    PAYLOAD = "payload",
    INITIATOR = "initiator",
    PREVIEW = "preview",
    RESPONSE = "response",
    TIMING = "timing",
    TRUST_TOKENS = "trust-tokens",
    WS_FRAMES = "web-socket-frames",
    DIRECT_SOCKET_CONNECTION = "direct-socket-connection",
    DIRECT_SOCKET_CHUNKS = "direct-socket-chunks"
}
export interface FilterOptions {
    clearFilter: boolean;
}
export declare class UIRequestLocation {
    readonly request: SDK.NetworkRequest.NetworkRequest;
    readonly header: UIHeaderLocation | null;
    readonly searchMatch: TextUtils.ContentProvider.SearchMatch | null;
    readonly isUrlMatch: boolean;
    readonly tab: UIRequestTabs | undefined;
    readonly filterOptions: FilterOptions | undefined;
    constructor(request: SDK.NetworkRequest.NetworkRequest, header: UIHeaderLocation | null, searchMatch: TextUtils.ContentProvider.SearchMatch | null, urlMatch: boolean, tab: UIRequestTabs | undefined, filterOptions: FilterOptions | undefined);
    static requestHeaderMatch(request: SDK.NetworkRequest.NetworkRequest, header: SDK.NetworkRequest.NameValue | null): UIRequestLocation;
    static responseHeaderMatch(request: SDK.NetworkRequest.NetworkRequest, header: SDK.NetworkRequest.NameValue | null): UIRequestLocation;
    static bodyMatch(request: SDK.NetworkRequest.NetworkRequest, searchMatch: TextUtils.ContentProvider.SearchMatch | null): UIRequestLocation;
    static urlMatch(request: SDK.NetworkRequest.NetworkRequest): UIRequestLocation;
    static header(request: SDK.NetworkRequest.NetworkRequest, section: UIHeaderSection, name: string): UIRequestLocation;
    static tab(request: SDK.NetworkRequest.NetworkRequest, tab: UIRequestTabs, filterOptions?: FilterOptions): UIRequestLocation;
}
export {};
