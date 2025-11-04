/**
 * @fileoverview Utils for CSP evaluator.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Removes scheme from url.
 * @param url Url.
 * @return url without scheme.
 */
export function getSchemeFreeUrl(url) {
    url = url.replace(/^\w[+\w.-]*:\/\//i, '');
    // Remove URL scheme.
    url = url.replace(/^\/\//, '');
    // Remove protocol agnostic "//"
    return url;
}
/**
 * Get the hostname from the given url string in a way that supports schemeless
 * URLs and wildcards (aka `*`) in hostnames
 */
export function getHostname(url) {
    const hostname = new URL('https://' +
        getSchemeFreeUrl(url)
            .replace(':*', '') // Remove wildcard port
            .replace('*', 'wildcard_placeholder'))
        .hostname.replace('wildcard_placeholder', '*');
    // Some browsers strip the brackets from IPv6 addresses when you access the
    // hostname. If the scheme free url starts with something that vaguely looks
    // like an IPv6 address and our parsed hostname doesn't have the brackets,
    // then we add them back to work around this
    const ipv6Regex = /^\[[\d:]+\]/;
    if (getSchemeFreeUrl(url).match(ipv6Regex) && !hostname.match(ipv6Regex)) {
        return '[' + hostname + ']';
    }
    return hostname;
}
function setScheme(u) {
    if (u.startsWith('//')) {
        return u.replace('//', 'https://');
    }
    return u;
}
/**
 * Searches for allowlisted CSP origin (URL with wildcards) in list of urls.
 * @param cspUrlString The allowlisted CSP origin. Can contain domain and
 *   path wildcards.
 * @param listOfUrlStrings List of urls to search in.
 * @return First match found in url list, null otherwise.
 */
export function matchWildcardUrls(cspUrlString, listOfUrlStrings) {
    // non-Chromium browsers don't support wildcards in domain names. We work
    // around this by replacing the wildcard with `wildcard_placeholder` before
    // parsing the domain and using that as a magic string. This magic string is
    // encapsulated in this function such that callers of this function do not
    // have to worry about this detail.
    const cspUrl = new URL(setScheme(cspUrlString
        .replace(':*', '') // Remove wildcard port
        .replace('*', 'wildcard_placeholder')));
    const listOfUrls = listOfUrlStrings.map(u => new URL(setScheme(u)));
    const host = cspUrl.hostname.toLowerCase();
    const hostHasWildcard = host.startsWith('wildcard_placeholder.');
    const wildcardFreeHost = host.replace(/^\wildcard_placeholder/i, '');
    const path = cspUrl.pathname;
    const hasPath = path !== '/';
    for (const url of listOfUrls) {
        const domain = url.hostname;
        if (!domain.endsWith(wildcardFreeHost)) {
            // Domains don't match.
            continue;
        }
        // If the host has no subdomain wildcard and doesn't match, continue.
        if (!hostHasWildcard && host !== domain) {
            continue;
        }
        // If the allowlisted url has a path, check if one of the url paths
        // match.
        if (hasPath) {
            // https://www.w3.org/TR/CSP2/#source-list-path-patching
            if (path.endsWith('/')) {
                if (!url.pathname.startsWith(path)) {
                    continue;
                }
            }
            else {
                if (url.pathname !== path) {
                    // Path doesn't match.
                    continue;
                }
            }
        }
        // We found a match.
        return url;
    }
    // No match was found.
    return null;
}
/**
 * Applies a check to all directive values of a csp.
 * @param parsedCsp Parsed CSP.
 * @param check The check function that
 *   should get applied on directive values.
 */
export function applyCheckFunktionToDirectives(parsedCsp, check) {
    const directiveNames = Object.keys(parsedCsp.directives);
    for (const directive of directiveNames) {
        const directiveValues = parsedCsp.directives[directive];
        if (directiveValues) {
            check(directive, directiveValues);
        }
    }
}
//# sourceMappingURL=utils.js.map