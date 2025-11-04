import type * as SDK from '../core/sdk/sdk.js';
import * as Protocol from '../generated/protocol.js';
export interface CookieExpectation {
    name: string;
    value: string;
    httpOnly?: boolean;
    sameSite?: Protocol.Network.CookieSameSite;
    secure?: boolean;
    session?: boolean;
    path?: string;
    domain?: string;
    expires?: null | number | string;
    size?: number;
    priority?: Protocol.Network.CookiePriority;
    partitionKey?: Protocol.Network.CookiePartitionKey | null;
    partitionKeyOpaque?: boolean;
}
export declare function expectCookie(cookie: SDK.Cookie.Cookie, cookieExpectation: CookieExpectation): void;
