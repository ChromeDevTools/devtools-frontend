/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import type { CDPSession } from '../api/CDPSession.js';
import type { ContinueRequestOverrides, ResponseForRequest } from '../api/HTTPRequest.js';
import { HTTPRequest, type ResourceType } from '../api/HTTPRequest.js';
import type { Request } from './core/Request.js';
import type { BidiFrame } from './Frame.js';
import { BidiHTTPResponse } from './HTTPResponse.js';
export declare const requests: WeakMap<Request, BidiHTTPRequest>;
/**
 * @internal
 */
export declare class BidiHTTPRequest extends HTTPRequest {
    #private;
    static from(bidiRequest: Request, frame: BidiFrame | undefined): BidiHTTPRequest;
    readonly id: string;
    private constructor();
    get client(): CDPSession;
    url(): string;
    resourceType(): ResourceType;
    method(): string;
    postData(): string | undefined;
    hasPostData(): boolean;
    fetchPostData(): Promise<string | undefined>;
    headers(): Record<string, string>;
    response(): BidiHTTPResponse | null;
    failure(): {
        errorText: string;
    } | null;
    isNavigationRequest(): boolean;
    initiator(): Bidi.Network.Initiator;
    redirectChain(): BidiHTTPRequest[];
    enqueueInterceptAction(pendingHandler: () => void | PromiseLike<unknown>): void;
    frame(): BidiFrame | null;
    continueRequestOverrides(): never;
    continue(_overrides?: ContinueRequestOverrides): never;
    responseForRequest(): never;
    abortErrorReason(): never;
    interceptResolutionState(): never;
    isInterceptResolutionHandled(): never;
    finalizeInterceptions(): never;
    abort(): never;
    respond(_response: Partial<ResponseForRequest>, _priority?: number): never;
}
//# sourceMappingURL=HTTPRequest.d.ts.map