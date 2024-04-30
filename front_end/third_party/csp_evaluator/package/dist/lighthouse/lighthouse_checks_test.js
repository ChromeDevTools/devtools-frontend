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
require("jasmine");
const finding_1 = require("../finding");
const parser_1 = require("../parser");
const lighthouseChecks = __importStar(require("./lighthouse_checks"));
function parsePolicies(policies) {
    return policies.map(p => (new parser_1.CspParser(p)).csp);
}
describe('Test evaluateForFailure', () => {
    it('robust nonce-based policy', () => {
        const test = 'script-src \'nonce-aaaaaaaaaa\'; object-src \'none\'; base-uri \'none\'';
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies([test]));
        expect(violations.length).toBe(0);
    });
    it('robust hash-based policy', () => {
        const test = 'script-src \'sha256-aaaaaaaaaa\'; object-src \'none\'';
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies([test]));
        expect(violations.length).toBe(0);
    });
    it('policy not attempt', () => {
        const test = 'block-all-mixed-content';
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies([test]));
        expect(violations.length).toBe(2);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[0].directive).toBe('script-src');
        expect(violations[0].description).toBe('script-src directive is missing.');
        expect(violations[1].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[1].directive).toBe('object-src');
        expect(violations[1].description)
            .toBe(`Missing object-src allows the injection of plugins which can execute JavaScript. Can you set it to 'none'?`);
    });
    it('policy not robust', () => {
        const test = 'script-src *.google.com; object-src \'none\'';
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies([test]));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.STRICT_CSP);
        expect(violations[0].directive).toBe('script-src');
        expect(violations[0].description)
            .toBe(`Host allowlists can frequently be bypassed. Consider using 'strict-dynamic' in combination with CSP nonces or hashes.`);
    });
    it('robust policy and not robust policy', () => {
        const policies = [
            'script-src *.google.com; object-src \'none\'',
            'script-src \'nonce-aaaaaaaaaa\'; base-uri \'none\''
        ];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('split across many policies', () => {
        const policies = [
            'object-src \'none\'', 'script-src \'nonce-aaaaaaaaaa\'',
            'base-uri \'none\''
        ];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('split across many policies with default-src', () => {
        const policies = ['default-src \'none\'', 'base-uri \'none\''];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('split across many policies some mixed useless policies', () => {
        const policies = [
            'object-src \'none\'', 'script-src \'nonce-aaaaaaaaaa\'',
            'base-uri \'none\'', 'block-all-mixed-content'
        ];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('split across many policies with allowlist', () => {
        const policies = [
            'object-src \'none\'', 'script-src \'nonce-aaaaaaaaaa\'',
            'base-uri \'none\'', 'script-src *'
        ];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('not robust and not attempt', () => {
        const policies = ['block-all-mixed-content', 'script-src *.google.com'];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(2);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[0].directive).toBe('object-src');
        expect(violations[0].description)
            .toBe(`Missing object-src allows the injection of plugins which can execute JavaScript. Can you set it to 'none'?`);
        expect(violations[1].severity).toBe(finding_1.Severity.STRICT_CSP);
        expect(violations[1].directive).toBe('script-src');
        expect(violations[1].description)
            .toBe(`Host allowlists can frequently be bypassed. Consider using \'strict-dynamic\' in combination with CSP nonces or hashes.`);
    });
    it('robust check only CSPs with script-src', () => {
        const policies = ['script-src https://example.com', 'object-src \'none\''];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.STRICT_CSP);
        expect(violations[0].directive).toBe('script-src');
        expect(violations[0].description)
            .toBe(`Host allowlists can frequently be bypassed. Consider using \'strict-dynamic\' in combination with CSP nonces or hashes.`);
    });
    it('two not attempt', () => {
        const policies = ['block-all-mixed-content', 'block-all-mixed-content'];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(2);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[0].directive).toBe('script-src');
        expect(violations[0].description).toBe('script-src directive is missing.');
        expect(violations[1].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[1].directive).toBe('object-src');
        expect(violations[1].description)
            .toBe(`Missing object-src allows the injection of plugins which can execute JavaScript. Can you set it to 'none'?`);
    });
    it('two not attempt somewhat', () => {
        const policies = [
            'block-all-mixed-content; object-src \'none\'',
            'block-all-mixed-content',
        ];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[0].directive).toBe('script-src');
        expect(violations[0].description).toBe('script-src directive is missing.');
    });
    it('base-uri split across many policies', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaaa\'; object-src \'none\'',
            'base-uri \'none\'',
        ];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('base-uri not set', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaaa\'; object-src \'none\'',
        ];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[0].directive).toBe('base-uri');
        expect(violations[0].description)
            .toBe(`Missing base-uri allows the injection of base tags. They can be used to set the base URL for all relative (script) URLs to an attacker controlled domain. Can you set it to 'none' or 'self'?`);
    });
    it('base-uri not set in either policy', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaaa\'; object-src \'none\'',
            'block-all-mixed-content'
        ];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[0].directive).toBe('base-uri');
    });
    it('check wildcards', () => {
        const policies = ['script-src \'none\'; object-src *'];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[0].directive).toBe('object-src');
        expect(violations[0].description)
            .toBe(`object-src should not allow '*' as source`);
    });
    it('check wildcards on multiple', () => {
        const policies = ['script-src \'none\'; object-src *', 'object-src \'none\''];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('check plain url schemes', () => {
        const policies = [
            `script-src 'strict-dynamic' 'nonce-random123' 'unsafe-inline' https:; base-uri 'none'; object-src https:`
        ];
        const violations = lighthouseChecks.evaluateForFailure(parsePolicies(policies));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.HIGH);
        expect(violations[0].directive).toBe('object-src');
        expect(violations[0].description)
            .toBe(`https: URI in object-src allows the execution of unsafe scripts.`);
    });
});
describe('Test evaluateForWarnings', () => {
    it('perfect', () => {
        const test = 'script-src \'nonce-aaaaaaaaaa\' \'unsafe-inline\' http: https:; report-uri url';
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies([test]));
        expect(violations.length).toBe(0);
    });
    it('perfect except some failures', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaa\' \'unsafe-inline\' http: https:; report-uri url; object-src \'none\'',
            'block-all-mixed-content'
        ];
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('a perfect policy and a policy that does not target', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaa\' \'unsafe-inline\' http: https:; report-uri url; base-uri \'none\'; object-src \'none\'',
            'block-all-mixed-content'
        ];
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('perfect policy split into two', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaa\' \'unsafe-inline\' http: https:; report-uri url; base-uri \'none\'; ',
            'block-all-mixed-content; object-src \'none\''
        ];
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('perfect policy split into three', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaa\' \'unsafe-inline\' http: https:; report-uri url; base-uri \'none\'; ',
            'block-all-mixed-content', 'object-src \'none\''
        ];
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('no reporting and malformed', () => {
        const test = 'script-src \'nonce-aaaaaaaaaa\'; unknown-directive';
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies([test]));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.STRICT_CSP);
        expect(violations[0].directive).toBe('script-src');
        expect(violations[0].description)
            .toBe('Consider adding \'unsafe-inline\' (ignored by browsers supporting nonces/hashes) to be backward compatible with older browsers.');
    });
    it('missing unsafe-inline fallback', () => {
        const test = 'script-src \'nonce-aaaaaaaaaa\'; report-uri url';
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies([test]));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.STRICT_CSP);
        expect(violations[0].directive).toBe('script-src');
        expect(violations[0].description)
            .toBe('Consider adding \'unsafe-inline\' (ignored by browsers supporting nonces/hashes) to be backward compatible with older browsers.');
    });
    it('missing allowlist fallback', () => {
        const test = 'script-src \'nonce-aaaaaaaaaa\' \'strict-dynamic\' \'unsafe-inline\'; report-uri url';
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies([test]));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.STRICT_CSP);
        expect(violations[0].directive).toBe('script-src');
        expect(violations[0].description)
            .toBe('Consider adding https: and http: url schemes (ignored by browsers supporting \'strict-dynamic\') to be backward compatible with older browsers.');
    });
    it('missing semicolon', () => {
        const test = 'script-src \'nonce-aaaaaaaaa\' \'unsafe-inline\'; report-uri url object-src \'self\'';
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies([test]));
        expect(violations.length).toBe(0);
    });
    it('invalid keyword', () => {
        const test = 'script-src \'nonce-aaaaaaaaa\' \'invalid\' \'unsafe-inline\'; report-uri url';
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies([test]));
        expect(violations.length).toBe(0);
    });
    it('perfect policy and invalid policy', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaa\' \'unsafe-inline\' http: https:; report-uri url; base-uri \'none\'; object-src \'none\'',
            'unknown'
        ];
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('reporting on the wrong policy', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaa\' \'unsafe-inline\' http: https:',
            'block-all-mixed-content; report-uri url'
        ];
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies(policies));
        expect(violations.length).toBe(0);
    });
    it('missing unsafe-inline fallback split over two policies', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaa\'',
            'block-all-mixed-content; report-uri url'
        ];
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies(policies));
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.STRICT_CSP);
        expect(violations[0].directive).toBe('script-src');
        expect(violations[0].description)
            .toBe('Consider adding \'unsafe-inline\' (ignored by browsers supporting nonces/hashes) to be backward compatible with older browsers.');
    });
    it('strict-dynamic with no fallback in any policy', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaa\' \'strict-dynamic\'',
            'block-all-mixed-content; report-uri url'
        ];
        const violations = lighthouseChecks.evaluateForWarnings(parsePolicies(policies));
        expect(violations.length).toBe(2);
        expect(violations[0].severity).toBe(finding_1.Severity.STRICT_CSP);
        expect(violations[0].directive).toBe('script-src');
        expect(violations[0].description)
            .toBe('Consider adding \'unsafe-inline\' (ignored by browsers supporting nonces/hashes) to be backward compatible with older browsers.');
        expect(violations[1].severity).toBe(finding_1.Severity.STRICT_CSP);
        expect(violations[1].directive).toBe('script-src');
        expect(violations[1].description)
            .toBe('Consider adding https: and http: url schemes (ignored by browsers supporting \'strict-dynamic\') to be backward compatible with older browsers.');
    });
});
describe('Test evaluateForSyntaxErrors', () => {
    it('whenPerfectPolicies', () => {
        const policies = [
            'script-src \'nonce-aaaaaaaaaa\' \'unsafe-inline\' http: https:',
            'block-all-mixed-content; report-uri url'
        ];
        const violations = lighthouseChecks.evaluateForSyntaxErrors(parsePolicies(policies));
        expect(violations.length).toBe(2);
        expect(violations[0].length).toBe(0);
        expect(violations[1].length).toBe(0);
    });
    it('whenShortNonce', () => {
        const test = 'script-src \'nonce-a\' \'unsafe-inline\'; report-uri url';
        const violations = lighthouseChecks.evaluateForSyntaxErrors(parsePolicies([test]));
        expect(violations.length).toBe(1);
        expect(violations[0].length).toBe(1);
        expect(violations[0][0].severity).toBe(finding_1.Severity.MEDIUM);
        expect(violations[0][0].directive).toBe('script-src');
        expect(violations[0][0].description)
            .toBe('Nonces should be at least 8 characters long.');
    });
    it('whenUnknownDirective', () => {
        const test = 'script-src \'nonce-aaaaaaaaa\' \'unsafe-inline\'; report-uri url; unknown';
        const violations = lighthouseChecks.evaluateForSyntaxErrors(parsePolicies([test]));
        expect(violations.length).toBe(1);
        expect(violations[0].length).toBe(1);
        expect(violations[0][0].severity).toBe(finding_1.Severity.SYNTAX);
        expect(violations[0][0].directive).toBe('unknown');
        expect(violations[0][0].description)
            .toBe('Directive "unknown" is not a known CSP directive.');
    });
    it('whenDeprecatedDirective', () => {
        const test = 'script-src \'nonce-aaaaaaaaa\' \'unsafe-inline\'; report-uri url; reflected-xss foo';
        const violations = lighthouseChecks.evaluateForSyntaxErrors(parsePolicies([test]));
        expect(violations.length).toBe(1);
        expect(violations[0].length).toBe(1);
        expect(violations[0][0].severity).toBe(finding_1.Severity.INFO);
        expect(violations[0][0].directive).toBe('reflected-xss');
        expect(violations[0][0].description)
            .toBe('reflected-xss is deprecated since CSP2. Please, use the X-XSS-Protection header instead.');
    });
    it('whenMissingSemicolon', () => {
        const test = 'script-src \'nonce-aaaaaaaaa\' \'unsafe-inline\'; report-uri url object-src \'none\'';
        const violations = lighthouseChecks.evaluateForSyntaxErrors(parsePolicies([test]));
        expect(violations.length).toBe(1);
        expect(violations[0].length).toBe(1);
        expect(violations[0][0].severity).toBe(finding_1.Severity.SYNTAX);
        expect(violations[0][0].directive).toBe('report-uri');
        expect(violations[0][0].description)
            .toBe('Did you forget the semicolon? "object-src" seems to be a directive, not a value.');
    });
    it('whenInvalidKeyword', () => {
        const test = 'script-src \'nonce-aaaaaaaaa\' \'unsafe-inline\'; object-src \'invalid\'';
        const violations = lighthouseChecks.evaluateForSyntaxErrors(parsePolicies([test]));
        expect(violations.length).toBe(1);
        expect(violations[0].length).toBe(1);
        expect(violations[0][0].severity).toBe(finding_1.Severity.SYNTAX);
        expect(violations[0][0].directive).toBe('object-src');
        expect(violations[0][0].description)
            .toBe('\'invalid\' seems to be an invalid CSP keyword.');
    });
    it('manyPolicies', () => {
        const policies = [
            'object-src \'invalid\'', 'script-src \'none\'',
            'script-src \'nonce-short\' default-src \'none\''
        ];
        const violations = lighthouseChecks.evaluateForSyntaxErrors(parsePolicies(policies));
        expect(violations.length).toBe(3);
        expect(violations[0].length).toBe(1);
        expect(violations[0][0].severity).toBe(finding_1.Severity.SYNTAX);
        expect(violations[0][0].directive).toBe('object-src');
        expect(violations[0][0].description)
            .toBe('\'invalid\' seems to be an invalid CSP keyword.');
        expect(violations[1].length).toBe(0);
        expect(violations[2].length).toBe(2);
        expect(violations[2][0].severity).toBe(finding_1.Severity.MEDIUM);
        expect(violations[2][0].directive).toBe('script-src');
        expect(violations[2][0].description)
            .toBe('Nonces should be at least 8 characters long.');
        expect(violations[2][1].severity).toBe(finding_1.Severity.SYNTAX);
        expect(violations[2][1].directive).toBe('script-src');
        expect(violations[2][1].description)
            .toBe('Did you forget the semicolon? "default-src" seems to be a directive, not a value.');
    });
});
//# sourceMappingURL=lighthouse_checks_test.js.map