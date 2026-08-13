/**
 * @fileoverview Collection of CSP evaluation checks.
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
import * as angular from '../allowlist_bypasses/angular.js';
import * as flash from '../allowlist_bypasses/flash.js';
import * as jsonp from '../allowlist_bypasses/jsonp.js';
import * as csp from '../csp.js';
import { Directive, Keyword } from '../csp.js';
import { Finding, Severity, Type } from '../finding.js';
import * as utils from '../utils.js';
/**
 * A list of CSP directives that can allow XSS vulnerabilities if they fail
 * validation.
 */
export const DIRECTIVES_CAUSING_XSS = [Directive.SCRIPT_SRC, Directive.OBJECT_SRC, Directive.BASE_URI];
/**
 * A list of URL schemes that can allow XSS vulnerabilities when requests to
 * them are made.
 */
export const URL_SCHEMES_CAUSING_XSS = ['data:', 'http:', 'https:'];
/**
 * Checks if passed csp allows inline scripts.
 * Findings of this check are critical and FP free.
 * unsafe-inline is ignored in the presence of a nonce or a hash. This check
 * does not account for this and therefore the effectiveCsp needs to be passed.
 *
 * Example policy where this check would trigger:
 *  script-src 'unsafe-inline'
 *
 * @param effectiveCsp A parsed csp that only contains values which
 *  are active in a certain version of CSP (e.g. no unsafe-inline if a nonce
 *  is present).
 */
export function checkScriptUnsafeInline(effectiveCsp) {
    const directiveName = effectiveCsp.getEffectiveDirective(Directive.SCRIPT_SRC);
    const values = effectiveCsp.directives[directiveName] || [];
    // Check if unsafe-inline is present.
    if (values.includes(Keyword.UNSAFE_INLINE)) {
        return [new Finding(Type.SCRIPT_UNSAFE_INLINE, `'unsafe-inline' allows the execution of unsafe in-page scripts ` +
                'and event handlers.', Severity.HIGH, directiveName, Keyword.UNSAFE_INLINE)];
    }
    return [];
}
/**
 * Checks if passed csp allows eval in scripts.
 * Findings of this check have a medium severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 'unsafe-eval'
 *
 * @param parsedCsp Parsed CSP.
 */
export function checkScriptUnsafeEval(parsedCsp) {
    const directiveName = parsedCsp.getEffectiveDirective(Directive.SCRIPT_SRC);
    const values = parsedCsp.directives[directiveName] || [];
    // Check if unsafe-eval is present.
    if (values.includes(Keyword.UNSAFE_EVAL)) {
        return [new Finding(Type.SCRIPT_UNSAFE_EVAL, `'unsafe-eval' allows the execution of code injected into DOM APIs ` +
                'such as eval().', Severity.MEDIUM_MAYBE, directiveName, Keyword.UNSAFE_EVAL)];
    }
    return [];
}
/**
 * Checks if plain URL schemes (e.g. http:) are allowed in sensitive directives.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src https: http: data:
 *
 * @param parsedCsp Parsed CSP.
 */
export function checkPlainUrlSchemes(parsedCsp) {
    const violations = [];
    const directivesToCheck = parsedCsp.getEffectiveDirectives(DIRECTIVES_CAUSING_XSS);
    for (const directive of directivesToCheck) {
        const values = parsedCsp.directives[directive] || [];
        for (const value of values) {
            if (URL_SCHEMES_CAUSING_XSS.includes(value)) {
                violations.push(new Finding(Type.PLAIN_URL_SCHEMES, value + ' URI in ' + directive + ' allows the execution of ' +
                    'unsafe scripts.', Severity.HIGH, directive, value));
            }
        }
    }
    return violations;
}
/**
 * Checks if csp contains wildcards in sensitive directives.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src *
 *
 * @param parsedCsp Parsed CSP.
 */
export function checkWildcards(parsedCsp) {
    const violations = [];
    const directivesToCheck = parsedCsp.getEffectiveDirectives(DIRECTIVES_CAUSING_XSS);
    for (const directive of directivesToCheck) {
        const values = parsedCsp.directives[directive] || [];
        for (const value of values) {
            const url = utils.getSchemeFreeUrl(value);
            if (url === '*') {
                violations.push(new Finding(Type.PLAIN_WILDCARD, directive + ` should not allow '*' as source`, Severity.HIGH, directive, value));
                continue;
            }
        }
    }
    return violations;
}
/**
 * Checks if object-src is restricted to none either directly or via a
 * default-src.
 */
