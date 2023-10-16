/**
 * @fileoverview Tests for CSP Finding.
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

import 'jasmine';

import {Directive, Keyword} from './csp';
import {Finding, Severity, Type} from './finding';


describe('Test finding', () => {
  it('Finding', () => {
    const type = Type.MISSING_SEMICOLON;
    const description = 'description';
    const severity = Severity.HIGH;
    const directive = Directive.SCRIPT_SRC;
    const value = Keyword.NONE;

    const finding = new Finding(type, description, severity, directive, value);

    expect(finding.type).toBe(type);
    expect(finding.description).toBe(description);
    expect(finding.severity).toBe(severity);
    expect(finding.directive).toBe(directive);
    expect(finding.value).toBe(value);
  });

  it('GetHighestSeverity', () => {
    const finding1 = new Finding(
        Type.MISSING_SEMICOLON, 'description', Severity.HIGH,
        Directive.SCRIPT_SRC);
    const finding2 = new Finding(
        Type.MISSING_SEMICOLON, 'description', Severity.MEDIUM,
        Directive.SCRIPT_SRC);
    const finding3 = new Finding(
        Type.MISSING_SEMICOLON, 'description', Severity.INFO,
        Directive.SCRIPT_SRC);

    expect(Finding.getHighestSeverity([
      finding1, finding3, finding2, finding1
    ])).toBe(Severity.HIGH);
    expect(Finding.getHighestSeverity([
      finding3, finding2
    ])).toBe(Severity.MEDIUM);
    expect(Finding.getHighestSeverity([
      finding3, finding3
    ])).toBe(Severity.INFO);
    expect(Finding.getHighestSeverity([])).toBe(Severity.NONE);
  });
});
