/**
 * @fileoverview `NetworkRequest` represents a single network request and keeps
 * track of all the related CDP events.
 */
import type { Protocol } from 'devtools-protocol';
import { Network, type JsUint } from '../../../protocol/protocol.js';
import type { CdpTarget } from '../context/CdpTarget.js';
import type { EventManager } from '../session/EventManager.js';
import type { NetworkStorage } from './NetworkStorage.js';
/** Abstracts one individual network request. */
export declare class NetworkRequest {
    #private;
    constructor(requestId: Network.Request, eventManager: EventManager, networkStorage: NetworkStorage, cdpTarget: CdpTarget, redirectCount?: number);
    get requestId(): string;
    get url(): string | undefined;
    get redirectCount(): number;
    get cdpTarget(): CdpTarget;
    isRedirecting(): boolean;
    handleRedirect(event: Protocol.Network.RequestWillBeSentEvent): void;
    onRequestWillBeSentEvent(event: Protocol.Network.RequestWillBeSentEvent): void;
    onRequestWillBeSentExtraInfoEvent(event: Protocol.Network.RequestWillBeSentExtraInfoEvent): void;
    onResponseReceivedExtraInfoEvent(event: Protocol.Network.ResponseReceivedExtraInfoEvent): void;
    onResponseReceivedEvent(event: Protocol.Network.ResponseReceivedEvent): void;
    onServedFromCache(): void;
    onLoadingFailedEvent(event: Protocol.Network.LoadingFailedEvent): void;
    /** Fired whenever a network request interception is hit. */
    onRequestPaused(params: Protocol.Fetch.RequestPausedEvent): void;
    /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-failRequest */
    failRequest(networkId: Network.Request, errorReason: Protocol.Network.ErrorReason): Promise<void>;
    /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-continueRequest */
    continueRequest(cdpFetchRequestId: Protocol.Fetch.RequestId, url?: string, method?: string, headers?: Protocol.Fetch.HeaderEntry[]): Promise<void>;
    /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-continueResponse */
    continueResponse(cdpFetchRequestId: Protocol.Fetch.RequestId, responseCode?: JsUint, responsePhrase?: string, responseHeaders?: Protocol.Fetch.HeaderEntry[]): Promise<void>;
    /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-continueWithAuth */
    continueWithAuth(cdpFetchRequestId: Protocol.Fetch.RequestId, response: 'Default' | 'CancelAuth' | 'ProvideCredentials', username?: string, password?: string): Promise<void>;
    /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-provideResponse */
    provideResponse(cdpFetchRequestId: Protocol.Fetch.RequestId, responseCode: JsUint, responsePhrase?: string, responseHeaders?: Protocol.Fetch.HeaderEntry[], body?: string): Promise<void>;
    dispose(): void;
    /** Returns the HTTP status code associated with this request if any. */
    get statusCode(): number;
}
