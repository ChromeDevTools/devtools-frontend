import type * as SDK from '../../../core/sdk/sdk.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
export declare class NetworkRequestFormatter {
    #private;
    static allowHeader(headerName: string): boolean;
    static formatHeaders(title: string, headers: Array<{
        name: string;
        value: string;
    }>, addListPrefixToEachLine?: boolean): string;
    static formatBody(title: string, request: SDK.NetworkRequest.NetworkRequest, maxBodySize: number): Promise<string>;
    static formatInitiatorUrl(initiatorUrl: string, allowedOrigin: string): string;
    constructor(request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTransferTimeCalculator);
    formatRequestHeaders(): string;
    formatResponseHeaders(): string;
    formatResponseBody(): Promise<string>;
    /**
     * Note: nothing here should include information from origins other than
     * the request's origin.
     */
    formatNetworkRequest(): Promise<string>;
    /**
     * Note: nothing here should include information from origins other than
     * the request's origin.
     */
    formatRequestInitiatorChain(): string;
    formatNetworkRequestTiming(): string;
}
