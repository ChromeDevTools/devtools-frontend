"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownDiagnosticFormatter = void 0;
var markdown_util_js_1 = require("./markdown-util.js");
var util_js_1 = require("./util.js");
var MarkdownDiagnosticFormatter = /** @class */ (function () {
    function MarkdownDiagnosticFormatter() {
    }
    MarkdownDiagnosticFormatter.prototype.report = function (stats) {
        return "\n".concat((0, markdown_util_js_1.markdownHeader)(2, "Summary"), "\n").concat((0, markdown_util_js_1.markdownTable)([
            ["Files analyzed", "Files with problems", "Problems", "Errors", "Warnings"],
            [stats.totalFiles, stats.filesWithProblems, stats.diagnostics, stats.errors, stats.warnings].map(function (v) { return v.toString(); })
        ]));
    };
    MarkdownDiagnosticFormatter.prototype.diagnosticTextForFile = function (file, diagnostics) {
        if (diagnostics.length === 0)
            return undefined;
        return "\n".concat((0, markdown_util_js_1.markdownHeader)(2, "".concat((0, util_js_1.relativeFileName)(file.fileName))), "\n").concat(markdownDiagnosticTable(file, diagnostics));
    };
    return MarkdownDiagnosticFormatter;
}());
exports.MarkdownDiagnosticFormatter = MarkdownDiagnosticFormatter;
function markdownDiagnosticTable(file, diagnostics) {
    var headerRow = ["Line", "Column", "Type", "Rule", "Message"];
    var rows = diagnostics.map(function (diagnostic) {
        var lineContext = file.getLineAndCharacterOfPosition(diagnostic.location.start);
        return [
            (lineContext.line + 1).toString(),
            (lineContext.character + 1).toString(),
            diagnostic.severity === "error" ? (0, markdown_util_js_1.markdownHighlight)("error") : "warning",
            diagnostic.source || "",
            diagnostic.message
        ];
    });
    return (0, markdown_util_js_1.markdownTable)(__spreadArray([headerRow], __read(rows), false), { removeEmptyColumns: true });
}
