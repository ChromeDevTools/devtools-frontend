"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeDiagnosticFormatter = void 0;
var chalk_1 = __importDefault(require("chalk"));
var util_js_1 = require("./util.js");
var CodeDiagnosticFormatter = /** @class */ (function () {
    function CodeDiagnosticFormatter() {
    }
    CodeDiagnosticFormatter.prototype.report = function (stats) {
        return (0, util_js_1.generalReport)(stats);
    };
    CodeDiagnosticFormatter.prototype.diagnosticTextForFile = function (file, diagnostics) {
        if (diagnostics.length === 0)
            return undefined;
        var diagnosticText = diagnostics.map(function (diagnostic) { return diagnosticTextForFile(file, diagnostic); }).join("\n");
        return "\n".concat(chalk_1.default.underline("".concat((0, util_js_1.relativeFileName)(file.fileName))), "\n").concat(diagnosticText);
    };
    return CodeDiagnosticFormatter;
}());
exports.CodeDiagnosticFormatter = CodeDiagnosticFormatter;
function diagnosticTextForFile(file, diagnostic) {
    var MAX_LINE_WIDTH = 50;
    var MIN_MESSAGE_PADDING = 10;
    // Get line and character of start position
    var lineContext = file.getLineAndCharacterOfPosition(diagnostic.location.start);
    // Get start and end position of the line
    var linePositionRange = {
        start: file.getPositionOfLineAndCharacter(lineContext.line, 0),
        end: file.getLineEndOfPosition(diagnostic.location.start)
    };
    // Modify the line position range if the width of the line exceeds MAX_LINE_WIDTH
    if (linePositionRange.end - linePositionRange.start > MAX_LINE_WIDTH) {
        // Calculate even padding to both sides
        var padding = Math.max(MIN_MESSAGE_PADDING, Math.round((MAX_LINE_WIDTH - (diagnostic.location.end - diagnostic.location.start)) / 2));
        // Calculate new start and end position without exceeding the line position range
        var start = Math.max(linePositionRange.start, diagnostic.location.start - padding);
        var end = Math.min(linePositionRange.end, diagnostic.location.end + padding);
        linePositionRange = { start: start, end: end };
    }
    // Get the source file text on the position range
    var lineText = file.getFullText().substring(linePositionRange.start, linePositionRange.end);
    // Highlight the error in the text
    // The highlighting range is offsetted by subtracting the line start position
    var highlightingColorFunction = function (str) { return chalk_1.default.black(diagnostic.severity === "error" ? chalk_1.default.bgRedBright(str) : chalk_1.default.bgYellow(str)); };
    var markedLine = (0, util_js_1.markText)(lineText, {
        start: diagnostic.location.start - linePositionRange.start,
        length: diagnostic.location.end - diagnostic.location.start
    }, highlightingColorFunction).replace(/^\s*/, " ");
    var block = [
        chalk_1.default.bold("".concat(diagnostic.message).concat(diagnostic.fixMessage ? " ".concat(diagnostic.fixMessage) : "")),
        "".concat(chalk_1.default.gray("".concat(lineContext.line + 1, ":")), " ").concat(markedLine),
        diagnostic.source == null ? undefined : chalk_1.default.gray("".concat(diagnostic.source))
    ]
        .filter(function (line) { return line != null; })
        .map(function (line) { return "    ".concat(line); })
        .join("\n");
    return "\n".concat(block, "\n");
}
