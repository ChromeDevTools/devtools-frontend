/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../parser/htmlScanner", "vscode-languageserver-types", "../htmlLanguageTypes", "../utils/object", "../languageFacts/dataProvider"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var htmlScanner_1 = require("../parser/htmlScanner");
    var vscode_languageserver_types_1 = require("vscode-languageserver-types");
    var htmlLanguageTypes_1 = require("../htmlLanguageTypes");
    var object_1 = require("../utils/object");
    var dataProvider_1 = require("../languageFacts/dataProvider");
    var HTMLHover = /** @class */ (function () {
        function HTMLHover(lsOptions, dataManager) {
            this.lsOptions = lsOptions;
            this.dataManager = dataManager;
        }
        HTMLHover.prototype.doHover = function (document, position, htmlDocument) {
            var convertContents = this.convertContents.bind(this);
            var doesSupportMarkdown = this.doesSupportMarkdown();
            var offset = document.offsetAt(position);
            var node = htmlDocument.findNodeAt(offset);
            if (!node || !node.tag) {
                return null;
            }
            var dataProviders = this.dataManager.getDataProviders().filter(function (p) { return p.isApplicable(document.languageId); });
            function getTagHover(currTag, range, open) {
                currTag = currTag.toLowerCase();
                var _loop_1 = function (provider) {
                    var hover = null;
                    provider.provideTags().forEach(function (tag) {
                        if (tag.name.toLowerCase() === currTag.toLowerCase()) {
                            var tagLabel = open ? '<' + currTag + '>' : '</' + currTag + '>';
                            var markupContent = dataProvider_1.generateDocumentation(tag, doesSupportMarkdown);
                            if (!markupContent) {
                                markupContent = {
                                    kind: doesSupportMarkdown ? 'markdown' : 'plaintext',
                                    value: ''
                                };
                            }
                            hover = { contents: markupContent, range: range };
                        }
                    });
                    if (hover) {
                        hover.contents = convertContents(hover.contents);
                        return { value: hover };
                    }
                };
                for (var _i = 0, dataProviders_1 = dataProviders; _i < dataProviders_1.length; _i++) {
                    var provider = dataProviders_1[_i];
                    var state_1 = _loop_1(provider);
                    if (typeof state_1 === "object")
                        return state_1.value;
                }
                return null;
            }
            function getAttrHover(currTag, currAttr, range) {
                currTag = currTag.toLowerCase();
                var _loop_2 = function (provider) {
                    var hover = null;
                    provider.provideAttributes(currTag).forEach(function (attr) {
                        if (currAttr === attr.name && attr.description) {
                            var contentsDoc = dataProvider_1.generateDocumentation(attr, doesSupportMarkdown);
                            if (contentsDoc) {
                                hover = { contents: contentsDoc, range: range };
                            }
                            else {
                                hover = null;
                            }
                        }
                    });
                    if (hover) {
                        hover.contents = convertContents(hover.contents);
                        return { value: hover };
                    }
                };
                for (var _i = 0, dataProviders_2 = dataProviders; _i < dataProviders_2.length; _i++) {
                    var provider = dataProviders_2[_i];
                    var state_2 = _loop_2(provider);
                    if (typeof state_2 === "object")
                        return state_2.value;
                }
                return null;
            }
            function getAttrValueHover(currTag, currAttr, currAttrValue, range) {
                currTag = currTag.toLowerCase();
                var _loop_3 = function (provider) {
                    var hover = null;
                    provider.provideValues(currTag, currAttr).forEach(function (attrValue) {
                        if (currAttrValue === attrValue.name && attrValue.description) {
                            var contentsDoc = dataProvider_1.generateDocumentation(attrValue, doesSupportMarkdown);
                            if (contentsDoc) {
                                hover = { contents: contentsDoc, range: range };
                            }
                            else {
                                hover = null;
                            }
                        }
                    });
                    if (hover) {
                        hover.contents = convertContents(hover.contents);
                        return { value: hover };
                    }
                };
                for (var _i = 0, dataProviders_3 = dataProviders; _i < dataProviders_3.length; _i++) {
                    var provider = dataProviders_3[_i];
                    var state_3 = _loop_3(provider);
                    if (typeof state_3 === "object")
                        return state_3.value;
                }
                return null;
            }
            function getTagNameRange(tokenType, startOffset) {
                var scanner = htmlScanner_1.createScanner(document.getText(), startOffset);
                var token = scanner.scan();
                while (token !== htmlLanguageTypes_1.TokenType.EOS && (scanner.getTokenEnd() < offset || scanner.getTokenEnd() === offset && token !== tokenType)) {
                    token = scanner.scan();
                }
                if (token === tokenType && offset <= scanner.getTokenEnd()) {
                    return { start: document.positionAt(scanner.getTokenOffset()), end: document.positionAt(scanner.getTokenEnd()) };
                }
                return null;
            }
            if (node.endTagStart && offset >= node.endTagStart) {
                var tagRange_1 = getTagNameRange(htmlLanguageTypes_1.TokenType.EndTag, node.endTagStart);
                if (tagRange_1) {
                    return getTagHover(node.tag, tagRange_1, false);
                }
                return null;
            }
            var tagRange = getTagNameRange(htmlLanguageTypes_1.TokenType.StartTag, node.start);
            if (tagRange) {
                return getTagHover(node.tag, tagRange, true);
            }
            var attrRange = getTagNameRange(htmlLanguageTypes_1.TokenType.AttributeName, node.start);
            if (attrRange) {
                var tag = node.tag;
                var attr = document.getText(attrRange);
                return getAttrHover(tag, attr, attrRange);
            }
            function scanAttrAndAttrValue(nodeStart, attrValueStart) {
                var scanner = htmlScanner_1.createScanner(document.getText(), nodeStart);
                var token = scanner.scan();
                var prevAttr = undefined;
                while (token !== htmlLanguageTypes_1.TokenType.EOS && (scanner.getTokenEnd() <= attrValueStart)) {
                    token = scanner.scan();
                    if (token === htmlLanguageTypes_1.TokenType.AttributeName) {
                        prevAttr = scanner.getTokenText();
                    }
                }
                return prevAttr;
            }
            var attrValueRange = getTagNameRange(htmlLanguageTypes_1.TokenType.AttributeValue, node.start);
            if (attrValueRange) {
                var tag = node.tag;
                var attrValue = trimQuotes(document.getText(attrValueRange));
                var matchAttr = scanAttrAndAttrValue(node.start, document.offsetAt(attrValueRange.start));
                if (matchAttr) {
                    return getAttrValueHover(tag, matchAttr, attrValue, attrValueRange);
                }
            }
            return null;
        };
        HTMLHover.prototype.convertContents = function (contents) {
            if (!this.doesSupportMarkdown()) {
                if (typeof contents === 'string') {
                    return contents;
                }
                // MarkupContent
                else if ('kind' in contents) {
                    return {
                        kind: 'plaintext',
                        value: contents.value
                    };
                }
                // MarkedString[]
                else if (Array.isArray(contents)) {
                    contents.map(function (c) {
                        return typeof c === 'string' ? c : c.value;
                    });
                }
                // MarkedString
                else {
                    return contents.value;
                }
            }
            return contents;
        };
        HTMLHover.prototype.doesSupportMarkdown = function () {
            var _a, _b, _c;
            if (!object_1.isDefined(this.supportsMarkdown)) {
                if (!object_1.isDefined(this.lsOptions.clientCapabilities)) {
                    this.supportsMarkdown = true;
                    return this.supportsMarkdown;
                }
                var contentFormat = (_c = (_b = (_a = this.lsOptions.clientCapabilities) === null || _a === void 0 ? void 0 : _a.textDocument) === null || _b === void 0 ? void 0 : _b.hover) === null || _c === void 0 ? void 0 : _c.contentFormat;
                this.supportsMarkdown = Array.isArray(contentFormat) && contentFormat.indexOf(vscode_languageserver_types_1.MarkupKind.Markdown) !== -1;
            }
            return this.supportsMarkdown;
        };
        return HTMLHover;
    }());
    exports.HTMLHover = HTMLHover;
    function trimQuotes(s) {
        if (s.length <= 1) {
            return s.replace(/['"]/, '');
        }
        if (s[0] === "'" || s[0] === "\"") {
            s = s.slice(1);
        }
        if (s[s.length - 1] === "'" || s[s.length - 1] === "\"") {
            s = s.slice(0, -1);
        }
        return s;
    }
});
