/**
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
import * as parserChecks from './checks/parser_checks.js';
import * as securityChecks from './checks/security_checks.js';
import * as strictcspChecks from './checks/strictcsp_checks.js';
import * as csp from './csp.js';
/**
 * A class to hold a CSP Evaluator.
 * Evaluates a parsed CSP and reports security findings.
 * @unrestricted
 */
export class CspEvaluator {
    version;
    csp;
    /**
     * List of findings reported by checks.
     *
     */
    findings = [];
    /**
     * @param parsedCsp A parsed Content Security Policy.
     * @param cspVersion CSP version to apply checks for.
     */
    constructor(parsedCsp, cspVersion) {
        /**
         * CSP version.
         */
        this.version = cspVersion || csp.Version.CSP3;
        /**
         * Parsed CSP.
         */
        this.csp = parsedCsp;
    }
    /**
     * Evaluates a parsed CSP against a set of checks
     * @param parsedCspChecks list of checks to run on the parsed CSP (i.e.
     *     checks like backward compatibility checks, which are independent of the
     *     actual CSP version).
     * @param effectiveCspChecks list of checks to run on the effective CSP.
     * @return List of Findings.
     * @export
     */
    evaluate(parsedCspChecks, effectiveCspChecks) {
        this.findings = [];
        const checks = effectiveCspChecks || DEFAULT_CHECKS;
        // We're applying checks on the policy as it would be seen by a browser
        // supporting a specific version of CSP.
        // For example a browser supporting only CSP1 will ignore nonces and
        // therefore 'unsafe-inline' would not get ignored if a policy has nonces.
        const effectiveCsp = this.csp.getEffectiveCsp(this.version, this.findings);
        // Checks independent of CSP version.
        if (parsedCspChecks) {
            for (const check of parsedCspChecks) {
                this.findings = this.findings.concat(check(this.csp));
            }
        }
        // Checks depenent on CSP version.
        for (const check of checks) {
            this.findings = this.findings.concat(check(effectiveCsp));
        }
        return this.findings;
    }
}
/**
 * Set of default checks to run.
 */
export const DEFAULT_CHECKS = [
    securityChecks.checkScriptUnsafeInline, securityChecks.checkScriptUnsafeEval,
    securityChecks.checkPlainUrlSchemes, securityChecks.checkWildcards,
    securityChecks.checkMissingDirectives,
    securityChecks.checkScriptAllowlistBypass,
    securityChecks.checkFlashObjectAllowlistBypass, securityChecks.checkIpSource,
    securityChecks.checkNonceLength, securityChecks.checkSrcHttp,
    securityChecks.checkDeprecatedDirective, parserChecks.checkUnknownDirective,
    parserChecks.checkMissingSemicolon, parserChecks.checkInvalidKeyword
];
/**
 * Strict CSP and backward compatibility checks.
 */
export const STRICTCSP_CHECKS = [
    strictcspChecks.checkStrictDynamic,
    strictcspChecks.checkStrictDynamicNotStandalone,
    strictcspChecks.checkUnsafeInlineFallback,
    strictcspChecks.checkAllowlistFallback,
    strictcspChecks.checkRequiresTrustedTypesForScripts
];
//# sourceMappingURL=evaluator.js.map