export function checkMissingObjectSrcDirective(parsedCsp) {
    let objectRestrictions = [];
    if (Directive.OBJECT_SRC in parsedCsp.directives) {
        objectRestrictions = parsedCsp.directives[Directive.OBJECT_SRC];
    }
    else if (Directive.DEFAULT_SRC in parsedCsp.directives) {
        objectRestrictions = parsedCsp.directives[Directive.DEFAULT_SRC];
    }
    if (objectRestrictions !== undefined && objectRestrictions.length >= 1) {
        return [];
    }
    return [new Finding(Type.MISSING_DIRECTIVES, `Missing object-src allows the injection of plugins which can execute JavaScript. Can you set it to 'none'?`, Severity.HIGH, Directive.OBJECT_SRC)];
}
/**
 * Checks if script-src is restricted either directly or via a default-src.
 */
export function checkMissingScriptSrcDirective(parsedCsp) {
    if (Directive.SCRIPT_SRC in parsedCsp.directives ||
        Directive.DEFAULT_SRC in parsedCsp.directives) {
        return [];
    }
    return [new Finding(Type.MISSING_DIRECTIVES, 'script-src directive is missing.', Severity.HIGH, Directive.SCRIPT_SRC)];
}
/**
 * Checks if the base-uri needs to be restricted and if so, whether it has been
 * restricted.
 */
export function checkMissingBaseUriDirective(parsedCsp) {
    return checkMultipleMissingBaseUriDirective([parsedCsp]);
}
/**
 * Checks if the base-uri needs to be restricted and if so, whether it has been
 * restricted.
 */
export function checkMultipleMissingBaseUriDirective(parsedCsps) {
    // base-uri can be used to bypass nonce based CSPs and hash based CSPs that
    // use strict dynamic
    const needsBaseUri = (csp) => (csp.policyHasScriptNonces() ||
        (csp.policyHasScriptHashes() && csp.policyHasStrictDynamic()));
    const hasBaseUri = (csp) => Directive.BASE_URI in csp.directives;
    if (parsedCsps.some(needsBaseUri) && !parsedCsps.some(hasBaseUri)) {
        const description = 'Missing base-uri allows the injection of base tags. ' +
            'They can be used to set the base URL for all relative (script) ' +
            'URLs to an attacker controlled domain. ' +
            `Can you set it to 'none' or 'self'?`;
        return [new Finding(Type.MISSING_DIRECTIVES, description, Severity.HIGH, Directive.BASE_URI)];
    }
    return [];
}
/**
 * Checks if all necessary directives for preventing XSS are set.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 'none'
 *
 * @param parsedCsp Parsed CSP.
 */
export function checkMissingDirectives(parsedCsp) {
    return [
        ...checkMissingObjectSrcDirective(parsedCsp),
        ...checkMissingScriptSrcDirective(parsedCsp),
        ...checkMissingBaseUriDirective(parsedCsp),
    ];
}
/**
 * Checks if allowlisted origins are bypassable by JSONP/Angular endpoints.
 * High severity findings of this check are FP free.
 *
 * Example policy where this check would trigger:
 *  default-src 'none'; script-src www.google.com
 *
 * @param parsedCsp Parsed CSP.
 */
