"use strict";
/*
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
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bidiToCdpCookie = exports.cdpToBiDiCookie = exports.cdpAuthChallengeResponseFromBidiAuthContinueWithAuthAction = exports.cdpFetchHeadersFromBidiNetworkHeaders = exports.bidiNetworkHeadersFromCdpFetchHeaders = exports.cdpNetworkHeadersFromBidiNetworkHeaders = exports.bidiNetworkHeadersFromCdpNetworkHeaders = exports.computeHeadersSize = void 0;
const ErrorResponse_1 = require("../../../protocol/ErrorResponse");
function computeHeadersSize(headers) {
    const requestHeaders = headers.reduce((acc, header) => {
        return `${acc}${header.name}: ${header.value.value}\r\n`;
    }, '');
    return new TextEncoder().encode(requestHeaders).length;
}
exports.computeHeadersSize = computeHeadersSize;
/** Converts from CDP Network domain headers to Bidi network headers. */
function bidiNetworkHeadersFromCdpNetworkHeaders(headers) {
    if (!headers) {
        return [];
    }
    return Object.entries(headers).map(([name, value]) => ({
        name,
        value: {
            type: 'string',
            value,
        },
    }));
}
exports.bidiNetworkHeadersFromCdpNetworkHeaders = bidiNetworkHeadersFromCdpNetworkHeaders;
/** Converts from Bidi network headers to CDP Network domain headers. */
function cdpNetworkHeadersFromBidiNetworkHeaders(headers) {
    if (headers === undefined) {
        return undefined;
    }
    return headers.reduce((result, header) => {
        // TODO: Distinguish between string and bytes?
        result[header.name] = header.value.value;
        return result;
    }, {});
}
exports.cdpNetworkHeadersFromBidiNetworkHeaders = cdpNetworkHeadersFromBidiNetworkHeaders;
/** Converts from CDP Fetch domain header entries to Bidi network headers. */
function bidiNetworkHeadersFromCdpFetchHeaders(headers) {
    if (!headers) {
        return [];
    }
    return headers.map(({ name, value }) => ({
        name,
        value: {
            type: 'string',
            value,
        },
    }));
}
exports.bidiNetworkHeadersFromCdpFetchHeaders = bidiNetworkHeadersFromCdpFetchHeaders;
/** Converts from Bidi network headers to CDP Fetch domain header entries. */
function cdpFetchHeadersFromBidiNetworkHeaders(headers) {
    if (headers === undefined) {
        return undefined;
    }
    return headers.map(({ name, value }) => ({
        name,
        value: value.value,
    }));
}
exports.cdpFetchHeadersFromBidiNetworkHeaders = cdpFetchHeadersFromBidiNetworkHeaders;
/** Converts from Bidi auth action to CDP auth challenge response. */
function cdpAuthChallengeResponseFromBidiAuthContinueWithAuthAction(action) {
    switch (action) {
        case 'default':
            return 'Default';
        case 'cancel':
            return 'CancelAuth';
        case 'provideCredentials':
            return 'ProvideCredentials';
    }
}
exports.cdpAuthChallengeResponseFromBidiAuthContinueWithAuthAction = cdpAuthChallengeResponseFromBidiAuthContinueWithAuthAction;
/**
 * Converts from CDP Network domain cookie to BiDi network cookie.
 * * https://chromedevtools.github.io/devtools-protocol/tot/Network/#type-Cookie
 * * https://w3c.github.io/webdriver-bidi/#type-network-Cookie
 */
