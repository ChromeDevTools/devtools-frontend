/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Protocol } from 'devtools-protocol';
import { CDPSession } from '../api/CDPSession.js';
import { CdpHTTPRequest } from './HTTPRequest.js';
/**
 * @internal
 */
export interface QueuedEventGroup {
    responseReceivedEvent: Protocol.Network.ResponseReceivedEvent;
    loadingFinishedEvent?: Protocol.Network.LoadingFinishedEvent;
    loadingFailedEvent?: Protocol.Network.LoadingFailedEvent;
}
/**
 * @internal
 */
export type FetchRequestId = string;
/**
 * @internal
 */
export interface RedirectInfo {
    event: Protocol.Network.RequestWillBeSentEvent;
    fetchRequestId?: FetchRequestId;
    client: CDPSession;
    fetchClient: CDPSession;
}
/**
 * A stored event and the session that sent it. A worker request can get its
 * Network events on the worker session and its Fetch events on the page
 * session.
 *
 * @internal
 */
export interface SessionEvent<T> {
    event: T;
    client: CDPSession;
}
/**
 * @internal
 */
export type NetworkRequestId = string;
/**
 * Helper class to track network events by request ID
 *
 * @internal
 */
export declare class NetworkEventManager {
    #private;
    forget(networkRequestId: NetworkRequestId): void;
    requestExtraInfo(networkRequestId: NetworkRequestId): Protocol.Network.RequestWillBeSentExtraInfoEvent[];
    responseExtraInfo(networkRequestId: NetworkRequestId): Protocol.Network.ResponseReceivedExtraInfoEvent[];
    private queuedRedirectInfo;
    queueRedirectInfo(fetchRequestId: FetchRequestId, redirectInfo: RedirectInfo): void;
    takeQueuedRedirectInfo(fetchRequestId: FetchRequestId): RedirectInfo | undefined;
    inFlightRequestsCount(): number;
    storeRequestWillBeSent(networkRequestId: NetworkRequestId, event: Protocol.Network.RequestWillBeSentEvent, client: CDPSession): void;
    getRequestWillBeSent(networkRequestId: NetworkRequestId): SessionEvent<Protocol.Network.RequestWillBeSentEvent> | undefined;
    forgetRequestWillBeSent(networkRequestId: NetworkRequestId): void;
    getRequestPaused(networkRequestId: NetworkRequestId): SessionEvent<Protocol.Fetch.RequestPausedEvent> | undefined;
    forgetRequestPaused(networkRequestId: NetworkRequestId): void;
    storeRequestPaused(networkRequestId: NetworkRequestId, event: Protocol.Fetch.RequestPausedEvent, client: CDPSession): void;
    getRequest(networkRequestId: NetworkRequestId): CdpHTTPRequest | undefined;
    storeRequest(networkRequestId: NetworkRequestId, request: CdpHTTPRequest): void;
    forgetRequest(networkRequestId: NetworkRequestId): void;
    getQueuedEventGroup(networkRequestId: NetworkRequestId): QueuedEventGroup | undefined;
    queueEventGroup(networkRequestId: NetworkRequestId, event: QueuedEventGroup): void;
    forgetQueuedEventGroup(networkRequestId: NetworkRequestId): void;
    printState(): void;
}
//# sourceMappingURL=NetworkEventManager.d.ts.map