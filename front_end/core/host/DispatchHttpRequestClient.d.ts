import type { DispatchHttpRequestRequest } from './InspectorFrontendHostAPI.js';
export declare enum ErrorType {
    HTTP_RESPONSE_UNAVAILABLE = "HTTP_RESPONSE_UNAVAILABLE",
    NOT_FOUND = "NOT_FOUND"
}
export declare class DispatchHttpRequestError extends Error {
    readonly type: ErrorType;
    constructor(type: ErrorType, options?: ErrorOptions);
}
export declare function makeHttpRequest<R>(request: DispatchHttpRequestRequest): Promise<R>;
