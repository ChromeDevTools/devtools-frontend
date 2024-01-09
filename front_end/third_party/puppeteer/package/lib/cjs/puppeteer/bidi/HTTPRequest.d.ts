/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import type { Frame } from '../api/Frame.js';
import type { ContinueRequestOverrides, ResponseForRequest } from '../api/HTTPRequest.js';
import { HTTPRequest, type ResourceType } from '../api/HTTPRequest.js';
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
    get client(): never;
    url(): string;
    resourceType(): ResourceType;
    method(): string;
    postData(): string | undefined;
    hasPostData(): boolean;
    fetchPostData(): Promise<string | undefined>;
    headers(): Record<string, string>;
    response(): BidiHTTPResponse | null;
    isNavigationRequest(): boolean;
    initiator(): Bidi.Network.Initiator;
    redirectChain(): BidiHTTPRequest[];
    enqueueInterceptAction(pendingHandler: () => void | PromiseLike<unknown>): void;
    frame(): Frame | null;
    continueRequestOverrides(): never;
    continue(_overrides?: ContinueRequestOverrides): never;
    responseForRequest(): never;
    abortErrorReason(): never;
    interceptResolutionState(): never;
    isInterceptResolutionHandled(): never;
    finalizeInterceptions(): never;
    abort(): never;
    respond(_response: Partial<ResponseForRequest>, _priority?: number): never;
    failure(): never;
}
//# sourceMappingURL=HTTPRequest.d.ts.map