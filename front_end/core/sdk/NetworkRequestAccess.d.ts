import type * as NetworkRequest from './NetworkRequest.js';
import * as SecurityOrigin from './SecurityOrigin.js';
/**
 * Specifies how a network request's response data (body and headers) can be accessed
 * relative to the initiating context's security origin.
 *
 * DevTools features that inspect network requests (such as AI Assistance) must respect
 * the browser Same-Origin Policy (SOP) and Cross-Origin Resource Sharing (CORS) rules:
 * - Same-origin responses are fully readable by the initiating document.
 * - Cross-origin responses with valid CORS headers (`Access-Control-Allow-Origin`) are readable.
 * - Opaque cross-origin responses (such as `no-cors` fetches to third-party endpoints) are NOT
 *   readable by the page and must never have their response bodies or restricted headers exposed
 *   to unauthorized contexts (b/513821237).
 */
export declare const enum ResponseAccessMode {
    /** The request target URL is same-origin with the initiator context. */
    SAME_ORIGIN = "SAME_ORIGIN",
    /** The request is cross-origin, but explicit CORS response headers permit access by the initiator. */
    CORS_ALLOWED = "CORS_ALLOWED",
    /** The request is cross-origin without CORS authorization; response body and unexposed headers are restricted. */
    OPAQUE_CROSS_ORIGIN = "OPAQUE_CROSS_ORIGIN"
}
/**
 * Standard CORS-safelisted response headers that are exposed on cross-origin requests
 * without requiring explicit `Access-Control-Expose-Headers`.
 *
 * @see https://fetch.spec.whatwg.org/#cors-safelisted-response-header-name
 */
export declare const CORS_SAFELISTED_RESPONSE_HEADERS: ReadonlySet<string>;
/**
 * Placeholder text replacing response body content when cross-origin access is forbidden.
 */
export declare const REDACTED_RESPONSE_BODY = "<redacted cross-origin response body>";
/**
 * Returns whether a network request used credentials (cookies, authorization headers,
 * or server-indicated credentials mode).
 *
 * @param request The network request to inspect.
 * @returns True if the request included credentials or requires credentialed CORS.
 * @see https://fetch.spec.whatwg.org/#credentials
 */
export declare function isRequestCredentialed(request: NetworkRequest.NetworkRequest): boolean;
/**
 * Evaluates the response access mode for a network request relative to an initiator origin.
 *
 * Evaluation rules:
 * 1. If `initiatorOrigin` is omitted, the origin is derived from `request.documentURL`. If
 *    `documentURL` is invalid or opaque, access mode defaults to `OPAQUE_CROSS_ORIGIN`.
 * 2. If the initiator origin is opaque (e.g. sandboxed iframe or `data:` URL), returns `OPAQUE_CROSS_ORIGIN`.
 * 3. If the initiator origin is same-origin with the request URL, returns `SAME_ORIGIN`.
 * 4. If Chrome's network stack flagged a CORS error (`corsErrorStatus`), returns `OPAQUE_CROSS_ORIGIN`.
 * 5. If the server provided an `Access-Control-Allow-Origin` header:
 *    - Wildcard `*` grants `CORS_ALLOWED` only if the request does not include credentials. Under the
 *      Fetch specification, wildcard `*` is invalid for credentialed requests.
 *    - An explicit match against the initiator origin grants `CORS_ALLOWED`.
 * 6. Otherwise, returns `OPAQUE_CROSS_ORIGIN`.
 *
 * @param request The network request being inspected.
 * @param initiatorOrigin The security origin of the initiating context (e.g. page or conversation origin).
 * @returns The evaluated `ResponseAccessMode`.
 */
export declare function evaluateResponseAccessMode(request: NetworkRequest.NetworkRequest, initiatorOrigin?: SecurityOrigin.SecurityOrigin): ResponseAccessMode;
/**
 * Filters the response headers of a network request based on its access mode.
 *
 * - `SAME_ORIGIN`: Returns all response headers.
 * - `CORS_ALLOWED`: Returns CORS-safelisted headers plus headers exposed via
 *   `Access-Control-Expose-Headers`.
 * - `OPAQUE_CROSS_ORIGIN`: Returns only CORS-safelisted response headers. Under the Fetch
 *   specification, opaque responses do not expose headers configured by `Access-Control-Expose-Headers`.
 *
 * @param request The network request whose headers are being filtered.
 * @param accessMode The evaluated response access mode for this request.
 * @returns Array of allowed header name/value pairs.
 */
export declare function getFilterableResponseHeaders(request: NetworkRequest.NetworkRequest, accessMode: ResponseAccessMode): Array<{
    name: string;
    value: string;
}>;
