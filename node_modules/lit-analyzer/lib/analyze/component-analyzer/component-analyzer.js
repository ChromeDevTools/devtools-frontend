"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentAnalyzer = void 0;
var array_util_js_1 = require("../util/array-util.js");
var range_util_js_1 = require("../util/range-util.js");
var rule_diagnostic_util_js_1 = require("../util/rule-diagnostic-util.js");
var rule_fix_util_js_1 = require("../util/rule-fix-util.js");
var ComponentAnalyzer = /** @class */ (function () {
    function ComponentAnalyzer() {
    }
    ComponentAnalyzer.prototype.getDiagnostics = function (definitionOrDeclaration, context) {
        return this.getRuleDiagnostics(definitionOrDeclaration, context).map(function (d) { return (0, rule_diagnostic_util_js_1.convertRuleDiagnosticToLitDiagnostic)(d, context); });
    };
    ComponentAnalyzer.prototype.getCodeFixesAtOffsetRange = function (definitionOrDeclaration, range, context) {
        return (0, array_util_js_1.arrayFlat)((0, array_util_js_1.arrayDefined)(this.getRuleDiagnostics(definitionOrDeclaration, context)
            .filter(function (_a) {
            var diagnostic = _a.diagnostic;
            return (0, range_util_js_1.intersects)(range, diagnostic.location);
        })
            .map(function (_a) {
            var _b;
            var diagnostic = _a.diagnostic;
            return (_b = diagnostic.fix) === null || _b === void 0 ? void 0 : _b.call(diagnostic);
        }))).map(function (ruleFix) { return (0, rule_fix_util_js_1.converRuleFixToLitCodeFix)(ruleFix); });
    };
    ComponentAnalyzer.prototype.getRuleDiagnostics = function (definitionOrDeclaration, context) {
        if ("tagName" in definitionOrDeclaration) {
            return context.rules.getDiagnosticsFromDefinition(definitionOrDeclaration, context);
        }
        else {
            return context.rules.getDiagnosticsFromDeclaration(definitionOrDeclaration, context);
        }
    };
    return ComponentAnalyzer;
}());
exports.ComponentAnalyzer = ComponentAnalyzer;
