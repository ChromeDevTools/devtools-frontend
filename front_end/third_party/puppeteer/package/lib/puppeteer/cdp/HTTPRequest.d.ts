/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Protocol } from 'devtools-protocol';
import type { CDPSession } from '../api/CDPSession.js';
import type { Frame } from '../api/Frame.js';
import { type ContinueRequestOverridesInternal, HTTPRequest, type ResourceType, type ResponseForRequestInternal } from '../api/HTTPRequest.js';
import { type Logger } from '../common/Debug.js';
import type { CdpHTTPResponse } from './HTTPResponse.js';
/**
 * @internal
 */
export declare class CdpHTTPRequest extends HTTPRequest {
    #private;
    id: string;
    _redirectChain: CdpHTTPRequest[];
    _response: CdpHTTPResponse | null;
    get client(): CDPSession;
    set client(newClient: CDPSession);
    /**
     * @internal
     */
    get _fetchClient(): CDPSession;
    set _fetchClient(fetchClient: CDPSession);
    constructor(client: CDPSession, frame: Frame | null, interceptionId: string | undefined, allowInterception: boolean, data: {
        /**
         * Request identifier.
         */
        requestId: Protocol.Network.RequestId;
        /**
         * Loader identifier. Empty string if the request is fetched from worker.
         */
        loaderId?: Protocol.Network.LoaderId;
        /**
         * URL of the document this request is loaded for.
         */
        documentURL?: string;
        /**
         * Request data.
         */
        request: Protocol.Network.Request;
        /**
         * Request initiator.
         */
        initiator?: Protocol.Network.Initiator;
        /**
         * Type of this resource.
         */
        type?: Protocol.Network.ResourceType;
    }, redirectChain: CdpHTTPRequest[], logger: Logger, fetchClient?: CDPSession);
    updateHeaders(headers: Protocol.Network.Headers): void;
    url(): string;
    resourceType(): ResourceType;
    method(): string;
    postData(): string | undefined;
    hasPostData(): boolean;
    fetchPostData(): Promise<string | undefined>;
    content(): Promise<Uint8Array | undefined>;
    headers(): Record<string, string>;
    response(): CdpHTTPResponse | null;
    frame(): Frame | null;
    isNavigationRequest(): boolean;
    initiator(): Protocol.Network.Initiator | undefined;
    redirectChain(): CdpHTTPRequest[];
    failure(): {
        errorText: string;
    } | null;
    protected canBeIntercepted(): boolean;
    /**
     * @internal
     */
    _continue(overrides?: ContinueRequestOverridesInternal): Promise<void>;
    _respond(response: Partial<ResponseForRequestInternal>): Promise<void>;
    _abort(errorReason: Protocol.Network.ErrorReason | null): Promise<void>;
    /**
     * The overrides sent with `Fetch.continueRequest`, or an empty object if
     * the request was not continued.
     *
     * @internal
     */
    get _continueOverrides(): ContinueRequestOverridesInternal;
    /**
     * Re-sends the resolution the user already chose to the current
     * `_interceptionId`. Used when Chrome restarts a request under a new
     * interception id.
     *
     * @internal
     */
    _replayInterception(): Promise<void>;
}
//# sourceMappingURL=HTTPRequest.d.ts.map