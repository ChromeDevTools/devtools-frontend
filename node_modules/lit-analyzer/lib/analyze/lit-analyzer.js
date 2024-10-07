"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
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
exports.LitAnalyzer = void 0;
var component_analyzer_js_1 = require("./component-analyzer/component-analyzer.js");
var lit_css_document_analyzer_js_1 = require("./document-analyzer/css/lit-css-document-analyzer.js");
var lit_html_document_analyzer_js_1 = require("./document-analyzer/html/lit-html-document-analyzer.js");
var rename_locations_for_tag_name_js_1 = require("./document-analyzer/html/rename-locations/rename-locations-for-tag-name.js");
var css_document_js_1 = require("./parse/document/text-document/css-document/css-document.js");
var html_document_js_1 = require("./parse/document/text-document/html-document/html-document.js");
var ts_module_js_1 = require("./ts-module.js");
var array_util_js_1 = require("./util/array-util.js");
var ast_util_js_1 = require("./util/ast-util.js");
var iterable_util_js_1 = require("./util/iterable-util.js");
var range_util_js_1 = require("./util/range-util.js");
var LitAnalyzer = /** @class */ (function () {
    function LitAnalyzer(context) {
        this.context = context;
        this.litHtmlDocumentAnalyzer = new lit_html_document_analyzer_js_1.LitHtmlDocumentAnalyzer();
        this.litCssDocumentAnalyzer = new lit_css_document_analyzer_js_1.LitCssDocumentAnalyzer();
        this.componentAnalyzer = new component_analyzer_js_1.ComponentAnalyzer();
        // Set the Typescript module
        // I plan on removing this function, so only "context.ts" is used.
        (0, ts_module_js_1.setTypescriptModule)(context.ts);
    }
    LitAnalyzer.prototype.getOutliningSpansInFile = function (file) {
        var _this = this;
        this.context.setContextBase({ file: file });
        var documents = this.getDocumentsInFile(file);
        this.context.updateComponents(file);
        return (0, array_util_js_1.arrayFlat)(documents.map(function (document) {
            if (document instanceof css_document_js_1.CssDocument) {
                return [];
            }
            else if (document instanceof html_document_js_1.HtmlDocument) {
                return _this.litHtmlDocumentAnalyzer.getOutliningSpans(document);
            }
            return [];
        }));
    };
    LitAnalyzer.prototype.getDefinitionAtPosition = function (file, position) {
        this.context.setContextBase({ file: file });
        var _a = this.getDocumentAndOffsetAtPosition(file, position), document = _a.document, offset = _a.offset;
        if (document == null)
            return undefined;
        this.context.updateComponents(file);
        if (document instanceof css_document_js_1.CssDocument) {
            return this.litCssDocumentAnalyzer.getDefinitionAtOffset(document, offset, this.context);
        }
        else if (document instanceof html_document_js_1.HtmlDocument) {
            return this.litHtmlDocumentAnalyzer.getDefinitionAtOffset(document, offset, this.context);
        }
        return;
    };
    /**
     * Yields entries that describe regions of code in the given file, and
     * what the analyzer knows about them.
     *
     * This is useful for generating a static index of analysis output. Two such
     * indexing systems are Kythe and the Language Server Index Format.
     */
    LitAnalyzer.prototype.indexFile = function (file) {
        var documents, documents_1, documents_1_1, document, e_1_1;
        var e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    this.context.updateComponents(file);
                    documents = this.getDocumentsInFile(file);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, 7, 8]);
                    documents_1 = __values(documents), documents_1_1 = documents_1.next();
                    _b.label = 2;
                case 2:
                    if (!!documents_1_1.done) return [3 /*break*/, 5];
                    document = documents_1_1.value;
                    if (!(document instanceof html_document_js_1.HtmlDocument)) return [3 /*break*/, 4];
                    return [5 /*yield**/, __values(this.litHtmlDocumentAnalyzer.indexFile(document, this.context))];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    documents_1_1 = documents_1.next();
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 8];
                case 6:
                    e_1_1 = _b.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 8];
                case 7:
                    try {
                        if (documents_1_1 && !documents_1_1.done && (_a = documents_1.return)) _a.call(documents_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    };
    LitAnalyzer.prototype.getQuickInfoAtPosition = function (file, position) {
        this.context.setContextBase({ file: file });
        var _a = this.getDocumentAndOffsetAtPosition(file, position), document = _a.document, offset = _a.offset;
        if (document == null)
            return undefined;
        this.context.updateComponents(file);
        if (document instanceof css_document_js_1.CssDocument) {
            return this.litCssDocumentAnalyzer.getQuickInfoAtOffset(document, offset, this.context);
        }
        else if (document instanceof html_document_js_1.HtmlDocument) {
            return this.litHtmlDocumentAnalyzer.getQuickInfoAtOffset(document, offset, this.context);
        }
        return;
    };
    LitAnalyzer.prototype.getRenameInfoAtPosition = function (file, position) {
        this.context.setContextBase({ file: file });
        var _a = this.getDocumentAndOffsetAtPosition(file, position), document = _a.document, offset = _a.offset;
        if (document != null) {
            if (document instanceof css_document_js_1.CssDocument) {
                return undefined;
            }
            else if (document instanceof html_document_js_1.HtmlDocument) {
                return this.litHtmlDocumentAnalyzer.getRenameInfoAtOffset(document, offset, this.context);
            }
        }
        else {
            var nodeUnderCursor = (0, ast_util_js_1.getNodeAtPosition)(file, position);
            if (nodeUnderCursor == null)
                return undefined;
            if (this.context.ts.isStringLiteralLike(nodeUnderCursor)) {
                var tagName = nodeUnderCursor.text;
                var definition = this.context.definitionStore.getDefinitionForTagName(tagName);
                if (definition != null && (0, ast_util_js_1.nodeIntersects)(nodeUnderCursor, (0, iterable_util_js_1.iterableFirst)(definition.tagNameNodes))) {
                    return {
                        fullDisplayName: tagName,
                        displayName: tagName,
                        range: (0, range_util_js_1.makeSourceFileRange)({ start: nodeUnderCursor.getStart() + 1, end: nodeUnderCursor.getEnd() - 1 }),
                        kind: "label",
                        target: definition
                    };
                }
            }
        }
        return;
    };
    LitAnalyzer.prototype.getRenameLocationsAtPosition = function (file, position) {
        this.context.setContextBase({ file: file });
        var renameInfo = this.getRenameInfoAtPosition(file, position);
        if (renameInfo == null)
            return [];
        if ("document" in renameInfo) {
            var document = renameInfo.document;
            var offset = document.virtualDocument.sfPositionToDocumentOffset(position);
            if (document instanceof css_document_js_1.CssDocument) {
                return [];
            }
            else {
                return this.litHtmlDocumentAnalyzer.getRenameLocationsAtOffset(document, offset, this.context);
            }
        }
        else {
            return (0, rename_locations_for_tag_name_js_1.renameLocationsForTagName)(renameInfo.target.tagName, this.context);
        }
    };
    LitAnalyzer.prototype.getClosingTagAtPosition = function (file, position) {
        this.context.setContextBase({ file: file });
        var _a = this.getDocumentAndOffsetAtPosition(file, position), document = _a.document, offset = _a.offset;
        if (document == null)
            return undefined;
        this.context.updateComponents(file);
        if (document instanceof html_document_js_1.HtmlDocument) {
            return this.litHtmlDocumentAnalyzer.getClosingTagAtOffset(document, offset);
        }
        return;
    };
    LitAnalyzer.prototype.getCompletionDetailsAtPosition = function (file, position, name) {
        this.context.setContextBase({ file: file });
        var _a = this.getDocumentAndOffsetAtPosition(file, position), document = _a.document, offset = _a.offset;
        if (document == null)
            return undefined;
        if (document instanceof css_document_js_1.CssDocument) {
            return this.litCssDocumentAnalyzer.getCompletionDetailsAtOffset(document, offset, name, this.context);
        }
        else if (document instanceof html_document_js_1.HtmlDocument) {
            return this.litHtmlDocumentAnalyzer.getCompletionDetailsAtOffset(document, offset, name, this.context);
        }
        return;
    };
    LitAnalyzer.prototype.getCompletionsAtPosition = function (file, position) {
        this.context.setContextBase({ file: file });
        var _a = this.getDocumentAndOffsetAtPosition(file, position), document = _a.document, offset = _a.offset;
        if (document == null)
            return undefined;
        this.context.updateComponents(file);
        if (document instanceof css_document_js_1.CssDocument) {
            return this.litCssDocumentAnalyzer.getCompletionsAtOffset(document, offset, this.context);
        }
        else if (document instanceof html_document_js_1.HtmlDocument) {
            return this.litHtmlDocumentAnalyzer.getCompletionsAtOffset(document, offset, this.context);
        }
        return;
    };
    LitAnalyzer.prototype.getDiagnosticsInFile = function (file) {
        var e_2, _a, e_3, _b, e_4, _c;
        this.context.setContextBase({ file: file, timeout: 7000, throwOnCancellation: true });
        this.context.updateComponents(file);
        this.context.updateDependencies(file);
        var documents = this.getDocumentsInFile(file);
        var diagnostics = [];
        // Get diagnostics for components definitions in this file
        var definitions = this.context.definitionStore.getDefinitionsWithDeclarationInFile(file);
        try {
            for (var definitions_1 = __values(definitions), definitions_1_1 = definitions_1.next(); !definitions_1_1.done; definitions_1_1 = definitions_1.next()) {
                var definition = definitions_1_1.value;
                if (this.context.isCancellationRequested) {
                    break;
                }
                diagnostics.push.apply(diagnostics, __spreadArray([], __read(this.componentAnalyzer.getDiagnostics(definition, this.context)), false));
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (definitions_1_1 && !definitions_1_1.done && (_a = definitions_1.return)) _a.call(definitions_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        // Get diagnostics for components in this file
        var declarations = this.context.definitionStore.getComponentDeclarationsInFile(file);
        try {
            for (var declarations_1 = __values(declarations), declarations_1_1 = declarations_1.next(); !declarations_1_1.done; declarations_1_1 = declarations_1.next()) {
                var declaration = declarations_1_1.value;
                if (this.context.isCancellationRequested) {
                    break;
                }
                diagnostics.push.apply(diagnostics, __spreadArray([], __read(this.componentAnalyzer.getDiagnostics(declaration, this.context)), false));
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (declarations_1_1 && !declarations_1_1.done && (_b = declarations_1.return)) _b.call(declarations_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        try {
            // Get diagnostics for documents in this file
            for (var documents_2 = __values(documents), documents_2_1 = documents_2.next(); !documents_2_1.done; documents_2_1 = documents_2.next()) {
                var document = documents_2_1.value;
                if (this.context.isCancellationRequested) {
                    break;
                }
                if (document instanceof css_document_js_1.CssDocument) {
                    diagnostics.push.apply(diagnostics, __spreadArray([], __read(this.litCssDocumentAnalyzer.getDiagnostics(document, this.context)), false));
                }
                else if (document instanceof html_document_js_1.HtmlDocument) {
                    diagnostics.push.apply(diagnostics, __spreadArray([], __read(this.litHtmlDocumentAnalyzer.getDiagnostics(document, this.context)), false));
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (documents_2_1 && !documents_2_1.done && (_c = documents_2.return)) _c.call(documents_2);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return diagnostics;
    };
    LitAnalyzer.prototype.getCodeFixesAtPositionRange = function (file, sourceFileRange) {
        var e_5, _a, e_6, _b;
        this.context.setContextBase({ file: file });
        var document = this.getDocumentAndOffsetAtPosition(file, sourceFileRange.start).document;
        this.context.updateComponents(file);
        this.context.updateDependencies(file);
        // Return fixes for intersecting document
        if (document instanceof html_document_js_1.HtmlDocument) {
            return this.litHtmlDocumentAnalyzer.getCodeFixesAtOffsetRange(document, (0, range_util_js_1.sfRangeToDocumentRange)(document, sourceFileRange), this.context);
        }
        // Else, return fixes for components in this file
        else {
            var definitions = this.context.definitionStore.getDefinitionsWithDeclarationInFile(file);
            try {
                for (var definitions_2 = __values(definitions), definitions_2_1 = definitions_2.next(); !definitions_2_1.done; definitions_2_1 = definitions_2.next()) {
                    var definition = definitions_2_1.value;
                    var result = this.componentAnalyzer.getCodeFixesAtOffsetRange(definition, (0, range_util_js_1.makeSourceFileRange)(sourceFileRange), this.context);
                    if (result.length > 0) {
                        return result;
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (definitions_2_1 && !definitions_2_1.done && (_a = definitions_2.return)) _a.call(definitions_2);
                }
                finally { if (e_5) throw e_5.error; }
            }
            var components = this.context.definitionStore.getComponentDeclarationsInFile(file);
            try {
                for (var components_1 = __values(components), components_1_1 = components_1.next(); !components_1_1.done; components_1_1 = components_1.next()) {
                    var component = components_1_1.value;
                    var result = this.componentAnalyzer.getCodeFixesAtOffsetRange(component, (0, range_util_js_1.makeSourceFileRange)(sourceFileRange), this.context);
                    if (result.length > 0) {
                        return result;
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (components_1_1 && !components_1_1.done && (_b = components_1.return)) _b.call(components_1);
                }
                finally { if (e_6) throw e_6.error; }
            }
        }
        return [];
    };
    LitAnalyzer.prototype.getFormatEditsInFile = function (file, settings) {
        var _this = this;
        this.context.setContextBase({ file: file });
        var documents = this.getDocumentsInFile(file);
        return (0, array_util_js_1.arrayFlat)(documents.map(function (document) {
            if (document instanceof css_document_js_1.CssDocument) {
                return [];
            }
            else if (document instanceof html_document_js_1.HtmlDocument) {
                return _this.litHtmlDocumentAnalyzer.getFormatEdits(document, settings);
            }
            return [];
        }));
    };
    LitAnalyzer.prototype.getDocumentAndOffsetAtPosition = function (sourceFile, position) {
        var document = this.context.documentStore.getDocumentAtPosition(sourceFile, position, this.context.config);
        return {
            document: document,
            offset: document != null ? document.virtualDocument.sfPositionToDocumentOffset(position) : -1
        };
    };
    LitAnalyzer.prototype.getDocumentsInFile = function (sourceFile) {
        return this.context.documentStore.getDocumentsInFile(sourceFile, this.context.config);
    };
    return LitAnalyzer;
}());
exports.LitAnalyzer = LitAnalyzer;
