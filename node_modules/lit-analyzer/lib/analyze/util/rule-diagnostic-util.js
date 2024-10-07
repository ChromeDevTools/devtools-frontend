"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertRuleDiagnosticToLitDiagnostic = void 0;
var lit_analyzer_config_js_1 = require("../lit-analyzer-config.js");
function convertRuleDiagnosticToLitDiagnostic(reported, context) {
    var source = reported.source;
    var _a = reported.diagnostic, message = _a.message, location = _a.location, fixMessage = _a.fixMessage, suggestion = _a.suggestion;
    return {
        fixMessage: fixMessage,
        location: location,
        suggestion: suggestion,
        message: message,
        source: source,
        file: context.currentFile,
        severity: (0, lit_analyzer_config_js_1.litDiagnosticRuleSeverity)(context.config, source),
        code: (0, lit_analyzer_config_js_1.ruleIdCode)(source)
    };
}
exports.convertRuleDiagnosticToLitDiagnostic = convertRuleDiagnosticToLitDiagnostic;
