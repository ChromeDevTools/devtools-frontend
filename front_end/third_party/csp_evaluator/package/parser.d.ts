/**
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
 *
 * @author lwe@google.com (Lukas Weichselbaum)
 */
import * as csp from './csp.js';
/**
 * A class to hold a parser for CSP in string format.
 * @unrestricted
 */
export declare class CspParser {
    csp: csp.Csp;
    /**
     * @param unparsedCsp A Content Security Policy as string.
     */
    constructor(unparsedCsp: string);
    /**
     * Parses a CSP from a string.
     * @param unparsedCsp CSP as string.
     */
    parse(unparsedCsp: string): csp.Csp;
}
/**
 * Remove whitespaces and turn to lower case if CSP keyword or protocol
 * handler.
 * @param directiveValue directive value.
 * @return normalized directive value.
 */
declare function normalizeDirectiveValue(directiveValue: string): string;
export declare const TEST_ONLY: {
    normalizeDirectiveValue: typeof normalizeDirectiveValue;
};
export {};
