"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCheckFunktionToDirectives = exports.matchWildcardUrls = exports.getHostname = exports.getSchemeFreeUrl = void 0;
function getSchemeFreeUrl(url) {
    url = url.replace(/^\w[+\w.-]*:\/\//i, '');
    url = url.replace(/^\/\//, '');
    return url;
}
exports.getSchemeFreeUrl = getSchemeFreeUrl;
function getHostname(url) {
    const hostname = new URL('https://' +
        getSchemeFreeUrl(url)
            .replace(':*', '')
            .replace('*', 'wildcard_placeholder'))
        .hostname.replace('wildcard_placeholder', '*');
    const ipv6Regex = /^\[[\d:]+\]/;
    if (getSchemeFreeUrl(url).match(ipv6Regex) && !hostname.match(ipv6Regex)) {
        return '[' + hostname + ']';
    }
    return hostname;
}
exports.getHostname = getHostname;
function setScheme(u) {
    if (u.startsWith('//')) {
        return u.replace('//', 'https://');
    }
    return u;
}
function matchWildcardUrls(cspUrlString, listOfUrlStrings) {
    const cspUrl = new URL(setScheme(cspUrlString
        .replace(':*', '')
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
            continue;
        }
        if (!hostHasWildcard && host !== domain) {
            continue;
        }
        if (hasPath) {
            if (path.endsWith('/')) {
                if (!url.pathname.startsWith(path)) {
                    continue;
                }
            }
            else {
                if (url.pathname !== path) {
                    continue;
                }
            }
        }
        return url;
    }
    return null;
}
exports.matchWildcardUrls = matchWildcardUrls;
function applyCheckFunktionToDirectives(parsedCsp, check) {
    const directiveNames = Object.keys(parsedCsp.directives);
    for (const directive of directiveNames) {
        const directiveValues = parsedCsp.directives[directive];
        if (directiveValues) {
            check(directive, directiveValues);
        }
    }
}
exports.applyCheckFunktionToDirectives = applyCheckFunktionToDirectives;
//# sourceMappingURL=utils.js.map