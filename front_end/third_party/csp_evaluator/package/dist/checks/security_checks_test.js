"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const csp_1 = require("../csp");
const finding_1 = require("../finding");
const parser_1 = require("../parser");
const securityChecks = __importStar(require("./security_checks"));
function checkCsp(test, checkFunction) {
    const parsedCsp = (new parser_1.CspParser(test)).csp;
    return checkFunction(parsedCsp);
}
describe('Test security checks', () => {
    it('CheckScriptUnsafeInlineInScriptSrc', () => {
        const test = 'default-src https:; script-src \'unsafe-inline\'';
        const violations = checkCsp(test, securityChecks.checkScriptUnsafeInline);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
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
        const parsedCsp = (new parser_1.CspParser(test)).csp;
        let effectiveCsp = parsedCsp.getEffectiveCsp(csp_1.Version.CSP1);
        let violations = securityChecks.checkScriptUnsafeInline(effectiveCsp);
        expect(violations.length).toBe(1);
        effectiveCsp = parsedCsp.getEffectiveCsp(csp_1.Version.CSP3);
        violations = securityChecks.checkScriptUnsafeInline(effectiveCsp);
        expect(violations.length).toBe(0);
    });
    it('CheckScriptUnsafeEvalInScriptSrc', () => {
        const test = 'default-src https:; script-src \'unsafe-eval\'';
        const violations = checkCsp(test, securityChecks.checkScriptUnsafeEval);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.MEDIUM_MAYBE);
    });
    it('CheckScriptUnsafeEvalInDefaultSrc', () => {
        const test = 'default-src \'unsafe-eval\'';
        const violations = checkCsp(test, securityChecks.checkScriptUnsafeEval);
        expect(violations.length).toBe(1);
    });
    it('CheckPlainUrlSchemesInScriptSrc', () => {
        const test = 'script-src data: http: https: sthInvalid:';
        const violations = checkCsp(test, securityChecks.checkPlainUrlSchemes);
        expect(violations.length).toBe(3);
        expect(violations.every((v) => v.severity === finding_1.Severity.HIGH)).toBeTrue();
    });
    it('CheckPlainUrlSchemesInObjectSrc', () => {
        const test = 'object-src data: http: https: sthInvalid:';
        const violations = checkCsp(test, securityChecks.checkPlainUrlSchemes);
        expect(violations.length).toBe(3);
        expect(violations.every((v) => v.severity === finding_1.Severity.HIGH)).toBeTrue();
    });
    it('CheckPlainUrlSchemesInBaseUri', () => {
        const test = 'base-uri data: http: https: sthInvalid:';
        const violations = checkCsp(test, securityChecks.checkPlainUrlSchemes);
        expect(violations.length).toBe(3);
        expect(violations.every((v) => v.severity === finding_1.Severity.HIGH)).toBeTrue();
    });
    it('CheckPlainUrlSchemesMixed', () => {
        const test = 'default-src https:; object-src data: sthInvalid:';
        const violations = checkCsp(test, securityChecks.checkPlainUrlSchemes);
        expect(violations.length).toBe(2);
        expect(violations.every((v) => v.severity === finding_1.Severity.HIGH)).toBeTrue();
        expect(violations[0].directive).toBe(csp_1.Directive.DEFAULT_SRC);
        expect(violations[1].directive).toBe(csp_1.Directive.OBJECT_SRC);
    });
    it('CheckPlainUrlSchemesDangerousDirectivesOK', () => {
        const test = 'default-src https:; object-src \'none\'; script-src \'none\'; ' +
            'base-uri \'none\'';
        const violations = checkCsp(test, securityChecks.checkPlainUrlSchemes);
        expect(violations.length).toBe(0);
    });
    it('CheckWildcardsInScriptSrc', () => {
        const test = 'script-src * http://* //*';
        const violations = checkCsp(test, securityChecks.checkWildcards);
        expect(violations.length).toBe(3);
        expect(violations.every((v) => v.severity === finding_1.Severity.HIGH)).toBeTrue();
    });
    it('CheckWildcardsInObjectSrc', () => {
        const test = 'object-src * http://* //*';
        const violations = checkCsp(test, securityChecks.checkWildcards);
        expect(violations.length).toBe(3);
        expect(violations.every((v) => v.severity === finding_1.Severity.HIGH)).toBeTrue();
    });
    it('CheckWildcardsInBaseUri', () => {
        const test = 'base-uri * http://* //*';
        const violations = checkCsp(test, securityChecks.checkWildcards);
        expect(violations.length).toBe(3);
        expect(violations.every((v) => v.severity === finding_1.Severity.HIGH)).toBeTrue();
    });
    it('CheckWildcardsSchemesMixed', () => {
        const test = 'default-src *; object-src * ignore.me.com';
        const violations = checkCsp(test, securityChecks.checkWildcards);
        expect(violations.length).toBe(2);
        expect(violations.every((v) => v.severity === finding_1.Severity.HIGH)).toBeTrue();
        expect(violations[0].directive).toBe(csp_1.Directive.DEFAULT_SRC);
        expect(violations[1].directive).toBe(csp_1.Directive.OBJECT_SRC);
    });
    it('CheckWildcardsDangerousDirectivesOK', () => {
        const test = 'default-src *; object-src *.foo.bar; script-src \'none\'; ' +
            'base-uri \'none\'';
        const violations = checkCsp(test, securityChecks.checkWildcards);
        expect(violations.length).toBe(0);
    });
    it('CheckMissingDirectivesMissingObjectSrc', () => {
        const test = 'script-src \'none\'';
        const violations = checkCsp(test, securityChecks.checkMissingDirectives);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
    });
    it('CheckMissingDirectivesMissingScriptSrc', () => {
        const test = 'object-src \'none\'';
        const violations = checkCsp(test, securityChecks.checkMissingDirectives);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
    });
    it('CheckMissingDirectivesObjectSrcSelf', () => {
        const test = 'object-src \'self\'';
        const violations = checkCsp(test, securityChecks.checkMissingDirectives);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
    });
    it('CheckMissingDirectivesMissingBaseUriInNonceCsp', () => {
        const test = 'script-src \'nonce-123\'; object-src \'none\'';
        const violations = checkCsp(test, securityChecks.checkMissingDirectives);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
    });
    it('CheckMissingDirectivesMissingBaseUriInHashWStrictDynamicCsp', () => {
        const test = 'script-src \'sha256-123456\' \'strict-dynamic\'; object-src \'none\'';
        const violations = checkCsp(test, securityChecks.checkMissingDirectives);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
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
    it('checkScriptAllowlistBypassJSONPBypass', () => {
        const test = 'script-src *.google.com';
        const violations = checkCsp(test, securityChecks.checkScriptAllowlistBypass);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[0].description.includes('www.google.com is known to host JSONP endpoints which'))
            .toBeTrue();
    });
    it('checkScriptAllowlistBypassWithNoneAndJSONPBypass', () => {
        const test = 'script-src *.google.com \'none\'';
        const violations = checkCsp(test, securityChecks.checkScriptAllowlistBypass);
        expect(violations.length).toBe(0);
    });
    it('checkScriptAllowlistBypassJSONPBypassEvalRequired', () => {
        const test = 'script-src https://googletagmanager.com \'unsafe-eval\'';
        const violations = checkCsp(test, securityChecks.checkScriptAllowlistBypass);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
    });
    it('checkScriptAllowlistBypassJSONPBypassEvalRequiredNotPresent', () => {
        const test = 'script-src https://googletagmanager.com';
        const violations = checkCsp(test, securityChecks.checkScriptAllowlistBypass);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.MEDIUM_MAYBE);
    });
    it('checkScriptAllowlistBypassAngularBypass', () => {
        const test = 'script-src gstatic.com';
        const violations = checkCsp(test, securityChecks.checkScriptAllowlistBypass);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[0].description.includes('gstatic.com is known to host Angular libraries which'))
            .toBeTrue();
    });
    it('checkScriptAllowlistBypassNoBypassWarningOnly', () => {
        const test = 'script-src foo.bar';
        const violations = checkCsp(test, securityChecks.checkScriptAllowlistBypass);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.MEDIUM_MAYBE);
    });
    it('checkScriptAllowlistBypassNoBypassSelfWarningOnly', () => {
        const test = 'script-src \'self\'';
        const violations = checkCsp(test, securityChecks.checkScriptAllowlistBypass);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.MEDIUM_MAYBE);
    });
    it('checkFlashObjectAllowlistBypassFlashBypass', () => {
        const test = 'object-src https://*.googleapis.com';
        const violations = checkCsp(test, securityChecks.checkFlashObjectAllowlistBypass);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
    });
    it('checkFlashObjectAllowlistBypassNoFlashBypass', () => {
        const test = 'object-src https://foo.bar';
        const violations = checkCsp(test, securityChecks.checkFlashObjectAllowlistBypass);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.MEDIUM_MAYBE);
    });
    it('checkFlashObjectAllowlistBypassSelfAllowed', () => {
        const test = 'object-src \'self\'';
        const violations = checkCsp(test, securityChecks.checkFlashObjectAllowlistBypass);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.MEDIUM_MAYBE);
        expect(violations[0].description)
            .toBe('Can you restrict object-src to \'none\' only?');
    });
    it('CheckIpSource', () => {
        const test = 'script-src 8.8.8.8; font-src //127.0.0.1 https://[::1] not.an.ip';
        const violations = checkCsp(test, securityChecks.checkIpSource);
        expect(violations.length).toBe(3);
        expect(violations.every((v) => v.severity === finding_1.Severity.INFO)).toBeTrue();
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
        expect(violations[0].severity).toBe(finding_1.Severity.INFO);
    });
    it('CheckDeprecatedDirectiveReferrer', () => {
        const test = 'referrer origin';
        const violations = checkCsp(test, securityChecks.checkDeprecatedDirective);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.INFO);
    });
    it('CheckNonceLengthWithLongNonce', () => {
        const test = 'script-src \'nonce-veryLongRandomNonce\'';
        const violations = checkCsp(test, securityChecks.checkNonceLength);
        expect(violations.length).toBe(0);
    });
    it('CheckNonceLengthWithShortNonce', () => {
        const test = 'script-src \'nonce-short\'';
        const violations = checkCsp(test, securityChecks.checkNonceLength);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.MEDIUM);
    });
    it('CheckNonceLengthInvalidCharset', () => {
        const test = 'script-src \'nonce-***notBase64***\'';
        const violations = checkCsp(test, securityChecks.checkNonceLength);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.INFO);
    });
    it('CheckSrcHttp', () => {
        const test = 'script-src http://foo.bar https://test.com; report-uri http://test.com';
        const violations = checkCsp(test, securityChecks.checkSrcHttp);
        expect(violations.length).toBe(2);
        expect(violations.every((v) => v.severity === finding_1.Severity.MEDIUM)).toBeTrue();
    });
    it('CheckHasConfiguredReporting_whenNoReporting', () => {
        const test = 'script-src \'nonce-aaaaaaaaaa\'';
        const violations = checkCsp(test, securityChecks.checkHasConfiguredReporting);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.INFO);
        expect(violations[0].directive).toBe('report-uri');
    });
    it('CheckHasConfiguredReporting_whenOnlyReportTo', () => {
        const test = 'script-src \'nonce-aaaaaaaaaa\'; report-to name';
        const violations = checkCsp(test, securityChecks.checkHasConfiguredReporting);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.INFO);
        expect(violations[0].directive).toBe('report-to');
    });
    it('CheckHasConfiguredReporting_whenOnlyReportUri', () => {
        const test = 'script-src \'nonce-aaaaaaaaaa\'; report-uri url';
        const violations = checkCsp(test, securityChecks.checkHasConfiguredReporting);
        expect(violations.length).toBe(0);
    });
    it('CheckHasConfiguredReporting_whenReportUriAndReportTo', () => {
        const test = 'script-src \'nonce-aaaaaaaaaa\'; report-uri url; report-to name';
        const violations = checkCsp(test, securityChecks.checkHasConfiguredReporting);
        expect(violations.length).toBe(0);
    });
});
//# sourceMappingURL=security_checks_test.js.map