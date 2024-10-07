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
exports.LitCssVscodeService = void 0;
var vscode = __importStar(require("vscode-css-languageservice"));
var lit_analyzer_config_js_1 = require("../../lit-analyzer-config.js");
var html_tag_js_1 = require("../../parse/parse-html-data/html-tag.js");
var general_util_js_1 = require("../../util/general-util.js");
var get_position_context_in_document_js_1 = require("../../util/get-position-context-in-document.js");
var iterable_util_js_1 = require("../../util/iterable-util.js");
var range_util_js_1 = require("../../util/range-util.js");
function makeVscTextDocument(cssDocument) {
    return vscode.TextDocument.create("untitled://embedded.css", "css", 1, cssDocument.virtualDocument.text);
}
var LitCssVscodeService = /** @class */ (function () {
    function LitCssVscodeService() {
        this.dataProvider = new LitVscodeCSSDataProvider();
    }
    Object.defineProperty(LitCssVscodeService.prototype, "cssService", {
        get: function () {
            return vscode.getCSSLanguageService({ customDataProviders: [this.dataProvider.provider] });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(LitCssVscodeService.prototype, "scssService", {
        get: function () {
            return vscode.getSCSSLanguageService({ customDataProviders: [this.dataProvider.provider] });
        },
        enumerable: false,
        configurable: true
    });
    LitCssVscodeService.prototype.getDiagnostics = function (document, context) {
        if ((0, lit_analyzer_config_js_1.isRuleDisabled)(context.config, "no-invalid-css")) {
            return [];
        }
        this.dataProvider.update(context.htmlStore);
        var vscTextDocument = makeVscTextDocument(document);
        // Return nothing if this is a one liner css snippet.
        // Example: css`100px`
        if (!vscTextDocument.getText().includes("\n")) {
            return [];
        }
        var vscStylesheet = this.makeVscStylesheet(vscTextDocument);
        var diagnostics = this.scssService.doValidation(vscTextDocument, vscStylesheet);
        return diagnostics
            .filter(function (diagnostic) { return diagnostic.range.start.line !== 0 && diagnostic.range.start.line < vscTextDocument.lineCount - 1; })
            .map(function (diagnostic) {
            return ({
                severity: diagnostic.severity === vscode.DiagnosticSeverity.Error ? "error" : "warning",
                source: "no-invalid-css",
                location: (0, range_util_js_1.documentRangeToSFRange)(document, {
                    start: vscTextDocument.offsetAt(diagnostic.range.start),
                    end: vscTextDocument.offsetAt(diagnostic.range.end)
                }),
                message: diagnostic.message,
                file: context.currentFile
            });
        });
    };
    LitCssVscodeService.prototype.getQuickInfo = function (document, offset, context) {
        var e_1, _a;
        this.dataProvider.update(context.htmlStore);
        var vscTextDocument = makeVscTextDocument(document);
        var vscStylesheet = this.makeVscStylesheet(vscTextDocument);
        var vscPosition = vscTextDocument.positionAt(offset);
        var hover = this.scssService.doHover(vscTextDocument, vscPosition, vscStylesheet);
        if (hover == null || hover.range == null)
            return;
        var contents = Array.isArray(hover.contents) ? hover.contents : [hover.contents];
        var primaryInfo = undefined;
        var secondaryInfo = undefined;
        try {
            for (var contents_1 = __values(contents), contents_1_1 = contents_1.next(); !contents_1_1.done; contents_1_1 = contents_1.next()) {
                var content = contents_1_1.value;
                var text = typeof content === "string" ? content : content.value;
                if (typeof content === "object" && "language" in content) {
                    if (content.language === "html") {
                        primaryInfo = "".concat(primaryInfo == null ? "" : "\n\n").concat(text);
                    }
                }
                else {
                    secondaryInfo = text;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (contents_1_1 && !contents_1_1.done && (_a = contents_1.return)) _a.call(contents_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return {
            primaryInfo: primaryInfo || "",
            secondaryInfo: secondaryInfo,
            range: (0, range_util_js_1.documentRangeToSFRange)(document, { start: vscTextDocument.offsetAt(hover.range.start), end: vscTextDocument.offsetAt(hover.range.end) })
        };
    };
    LitCssVscodeService.prototype.getCompletions = function (document, offset, context) {
        var e_2, _a, e_3, _b;
        this.dataProvider.update(context.htmlStore);
        var positionContext = (0, get_position_context_in_document_js_1.getPositionContextInDocument)(document, offset);
        // If there is ":" before the word, treat them like it's a part of the "leftWord", because ":" is a part of the name, but also a separator
        if (positionContext.beforeWord === ":") {
            positionContext.leftWord =
                ":" +
                    (0, get_position_context_in_document_js_1.grabWordInDirection)({
                        startOffset: offset - positionContext.leftWord.length - 1,
                        stopChar: /[^:]/,
                        direction: "left",
                        text: document.virtualDocument.text
                    }) +
                    positionContext.leftWord;
        }
        var range = (0, range_util_js_1.documentRangeToSFRange)(document, {
            start: positionContext.offset - positionContext.leftWord.length,
            end: positionContext.offset + positionContext.rightWord.length
        });
        var vscTextDocument = makeVscTextDocument(document);
        var vscStylesheet = this.makeVscStylesheet(vscTextDocument);
        var vscPosition = vscTextDocument.positionAt(offset);
        var items = this.cssService.doComplete(vscTextDocument, vscPosition, vscStylesheet);
        // Get all completions from vscode html language service
        var completions = items.items.map(function (i) {
            return ({
                kind: i.kind == null ? "unknown" : translateCompletionItemKind(i.kind),
                name: i.label,
                insert: i.label,
                kindModifiers: i.kind === vscode.CompletionItemKind.Color ? "color" : undefined,
                documentation: (0, general_util_js_1.lazy)(function () { return (typeof i.documentation === "string" || i.documentation == null ? i.documentation : i.documentation.value); }),
                sortText: i.sortText,
                range: range
            });
        });
        var _loop_1 = function (cssProp) {
            if (completions.some(function (c) { return c.name === cssProp.name; })) {
                return "continue";
            }
            completions.push({
                kind: "variableElement",
                name: cssProp.name,
                insert: cssProp.name,
                sortText: positionContext.leftWord.startsWith("-") ? "0" : "e_0",
                documentation: (0, general_util_js_1.lazy)(function () { return (0, html_tag_js_1.documentationForCssProperty)(cssProp); }),
                range: range
            });
        };
        try {
            // Add completions for css custom properties
            for (var _c = __values(context.htmlStore.getAllCssPropertiesForTag("")), _d = _c.next(); !_d.done; _d = _c.next()) {
                var cssProp = _d.value;
                _loop_1(cssProp);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (positionContext.beforeWord === "(") {
            // Get the name of the pseudo element
            var pseudoElementName = (0, get_position_context_in_document_js_1.grabWordInDirection)({
                startOffset: offset - positionContext.leftWord.length - 1,
                stopChar: /[^-A-Za-z]/,
                direction: "left",
                text: document.virtualDocument.text
            });
            // Add completions for css shadow parts
            if (pseudoElementName === "part") {
                var _loop_2 = function (cssPart) {
                    completions.push({
                        kind: "variableElement",
                        name: cssPart.name,
                        insert: cssPart.name,
                        sortText: "0",
                        documentation: (0, general_util_js_1.lazy)(function () { return (0, html_tag_js_1.documentationForCssPart)(cssPart); }),
                        range: range
                    });
                };
                try {
                    for (var _e = __values(context.htmlStore.getAllCssPartsForTag("")), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var cssPart = _f.value;
                        _loop_2(cssPart);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
        }
        return completions;
    };
    LitCssVscodeService.prototype.makeVscStylesheet = function (vscTextDocument) {
        return this.scssService.parseStylesheet(vscTextDocument);
    };
    return LitCssVscodeService;
}());
exports.LitCssVscodeService = LitCssVscodeService;
function translateCompletionItemKind(kind) {
    switch (kind) {
        case vscode.CompletionItemKind.Method:
            return "memberFunctionElement";
        case vscode.CompletionItemKind.Function:
            return "functionElement";
        case vscode.CompletionItemKind.Constructor:
            return "constructorImplementationElement";
        case vscode.CompletionItemKind.Field:
        case vscode.CompletionItemKind.Variable:
            return "variableElement";
        case vscode.CompletionItemKind.Class:
            return "classElement";
        case vscode.CompletionItemKind.Interface:
            return "interfaceElement";
        case vscode.CompletionItemKind.Module:
            return "moduleElement";
        case vscode.CompletionItemKind.Property:
            return "memberVariableElement";
        case vscode.CompletionItemKind.Unit:
        case vscode.CompletionItemKind.Value:
            return "constElement";
        case vscode.CompletionItemKind.Enum:
            return "enumElement";
        case vscode.CompletionItemKind.Keyword:
            return "keyword";
        case vscode.CompletionItemKind.Color:
            return "constElement";
        case vscode.CompletionItemKind.Reference:
            return "alias";
        case vscode.CompletionItemKind.File:
            return "moduleElement";
        case vscode.CompletionItemKind.Snippet:
        case vscode.CompletionItemKind.Text:
        default:
            return "unknown";
    }
}
var LitVscodeCSSDataProvider = /** @class */ (function () {
    function LitVscodeCSSDataProvider() {
        var _this = this;
        this.pseudoElementData = [];
        this.customDataProvider = (function () {
            var provider = _this;
            return {
                providePseudoElements: function () {
                    return [
                        {
                            browsers: [],
                            description: "Unlike ::part, ::theme matches elements parts with that theme name, anywhere in the document.",
                            name: "::theme",
                            status: "nonstandard"
                        }
                    ];
                },
                provideAtDirectives: function () {
                    return [];
                },
                providePseudoClasses: function () {
                    return provider.pseudoElementData;
                },
                provideProperties: function () {
                    return [];
                }
            };
        })();
    }
    Object.defineProperty(LitVscodeCSSDataProvider.prototype, "provider", {
        get: function () {
            return this.customDataProvider;
        },
        enumerable: false,
        configurable: true
    });
    LitVscodeCSSDataProvider.prototype.update = function (htmlStore) {
        this.pseudoElementData = Array.from((0, iterable_util_js_1.iterableMap)((0, iterable_util_js_1.iterableFilter)(htmlStore.getGlobalTags(), function (tag) { return !tag.builtIn; }), function (tag) {
            return ({
                browsers: [],
                description: (0, html_tag_js_1.documentationForHtmlTag)(tag),
                name: tag.tagName,
                status: "standard"
            });
        }));
    };
    return LitVscodeCSSDataProvider;
}());
