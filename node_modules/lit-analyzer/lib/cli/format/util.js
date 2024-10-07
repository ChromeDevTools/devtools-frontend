"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.textPad = exports.markText = exports.relativeFileName = exports.generalReport = void 0;
var chalk_1 = __importDefault(require("chalk"));
function generalReport(stats) {
    function numberStatText(n, text) {
        return "".concat(n, " ").concat(text).concat(n === 1 ? "" : "s");
    }
    if (stats.diagnostics > 0) {
        var message = "  \u2716 ".concat(numberStatText(stats.diagnostics, "problem"), " in ").concat(numberStatText(stats.filesWithProblems, "file"), " (").concat(numberStatText(stats.errors, "error"), ", ").concat(numberStatText(stats.warnings, "warning"), ")");
        if (stats.errors > 0) {
            return "\n".concat(chalk_1.default.red(message));
        }
        else {
            return "\n".concat(chalk_1.default.yellow(message));
        }
    }
    else {
        return "\n".concat(chalk_1.default.green("  \u2713 Found 0 problems in ".concat(numberStatText(stats.totalFiles, "file"))));
    }
}
exports.generalReport = generalReport;
function relativeFileName(fileName) {
    return fileName.replace(process.cwd(), ".");
}
exports.relativeFileName = relativeFileName;
function markText(text, range, colorFunction) {
    if (colorFunction === void 0) { colorFunction = chalk_1.default.bgRedBright; }
    return (text.substring(0, range.start) + chalk_1.default.bold(colorFunction(text.substr(range.start, range.length))) + text.substring(range.start + range.length));
}
exports.markText = markText;
function textPad(str, _a) {
    var width = _a.width, fill = _a.fill, dir = _a.dir;
    var padding = (fill || " ").repeat(Math.max(0, width - str.length));
    return "".concat(dir !== "right" ? padding : "").concat(str).concat(dir === "right" ? padding : "");
}
exports.textPad = textPad;
