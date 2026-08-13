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
import * as csp from './csp.js';
/**
 * Removes scheme from url.
 * @param url Url.
 * @return url without scheme.
 */
export declare function getSchemeFreeUrl(url: string): string;
/**
 * Get the hostname from the given url string in a way that supports schemeless
 * URLs and wildcards (aka `*`) in hostnames
 */
export declare function getHostname(url: string): string;
/**
 * Searches for allowlisted CSP origin (URL with wildcards) in list of urls.
 * @param cspUrlString The allowlisted CSP origin. Can contain domain and
 *   path wildcards.
 * @param listOfUrlStrings List of urls to search in.
 * @return First match found in url list, null otherwise.
 */
export declare function matchWildcardUrls(cspUrlString: string, listOfUrlStrings: string[]): URL | null;
/**
 * Applies a check to all directive values of a csp.
 * @param parsedCsp Parsed CSP.
 * @param check The check function that
 *   should get applied on directive values.
 */
export declare function applyCheckFunktionToDirectives(parsedCsp: csp.Csp, check: (directive: string, directiveValues: string[]) => void): void;
