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
import { Csp, Directive } from '../csp.js';
import { Finding } from '../finding.js';
/**
 * A list of CSP directives that can allow XSS vulnerabilities if they fail
 * validation.
 */
export declare const DIRECTIVES_CAUSING_XSS: Directive[];
/**
 * A list of URL schemes that can allow XSS vulnerabilities when requests to
 * them are made.
 */
export declare const URL_SCHEMES_CAUSING_XSS: string[];
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
export declare function checkScriptUnsafeInline(effectiveCsp: Csp): Finding[];
/**
 * Checks if passed csp allows eval in scripts.
 * Findings of this check have a medium severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 'unsafe-eval'
 *
 * @param parsedCsp Parsed CSP.
 */
export declare function checkScriptUnsafeEval(parsedCsp: Csp): Finding[];
/**
 * Checks if plain URL schemes (e.g. http:) are allowed in sensitive directives.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src https: http: data:
 *
 * @param parsedCsp Parsed CSP.
 */
export declare function checkPlainUrlSchemes(parsedCsp: Csp): Finding[];
/**
 * Checks if csp contains wildcards in sensitive directives.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src *
 *
 * @param parsedCsp Parsed CSP.
 */
export declare function checkWildcards(parsedCsp: Csp): Finding[];
/**
 * Checks if object-src is restricted to none either directly or via a
 * default-src.
 */
export declare function checkMissingObjectSrcDirective(parsedCsp: Csp): Finding[];
/**
 * Checks if script-src is restricted either directly or via a default-src.
 */
export declare function checkMissingScriptSrcDirective(parsedCsp: Csp): Finding[];
/**
 * Checks if the base-uri needs to be restricted and if so, whether it has been
 * restricted.
 */
export declare function checkMissingBaseUriDirective(parsedCsp: Csp): Finding[];
/**
 * Checks if the base-uri needs to be restricted and if so, whether it has been
 * restricted.
 */
export declare function checkMultipleMissingBaseUriDirective(parsedCsps: Csp[]): Finding[];
/**
 * Checks if all necessary directives for preventing XSS are set.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 'none'
 *
 * @param parsedCsp Parsed CSP.
 */
export declare function checkMissingDirectives(parsedCsp: Csp): Finding[];
/**
 * Checks if allowlisted origins are bypassable by JSONP/Angular endpoints.
 * High severity findings of this check are FP free.
 *
 * Example policy where this check would trigger:
 *  default-src 'none'; script-src www.google.com
 *
 * @param parsedCsp Parsed CSP.
 */
export declare function checkScriptAllowlistBypass(parsedCsp: Csp): Finding[];
/**
 * Checks if allowlisted object-src origins are bypassable.
 * Findings of this check have a high severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  default-src 'none'; object-src ajax.googleapis.com
 *
 * @param parsedCsp Parsed CSP.
 */
export declare function checkFlashObjectAllowlistBypass(parsedCsp: Csp): Finding[];
/**
 * Returns whether the given string "looks" like an IP address. This function
 * only uses basic heuristics and does not accept all valid IPs nor reject all
 * invalid IPs.
 */
export declare function looksLikeIpAddress(maybeIp: string): boolean;
/**
 * Checks if csp contains IP addresses.
 * Findings of this check are informal only and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 127.0.0.1
 *
 * @param parsedCsp Parsed CSP.
 */
export declare function checkIpSource(parsedCsp: Csp): Finding[];
/**
 * Checks if csp contains directives that are deprecated in CSP3.
 * Findings of this check are informal only and are FP free.
 *
 * Example policy where this check would trigger:
 *  report-uri foo.bar/csp
 *
 * @param parsedCsp Parsed CSP.
 */
export declare function checkDeprecatedDirective(parsedCsp: Csp): Finding[];
/**
 * Checks if csp nonce is at least 8 characters long.
 * Findings of this check are of medium severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  script-src 'nonce-short'
 *
 * @param parsedCsp Parsed CSP.
 */
export declare function checkNonceLength(parsedCsp: Csp): Finding[];
/**
 * Checks if CSP allows sourcing from http://
 * Findings of this check are of medium severity and are FP free.
 *
 * Example policy where this check would trigger:
 *  report-uri http://foo.bar/csp
 *
 * @param parsedCsp Parsed CSP.
 */
export declare function checkSrcHttp(parsedCsp: Csp): Finding[];
/**
 * Checks if the policy has configured reporting in a robust manner.
 */
export declare function checkHasConfiguredReporting(parsedCsp: Csp): Finding[];
