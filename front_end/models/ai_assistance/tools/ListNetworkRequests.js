// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Logs from '../../logs/logs.js';
import { formatBytesToKb, seconds } from '../data_formatters/UnitFormatters.js';
import { isOriginAllowedByLock, resolveOriginFromLock, } from './Tool.js';
const UIStringsNotTranslate = {
    listingNetworkRequests: 'Listing network requests',
};
const lockedString = i18n.i18n.lockedString;
/**
 * Imported HAR sessions lock to a synthetic imported-har:// origin, so the real
 * web origin must be extracted from the first request's documentURL.
 */
function resolveBaseOrigin(establishedOrigin, requestsToShow) {
    if (establishedOrigin.isFile()) {
        return '';
    }
    for (const prefix of SDK.SecurityOrigin.IMPORTED_ORIGIN_PREFIXES) {
        if (establishedOrigin.siteId().startsWith(prefix)) {
            return Common.ParsedURL.ParsedURL.extractOrigin(requestsToShow[0].documentURL).toLowerCase();
        }
    }
    return establishedOrigin.siteId();
}
/**
 * Formats and shortens a request URL for a single row in the compact network table:
 * 1. Strips newlines (`\r`, `\n`) so the URL stays on a single table line.
 * 2. Truncates `data:` URLs over 80 chars, keeping the `<mediatype>,` header if under 60 chars.
 * 3. Strips `baseOrigin` from same-origin URLs (when followed by `/`, `?`, `#`, or end-of-string).
 * 4. Caps paths over 300 chars (dropping the query/hash) and `?query`/`#hash` suffixes over 100 chars.
 */
function formatRequestUrl(rawUrl, baseOrigin) {
    // Semicolons remain unescaped because the trailing status;duration;size fields have fixed shapes.
    let cleanUrl = rawUrl.replace(/[\r\n]+/g, '');
    if (/^data:/i.test(cleanUrl)) {
        if (cleanUrl.length <= 80) {
            return cleanUrl;
        }
        const commaIndex = cleanUrl.indexOf(',');
        let truncated;
        if (commaIndex !== -1 && commaIndex < 60) {
            truncated = cleanUrl.slice(0, commaIndex + 1);
        }
        else {
            truncated = Platform.StringUtilities.truncateToCodeUnitLength(cleanUrl, 60);
        }
        return truncated + '...<truncated>';
    }
    if (baseOrigin !== '' && cleanUrl.slice(0, baseOrigin.length).toLowerCase() === baseOrigin) {
        const nextChar = cleanUrl[baseOrigin.length];
        // Verifying a path/query/hash boundary prevents stripping the base origin
        // from cross-origin hosts like https://example.com.evil.com/x or https://example.com:8443/x.
        if (nextChar === undefined) {
            cleanUrl = '/';
        }
        else if (nextChar === '/') {
            cleanUrl = cleanUrl.slice(baseOrigin.length);
        }
        else if (nextChar === '?' || nextChar === '#') {
            cleanUrl = '/' + cleanUrl.slice(baseOrigin.length);
        }
    }
    const queryOrFragmentIndex = cleanUrl.search(/[?#]/);
    const pathPart = queryOrFragmentIndex === -1 ? cleanUrl : cleanUrl.slice(0, queryOrFragmentIndex);
    const suffixPart = queryOrFragmentIndex === -1 ? '' : cleanUrl.slice(queryOrFragmentIndex);
    if (pathPart.length > 300) {
        return Platform.StringUtilities.truncateToCodeUnitLength(pathPart, 300) + '...<truncated>';
    }
    if (suffixPart.length > 100) {
        return pathPart + Platform.StringUtilities.truncateToCodeUnitLength(suffixPart, 100) + '...<truncated>';
    }
    return cleanUrl;
}
/**
 * A tool that lists all network requests recorded by DevTools.
 * Returns a compact semicolon-delimited table of requests initiated by the conversation's established origin.
 */
export class ListNetworkRequestsTool {
    name = "listNetworkRequests" /* ToolName.LIST_NETWORK_REQUESTS */;
    permissionPrompt = "never" /* PermissionPrompt.NEVER */;
    description = 'Returns a compact semicolon-delimited table of requests initiated by the conversation\'s established origin, including request ID, URL, HTTP status code, duration, and transfer size.';
    #networkLog;
    constructor(networkLog) {
        this.#networkLog = networkLog;
    }
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: '',
        nullable: true,
        required: [],
        properties: {},
    };
    displayInfoFromArgs() {
        return {
            title: lockedString(UIStringsNotTranslate.listingNetworkRequests),
            action: 'listNetworkRequests()',
        };
    }
    /**
     * Handles the request to list network requests.
     * Returns a compact semicolon-delimited table of requests initiated by the conversation's established origin.
     */
    async handler(_params, context) {
        // A conversation is locked to an origin once the first query is made.
        // We only allow inspecting requests matching the conversation's established origin.
        const originLock = context.getOriginLock();
        const originResult = resolveOriginFromLock(originLock);
        if ('error' in originResult) {
            return originResult;
        }
        const establishedOrigin = originResult.origin;
        // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        const networkLog = this.#networkLog ?? Logs.NetworkLog.NetworkLog.instance();
        let hasCrossOriginRequest = false;
        const requestsToShow = [];
        for (const request of networkLog.requests()) {
            // If the request's initiator origin does not match the locked origin, skip it.
            if (!isOriginAllowedByLock(originLock, request.initiatorSecurityOrigin())) {
                hasCrossOriginRequest = true;
                continue;
            }
            requestsToShow.push(request);
        }
        if (requestsToShow.length === 0) {
            if (hasCrossOriginRequest) {
                return {
                    error: `No requests showing with origin ${establishedOrigin.siteId()}. Tell the user to start a new chat`,
                };
            }
            return {
                error: 'No network requests have been recorded. DevTools only records requests made while DevTools is open and network recording is enabled (and the log has not been cleared). Ask the user to ensure network recording is enabled, reload the page or repeat the action that triggers the request, and try again.',
            };
        }
        const baseOrigin = resolveBaseOrigin(establishedOrigin, requestsToShow);
        const HEADER = 'id;url;status;duration;size';
        const lines = baseOrigin ? [`origin: ${baseOrigin} (omitted from same-origin /... URLs)`, HEADER] : [HEADER];
        for (const request of requestsToShow) {
            const id = request.requestId().replace(/[\r\n]+/g, '');
            const url = formatRequestUrl(request.url(), baseOrigin);
            lines.push(`${id};${url};${request.statusCode};${seconds(request.duration)};${formatBytesToKb(request.transferSize)}`);
        }
        return {
            result: lines.join('\n'),
            widgets: [{
                    name: 'NETWORK_REQUESTS_LIST',
                    data: {
                        requests: requestsToShow,
                    },
                }],
        };
    }
}
//# sourceMappingURL=ListNetworkRequests.js.map