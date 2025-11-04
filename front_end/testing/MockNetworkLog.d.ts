import * as Common from '../core/common/common.js';
import type * as SDK from '../core/sdk/sdk.js';
import * as Logs from '../models/logs/logs.js';
interface MockNetworkRequest {
    requestId(): string;
}
export declare function createNetworkRequest(requestId: string): SDK.NetworkRequest.NetworkRequest;
export declare class MockNetworkLog extends Common.ObjectWrapper.ObjectWrapper<Logs.NetworkLog.EventTypes> {
    private mockRequests;
    constructor(mockRequests: MockNetworkRequest[]);
    requestsForId(requestId: string): MockNetworkRequest[];
    addRequest(mockRequest: MockNetworkRequest): void;
}
export {};
