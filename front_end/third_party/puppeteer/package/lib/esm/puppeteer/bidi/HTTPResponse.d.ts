/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import type Protocol from 'devtools-protocol';
import type { Frame } from '../api/Frame.js';
import { HTTPResponse as HTTPResponse, type RemoteAddress } from '../api/HTTPResponse.js';
import type { BidiHTTPRequest } from './HTTPRequest.js';
/**
 * @internal
 */
export declare class BidiHTTPResponse extends HTTPResponse {
    #private;
    constructor(request: BidiHTTPRequest, { response }: Bidi.Network.ResponseCompletedParameters);
    remoteAddress(): RemoteAddress;
    url(): string;
    status(): number;
    statusText(): string;
    headers(): Record<string, string>;
    request(): BidiHTTPRequest;
    fromCache(): boolean;
    timing(): Protocol.Network.ResourceTiming | null;
    frame(): Frame | null;
    fromServiceWorker(): boolean;
    securityDetails(): never;
    buffer(): never;
}
//# sourceMappingURL=HTTPResponse.d.ts.map