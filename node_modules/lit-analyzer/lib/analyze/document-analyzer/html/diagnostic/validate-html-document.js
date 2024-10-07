"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHTMLDocument = void 0;
var rule_diagnostic_util_js_1 = require("../../../util/rule-diagnostic-util.js");
function validateHTMLDocument(htmlDocument, context) {
    return context.rules.getDiagnosticsFromDocument(htmlDocument, context).map(function (d) { return (0, rule_diagnostic_util_js_1.convertRuleDiagnosticToLitDiagnostic)(d, context); });
}
exports.validateHTMLDocument = validateHTMLDocument;
