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
const parserChecks = __importStar(require("./parser_checks"));
function checkCsp(test, checkFunction) {
    const parsedCsp = (new parser_1.CspParser(test)).csp;
    return checkFunction(parsedCsp);
}
describe('Test parser checks', () => {
    it('CheckUnknownDirective', () => {
        const test = 'foobar-src http:';
        const violations = checkCsp(test, parserChecks.checkUnknownDirective);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.SYNTAX);
        expect(violations[0].directive).toBe('foobar-src');
    });
    it('CheckMissingSemicolon', () => {
        const test = 'default-src foo.bar script-src \'none\'';
        const violations = checkCsp(test, parserChecks.checkMissingSemicolon);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.SYNTAX);
        expect(violations[0].value).toBe('script-src');
    });
    it('CheckInvalidKeywordForgottenSingleTicks', () => {
        const test = 'script-src strict-dynamic nonce-test sha256-asdf';
        const violations = checkCsp(test, parserChecks.checkInvalidKeyword);
        expect(violations.length).toBe(3);
        expect(violations.every((v) => v.severity === finding_1.Severity.SYNTAX)).toBeTrue();
        expect(violations.every((v) => v.description.includes('single-ticks')))
            .toBeTrue();
    });
    it('CheckInvalidKeywordUnknownKeyword', () => {
        const test = 'script-src \'foo-bar\'';
        const violations = checkCsp(test, parserChecks.checkInvalidKeyword);
        expect(violations.length).toBe(1);
        expect(violations[0].severity).toBe(finding_1.Severity.SYNTAX);
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
//# sourceMappingURL=parser_checks_test.js.map