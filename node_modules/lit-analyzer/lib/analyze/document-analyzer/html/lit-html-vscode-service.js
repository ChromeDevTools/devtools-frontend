"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.LitHtmlVscodeService = void 0;
var vscode = __importStar(require("vscode-html-languageservice"));
var virtual_document_js_1 = require("../../parse/document/virtual-document/virtual-document.js");
var range_util_js_1 = require("../../util/range-util.js");
var htmlService = vscode.getLanguageService();
function makeVscTextDocument(htmlDocument) {
    return vscode.TextDocument.create("untitled://embedded.html", "html", 1, htmlDocument.virtualDocument.text);
}
function makeVscHtmlDocument(vscTextDocument) {
    return htmlService.parseHTMLDocument(vscTextDocument);
}
var LitHtmlVscodeService = /** @class */ (function () {
    function LitHtmlVscodeService() {
    }
    LitHtmlVscodeService.prototype.getClosingTagAtOffset = function (document, offset) {
        var vscTextDocument = makeVscTextDocument(document);
        var vscHtmlDocument = makeVscHtmlDocument(vscTextDocument);
        var htmlLSPosition = vscTextDocument.positionAt(offset);
        var tagComplete = htmlService.doTagComplete(vscTextDocument, htmlLSPosition, vscHtmlDocument);
        if (tagComplete == null)
            return;
        // Html returns completions with snippet placeholders. Strip these out.
        return {
            newText: tagComplete.replace(/\$\d/g, "")
        };
    };
    LitHtmlVscodeService.prototype.format = function (document, settings) {
        var parts = document.virtualDocument.getPartsAtDocumentRange((0, range_util_js_1.makeDocumentRange)({
            start: 0,
            end: document.virtualDocument.location.end - document.virtualDocument.location.start
        }));
        var ranges = (0, virtual_document_js_1.textPartsToRanges)(parts);
        var originalHtml = parts.map(function (p) { return (typeof p === "string" ? p : "[#".concat("#".repeat(p.getText().length), "]")); }).join("");
        var vscTextDocument = vscode.TextDocument.create("untitled://embedded.html", "html", 1, originalHtml);
        var edits = htmlService.format(vscTextDocument, undefined, {
            tabSize: settings.tabSize,
            insertSpaces: !!settings.convertTabsToSpaces,
            wrapLineLength: 90,
            unformatted: "",
            contentUnformatted: "pre,code,textarea",
            indentInnerHtml: true,
            preserveNewLines: true,
            maxPreserveNewLines: undefined,
            indentHandlebars: false,
            endWithNewline: false,
            extraLiners: "head, body, /html",
            wrapAttributes: "auto"
        });
        var hasLeadingNewline = originalHtml.startsWith("\n");
        var hasTrailingNewline = originalHtml.endsWith("\n");
        var newHtml = "".concat(hasLeadingNewline ? "\n" : "").concat(vscode.TextDocument.applyEdits(vscTextDocument, edits)).concat(hasTrailingNewline ? "\n" : "");
        var splitted = newHtml.split(/\[#+\]/);
        return splitted.map(function (newText, i) {
            var range = ranges[i];
            return { range: (0, range_util_js_1.documentRangeToSFRange)(document, range), newText: newText };
        });
    };
    return LitHtmlVscodeService;
}());
exports.LitHtmlVscodeService = LitHtmlVscodeService;
