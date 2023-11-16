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