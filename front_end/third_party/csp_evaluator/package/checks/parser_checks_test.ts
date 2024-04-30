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
 * @fileoverview Tests for CSP Parser checks.
 * @author lwe@google.com (Lukas Weichselbaum)
 */

import 'jasmine';

import {Finding, Severity} from '../finding';
import {CspParser} from '../parser';

import {CheckerFunction} from './checker';
import * as parserChecks from './parser_checks';

/**
 * Runs a check on a CSP string.
 *
 * @param test CSP string.
 * @param checkFunction check.
 */
function checkCsp(test: string, checkFunction: CheckerFunction): Finding[] {
  const parsedCsp = (new CspParser(test)).csp;
  return checkFunction(parsedCsp);
}


describe('Test parser checks', () => {
  /** Tests for csp.parserChecks.checkUnknownDirective */
  it('CheckUnknownDirective', () => {
    const test = 'foobar-src http:';

    const violations = checkCsp(test, parserChecks.checkUnknownDirective);
    expect(violations.length).toBe(1);
    expect(violations[0].severity).toBe(Severity.SYNTAX);
    expect(violations[0].directive).toBe('foobar-src');
  });

  /** Tests for csp.parserChecks.checkMissingSemicolon */
  it('CheckMissingSemicolon', () => {
    const test = 'default-src foo.bar script-src \'none\'';

    const violations = checkCsp(test, parserChecks.checkMissingSemicolon);
    expect(violations.length).toBe(1);
    expect(violations[0].severity).toBe(Severity.SYNTAX);
    expect(violations[0].value).toBe('script-src');
  });

  /** Tests for csp.parserChecks.checkInvalidKeyword */
  it('CheckInvalidKeywordForgottenSingleTicks', () => {
    const test = 'script-src strict-dynamic nonce-test sha256-asdf';

    const violations = checkCsp(test, parserChecks.checkInvalidKeyword);
    expect(violations.length).toBe(3);
    expect(violations.every((v) => v.severity === Severity.SYNTAX)).toBeTrue();
    expect(violations.every((v) => v.description.includes('single-ticks')))
        .toBeTrue();
  });

  it('CheckInvalidKeywordUnknownKeyword', () => {
    const test = 'script-src \'foo-bar\'';

    const violations = checkCsp(test, parserChecks.checkInvalidKeyword);
    expect(violations.length).toBe(1);
    expect(violations[0].severity).toBe(Severity.SYNTAX);
    expect(violations[0].value).toBe('\'foo-bar\'');
  });

  it('CheckInvalidKeywordAllowsRequireTrustedTypesForScript', () => {
    const test = 'require-trusted-types-for \'script\'';

    const violations = checkCsp(test, parserChecks.checkInvalidKeyword);
    expect(violations.length).toBe(0);
  });

  it('CheckInvalidKeywordAllowsTrustedTypesAllowDuplicateKeyword', () => {
    const test = 'trusted-types \'allow-duplicates\' policy1';

    const violations = checkCsp(test, parserChecks.checkInvalidKeyword);
    expect(violations.length).toBe(0);
  });
});
