// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
const UIStrings = {
    /**
     * @description Comment in a generated fetch command explaining why sec-* request headers are commented out.
     */
    secHeadersSetByBrowser: 'All sec-* headers are set by the browser',
    /**
     * @description Comment in a generated fetch command explaining why proxy-* request headers are commented out.
     */
    proxyHeadersSetByBrowser: 'All proxy-* headers are set by the browser',
    /**
     * @description Comment in a generated fetch command explaining why the Accept-Charset header is commented out.
     */
    deprecatedBrowserDoesNotSend: 'Deprecated; browser does not send this',
    /**
     * @description Comment in a generated fetch command explaining why the Accept-Encoding header is commented out.
     */
    browserNegotiatesCompression: 'Browser negotiates compression',
    /**
     * @description Comment in a generated fetch command explaining why an Access-Control-Request header is commented out.
     */
    browserSetsDuringCorsPreflight: 'Browser sets during CORS preflight',
    /**
     * @description Comment in a generated fetch command explaining why a connection-related header is commented out.
     */
    browserManagesConnections: 'Browser manages connections',
    /**
     * @description Comment in a generated fetch command explaining why the Content-Length header is commented out.
     */
    browserCalculatesFromBody: 'Browser calculates from body',
    /**
     * @description Comment in a generated fetch command explaining why the Cookie header is commented out.
     */
    browserManagesCookieJar: 'Browser manages this from the cookie jar',
    /**
     * @description Comment in a generated fetch command explaining why the Cookie2 header is commented out.
     */
    deprecatedCookieHeader: 'Deprecated cookie header; browser blocks this',
    /**
     * @description Comment in a generated fetch command explaining why the Date header is commented out.
     */
    browserControlsRequestDate: 'Browser controls the request date',
    /**
     * @description Comment in a generated fetch command explaining why the DNT header is commented out.
     */
    browserSetsPrivacyPreferences: 'Browser sets from user privacy preferences',
    /**
     * @description Comment in a generated fetch command explaining why the Expect header is commented out.
     */
    browserManagesRequestExpectations: 'Browser manages request expectations',
    /**
     * @description Comment in a generated fetch command explaining why the Host header is commented out.
     */
    browserDerivesFromUrl: 'Browser will derive from URL',
    /**
     * @description Comment in a generated fetch command explaining why the Origin header is commented out.
     */
    browserSetsRequestContext: 'Browser will set based on request context',
    /**
     * @description Comment in a generated fetch command explaining why the Referer header is commented out.
     */
    browserSetsReferrer: 'Browser will set this from referrer option + policy',
    /**
     * @description Comment in a generated fetch command explaining why the Set-Cookie request header is commented out.
     */
    responseHeaderBlockedOnRequests: 'Response header; browser blocks it on requests',
    /**
     * @description Comment in a generated fetch command explaining why the TE header is commented out.
     */
    browserManagesTransferCodings: 'Browser manages transfer codings',
    /**
     * @description Comment in a generated fetch command explaining why the Trailer header is commented out.
     */
    browserManagesRequestTrailers: 'Browser manages request trailers',
    /**
     * @description Comment in a generated fetch command explaining why the Transfer-Encoding header is commented out.
     */
    browserManagesTransferEncoding: 'Browser manages transfer encoding',
    /**
     * @description Comment in a generated fetch command explaining why the Upgrade header is commented out.
     */
    browserManagesProtocolUpgrades: 'Browser manages protocol upgrades',
    /**
     * @description Comment in a generated fetch command explaining why the Via header is commented out.
     */
    browserAndProxiesManageMetadata: 'Browser and proxies manage forwarding metadata',
    /**
     * @description Comment in a generated fetch command explaining why a method override header is commented out.
     */
    browserBlocksForbiddenMethods: 'Browser blocks overrides to forbidden methods',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/FetchHeaderCommenting.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
const FORBIDDEN_METHOD_PATTERN = /^(?:CONNECT|TRACE|TRACK)$/i;
function containsForbiddenMethod(value) {
    return value.split(',').some(method => FORBIDDEN_METHOD_PATTERN.test(method.trim()));
}
/**
 * Rules for request headers that the browser will ignore or override.
 * https://fetch.spec.whatwg.org/#forbidden-request-header
 */
export const FORBIDDEN_HEADER_RULES = [
    { pattern: /^sec-/i, comment: i18nLazyString(UIStrings.secHeadersSetByBrowser), style: 'prefix' },
    { pattern: /^proxy-/i, comment: i18nLazyString(UIStrings.proxyHeadersSetByBrowser), style: 'prefix' },
    { pattern: /^accept-charset$/i, comment: i18nLazyString(UIStrings.deprecatedBrowserDoesNotSend), style: 'append' },
    { pattern: /^accept-encoding$/i, comment: i18nLazyString(UIStrings.browserNegotiatesCompression), style: 'append' },
    {
        pattern: /^access-control-request-headers$/i,
        comment: i18nLazyString(UIStrings.browserSetsDuringCorsPreflight),
        style: 'append',
    },
    {
        pattern: /^access-control-request-method$/i,
        comment: i18nLazyString(UIStrings.browserSetsDuringCorsPreflight),
        style: 'append',
    },
    { pattern: /^connection$/i, comment: i18nLazyString(UIStrings.browserManagesConnections), style: 'append' },
    { pattern: /^content-length$/i, comment: i18nLazyString(UIStrings.browserCalculatesFromBody), style: 'append' },
    { pattern: /^cookie$/i, comment: i18nLazyString(UIStrings.browserManagesCookieJar), style: 'append' },
    { pattern: /^cookie2$/i, comment: i18nLazyString(UIStrings.deprecatedCookieHeader), style: 'append' },
    { pattern: /^date$/i, comment: i18nLazyString(UIStrings.browserControlsRequestDate), style: 'append' },
    { pattern: /^dnt$/i, comment: i18nLazyString(UIStrings.browserSetsPrivacyPreferences), style: 'append' },
    { pattern: /^expect$/i, comment: i18nLazyString(UIStrings.browserManagesRequestExpectations), style: 'append' },
    { pattern: /^host$/i, comment: i18nLazyString(UIStrings.browserDerivesFromUrl), style: 'append' },
    { pattern: /^keep-alive$/i, comment: i18nLazyString(UIStrings.browserManagesConnections), style: 'append' },
    { pattern: /^origin$/i, comment: i18nLazyString(UIStrings.browserSetsRequestContext), style: 'append' },
    { pattern: /^referer$/i, comment: i18nLazyString(UIStrings.browserSetsReferrer), style: 'append' },
    { pattern: /^set-cookie$/i, comment: i18nLazyString(UIStrings.responseHeaderBlockedOnRequests), style: 'append' },
    { pattern: /^te$/i, comment: i18nLazyString(UIStrings.browserManagesTransferCodings), style: 'append' },
    { pattern: /^trailer$/i, comment: i18nLazyString(UIStrings.browserManagesRequestTrailers), style: 'append' },
    {
        pattern: /^transfer-encoding$/i,
        comment: i18nLazyString(UIStrings.browserManagesTransferEncoding),
        style: 'append',
    },
    { pattern: /^upgrade$/i, comment: i18nLazyString(UIStrings.browserManagesProtocolUpgrades), style: 'append' },
    { pattern: /^via$/i, comment: i18nLazyString(UIStrings.browserAndProxiesManageMetadata), style: 'append' },
    {
        pattern: /^x-(?:http-method(?:-override)?|method-override)$/i,
        comment: i18nLazyString(UIStrings.browserBlocksForbiddenMethods),
        style: 'append',
        isForbidden: containsForbiddenMethod,
    },
];
function findForbiddenHeaderRule(name, value, rules) {
    return rules.find(rule => rule.pattern.test(name) && (rule.isForbidden?.(value) ?? true));
}
export function isForbiddenHeader(name, value, rules = FORBIDDEN_HEADER_RULES) {
    return Boolean(findForbiddenHeaderRule(name, value, rules));
}
// Matches a typical header line: leading whitespace, then `"key": value`
// Captures the indentation, key name, and JSON-encoded value.
const HEADER_LINE_RE = /^(\s*)"([^"]+)"\s*:\s*("(?:\\.|[^"\\])*")(?:,)?\s*$/;
// Detects the start of the headers block.
const HEADERS_START_RE = /^\s*"headers"\s*:\s*\{\s*$/;
// Detects a line that closes a block (just whitespace + } with optional comma).
const BLOCK_CLOSE_RE = /^\s*\},?\s*$/;
/**
 * Given serialized fetch options, comments out header lines that match any of
 * the forbidden header rules.
 *
 * The format of the serializedOptions is well constrained.
 * HTTP headers are, by spec, single-line. Multi-value headers will be
 * joined by commas into one string. Then, JSON.stringify will always render
 * each field on its own line.
 *
 * The function operates line-by-line with a simple 3-mode state machine:
 *   Mode 1: Before the headers block
 *   Mode 2: Inside the headers block
 *   Mode 3: After the headers block (or after bailing on anomaly)
 *
 * If an anomalous line is encountered inside the headers block (one that doesn't
 * look like a simple `"key": value,` entry), processing stops immediately and
 * remaining lines pass through unchanged.
 */
export function commentForbiddenHeaders(serializedOptions, rules = FORBIDDEN_HEADER_RULES) {
    const lines = serializedOptions.split('\n');
    const result = [];
    let mode = 1 /* Mode.BEFORE_HEADERS */;
    // For grouping consecutive matches with the same 'prefix' rule.
    let pendingPrefixRule = null;
    function resetPrefixState() {
        pendingPrefixRule = null;
    }
    for (const line of lines) {
        switch (mode) {
            case 1 /* Mode.BEFORE_HEADERS */: {
                result.push(line);
                if (HEADERS_START_RE.test(line)) {
                    mode = 2 /* Mode.INSIDE_HEADERS */;
                }
                break;
            }
            case 2 /* Mode.INSIDE_HEADERS */: {
                // Check for end of headers block.
                if (BLOCK_CLOSE_RE.test(line)) {
                    resetPrefixState();
                    result.push(line);
                    mode = 3 /* Mode.AFTER_HEADERS */;
                    break;
                }
                // Try to parse as a header line.
                const match = HEADER_LINE_RE.exec(line);
                if (!match) {
                    // Anomalous line — bail out.
                    resetPrefixState();
                    result.push(line);
                    mode = 3 /* Mode.AFTER_HEADERS */;
                    break;
                }
                const indent = match[1];
                const headerName = match[2];
                const headerValue = JSON.parse(match[3]);
                // Check if this header matches any forbidden rule.
                const matchedRule = findForbiddenHeaderRule(headerName, headerValue, rules);
                if (!matchedRule) {
                    // Not forbidden — emit as-is.
                    resetPrefixState();
                    result.push(line);
                }
                else if (matchedRule.style === 'append') {
                    resetPrefixState();
                    result.push(`${indent}// ${line.trimStart()} // ${matchedRule.comment()}`);
                }
                else {
                    // 'prefix' style: emit a heading comment before the first match in a group.
                    if (pendingPrefixRule !== matchedRule) {
                        pendingPrefixRule = matchedRule;
                        result.push(`${indent}// ${matchedRule.comment()}`);
                    }
                    result.push(`${indent}// ${line.trimStart()}`);
                }
                break;
            }
            case 3 /* Mode.AFTER_HEADERS */: {
                result.push(line);
                break;
            }
        }
    }
    return result.join('\n');
}
//# sourceMappingURL=FetchHeaderCommenting.js.map