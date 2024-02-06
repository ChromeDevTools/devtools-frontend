/**
 * Copyright 2023 Google LLC.
 * Copyright (c) Microsoft Corporation.
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
import { Network } from '../../../protocol/protocol.js';
import type { NetworkRequest } from './NetworkRequest.js';
interface NetworkInterception {
    urlPatterns: Network.UrlPattern[];
    phases: Network.AddInterceptParameters['phases'];
}
export interface BlockedRequest {
    request: Protocol.Fetch.RequestId;
    phase: Network.InterceptPhase;
    response: Network.ResponseData;
}
/** Stores network and intercept maps. */
export declare class NetworkStorage {
    #private;
    disposeRequestMap(): void;
    /**
     * Adds the given entry to the intercept map.
     * URL patterns are assumed to be parsed.
     *
     * @return The intercept ID.
     */
    addIntercept(value: NetworkInterception): Network.Intercept;
    /**
     * Removes the given intercept from the intercept map.
     * Throws NoSuchInterceptException if the intercept does not exist.
     */
    removeIntercept(intercept: Network.Intercept): void;
    /** Returns true if there's at least one added intercept. */
    hasIntercepts(): boolean;
    /** Gets parameters for CDP 'Fetch.enable' command from the intercept map. */
    getFetchEnableParams(): Protocol.Fetch.EnableRequest;
    getRequest(id: Network.Request): NetworkRequest | undefined;
    addRequest(request: NetworkRequest): void;
    deleteRequest(id: Network.Request): void;
    /** Returns true if there's at least one network request. */
    hasNetworkRequests(): boolean;
    /** Returns true if there's at least one blocked network request. */
    hasBlockedRequests(): boolean;
    /** Converts a URL pattern from the spec to a CDP URL pattern. */
    static cdpFromSpecUrlPattern(urlPattern: Network.UrlPattern): string;
    static buildUrlPatternString({ protocol, hostname, port, pathname, search, }: Network.UrlPatternPattern): string;
    /**
     * Maps spec Network.InterceptPhase to CDP Fetch.RequestStage.
     * AuthRequired has no CDP equivalent..
     */
    static requestStageFromPhase(phase: Network.InterceptPhase): Protocol.Fetch.RequestStage;
    /**
     * Returns true if the given protocol is special.
     * Special protocols are those that have a default port.
     *
     * Example inputs: 'http', 'http:'
     *
     * @see https://url.spec.whatwg.org/#special-scheme
     */
    static isSpecialScheme(protocol: string): boolean;
    addBlockedRequest(requestId: Network.Request, value: BlockedRequest): void;
    removeBlockedRequest(requestId: Network.Request): void;
    /**
     * Returns the blocked request associated with the given network ID, if any.
     */
    getBlockedRequest(networkId: Network.Request): BlockedRequest | undefined;
    /** #@see https://w3c.github.io/webdriver-bidi/#get-the-network-intercepts */
    getNetworkIntercepts(requestId: Network.Request, phase?: Network.InterceptPhase): Network.Intercept[];
    /** Matches the given URLPattern against the given URL. */
    static matchUrlPattern(urlPattern: Network.UrlPattern, url: string | undefined): boolean;
}
export {};
