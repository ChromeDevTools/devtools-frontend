/**
 * @fileoverview Collection of "strict" CSP and backward compatibility checks.
 * A "strict" CSP is based on nonces or hashes and drops the allowlist.
 * These checks ensure that 'strict-dynamic' and a CSP nonce/hash are present.
 * Due to 'strict-dynamic' any allowlist will get dropped in CSP3.
 * The backward compatibility checks ensure that the strict nonce/hash based CSP
 * will be a no-op in older browsers by checking for presence of 'unsafe-inline'
 * (will be dropped in newer browsers if a nonce or hash is present) and for
 * prsensence of http: and https: url schemes (will be droped in the presence of
 * 'strict-dynamic' in newer browsers).
 *
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
import * as csp from '../csp.js';
import { Keyword } from '../csp.js';
import { Finding, Severity, Type } from '../finding.js';
/**
 * Checks if 'strict-dynamic' is present.
 *
 * Example policy where this check would trigger:
 *  script-src foo.bar
 *
 * @param parsedCsp A parsed csp.
 */
export function checkStrictDynamic(parsedCsp) {
    const directiveName = parsedCsp.getEffectiveDirective(csp.Directive.SCRIPT_SRC);
    const values = parsedCsp.directives[directiveName] || [];
    const schemeOrHostPresent = values.some((v) => !v.startsWith('\''));
    // Check if strict-dynamic is present in case a host/scheme allowlist is used.
    if (schemeOrHostPresent && !values.includes(Keyword.STRICT_DYNAMIC)) {
        return [new Finding(Type.STRICT_DYNAMIC, 'Host allowlists can frequently be bypassed. Consider using ' +
                '\'strict-dynamic\' in combination with CSP nonces or hashes.', Severity.STRICT_CSP, directiveName)];
    }
    return [];
}
/**
 * Checks if 'strict-dynamic' is only used together with a nonce or a hash.
 *
 * Example policy where this check would trigger:
 *  script-src 'strict-dynamic'
 *
 * @param parsedCsp A parsed csp.
 */
export function checkStrictDynamicNotStandalone(parsedCsp) {
    const directiveName = parsedCsp.getEffectiveDirective(csp.Directive.SCRIPT_SRC);
    const values = parsedCsp.directives[directiveName] || [];
    if (values.includes(Keyword.STRICT_DYNAMIC) &&
        (!parsedCsp.policyHasScriptNonces() &&
            !parsedCsp.policyHasScriptHashes())) {
        return [new Finding(Type.STRICT_DYNAMIC_NOT_STANDALONE, '\'strict-dynamic\' without a CSP nonce/hash will block all scripts.', Severity.INFO, directiveName)];
    }
    return [];
}
/**
 * Checks if the policy has 'unsafe-inline' when a nonce or hash are present.
 * This will ensure backward compatibility to browser that don't support
 * CSP nonces or hasehs.
 *
 * Example policy where this check would trigger:
 *  script-src 'nonce-test'
 *
 * @param parsedCsp A parsed csp.
 */
export function checkUnsafeInlineFallback(parsedCsp) {
    if (!parsedCsp.policyHasScriptNonces() &&
        !parsedCsp.policyHasScriptHashes()) {
        return [];
    }
    const directiveName = parsedCsp.getEffectiveDirective(csp.Directive.SCRIPT_SRC);
    const values = parsedCsp.directives[directiveName] || [];
    if (!values.includes(Keyword.UNSAFE_INLINE)) {
        return [new Finding(Type.UNSAFE_INLINE_FALLBACK, 'Consider adding \'unsafe-inline\' (ignored by browsers supporting ' +
                'nonces/hashes) to be backward compatible with older browsers.', Severity.STRICT_CSP, directiveName)];
    }
    return [];
}
/**
 * Checks if the policy has an allowlist fallback (* or http: and https:) when
 * 'strict-dynamic' is present.
 * This will ensure backward compatibility to browser that don't support
 * 'strict-dynamic'.
 *
 * Example policy where this check would trigger:
 *  script-src 'nonce-test' 'strict-dynamic'
 *
 * @param parsedCsp A parsed csp.
 */
export function checkAllowlistFallback(parsedCsp) {
    const directiveName = parsedCsp.getEffectiveDirective(csp.Directive.SCRIPT_SRC);
    const values = parsedCsp.directives[directiveName] || [];
    if (!values.includes(Keyword.STRICT_DYNAMIC)) {
        return [];
    }
    // Check if there's already an allowlist (url scheme or url)
    if (!values.some((v) => ['http:', 'https:', '*'].includes(v) || v.includes('.'))) {
        return [new Finding(Type.ALLOWLIST_FALLBACK, 'Consider adding https: and http: url schemes (ignored by browsers ' +
                'supporting \'strict-dynamic\') to be backward compatible with older ' +
                'browsers.', Severity.STRICT_CSP, directiveName)];
    }
    return [];
}
/**
 * Checks if the policy requires Trusted Types for scripts.
 *
 * I.e. the policy should have the following dirctive:
 *  require-trusted-types-for 'script'
 *
 * @param parsedCsp A parsed csp.
 */
export function checkRequiresTrustedTypesForScripts(parsedCsp) {
    const directiveName = parsedCsp.getEffectiveDirective(csp.Directive.REQUIRE_TRUSTED_TYPES_FOR);
    const values = parsedCsp.directives[directiveName] || [];
    if (!values.includes(csp.TrustedTypesSink.SCRIPT)) {
        return [new Finding(Type.REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS, 'Consider requiring Trusted Types for scripts to lock down DOM XSS ' +
                'injection sinks. You can do this by adding ' +
                '"require-trusted-types-for \'script\'" to your policy.', Severity.INFO, csp.Directive.REQUIRE_TRUSTED_TYPES_FOR)];
    }
    return [];
}
//# sourceMappingURL=strictcsp_checks.js.map