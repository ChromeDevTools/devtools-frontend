/**
 * @fileoverview `NetworkRequest` represents a single network request and keeps
 * track of all the related CDP events.
 */
import type Protocol from 'devtools-protocol';
import type { IEventManager } from '../events/EventManager.js';
import { type Network } from '../../../protocol/protocol.js';
export declare class NetworkRequest {
    #private;
    /**
     * Each network request has an associated request id, which is a string
     * uniquely identifying that request.
     *
     * The identifier for a request resulting from a redirect matches that of the
     * request that initiated it.
     */
    readonly requestId: Network.Request;
    constructor(requestId: Network.Request, eventManager: IEventManager);
    onRequestWillBeSentEvent(event: Protocol.Network.RequestWillBeSentEvent): void;
    onRequestWillBeSentExtraInfoEvent(event: Protocol.Network.RequestWillBeSentExtraInfoEvent): void;
    onResponseReceivedEventExtraInfo(event: Protocol.Network.ResponseReceivedExtraInfoEvent): void;
    onResponseReceivedEvent(responseReceivedEvent: Protocol.Network.ResponseReceivedEvent): void;
    onServedFromCache(): void;
    onLoadingFailedEvent(event: Protocol.Network.LoadingFailedEvent): void;
    dispose(): void;
}
