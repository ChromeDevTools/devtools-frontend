export declare enum FilterType {
    Domain = "domain",
    HasResponseHeader = "has-response-header",
    HasRequestHeader = "has-request-header",
    HasOverrides = "has-overrides",
    ResponseHeaderValueSetCookie = "response-header-set-cookie",
    Is = "is",
    LargerThan = "larger-than",
    Method = "method",
    MimeType = "mime-type",
    MixedContent = "mixed-content",
    Priority = "priority",
    Scheme = "scheme",
    SetCookieDomain = "set-cookie-domain",
    SetCookieName = "set-cookie-name",
    SetCookieValue = "set-cookie-value",
    ResourceType = "resource-type",
    CookieDomain = "cookie-domain",
    CookieName = "cookie-name",
    CookiePath = "cookie-path",
    CookieValue = "cookie-value",
    StatusCode = "status-code",
    Url = "url"
}
export declare const enum IsFilterType {
    RUNNING = "running",
    FROM_CACHE = "from-cache",
    SERVICE_WORKER_INTERCEPTED = "service-worker-intercepted",
    SERVICE_WORKER_INITIATED = "service-worker-initiated"
}
export declare const enum MixedContentFilterValues {
    ALL = "all",
    DISPLAYED = "displayed",
    BLOCKED = "blocked",
    BLOCK_OVERRIDDEN = "block-overridden"
}
interface UIFilter {
    filterType: FilterType | null;
    filterValue: string;
}
export declare class UIRequestFilter {
    readonly filters: UIFilter[];
    constructor(filters: UIFilter[]);
    static filters(filters: UIFilter[]): UIRequestFilter;
}
export {};
