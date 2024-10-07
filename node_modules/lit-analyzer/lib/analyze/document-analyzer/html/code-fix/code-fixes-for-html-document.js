"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeFixesForHtmlDocument = void 0;
var array_util_js_1 = require("../../../util/array-util.js");
var range_util_js_1 = require("../../../util/range-util.js");
var rule_fix_util_js_1 = require("../../../util/rule-fix-util.js");
function codeFixesForHtmlDocument(htmlDocument, range, context) {
    return (0, array_util_js_1.arrayFlat)((0, array_util_js_1.arrayDefined)(context.rules
        .getDiagnosticsFromDocument(htmlDocument, context)
        .filter(function (_a) {
        var diagnostic = _a.diagnostic;
        return (0, range_util_js_1.intersects)((0, range_util_js_1.documentRangeToSFRange)(htmlDocument, range), diagnostic.location);
    })
        .map(function (_a) {
        var _b;
        var diagnostic = _a.diagnostic;
        return (_b = diagnostic.fix) === null || _b === void 0 ? void 0 : _b.call(diagnostic);
    }))).map(function (ruleFix) { return (0, rule_fix_util_js_1.converRuleFixToLitCodeFix)(ruleFix); });
}
exports.codeFixesForHtmlDocument = codeFixesForHtmlDocument;
