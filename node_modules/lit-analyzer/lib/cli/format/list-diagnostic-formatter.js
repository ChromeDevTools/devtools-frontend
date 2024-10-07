"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListDiagnosticFormatter = void 0;
var chalk_1 = __importDefault(require("chalk"));
var util_js_1 = require("./util.js");
var ListDiagnosticFormatter = /** @class */ (function () {
    function ListDiagnosticFormatter() {
    }
    ListDiagnosticFormatter.prototype.report = function (stats) {
        return (0, util_js_1.generalReport)(stats);
    };
    ListDiagnosticFormatter.prototype.diagnosticTextForFile = function (file, diagnostics) {
        if (diagnostics.length === 0)
            return undefined;
        return diagnosticTextForFile(file, diagnostics);
    };
    return ListDiagnosticFormatter;
}());
exports.ListDiagnosticFormatter = ListDiagnosticFormatter;
function diagnosticTextForFile(file, diagnostics) {
    var diagnosticText = diagnostics.map(function (diagnostic) { return litDiagnosticToErrorText(file, diagnostic); }).join("\n");
    return "\n".concat(chalk_1.default.underline("".concat((0, util_js_1.relativeFileName)(file.fileName))), "\n").concat(diagnosticText);
}
function litDiagnosticToErrorText(file, diagnostic) {
    var lineContext = file.getLineAndCharacterOfPosition(diagnostic.location.start);
    var linePart = "".concat((0, util_js_1.textPad)("".concat(lineContext.line + 1), { width: 5 }), ":").concat((0, util_js_1.textPad)("".concat(lineContext.character), {
        width: 4,
        dir: "right"
    }));
    var severityPart = "".concat((0, util_js_1.textPad)(diagnostic.severity === "warning" ? chalk_1.default.yellow("warning") : chalk_1.default.red("error"), {
        width: 18,
        dir: "right"
    }));
    var messagePart = diagnostic.message;
    return "".concat(linePart, " ").concat(severityPart, " ").concat(messagePart);
}
