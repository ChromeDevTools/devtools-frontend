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
export class CspParser {
    csp;
    /**
     * @param unparsedCsp A Content Security Policy as string.
     */
    constructor(unparsedCsp) {
        /**
         * Parsed CSP
         */
        this.csp = new csp.Csp();
        this.parse(unparsedCsp);
    }
    /**
     * Parses a CSP from a string.
     * @param unparsedCsp CSP as string.
     */
    parse(unparsedCsp) {
        // Reset the internal state:
        this.csp = new csp.Csp();
        // Split CSP into directive tokens.
        const directiveTokens = unparsedCsp.split(';');
        for (let i = 0; i < directiveTokens.length; i++) {
            const directiveToken = directiveTokens[i].trim();
            // Split directive tokens into directive name and directive values.
            const directiveParts = directiveToken.match(/\S+/g);
            if (Array.isArray(directiveParts)) {
                const directiveName = directiveParts[0].toLowerCase();
                // If the set of directives already contains a directive whose name is a
                // case insensitive match for directive name, ignore this instance of
                // the directive and continue to the next token.
                if (directiveName in this.csp.directives) {
                    continue;
                }
                if (!csp.isDirective(directiveName)) {
                }
                const directiveValues = [];
                for (let directiveValue, j = 1; (directiveValue = directiveParts[j]); j++) {
                    directiveValue = normalizeDirectiveValue(directiveValue);
                    if (!directiveValues.includes(directiveValue)) {
                        directiveValues.push(directiveValue);
                    }
                }
                this.csp.directives[directiveName] = directiveValues;
            }
        }
        return this.csp;
    }
}
/**
 * Remove whitespaces and turn to lower case if CSP keyword or protocol
 * handler.
 * @param directiveValue directive value.
 * @return normalized directive value.
 */
function normalizeDirectiveValue(directiveValue) {
    directiveValue = directiveValue.trim();
    const directiveValueLower = directiveValue.toLowerCase();
    if (csp.isKeyword(directiveValueLower) || csp.isUrlScheme(directiveValue)) {
        return directiveValueLower;
    }
    return directiveValue;
}
export const TEST_ONLY = { normalizeDirectiveValue };
//# sourceMappingURL=parser.js.map