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
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import type { Protocol } from 'devtools-protocol';
import type { Frame } from '../api/Frame.js';
import type { ContinueRequestOverrides, InterceptResolutionState, ResponseForRequest } from '../api/HTTPRequest.js';
import { HTTPRequest, type ResourceType } from '../api/HTTPRequest.js';
import type { CDPSession } from '../puppeteer-core.js';
import type { BidiHTTPResponse } from './HTTPResponse.js';
/**
 * @internal
 */
export declare class BidiHTTPRequest extends HTTPRequest {
    #private;
    _response: BidiHTTPResponse | null;
    _redirectChain: BidiHTTPRequest[];
    _navigationId: string | null;
    constructor(event: Bidi.Network.BeforeRequestSentParameters, frame: Frame | null, redirectChain?: BidiHTTPRequest[]);
    get client(): CDPSession;
    url(): string;
    resourceType(): ResourceType;
    method(): string;
    postData(): string | undefined;
    headers(): Record<string, string>;
    response(): BidiHTTPResponse | null;
    isNavigationRequest(): boolean;
    initiator(): Bidi.Network.Initiator;
    redirectChain(): BidiHTTPRequest[];
    enqueueInterceptAction(pendingHandler: () => void | PromiseLike<unknown>): void;
    frame(): Frame | null;
    continueRequestOverrides(): ContinueRequestOverrides;
    continue(_overrides?: ContinueRequestOverrides): Promise<void>;
    responseForRequest(): Partial<ResponseForRequest>;
    abortErrorReason(): Protocol.Network.ErrorReason | null;
    interceptResolutionState(): InterceptResolutionState;
    isInterceptResolutionHandled(): boolean;
    finalizeInterceptions(): Promise<void>;
    abort(): Promise<void>;
    respond(_response: Partial<ResponseForRequest>, _priority?: number): Promise<void>;
    failure(): {
        errorText: string;
    } | null;
}
//# sourceMappingURL=HTTPRequest.d.ts.map