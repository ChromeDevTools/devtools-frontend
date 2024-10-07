"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LitCssDocumentAnalyzer = void 0;
var ast_util_js_1 = require("../../util/ast-util.js");
var get_position_context_in_document_js_1 = require("../../util/get-position-context-in-document.js");
var iterable_util_js_1 = require("../../util/iterable-util.js");
var range_util_js_1 = require("../../util/range-util.js");
var lit_css_vscode_service_js_1 = require("./lit-css-vscode-service.js");
var LitCssDocumentAnalyzer = /** @class */ (function () {
    function LitCssDocumentAnalyzer() {
        this.vscodeCssService = new lit_css_vscode_service_js_1.LitCssVscodeService();
        this.completionsCache = [];
    }
    LitCssDocumentAnalyzer.prototype.getCompletionDetailsAtOffset = function (document, offset, name, context) {
        var completionWithName = this.completionsCache.find(function (completion) { return completion.name === name; });
        if (completionWithName == null || completionWithName.documentation == null)
            return undefined;
        var primaryInfo = completionWithName.documentation();
        if (primaryInfo == null)
            return undefined;
        return {
            name: name,
            kind: completionWithName.kind,
            primaryInfo: primaryInfo
        };
    };
    LitCssDocumentAnalyzer.prototype.getCompletionsAtOffset = function (document, offset, context) {
        this.completionsCache = this.vscodeCssService.getCompletions(document, offset, context);
        return this.completionsCache;
    };
    LitCssDocumentAnalyzer.prototype.getQuickInfoAtOffset = function (document, offset, context) {
        return this.vscodeCssService.getQuickInfo(document, offset, context);
    };
    LitCssDocumentAnalyzer.prototype.getDiagnostics = function (document, context) {
        return this.vscodeCssService.getDiagnostics(document, context);
    };
    LitCssDocumentAnalyzer.prototype.getDefinitionAtOffset = function (document, offset, context) {
        var e_1, _a;
        var positionContext = (0, get_position_context_in_document_js_1.getPositionContextInDocument)(document, offset);
        var word = positionContext.word;
        var start = offset - positionContext.leftWord.length;
        var end = start + word.length;
        // Return definitions for css custom properties
        if (word.startsWith("-")) {
            try {
                for (var _b = __values(context.htmlStore.getAllCssPropertiesForTag("")), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var cssProp = _c.value;
                    if (cssProp.name === word) {
                        var nodes = (0, iterable_util_js_1.iterableDefined)((cssProp.related != null ? cssProp.related : [cssProp]).map(function (p) { var _a, _b; return (_b = (_a = p.declaration) === null || _a === void 0 ? void 0 : _a.declaration) === null || _b === void 0 ? void 0 : _b.node; }));
                        if (nodes.length === 0) {
                            return;
                        }
                        return {
                            fromRange: (0, range_util_js_1.documentRangeToSFRange)(document, { start: start, end: end }),
                            targets: nodes.map(function (node) { return ({
                                kind: "node",
                                node: (0, ast_util_js_1.getNodeIdentifier)(node, context.ts) || node
                            }); })
                        };
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        // Return definitions for custom elements
        else {
            var definition = context.definitionStore.getDefinitionForTagName(word);
            if (definition != null && definition.declaration != null) {
                var node = definition.declaration.node;
                return {
                    fromRange: (0, range_util_js_1.documentRangeToSFRange)(document, { start: start, end: end }),
                    targets: [
                        {
                            kind: "node",
                            node: (0, ast_util_js_1.getNodeIdentifier)(node, context.ts) || node
                        }
                    ]
                };
            }
        }
        return undefined;
    };
    return LitCssDocumentAnalyzer;
}());
exports.LitCssDocumentAnalyzer = LitCssDocumentAnalyzer;
