/**
 * Copyright 2017 Google Inc. All rights reserved.
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
import type { Protocol } from 'devtools-protocol';
import { type CDPSession } from '../api/CDPSession.js';
import type { Frame } from '../api/Frame.js';
import { EventEmitter, type EventType } from '../common/EventEmitter.js';
import { CdpHTTPRequest } from './HTTPRequest.js';
import { CdpHTTPResponse } from './HTTPResponse.js';
/**
 * @public
 */
export interface Credentials {
    username: string;
    password: string;
}
/**
 * @public
 */
export interface NetworkConditions {
    download: number;
    upload: number;
    latency: number;
}
/**
 * @public
 */
export interface InternalNetworkConditions extends NetworkConditions {
    offline: boolean;
}
/**
 * We use symbols to prevent any external parties listening to these events.
 * They are internal to Puppeteer.
 *
 * @internal
 */
export declare namespace NetworkManagerEvent {
    const Request: unique symbol;
    const RequestServedFromCache: unique symbol;
    const Response: unique symbol;
    const RequestFailed: unique symbol;
    const RequestFinished: unique symbol;
}
/**
 * @internal
 */
export interface CdpNetworkManagerEvents extends Record<EventType, unknown> {
    [NetworkManagerEvent.Request]: CdpHTTPRequest;
    [NetworkManagerEvent.RequestServedFromCache]: CdpHTTPRequest | undefined;
    [NetworkManagerEvent.Response]: CdpHTTPResponse;
    [NetworkManagerEvent.RequestFailed]: CdpHTTPRequest;
    [NetworkManagerEvent.RequestFinished]: CdpHTTPRequest;
}
/**
 * @internal
 */
export interface FrameProvider {
    frame(id: string): Frame | null;
}
/**
 * @internal
 */
export declare class NetworkManager extends EventEmitter<CdpNetworkManagerEvents> {
    #private;
    constructor(ignoreHTTPSErrors: boolean, frameManager: FrameProvider);
    addClient(client: CDPSession): Promise<void>;
    authenticate(credentials?: Credentials): Promise<void>;
    setExtraHTTPHeaders(extraHTTPHeaders: Record<string, string>): Promise<void>;
    extraHTTPHeaders(): Record<string, string>;
    inFlightRequestsCount(): number;
    setOfflineMode(value: boolean): Promise<void>;
    emulateNetworkConditions(networkConditions: NetworkConditions | null): Promise<void>;
    setUserAgent(userAgent: string, userAgentMetadata?: Protocol.Emulation.UserAgentMetadata): Promise<void>;
    setCacheEnabled(enabled: boolean): Promise<void>;
    setRequestInterception(value: boolean): Promise<void>;
}
//# sourceMappingURL=NetworkManager.d.ts.map