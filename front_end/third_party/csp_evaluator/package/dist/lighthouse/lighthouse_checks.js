"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateForSyntaxErrors = exports.evaluateForWarnings = exports.evaluateForFailure = void 0;
const parser_checks_1 = require("../checks/parser_checks");
const security_checks_1 = require("../checks/security_checks");
const strictcsp_checks_1 = require("../checks/strictcsp_checks");
const csp_1 = require("../csp");
function arrayContains(arr, elem) {
    return arr.some(e => e.equals(elem));
}
function setIntersection(sets) {
    const intersection = [];
    if (sets.length === 0) {
        return intersection;
    }
    const firstSet = sets[0];
    for (const elem of firstSet) {
        if (sets.every(set => arrayContains(set, elem))) {
            intersection.push(elem);
        }
    }
    return intersection;
}
function setUnion(sets) {
    const union = [];
    for (const set of sets) {
        for (const elem of set) {
            if (!arrayContains(union, elem)) {
                union.push(elem);
            }
        }
    }
    return union;
}
function atLeastOnePasses(parsedCsps, checker) {
    const findings = [];
    for (const parsedCsp of parsedCsps) {
        findings.push(checker(parsedCsp));
    }
    return setIntersection(findings);
}
function atLeastOneFails(parsedCsps, checker) {
    const findings = [];
    for (const parsedCsp of parsedCsps) {
        findings.push(checker(parsedCsp));
    }
    return setUnion(findings);
}
function evaluateForFailure(parsedCsps) {
    const targetsXssFindings = [
        ...atLeastOnePasses(parsedCsps, security_checks_1.checkMissingScriptSrcDirective),
        ...atLeastOnePasses(parsedCsps, security_checks_1.checkMissingObjectSrcDirective),
        ...security_checks_1.checkMultipleMissingBaseUriDirective(parsedCsps),
    ];
    const effectiveCsps = parsedCsps.map(csp => csp.getEffectiveCsp(csp_1.Version.CSP3));
    const effectiveCspsWithScript = effectiveCsps.filter(csp => {
        const directiveName = csp.getEffectiveDirective(csp_1.Directive.SCRIPT_SRC);
        return csp.directives[directiveName];
    });
    const robust = [
        ...atLeastOnePasses(effectiveCspsWithScript, strictcsp_checks_1.checkStrictDynamic),
        ...atLeastOnePasses(effectiveCspsWithScript, security_checks_1.checkScriptUnsafeInline),
        ...atLeastOnePasses(effectiveCsps, security_checks_1.checkWildcards),
        ...atLeastOnePasses(effectiveCsps, security_checks_1.checkPlainUrlSchemes),
    ];
    return [...targetsXssFindings, ...robust];
}
exports.evaluateForFailure = evaluateForFailure;
function evaluateForWarnings(parsedCsps) {
    return [
        ...atLeastOneFails(parsedCsps, strictcsp_checks_1.checkUnsafeInlineFallback),
        ...atLeastOneFails(parsedCsps, strictcsp_checks_1.checkAllowlistFallback)
    ];
}
exports.evaluateForWarnings = evaluateForWarnings;
function evaluateForSyntaxErrors(parsedCsps) {
    const allFindings = [];
    for (const csp of parsedCsps) {
        const findings = [
            ...security_checks_1.checkNonceLength(csp), ...parser_checks_1.checkUnknownDirective(csp),
            ...security_checks_1.checkDeprecatedDirective(csp), ...parser_checks_1.checkMissingSemicolon(csp),
            ...parser_checks_1.checkInvalidKeyword(csp)
        ];
        allFindings.push(findings);
    }
    return allFindings;
}
exports.evaluateForSyntaxErrors = evaluateForSyntaxErrors;
//# sourceMappingURL=lighthouse_checks.js.map