export function checkScriptAllowlistBypass(parsedCsp) {
    const violations = [];
    const effectiveScriptSrcDirective = parsedCsp.getEffectiveDirective(Directive.SCRIPT_SRC);
    const scriptSrcValues = parsedCsp.directives[effectiveScriptSrcDirective] || [];
    if (scriptSrcValues.includes(Keyword.NONE)) {
        return violations;
    }
    for (const value of scriptSrcValues) {
        if (value === Keyword.SELF) {
            violations.push(new Finding(Type.SCRIPT_ALLOWLIST_BYPASS, `'self' can be problematic if you host JSONP, AngularJS or user ` +
                'uploaded files.', Severity.MEDIUM_MAYBE, effectiveScriptSrcDirective, value));
            continue;
        }
        // Ignore keywords, nonces and hashes (they start with a single quote).
        if (value.startsWith('\'')) {
            continue;
        }
        // Ignore standalone schemes and things that don't look like URLs (no dot).
        if (csp.isUrlScheme(value) || value.indexOf('.') === -1) {
            continue;
        }
        const url = '//' + utils.getSchemeFreeUrl(value);
        const angularBypass = utils.matchWildcardUrls(url, angular.URLS);
        let jsonpBypass = utils.matchWildcardUrls(url, jsonp.URLS);
        // Some JSONP bypasses only work in presence of unsafe-eval.
        if (jsonpBypass) {
            const evalRequired = jsonp.NEEDS_EVAL.includes(jsonpBypass.hostname);
            const evalPresent = scriptSrcValues.includes(Keyword.UNSAFE_EVAL);
            if (evalRequired && !evalPresent) {
                jsonpBypass = null;
            }
        }
        if (jsonpBypass || angularBypass) {
            let bypassDomain = '';
            let bypassTxt = '';
            if (jsonpBypass) {
                bypassDomain = jsonpBypass.hostname;
                bypassTxt = ' JSONP endpoints';
            }
            if (angularBypass) {
                bypassDomain = angularBypass.hostname;
                bypassTxt += (bypassTxt.trim() === '') ? '' : ' and';
                bypassTxt += ' Angular libraries';
            }
            violations.push(new Finding(Type.SCRIPT_ALLOWLIST_BYPASS, bypassDomain + ' is known to host' + bypassTxt +
                ' which allow to bypass this CSP.', Severity.HIGH, effectiveScriptSrcDirective, value));
        }
        else {
            violations.push(new Finding(Type.SCRIPT_ALLOWLIST_BYPASS, `No bypass found; make sure that this URL doesn't serve JSONP ` +
                'replies or Angular libraries.', Severity.MEDIUM_MAYBE, effectiveScriptSrcDirective, value));
        }
    }
    return violations;
}
/**
 * Checks if allowlisted object-src origins are bypassable.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  default-src 'none'; object-src ajax.googleapis.com
 *
 * @param parsedCsp Parsed CSP.
 */
export function checkFlashObjectAllowlistBypass(parsedCsp) {
    const violations = [];
    const effectiveObjectSrcDirective = parsedCsp.getEffectiveDirective(Directive.OBJECT_SRC);
    const objectSrcValues = parsedCsp.directives[effectiveObjectSrcDirective] || [];
    // If flash is not allowed in plugin-types, continue.
    const pluginTypes = parsedCsp.directives[Directive.PLUGIN_TYPES];
    if (pluginTypes && !pluginTypes.includes('application/x-shockwave-flash')) {
        return [];
    }
    for (const value of objectSrcValues) {
        // Nothing to do here if 'none'.
        if (value === Keyword.NONE) {
            return [];
        }
        const url = '//' + utils.getSchemeFreeUrl(value);
        const flashBypass = utils.matchWildcardUrls(url, flash.URLS);
        if (flashBypass) {
            violations.push(new Finding(Type.OBJECT_ALLOWLIST_BYPASS, flashBypass.hostname +
                ' is known to host Flash files which allow to bypass this CSP.', Severity.HIGH, effectiveObjectSrcDirective, value));
        }
        else if (effectiveObjectSrcDirective === Directive.OBJECT_SRC) {
            violations.push(new Finding(Type.OBJECT_ALLOWLIST_BYPASS, `Can you restrict object-src to 'none' only?`, Severity.MEDIUM_MAYBE, effectiveObjectSrcDirective, value));
        }
    }
    return violations;
}
/**
 * Returns whether the given string "looks" like an IP address. This function
 * only uses basic heuristics and does not accept all valid IPs nor reject all
 * invalid IPs.
 */
export function looksLikeIpAddress(maybeIp) {
    if (maybeIp.startsWith('[') && maybeIp.endsWith(']')) {
        // Looks like an IPv6 address and not a hostname (though it may be some
        // nonsense like `[foo]`)
        return true;
    }
    if (/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(maybeIp)) {
        // Looks like an IPv4 address (though it may be something like
        // `500.600.700.800`
        return true;
    }
    // Won't match IP addresses encoded in other manners (eg octal or
    // decimal)
    return false;
}
/**
 * Checks if csp contains IP addresses.
 * Findings of this check are informal only and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 127.0.0.1
 *
 * @param parsedCsp Parsed CSP.
 */
export function checkIpSource(parsedCsp) {
    const violations = [];
    // Function for checking if directive values contain IP addresses.
    const checkIp = (directive, directiveValues) => {
        for (const value of directiveValues) {
            const host = utils.getHostname(value);
            if (looksLikeIpAddress(host)) {
                // Check if localhost.
                // See 4.8 in https://www.w3.org/TR/CSP2/#match-source-expression
                if (host === '127.0.0.1') {
                    violations.push(new Finding(Type.IP_SOURCE, directive + ' directive allows localhost as source. ' +
                        'Please make sure to remove this in production environments.', Severity.INFO, directive, value));
                }
                else {
                    violations.push(new Finding(Type.IP_SOURCE, directive + ' directive has an IP-Address as source: ' + host +
                        ' (will be ignored by browsers!). ', Severity.INFO, directive, value));
                }
            }
        }
    };
    // Apply check to values of all directives.
    utils.applyCheckFunktionToDirectives(parsedCsp, checkIp);
    return violations;
}
/**
 * Checks if csp contains directives that are deprecated in CSP3.
 * Findings of this check are informal only and are FP free.
 *
 * Example policy where this check would trigger:
 *  report-uri foo.bar/csp
 *
 * @param parsedCsp Parsed CSP.
 */
