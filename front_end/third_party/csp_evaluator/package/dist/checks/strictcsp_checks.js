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
exports.checkRequiresTrustedTypesForScripts = exports.checkAllowlistFallback = exports.checkUnsafeInlineFallback = exports.checkStrictDynamicNotStandalone = exports.checkStrictDynamic = void 0;
const csp = __importStar(require("../csp"));
const csp_1 = require("../csp");
const finding_1 = require("../finding");
function checkStrictDynamic(parsedCsp) {
    const directiveName = parsedCsp.getEffectiveDirective(csp.Directive.SCRIPT_SRC);
    const values = parsedCsp.directives[directiveName] || [];
    const schemeOrHostPresent = values.some((v) => !v.startsWith('\''));
    if (schemeOrHostPresent && !values.includes(csp_1.Keyword.STRICT_DYNAMIC)) {
        return [new finding_1.Finding(finding_1.Type.STRICT_DYNAMIC, 'Host allowlists can frequently be bypassed. Consider using ' +
                '\'strict-dynamic\' in combination with CSP nonces or hashes.', finding_1.Severity.STRICT_CSP, directiveName)];
    }
    return [];
}
exports.checkStrictDynamic = checkStrictDynamic;
function checkStrictDynamicNotStandalone(parsedCsp) {
    const directiveName = parsedCsp.getEffectiveDirective(csp.Directive.SCRIPT_SRC);
    const values = parsedCsp.directives[directiveName] || [];
    if (values.includes(csp_1.Keyword.STRICT_DYNAMIC) &&
        (!parsedCsp.policyHasScriptNonces() &&
            !parsedCsp.policyHasScriptHashes())) {
        return [new finding_1.Finding(finding_1.Type.STRICT_DYNAMIC_NOT_STANDALONE, '\'strict-dynamic\' without a CSP nonce/hash will block all scripts.', finding_1.Severity.INFO, directiveName)];
    }
    return [];
}
exports.checkStrictDynamicNotStandalone = checkStrictDynamicNotStandalone;
function checkUnsafeInlineFallback(parsedCsp) {
    if (!parsedCsp.policyHasScriptNonces() &&
        !parsedCsp.policyHasScriptHashes()) {
        return [];
    }
    const directiveName = parsedCsp.getEffectiveDirective(csp.Directive.SCRIPT_SRC);
    const values = parsedCsp.directives[directiveName] || [];
    if (!values.includes(csp_1.Keyword.UNSAFE_INLINE)) {
        return [new finding_1.Finding(finding_1.Type.UNSAFE_INLINE_FALLBACK, 'Consider adding \'unsafe-inline\' (ignored by browsers supporting ' +
                'nonces/hashes) to be backward compatible with older browsers.', finding_1.Severity.STRICT_CSP, directiveName)];
    }
    return [];
}
exports.checkUnsafeInlineFallback = checkUnsafeInlineFallback;
function checkAllowlistFallback(parsedCsp) {
    const directiveName = parsedCsp.getEffectiveDirective(csp.Directive.SCRIPT_SRC);
    const values = parsedCsp.directives[directiveName] || [];
    if (!values.includes(csp_1.Keyword.STRICT_DYNAMIC)) {
        return [];
    }
    if (!values.some((v) => ['http:', 'https:', '*'].includes(v) || v.includes('.'))) {
        return [new finding_1.Finding(finding_1.Type.ALLOWLIST_FALLBACK, 'Consider adding https: and http: url schemes (ignored by browsers ' +
                'supporting \'strict-dynamic\') to be backward compatible with older ' +
                'browsers.', finding_1.Severity.STRICT_CSP, directiveName)];
    }
    return [];
}
exports.checkAllowlistFallback = checkAllowlistFallback;
function checkRequiresTrustedTypesForScripts(parsedCsp) {
    const directiveName = parsedCsp.getEffectiveDirective(csp.Directive.REQUIRE_TRUSTED_TYPES_FOR);
    const values = parsedCsp.directives[directiveName] || [];
    if (!values.includes(csp.TrustedTypesSink.SCRIPT)) {
        return [new finding_1.Finding(finding_1.Type.REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS, 'Consider requiring Trusted Types for scripts to lock down DOM XSS ' +
                'injection sinks. You can do this by adding ' +
                '"require-trusted-types-for \'script\'" to your policy.', finding_1.Severity.INFO, csp.Directive.REQUIRE_TRUSTED_TYPES_FOR)];
    }
    return [];
}
exports.checkRequiresTrustedTypesForScripts = checkRequiresTrustedTypesForScripts;
//# sourceMappingURL=strictcsp_checks.js.map