function cdpToBiDiCookie(cookie) {
    const result = {
        name: cookie.name,
        value: { type: 'string', value: cookie.value },
        domain: cookie.domain,
        path: cookie.path,
        size: cookie.size,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite === undefined
            ? "none" /* Network.SameSite.None */
            : sameSiteCdpToBiDi(cookie.sameSite),
        ...(cookie.expires >= 0 ? { expiry: cookie.expires } : undefined),
    };
    // Extending with CDP-specific properties with `goog:` prefix.
    result[`goog:session`] = cookie.session;
    result[`goog:priority`] = cookie.priority;
    result[`goog:sameParty`] = cookie.sameParty;
    result[`goog:sourceScheme`] = cookie.sourceScheme;
    result[`goog:sourcePort`] = cookie.sourcePort;
    if (cookie.partitionKey !== undefined) {
        result[`goog:partitionKey`] = cookie.partitionKey;
    }
    if (cookie.partitionKeyOpaque !== undefined) {
        result[`goog:partitionKeyOpaque`] = cookie.partitionKeyOpaque;
    }
    return result;
}
exports.cdpToBiDiCookie = cdpToBiDiCookie;
/**
 * Converts from BiDi set network cookie params to CDP Network domain cookie.
 * * https://w3c.github.io/webdriver-bidi/#type-network-Cookie
 * * https://chromedevtools.github.io/devtools-protocol/tot/Network/#type-CookieParam
 */
function bidiToCdpCookie(params, partitionKey) {
    if (params.cookie.value.type !== 'string') {
        // CDP supports only string values in cookies.
        throw new ErrorResponse_1.UnsupportedOperationException('Only string cookie values are supported');
    }
    const deserializedValue = params.cookie.value.value;
    const result = {
        name: params.cookie.name,
        value: deserializedValue,
        domain: params.cookie.domain,
        path: params.cookie.path ?? '/',
        secure: params.cookie.secure ?? false,
        httpOnly: params.cookie.httpOnly ?? false,
        // CDP's `partitionKey` is the BiDi's `partition.sourceOrigin`.
        ...(partitionKey.sourceOrigin !== undefined && {
            partitionKey: partitionKey.sourceOrigin,
        }),
        ...(params.cookie.expiry !== undefined && {
            expires: params.cookie.expiry,
        }),
        ...(params.cookie.sameSite !== undefined && {
            sameSite: sameSiteBiDiToCdp(params.cookie.sameSite),
        }),
    };
    // Extending with CDP-specific properties with `goog:` prefix.
    if (params.cookie[`goog:url`] !== undefined) {
        result.url = params.cookie[`goog:url`];
    }
    if (params.cookie[`goog:priority`] !== undefined) {
        result.priority = params.cookie[`goog:priority`];
    }
    if (params.cookie[`goog:sameParty`] !== undefined) {
        result.sameParty = params.cookie[`goog:sameParty`];
    }
    if (params.cookie[`goog:sourceScheme`] !== undefined) {
        result.sourceScheme = params.cookie[`goog:sourceScheme`];
    }
    if (params.cookie[`goog:sourcePort`] !== undefined) {
        result.sourcePort = params.cookie[`goog:sourcePort`];
    }
    return result;
}
exports.bidiToCdpCookie = bidiToCdpCookie;
function sameSiteCdpToBiDi(sameSite) {
    switch (sameSite) {
        case 'Strict':
            return "strict" /* Network.SameSite.Strict */;
        case 'None':
            return "none" /* Network.SameSite.None */;
        case 'Lax':
            return "lax" /* Network.SameSite.Lax */;
        default:
            // Defaults to `Lax`:
            // https://web.dev/articles/samesite-cookies-explained#samesitelax_by_default
            return "lax" /* Network.SameSite.Lax */;
    }
}
function sameSiteBiDiToCdp(sameSite) {
    switch (sameSite) {
        case "strict" /* Network.SameSite.Strict */:
            return 'Strict';
        case "lax" /* Network.SameSite.Lax */:
            return 'Lax';
        case "none" /* Network.SameSite.None */:
            return 'None';
    }
    throw new ErrorResponse_1.InvalidArgumentException(`Unknown 'sameSite' value ${sameSite}`);
}
//# sourceMappingURL=NetworkUtils.js.map