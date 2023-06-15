/// <reference types="node" />
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
import { Frame } from '../api/Frame.js';
import { HTTPResponse as BaseHTTPResponse, RemoteAddress } from '../api/HTTPResponse.js';
import { CDPSession } from './Connection.js';
import { HTTPRequest } from './HTTPRequest.js';
import { SecurityDetails } from './SecurityDetails.js';
/**
 * @internal
 */
export declare class HTTPResponse extends BaseHTTPResponse {
    #private;
    constructor(client: CDPSession, request: HTTPRequest, responsePayload: Protocol.Network.Response, extraInfo: Protocol.Network.ResponseReceivedExtraInfoEvent | null);
    _resolveBody(err: Error | null): void;
    remoteAddress(): RemoteAddress;
    url(): string;
    status(): number;
    statusText(): string;
    headers(): Record<string, string>;
    securityDetails(): SecurityDetails | null;
    timing(): Protocol.Network.ResourceTiming | null;
    buffer(): Promise<Buffer>;
    request(): HTTPRequest;
    fromCache(): boolean;
    fromServiceWorker(): boolean;
    frame(): Frame | null;
}
//# sourceMappingURL=HTTPResponse.d.ts.map