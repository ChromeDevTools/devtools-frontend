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
 * @fileoverview Tests for CSP Evaluator Checks.
 * @author lwe@google.com (Lukas Weichselbaum)
 */


 import {Directive, Version} from '../csp';
 import {Finding, Severity} from '../finding';
 import {CspParser} from '../parser';

 import {CheckerFunction} from './checker';
 import * as securityChecks from './security_checks';

 /**
  * Helper function for running a check on a CSP string.
  *
  * @param test CSP string.
  * @param checkFunction check.
  */
 function checkCsp(test: string, checkFunction: CheckerFunction): Finding[] {
   const parsedCsp = (new CspParser(test)).csp;
   return checkFunction(parsedCsp);
 }

 describe('Test security checks', () => {
   /** Tests for csp.securityChecks.checkScriptUnsafeInline */
   it('CheckScriptUnsafeInlineInScriptSrc', () => {
     const test = 'default-src https:; script-src \'unsafe-inline\'';

     const violations = checkCsp(test, securityChecks.checkScriptUnsafeInline);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.HIGH);
   });

   it('CheckScriptUnsafeInlineInDefaultSrc', () => {
     const test = 'default-src \'unsafe-inline\'';

     const violations = checkCsp(test, securityChecks.checkScriptUnsafeInline);
     expect(violations.length).toBe(1);
   });

   it('CheckScriptUnsafeInlineInDefaultSrcAndNotInScriptSrc', () => {
     const test = 'default-src \'unsafe-inline\'; script-src https:';

     const violations = checkCsp(test, securityChecks.checkScriptUnsafeInline);
     expect(violations.length).toBe(0);
   });

   it('CheckScriptUnsafeInlineWithNonce', () => {
     const test = 'script-src \'unsafe-inline\' \'nonce-foobar\'';
     const parsedCsp = (new CspParser(test)).csp;

     let effectiveCsp = parsedCsp.getEffectiveCsp(Version.CSP1);
     let violations = securityChecks.checkScriptUnsafeInline(effectiveCsp);
     expect(violations.length).toBe(1);

     effectiveCsp = parsedCsp.getEffectiveCsp(Version.CSP3);
     violations = securityChecks.checkScriptUnsafeInline(effectiveCsp);
     expect(violations.length).toBe(0);
   });

   /** Tests for csp.securityChecks.checkScriptUnsafeEval */
   it('CheckScriptUnsafeEvalInScriptSrc', () => {
     const test = 'default-src https:; script-src \'unsafe-eval\'';

     const violations = checkCsp(test, securityChecks.checkScriptUnsafeEval);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.MEDIUM_MAYBE);
   });

   it('CheckScriptUnsafeEvalInDefaultSrc', () => {
     const test = 'default-src \'unsafe-eval\'';

     const violations = checkCsp(test, securityChecks.checkScriptUnsafeEval);
     expect(violations.length).toBe(1);
   });

   /** Tests for csp.securityChecks.checkPlainUrlSchemes */
   it('CheckPlainUrlSchemesInScriptSrc', () => {
     const test = 'script-src data: http: https: sthInvalid:';

     const violations = checkCsp(test, securityChecks.checkPlainUrlSchemes);
     expect(violations.length).toBe(3);
     expect(violations.every((v) => v.severity === Severity.HIGH)).toBeTrue();
   });

   it('CheckPlainUrlSchemesInObjectSrc', () => {
     const test = 'object-src data: http: https: sthInvalid:';

     const violations = checkCsp(test, securityChecks.checkPlainUrlSchemes);
     expect(violations.length).toBe(3);
     expect(violations.every((v) => v.severity === Severity.HIGH)).toBeTrue();
   });

   it('CheckPlainUrlSchemesInBaseUri', () => {
     const test = 'base-uri data: http: https: sthInvalid:';

     const violations = checkCsp(test, securityChecks.checkPlainUrlSchemes);
     expect(violations.length).toBe(3);
     expect(violations.every((v) => v.severity === Severity.HIGH)).toBeTrue();
   });

   it('CheckPlainUrlSchemesMixed', () => {
     const test = 'default-src https:; object-src data: sthInvalid:';

     const violations = checkCsp(test, securityChecks.checkPlainUrlSchemes);
     expect(violations.length).toBe(2);
     expect(violations.every((v) => v.severity === Severity.HIGH)).toBeTrue();
     expect(violations[0].directive).toBe(Directive.DEFAULT_SRC);
     expect(violations[1].directive).toBe(Directive.OBJECT_SRC);
   });

   it('CheckPlainUrlSchemesDangerousDirectivesOK', () => {
     const test =
         'default-src https:; object-src \'none\'; script-src \'none\'; ' +
         'base-uri \'none\'';

     const violations = checkCsp(test, securityChecks.checkPlainUrlSchemes);
     expect(violations.length).toBe(0);
   });

   /** Tests for csp.securityChecks.checkWildcards */
   it('CheckWildcardsInScriptSrc', () => {
     const test = 'script-src * http://* //*';
     const violations = checkCsp(test, securityChecks.checkWildcards);
     expect(violations.length).toBe(3);
     expect(violations.every((v) => v.severity === Severity.HIGH)).toBeTrue();
   });

   it('CheckWildcardsInObjectSrc', () => {
     const test = 'object-src * http://* //*';
     const violations = checkCsp(test, securityChecks.checkWildcards);
     expect(violations.length).toBe(3);
     expect(violations.every((v) => v.severity === Severity.HIGH)).toBeTrue();
   });

   it('CheckWildcardsInBaseUri', () => {
     const test = 'base-uri * http://* //*';
     const violations = checkCsp(test, securityChecks.checkWildcards);
     expect(violations.length).toBe(3);
     expect(violations.every((v) => v.severity === Severity.HIGH)).toBeTrue();
   });

   it('CheckWildcardsSchemesMixed', () => {
     const test = 'default-src *; object-src * ignore.me.com';
     const violations = checkCsp(test, securityChecks.checkWildcards);
     expect(violations.length).toBe(2);
     expect(violations.every((v) => v.severity === Severity.HIGH)).toBeTrue();
     expect(violations[0].directive).toBe(Directive.DEFAULT_SRC);
     expect(violations[1].directive).toBe(Directive.OBJECT_SRC);
   });

   it('CheckWildcardsDangerousDirectivesOK', () => {
     const test = 'default-src *; object-src *.foo.bar; script-src \'none\'; ' +
         'base-uri \'none\'';
     const violations = checkCsp(test, securityChecks.checkWildcards);
     expect(violations.length).toBe(0);
   });

   /** Tests for csp.securityChecks.checkMissingDirectives */

   it('CheckMissingDirectivesMissingObjectSrc', () => {
     const test = 'script-src \'none\'';

     const violations = checkCsp(test, securityChecks.checkMissingDirectives);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.HIGH);
   });

   it('CheckMissingDirectivesMissingScriptSrc', () => {
     const test = 'object-src \'none\'';

     const violations = checkCsp(test, securityChecks.checkMissingDirectives);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.HIGH);
   });

   it('CheckMissingDirectivesObjectSrcSelf', () => {
     const test = 'object-src \'self\'';

     const violations = checkCsp(test, securityChecks.checkMissingDirectives);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.HIGH);
   });

   it('CheckMissingDirectivesMissingBaseUriInNonceCsp', () => {
     const test = 'script-src \'nonce-123\'; object-src \'none\'';

     const violations = checkCsp(test, securityChecks.checkMissingDirectives);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.HIGH);
   });

   it('CheckMissingDirectivesMissingBaseUriInHashWStrictDynamicCsp', () => {
     const test =
         'script-src \'sha256-123456\' \'strict-dynamic\'; object-src \'none\'';

     const violations = checkCsp(test, securityChecks.checkMissingDirectives);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.HIGH);
   });

   it('CheckMissingDirectivesMissingBaseUriInHashCsp', () => {
     const test = 'script-src \'sha256-123456\'; object-src \'none\'';

     const violations = checkCsp(test, securityChecks.checkMissingDirectives);
     expect(violations.length).toBe(0);
   });

   it('CheckMissingDirectivesScriptAndObjectSrcSet', () => {
     const test = 'script-src \'none\'; object-src \'none\'';

     const violations = checkCsp(test, securityChecks.checkMissingDirectives);
     expect(violations.length).toBe(0);
   });

   it('CheckMissingDirectivesDefaultSrcSet', () => {
     const test = 'default-src https:;';

     const violations = checkCsp(test, securityChecks.checkMissingDirectives);
     expect(violations.length).toBe(0);
   });

   it('CheckMissingDirectivesDefaultSrcSetToNone', () => {
     const test = 'default-src \'none\';';

     const violations = checkCsp(test, securityChecks.checkMissingDirectives);
     expect(violations.length).toBe(0);
   });

   /** Tests for csp.securityChecks.checkScriptAllowlistBypass */


   it('checkScriptAllowlistBypassJSONPBypass', () => {
     const test = 'script-src *.google.com';

     const violations =
         checkCsp(test, securityChecks.checkScriptAllowlistBypass);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.HIGH);
     expect(violations[0].description.includes(
                'www.google.com is known to host JSONP endpoints which'))
         .toBeTrue();
   });

   it('checkScriptAllowlistBypassWithNoneAndJSONPBypass', () => {
     const test = 'script-src *.google.com \'none\'';

     const violations =
         checkCsp(test, securityChecks.checkScriptAllowlistBypass);
     expect(violations.length).toBe(0);
   });

   it('checkScriptAllowlistBypassJSONPBypassEvalRequired', () => {
     const test = 'script-src https://googletagmanager.com \'unsafe-eval\'';

     const violations =
         checkCsp(test, securityChecks.checkScriptAllowlistBypass);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.HIGH);
   });

   it('checkScriptAllowlistBypassJSONPBypassEvalRequiredNotPresent', () => {
     const test = 'script-src https://googletagmanager.com';

     const violations =
         checkCsp(test, securityChecks.checkScriptAllowlistBypass);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.MEDIUM_MAYBE);
   });

   it('checkScriptAllowlistBypassAngularBypass', () => {
     const test = 'script-src gstatic.com';

     const violations =
         checkCsp(test, securityChecks.checkScriptAllowlistBypass);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.HIGH);
     expect(violations[0].description.includes(
                'gstatic.com is known to host Angular libraries which'))
         .toBeTrue();
   });

   it('checkScriptAllowlistBypassNoBypassWarningOnly', () => {
     const test = 'script-src foo.bar';

     const violations =
         checkCsp(test, securityChecks.checkScriptAllowlistBypass);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.MEDIUM_MAYBE);
   });

   it('checkScriptAllowlistBypassNoBypassSelfWarningOnly', () => {
     const test = 'script-src \'self\'';

     const violations =
         checkCsp(test, securityChecks.checkScriptAllowlistBypass);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.MEDIUM_MAYBE);
   });

   /** Tests for csp.securityChecks.checkFlashObjectAllowlistBypass */


   it('checkFlashObjectAllowlistBypassFlashBypass', () => {
     const test = 'object-src https://*.googleapis.com';
     const violations =
         checkCsp(test, securityChecks.checkFlashObjectAllowlistBypass);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.HIGH);
   });

   it('checkFlashObjectAllowlistBypassNoFlashBypass', () => {
     const test = 'object-src https://foo.bar';
     const violations =
         checkCsp(test, securityChecks.checkFlashObjectAllowlistBypass);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.MEDIUM_MAYBE);
   });

   it('checkFlashObjectAllowlistBypassSelfAllowed', () => {
     const test = 'object-src \'self\'';
     const violations =
         checkCsp(test, securityChecks.checkFlashObjectAllowlistBypass);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.MEDIUM_MAYBE);
     expect(violations[0].description)
         .toBe('Can you restrict object-src to \'none\' only?');
   });

   /** Tests for csp.securityChecks.checkIpSource */
   it('CheckIpSource', () => {
     const test =
         'script-src 8.8.8.8; font-src //127.0.0.1 https://[::1] not.an.ip';

     const violations = checkCsp(test, securityChecks.checkIpSource);
     expect(violations.length).toBe(3);
     expect(violations.every((v) => v.severity === Severity.INFO)).toBeTrue();
   });

   it('LooksLikeIpAddressIPv4', () => {
     expect(securityChecks.looksLikeIpAddress('8.8.8.8')).toBeTrue();
   });

   it('LooksLikeIpAddressIPv6', () => {
     expect(securityChecks.looksLikeIpAddress('[::1]')).toBeTrue();
   });

   it('CheckDeprecatedDirectiveReportUriWithReportTo', () => {
     const test = 'report-uri foo.bar/csp;report-to abc';

     const violations = checkCsp(test, securityChecks.checkDeprecatedDirective);
     expect(violations.length).toBe(0);
   });

   it('CheckDeprecatedDirectiveWithoutReportUriButWithReportTo', () => {
     const test = 'report-to abc';

     const violations = checkCsp(test, securityChecks.checkDeprecatedDirective);
     expect(violations.length).toBe(0);
   });

   it('CheckDeprecatedDirectiveReflectedXss', () => {
     const test = 'reflected-xss block';

     const violations = checkCsp(test, securityChecks.checkDeprecatedDirective);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.INFO);
   });

   it('CheckDeprecatedDirectiveReferrer', () => {
     const test = 'referrer origin';

     const violations = checkCsp(test, securityChecks.checkDeprecatedDirective);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.INFO);
   });

   /** Tests for csp.securityChecks.checkNonceLength */
   it('CheckNonceLengthWithLongNonce', () => {
     const test = 'script-src \'nonce-veryLongRandomNonce\'';

     const violations = checkCsp(test, securityChecks.checkNonceLength);
     expect(violations.length).toBe(0);
   });

   it('CheckNonceLengthWithShortNonce', () => {
     const test = 'script-src \'nonce-short\'';

     const violations = checkCsp(test, securityChecks.checkNonceLength);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.MEDIUM);
   });

   it('CheckNonceLengthInvalidCharset', () => {
     const test = 'script-src \'nonce-***notBase64***\'';

     const violations = checkCsp(test, securityChecks.checkNonceLength);
     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.INFO);
   });

   /** Tests for csp.securityChecks.checkSrcHttp */
   it('CheckSrcHttp', () => {
     const test =
         'script-src http://foo.bar https://test.com; report-uri http://test.com';

     const violations = checkCsp(test, securityChecks.checkSrcHttp);
     expect(violations.length).toBe(2);
     expect(violations.every((v) => v.severity === Severity.MEDIUM)).toBeTrue();
   });

   /** Tests for csp.securityChecks.checkHasConfiguredReporting */
   it('CheckHasConfiguredReporting_whenNoReporting', () => {
     const test = 'script-src \'nonce-aaaaaaaaaa\'';

     const violations =
         checkCsp(test, securityChecks.checkHasConfiguredReporting);

     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.INFO);
     expect(violations[0].directive).toBe('report-uri');
   });

   it('CheckHasConfiguredReporting_whenOnlyReportTo', () => {
     const test = 'script-src \'nonce-aaaaaaaaaa\'; report-to name';

     const violations =
         checkCsp(test, securityChecks.checkHasConfiguredReporting);

     expect(violations.length).toBe(1);
     expect(violations[0].severity).toBe(Severity.INFO);
     expect(violations[0].directive).toBe('report-to');
   });

   it('CheckHasConfiguredReporting_whenOnlyReportUri', () => {
     const test = 'script-src \'nonce-aaaaaaaaaa\'; report-uri url';

     const violations =
         checkCsp(test, securityChecks.checkHasConfiguredReporting);

     expect(violations.length).toBe(0);
   });

   it('CheckHasConfiguredReporting_whenReportUriAndReportTo', () => {
     const test =
         'script-src \'nonce-aaaaaaaaaa\'; report-uri url; report-to name';

     const violations =
         checkCsp(test, securityChecks.checkHasConfiguredReporting);

     expect(violations.length).toBe(0);
   });
 });