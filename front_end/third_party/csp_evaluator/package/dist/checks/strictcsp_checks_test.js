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
const finding_1 = require("../finding");
const parser_1 = require("../parser");
const strictcspChecks = __importStar(require("./strictcsp_checks"));
function checkCsp(test, checkFunction) {
    const parsedCsp = (new parser_1.CspParser(test)).csp;
    return checkFunction(parsedCsp);
}
describe('Test strictcsp checks', () => {
    it('CheckStrictDynamic', () => {
        const test = 'script-src foo.bar';
        const violations = checkCsp(test, strictcspChecks.checkStrictDynamic);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.STRICT_CSP);
    });
    it('CheckStrictDynamicNotStandalone', () => {
        const test = 'script-src \'strict-dynamic\'';
        const violations = checkCsp(test, strictcspChecks.checkStrictDynamicNotStandalone);
        expect(violations[0].severity).toBe(finding_1.Severity.INFO);
    });
    it('CheckStrictDynamicNotStandaloneDoesntFireIfNoncePresent', () => {
        const test = 'script-src \'strict-dynamic\' \'nonce-foobar\'';
        const violations = checkCsp(test, strictcspChecks.checkStrictDynamicNotStandalone);
        expect(violations.length).toBe(0);
    });
    it('CheckUnsafeInlineFallback', () => {
        const test = 'script-src \'nonce-test\'';
        const violations = checkCsp(test, strictcspChecks.checkUnsafeInlineFallback);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.STRICT_CSP);
    });
    it('CheckUnsafeInlineFallbackDoesntFireIfFallbackPresent', () => {
        const test = 'script-src \'nonce-test\' \'unsafe-inline\'';
        const violations = checkCsp(test, strictcspChecks.checkUnsafeInlineFallback);
        expect(violations.length).toBe(0);
    });
    it('checkAllowlistFallback', () => {
        const test = 'script-src \'nonce-test\' \'strict-dynamic\'';
        const violations = checkCsp(test, strictcspChecks.checkAllowlistFallback);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.STRICT_CSP);
    });
    it('checkAllowlistFallbackDoesntFireIfSchemeFallbackPresent', () => {
        const test = 'script-src \'nonce-test\' \'strict-dynamic\' https:';
        const violations = checkCsp(test, strictcspChecks.checkAllowlistFallback);
        expect(violations.length).toBe(0);
    });
    it('checkAllowlistFallbackDoesntFireIfURLFallbackPresent', () => {
        const test = 'script-src \'nonce-test\' \'strict-dynamic\' foo.bar';
        const violations = checkCsp(test, strictcspChecks.checkAllowlistFallback);
        expect(violations.length).toBe(0);
    });
    it('checkAllowlistFallbackDoesntFireInAbsenceOfStrictDynamic', () => {
        const test = 'script-src \'nonce-test\'';
        const violations = checkCsp(test, strictcspChecks.checkAllowlistFallback);
        expect(violations.length).toBe(0);
    });
});
//# sourceMappingURL=strictcsp_checks_test.js.map