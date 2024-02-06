/**
 * @fileoverview Utility functions for the Network domain.
 */
import type { Protocol } from 'devtools-protocol';
import { Network, type Storage } from '../../../protocol/protocol.js';
export declare function computeHeadersSize(headers: Network.Header[]): number;
/** Converts from CDP Network domain headers to Bidi network headers. */
export declare function bidiNetworkHeadersFromCdpNetworkHeaders(headers?: Protocol.Network.Headers): Network.Header[];
/** Converts from Bidi network headers to CDP Network domain headers. */
export declare function cdpNetworkHeadersFromBidiNetworkHeaders(headers?: Network.Header[]): Protocol.Network.Headers | undefined;
/** Converts from CDP Fetch domain header entries to Bidi network headers. */
export declare function bidiNetworkHeadersFromCdpFetchHeaders(headers?: Protocol.Fetch.HeaderEntry[]): Network.Header[];
/** Converts from Bidi network headers to CDP Fetch domain header entries. */
export declare function cdpFetchHeadersFromBidiNetworkHeaders(headers?: Network.Header[]): Protocol.Fetch.HeaderEntry[] | undefined;
/** Converts from Bidi auth action to CDP auth challenge response. */
export declare function cdpAuthChallengeResponseFromBidiAuthContinueWithAuthAction(action: 'default' | 'cancel' | 'provideCredentials'): "Default" | "CancelAuth" | "ProvideCredentials";
/**
 * Converts from CDP Network domain cookie to BiDi network cookie.
 * * https://chromedevtools.github.io/devtools-protocol/tot/Network/#type-Cookie
 * * https://w3c.github.io/webdriver-bidi/#type-network-Cookie
 */
export declare function cdpToBiDiCookie(cookie: Protocol.Network.Cookie): Network.Cookie;
/**
 * Converts from BiDi set network cookie params to CDP Network domain cookie.
 * * https://w3c.github.io/webdriver-bidi/#type-network-Cookie
 * * https://chromedevtools.github.io/devtools-protocol/tot/Network/#type-CookieParam
 */
export declare function bidiToCdpCookie(params: Storage.SetCookieParameters, partitionKey: Storage.PartitionKey): Protocol.Network.CookieParam;
