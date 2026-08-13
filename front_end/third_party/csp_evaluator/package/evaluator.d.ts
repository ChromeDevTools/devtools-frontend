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
import { CheckerFunction } from './checks/checker.js';
import { Csp, Version } from './csp.js';
import { Finding } from './finding.js';
/**
 * A class to hold a CSP Evaluator.
 * Evaluates a parsed CSP and reports security findings.
 * @unrestricted
 */
export declare class CspEvaluator {
    version: Version;
    csp: Csp;
    /**
     * List of findings reported by checks.
     *
     */
    findings: Finding[];
    /**
     * @param parsedCsp A parsed Content Security Policy.
     * @param cspVersion CSP version to apply checks for.
     */
    constructor(parsedCsp: Csp, cspVersion?: Version);
    /**
     * Evaluates a parsed CSP against a set of checks
     * @param parsedCspChecks list of checks to run on the parsed CSP (i.e.
     *     checks like backward compatibility checks, which are independent of the
     *     actual CSP version).
     * @param effectiveCspChecks list of checks to run on the effective CSP.
     * @return List of Findings.
     * @export
     */
    evaluate(parsedCspChecks?: CheckerFunction[], effectiveCspChecks?: CheckerFunction[]): Finding[];
}
/**
 * Set of default checks to run.
 */
export declare const DEFAULT_CHECKS: CheckerFunction[];
/**
 * Strict CSP and backward compatibility checks.
 */
export declare const STRICTCSP_CHECKS: CheckerFunction[];
