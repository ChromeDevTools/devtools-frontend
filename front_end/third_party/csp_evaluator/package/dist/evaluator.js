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
exports.STRICTCSP_CHECKS = exports.DEFAULT_CHECKS = exports.CspEvaluator = void 0;
const parserChecks = __importStar(require("./checks/parser_checks"));
const securityChecks = __importStar(require("./checks/security_checks"));
const strictcspChecks = __importStar(require("./checks/strictcsp_checks"));
const csp = __importStar(require("./csp"));
class CspEvaluator {
    constructor(parsedCsp, cspVersion) {
        this.findings = [];
        this.version = cspVersion || csp.Version.CSP3;
        this.csp = parsedCsp;
    }
    evaluate(parsedCspChecks, effectiveCspChecks) {
        this.findings = [];
        const checks = effectiveCspChecks || exports.DEFAULT_CHECKS;
        const effectiveCsp = this.csp.getEffectiveCsp(this.version, this.findings);
        if (parsedCspChecks) {
            for (const check of parsedCspChecks) {
                this.findings = this.findings.concat(check(this.csp));
            }
        }
        for (const check of checks) {
            this.findings = this.findings.concat(check(effectiveCsp));
        }
        return this.findings;
    }
}
exports.CspEvaluator = CspEvaluator;
exports.DEFAULT_CHECKS = [
    securityChecks.checkScriptUnsafeInline, securityChecks.checkScriptUnsafeEval,
    securityChecks.checkPlainUrlSchemes, securityChecks.checkWildcards,
    securityChecks.checkMissingDirectives,
    securityChecks.checkScriptAllowlistBypass,
    securityChecks.checkFlashObjectAllowlistBypass, securityChecks.checkIpSource,
    securityChecks.checkNonceLength, securityChecks.checkSrcHttp,
    securityChecks.checkDeprecatedDirective, parserChecks.checkUnknownDirective,
    parserChecks.checkMissingSemicolon, parserChecks.checkInvalidKeyword
];
exports.STRICTCSP_CHECKS = [
    strictcspChecks.checkStrictDynamic,
    strictcspChecks.checkStrictDynamicNotStandalone,
    strictcspChecks.checkUnsafeInlineFallback,
    strictcspChecks.checkAllowlistFallback,
    strictcspChecks.checkRequiresTrustedTypesForScripts
];
//# sourceMappingURL=evaluator.js.map