export function checkDeprecatedDirective(parsedCsp) {
    const violations = [];
    // More details: https://www.chromestatus.com/feature/5769374145183744
    if (Directive.REFLECTED_XSS in parsedCsp.directives) {
        violations.push(new Finding(Type.DEPRECATED_DIRECTIVE, 'reflected-xss is deprecated since CSP2. ' +
            'Please, use the X-XSS-Protection header instead.', Severity.INFO, Directive.REFLECTED_XSS));
    }
    // More details: https://www.chromestatus.com/feature/5680800376815616
    if (Directive.REFERRER in parsedCsp.directives) {
        violations.push(new Finding(Type.DEPRECATED_DIRECTIVE, 'referrer is deprecated since CSP2. ' +
            'Please, use the Referrer-Policy header instead.', Severity.INFO, Directive.REFERRER));
    }
    // More details: https://github.com/w3c/webappsec-csp/pull/327
    if (Directive.DISOWN_OPENER in parsedCsp.directives) {
        violations.push(new Finding(Type.DEPRECATED_DIRECTIVE, 'disown-opener is deprecated since CSP3. ' +
            'Please, use the Cross Origin Opener Policy header instead.', Severity.INFO, Directive.DISOWN_OPENER));
    }
    return violations;
}
/**
 * Checks if csp nonce is at least 8 characters long.
 * Findings of this check are of medium severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 'nonce-short'
 *
 * @param parsedCsp Parsed CSP.
 */
export function checkNonceLength(parsedCsp) {
    const noncePattern = new RegExp('^\'nonce-(.+)\'$');
    const violations = [];
    utils.applyCheckFunktionToDirectives(parsedCsp, (directive, directiveValues) => {
        for (const value of directiveValues) {
            const match = value.match(noncePattern);
            if (!match) {
                continue;
            }
            // Not a nonce.
            const nonceValue = match[1];
            if (nonceValue.length < 8) {
                violations.push(new Finding(Type.NONCE_LENGTH, 'Nonces should be at least 8 characters long.', Severity.MEDIUM, directive, value));
            }
            if (!csp.isNonce(value, true)) {
                violations.push(new Finding(Type.NONCE_CHARSET, 'Nonces should only use the base64 charset.', Severity.INFO, directive, value));
            }
        }
    });
    return violations;
}
/**
 * Checks if CSP allows sourcing from http://
 * Findings of this check are of medium severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  report-uri http://foo.bar/csp
 *
 * @param parsedCsp Parsed CSP.
 */
export function checkSrcHttp(parsedCsp) {
    const violations = [];
    utils.applyCheckFunktionToDirectives(parsedCsp, (directive, directiveValues) => {
        for (const value of directiveValues) {
            const description = directive === Directive.REPORT_URI ?
                'Use HTTPS to send violation reports securely.' :
                'Allow only resources downloaded over HTTPS.';
            if (value.startsWith('http://')) {
                violations.push(new Finding(Type.SRC_HTTP, description, Severity.MEDIUM, directive, value));
            }
        }
    });
    return violations;
}
/**
 * Checks if the policy has configured reporting in a robust manner.
 */
export function checkHasConfiguredReporting(parsedCsp) {
    const reportUriValues = parsedCsp.directives[Directive.REPORT_URI] || [];
    if (reportUriValues.length > 0) {
        return [];
    }
    const reportToValues = parsedCsp.directives[Directive.REPORT_TO] || [];
    if (reportToValues.length > 0) {
        return [new Finding(Type.REPORT_TO_ONLY, `This CSP policy only provides a reporting destination via the 'report-to' directive. This directive is only supported in Chromium-based browsers so it is recommended to also use a 'report-uri' directive.`, Severity.INFO, Directive.REPORT_TO)];
    }
    return [new Finding(Type.REPORTING_DESTINATION_MISSING, 'This CSP policy does not configure a reporting destination. This makes it difficult to maintain the CSP policy over time and monitor for any breakages.', Severity.INFO, Directive.REPORT_URI)];
}
//# sourceMappingURL=security_checks.js.map