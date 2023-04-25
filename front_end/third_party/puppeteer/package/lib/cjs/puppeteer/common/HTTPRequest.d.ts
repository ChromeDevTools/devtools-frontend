/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Protocol } from 'devtools-protocol';
import { ContinueRequestOverrides, ErrorCode, HTTPRequest as BaseHTTPRequest, InterceptResolutionState, ResourceType, ResponseForRequest } from '../api/HTTPRequest.js';
import { HTTPResponse } from '../api/HTTPResponse.js';
import { CDPSession } from './Connection.js';
import { Frame } from './Frame.js';
/**
 * @internal
 */
export declare class HTTPRequest extends BaseHTTPRequest {
    #private;
    _requestId: string;
    _interceptionId: string | undefined;
    _failureText: string | null;
    _response: HTTPResponse | null;
    _fromMemoryCache: boolean;
    _redirectChain: HTTPRequest[];
    get client(): CDPSession;
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
    }, redirectChain: HTTPRequest[]);
    url(): string;
    continueRequestOverrides(): ContinueRequestOverrides;
    responseForRequest(): Partial<ResponseForRequest> | null;
    abortErrorReason(): Protocol.Network.ErrorReason | null;
    interceptResolutionState(): InterceptResolutionState;
    isInterceptResolutionHandled(): boolean;
    enqueueInterceptAction(pendingHandler: () => void | PromiseLike<unknown>): void;
    finalizeInterceptions(): Promise<void>;
    resourceType(): ResourceType;
    method(): string;
    postData(): string | undefined;
    headers(): Record<string, string>;
    response(): HTTPResponse | null;
    frame(): Frame | null;
    isNavigationRequest(): boolean;
    initiator(): Protocol.Network.Initiator | undefined;
    redirectChain(): HTTPRequest[];
    failure(): {
        errorText: string;
    } | null;
    continue(overrides?: ContinueRequestOverrides, priority?: number): Promise<void>;
    respond(response: Partial<ResponseForRequest>, priority?: number): Promise<void>;
    abort(errorCode?: ErrorCode, priority?: number): Promise<void>;
}
//# sourceMappingURL=HTTPRequest.d.ts.map