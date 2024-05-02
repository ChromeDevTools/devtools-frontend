/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Protocol } from 'devtools-protocol';
import { type CDPSession } from '../api/CDPSession.js';
import type { Frame } from '../api/Frame.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { type NetworkManagerEvents } from '../common/NetworkManagerEvents.js';
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
    /**
     * Download speed (bytes/s)
     */
    download: number;
    /**
     * Upload speed (bytes/s)
     */
    upload: number;
    /**
     * Latency (ms)
     */
    latency: number;
}
/**
 * @public
 */
export interface InternalNetworkConditions extends NetworkConditions {
    offline: boolean;
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
export declare class NetworkManager extends EventEmitter<NetworkManagerEvents> {
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