import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Logs from '../../logs/logs.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
/**
 * Sanitizes headers by replacing unapproved header values with '<redacted>'.
 *
 * @param headers List of header name/value pairs to sanitize.
 * @returns Sanitized list of headers with unapproved values redacted.
 */
export declare function sanitizeHeaders(headers: Array<{
    name: string;
    value: string;
}>): Array<{
    name: string;
    value: string;
}>;
/**
 * Options for configuring {@link NetworkRequestFormatter}.
 */
export interface NetworkRequestFormatterOptions {
    /** The security origin of the initiating context for SOP/CORS evaluation. Defaults to `request.initiatorSecurityOrigin()`. */
    initiatorSecurityOrigin?: SDK.SecurityOrigin.SecurityOrigin;
    /** Optional network log instance for resolving initiator graphs. */
    networkLog?: Logs.NetworkLog.NetworkLog;
}
export declare class NetworkRequestFormatter {
    #private;
    /**
     * @param request The network request to format.
     * @param calculator Calculator for request timing metrics.
     * @param options Optional configuration options.
     */
    constructor(request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTransferTimeCalculator, options?: NetworkRequestFormatterOptions);
    /**
     * Evaluates the response access mode for this network request relative to the initiator security origin.
     *
     * @returns The evaluated `ResponseAccessMode`.
     */
    responseAccessMode(): SDK.NetworkRequestAccess.ResponseAccessMode;
    static allowHeader(headerName: string): boolean;
    static formatHeaders(title: string, headers: Array<{
        name: string;
        value: string;
    }>, addListPrefixToEachLine?: boolean): string;
    static formatBody(title: string, request: SDK.NetworkRequest.NetworkRequest, maxBodySize: number): Promise<string>;
    static formatInitiatorUrl(initiatorUrl: Platform.DevToolsPath.UrlString, allowedOrigin: Platform.DevToolsPath.UrlString): string;
    static formatStatus(status: {
        statusCode: number;
        statusText: string;
        failed: boolean;
        canceled: boolean;
        preserved: boolean;
        finished: boolean;
    }): string;
    static formatFailureReasons(reasons: {
        blockedReason?: Protocol.Network.BlockedReason;
        corsErrorStatus?: Protocol.Network.CorsErrorStatus;
        localizedFailDescription?: string | null;
    }): string;
    formatRequestHeaders(): string;
    /**
     * Formats response headers for the AI prompt.
     *
     * Headers are filtered based on the request's evaluated ResponseAccessMode:
     * - Opaque cross-origin requests only include CORS-safelisted response headers.
     * - CORS-authorized requests include CORS-safelisted and Access-Control-Expose-Headers.
     * - Same-origin requests include all response headers.
     * Values of headers not present on the global allowedHeaders list are then redacted.
     */
    formatResponseHeaders(): string;
    /**
     * Formats the response body for the AI prompt.
     *
     * For opaque cross-origin requests, the response body is redacted because the initiating page's
     * JavaScript is forbidden by the Same-Origin Policy from reading it.
     */
    formatResponseBody(): Promise<string>;
    /**
     * Note: nothing here should include information from origins other than
     * the request's origin.
     */
    formatNetworkRequest(): Promise<string>;
    formatStatus(): string;
    formatFailureReasons(): string;
    /**
     * Note: nothing here should include information from origins other than
     * the request's origin.
     */
    formatRequestInitiatorChain(): string;
    formatNetworkRequestTiming(): string;
}
