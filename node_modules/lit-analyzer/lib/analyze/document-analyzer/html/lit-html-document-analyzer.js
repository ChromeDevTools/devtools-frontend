"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LitHtmlDocumentAnalyzer = void 0;
var html_node_attr_types_js_1 = require("../../types/html-node/html-node-attr-types.js");
var html_node_types_js_1 = require("../../types/html-node/html-node-types.js");
var lit_outlining_span_js_1 = require("../../types/lit-outlining-span.js");
var iterable_util_js_1 = require("../../util/iterable-util.js");
var range_util_js_1 = require("../../util/range-util.js");
var code_fixes_for_html_document_js_1 = require("./code-fix/code-fixes-for-html-document.js");
var completions_at_offset_js_1 = require("./completion/completions-at-offset.js");
var definition_for_html_attr_js_1 = require("./definition/definition-for-html-attr.js");
var definition_for_html_node_js_1 = require("./definition/definition-for-html-node.js");
var validate_html_document_js_1 = require("./diagnostic/validate-html-document.js");
var lit_html_vscode_service_js_1 = require("./lit-html-vscode-service.js");
var quick_info_for_html_attr_js_1 = require("./quick-info/quick-info-for-html-attr.js");
var quick_info_for_html_node_js_1 = require("./quick-info/quick-info-for-html-node.js");
var rename_locations_at_offset_js_1 = require("./rename-locations/rename-locations-at-offset.js");
var LitHtmlDocumentAnalyzer = /** @class */ (function () {
    function LitHtmlDocumentAnalyzer() {
        this.vscodeHtmlService = new lit_html_vscode_service_js_1.LitHtmlVscodeService();
        this.completionsCache = [];
    }
    LitHtmlDocumentAnalyzer.prototype.getCompletionDetailsAtOffset = function (document, offset, name, context) {
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
    LitHtmlDocumentAnalyzer.prototype.getCompletionsAtOffset = function (document, offset, context) {
        this.completionsCache = (0, completions_at_offset_js_1.completionsAtOffset)(document, offset, context);
        return (0, completions_at_offset_js_1.completionsAtOffset)(document, offset, context);
    };
    LitHtmlDocumentAnalyzer.prototype.getDiagnostics = function (document, context) {
        return (0, validate_html_document_js_1.validateHTMLDocument)(document, context);
    };
    LitHtmlDocumentAnalyzer.prototype.getClosingTagAtOffset = function (document, offset) {
        return this.vscodeHtmlService.getClosingTagAtOffset(document, offset);
    };
    LitHtmlDocumentAnalyzer.prototype.getCodeFixesAtOffsetRange = function (document, offsetRange, context) {
        var hit = document.htmlNodeOrAttrAtOffset(offsetRange);
        if (hit == null)
            return [];
        return (0, code_fixes_for_html_document_js_1.codeFixesForHtmlDocument)(document, offsetRange, context);
    };
    LitHtmlDocumentAnalyzer.prototype.getDefinitionAtOffset = function (document, offset, context) {
        var hit = document.htmlNodeOrAttrAtOffset(offset);
        if (hit == null)
            return undefined;
        if ((0, html_node_types_js_1.isHTMLNode)(hit)) {
            return (0, definition_for_html_node_js_1.definitionForHtmlNode)(hit, context);
        }
        else if ((0, html_node_attr_types_js_1.isHTMLAttr)(hit)) {
            return (0, definition_for_html_attr_js_1.definitionForHtmlAttr)(hit, context);
        }
        return;
    };
    LitHtmlDocumentAnalyzer.prototype.getRenameInfoAtOffset = function (document, offset, context) {
        var hit = document.htmlNodeOrAttrAtOffset(offset);
        if (hit == null)
            return undefined;
        if ((0, html_node_types_js_1.isHTMLNode)(hit)) {
            return {
                kind: "memberVariableElement",
                fullDisplayName: hit.tagName,
                displayName: hit.tagName,
                range: (0, range_util_js_1.documentRangeToSFRange)(document, __assign({}, hit.location.name)),
                document: document,
                target: hit
            };
        }
        return;
    };
    LitHtmlDocumentAnalyzer.prototype.getRenameLocationsAtOffset = function (document, offset, context) {
        return (0, rename_locations_at_offset_js_1.renameLocationsAtOffset)(document, offset, context);
    };
    LitHtmlDocumentAnalyzer.prototype.getQuickInfoAtOffset = function (document, offset, context) {
        var hit = document.htmlNodeOrAttrAtOffset(offset);
        if (hit == null)
            return undefined;
        if ((0, html_node_types_js_1.isHTMLNode)(hit)) {
            return (0, quick_info_for_html_node_js_1.quickInfoForHtmlNode)(hit, context);
        }
        if ((0, html_node_attr_types_js_1.isHTMLAttr)(hit)) {
            return (0, quick_info_for_html_attr_js_1.quickInfoForHtmlAttr)(hit, context);
        }
        return;
    };
    LitHtmlDocumentAnalyzer.prototype.getOutliningSpans = function (document) {
        return (0, iterable_util_js_1.iterableDefined)(document.mapNodes(function (node) {
            if (node.location.endTag == null)
                return undefined;
            // Calculate last index of the collapsed span.
            // We don't want to include the last line because it will include the </endtag> in the collapsed region
            var endIndex = (function () {
                var lastChild = node.children[node.children.length - 1];
                if (lastChild != null) {
                    return lastChild.location.endTag != null ? lastChild.location.endTag.start : lastChild.location.startTag.end;
                }
                return node.location.endTag.start;
            })();
            return {
                autoCollapse: false,
                bannerText: node.tagName,
                kind: lit_outlining_span_js_1.LitOutliningSpanKind.Code,
                location: (0, range_util_js_1.documentRangeToSFRange)(document, { start: node.location.startTag.end, end: endIndex })
            };
        }));
    };
    LitHtmlDocumentAnalyzer.prototype.getFormatEdits = function (document, settings) {
        return this.vscodeHtmlService.format(document, settings);
    };
    LitHtmlDocumentAnalyzer.prototype.indexFile = function (document, context) {
        var _a, _b, node, definition, _c, _d, attribute, definition_1, e_1_1, e_2_1;
        var e_2, _e, e_1, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 12, 13, 14]);
                    _a = __values(document.nodes()), _b = _a.next();
                    _g.label = 1;
                case 1:
                    if (!!_b.done) return [3 /*break*/, 11];
                    node = _b.value;
                    definition = (0, definition_for_html_node_js_1.definitionForHtmlNode)(node, context);
                    if (!(definition != null)) return [3 /*break*/, 3];
                    return [4 /*yield*/, { kind: "NODE-REFERENCE", node: node, document: document, definition: definition }];
                case 2:
                    _g.sent();
                    _g.label = 3;
                case 3:
                    _g.trys.push([3, 8, 9, 10]);
                    _c = (e_1 = void 0, __values(node.attributes)), _d = _c.next();
                    _g.label = 4;
                case 4:
                    if (!!_d.done) return [3 /*break*/, 7];
                    attribute = _d.value;
                    definition_1 = (0, definition_for_html_attr_js_1.definitionForHtmlAttr)(attribute, context);
                    if (!(definition_1 != null)) return [3 /*break*/, 6];
                    return [4 /*yield*/, { kind: "ATTRIBUTE-REFERENCE", attribute: attribute, document: document, definition: definition_1 }];
                case 5:
                    _g.sent();
                    _g.label = 6;
                case 6:
                    _d = _c.next();
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_1_1 = _g.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (_d && !_d.done && (_f = _c.return)) _f.call(_c);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 10:
                    _b = _a.next();
                    return [3 /*break*/, 1];
                case 11: return [3 /*break*/, 14];
                case 12:
                    e_2_1 = _g.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 14];
                case 13:
                    try {
                        if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 14: return [2 /*return*/];
            }
        });
    };
    return LitHtmlDocumentAnalyzer;
}());
exports.LitHtmlDocumentAnalyzer = LitHtmlDocumentAnalyzer;
