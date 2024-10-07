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
        define(["require", "exports", "../parser/htmlScanner", "vscode-languageserver-types", "../utils/strings", "vscode-uri", "../htmlLanguageTypes"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var htmlScanner_1 = require("../parser/htmlScanner");
    var vscode_languageserver_types_1 = require("vscode-languageserver-types");
    var strings = require("../utils/strings");
    var vscode_uri_1 = require("vscode-uri");
    var htmlLanguageTypes_1 = require("../htmlLanguageTypes");
    function normalizeRef(url) {
        var first = url[0];
        var last = url[url.length - 1];
        if (first === last && (first === '\'' || first === '\"')) {
            url = url.substr(1, url.length - 2);
        }
        return url;
    }
    function validateRef(url, languageId) {
        if (!url.length) {
            return false;
        }
        if (languageId === 'handlebars' && /{{.*}}/.test(url)) {
            return false;
        }
        return /\b(w[\w\d+.-]*:\/\/)?[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/?))/.test(url);
    }
    function getWorkspaceUrl(documentUri, tokenContent, documentContext, base) {
        if (/^\s*javascript\:/i.test(tokenContent) || /[\n\r]/.test(tokenContent)) {
            return undefined;
        }
        tokenContent = tokenContent.replace(/^\s*/g, '');
        if (/^https?:\/\//i.test(tokenContent) || /^file:\/\//i.test(tokenContent)) {
            // Absolute link that needs no treatment
            return tokenContent;
        }
        if (/^\#/i.test(tokenContent)) {
            return documentUri + tokenContent;
        }
        if (/^\/\//i.test(tokenContent)) {
            // Absolute link (that does not name the protocol)
            var pickedScheme = strings.startsWith(documentUri, 'https://') ? 'https' : 'http';
            return pickedScheme + ':' + tokenContent.replace(/^\s*/g, '');
        }
        if (documentContext) {
            return documentContext.resolveReference(tokenContent, base || documentUri);
        }
        return tokenContent;
    }
    function createLink(document, documentContext, attributeValue, startOffset, endOffset, base) {
        var tokenContent = normalizeRef(attributeValue);
        if (!validateRef(tokenContent, document.languageId)) {
            return undefined;
        }
        if (tokenContent.length < attributeValue.length) {
            startOffset++;
            endOffset--;
        }
        var workspaceUrl = getWorkspaceUrl(document.uri, tokenContent, documentContext, base);
        if (!workspaceUrl || !isValidURI(workspaceUrl)) {
            return undefined;
        }
        return {
            range: vscode_languageserver_types_1.Range.create(document.positionAt(startOffset), document.positionAt(endOffset)),
            target: workspaceUrl
        };
    }
    function isValidURI(uri) {
        try {
            vscode_uri_1.URI.parse(uri);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    function findDocumentLinks(document, documentContext) {
        var newLinks = [];
        var scanner = htmlScanner_1.createScanner(document.getText(), 0);
        var token = scanner.scan();
        var lastAttributeName = undefined;
        var afterBase = false;
        var base = void 0;
        var idLocations = {};
        while (token !== htmlLanguageTypes_1.TokenType.EOS) {
            switch (token) {
                case htmlLanguageTypes_1.TokenType.StartTag:
                    if (!base) {
                        var tagName = scanner.getTokenText().toLowerCase();
                        afterBase = tagName === 'base';
                    }
                    break;
                case htmlLanguageTypes_1.TokenType.AttributeName:
                    lastAttributeName = scanner.getTokenText().toLowerCase();
                    break;
                case htmlLanguageTypes_1.TokenType.AttributeValue:
                    if (lastAttributeName === 'src' || lastAttributeName === 'href') {
                        var attributeValue = scanner.getTokenText();
                        if (!afterBase) { // don't highlight the base link itself
                            var link = createLink(document, documentContext, attributeValue, scanner.getTokenOffset(), scanner.getTokenEnd(), base);
                            if (link) {
                                newLinks.push(link);
                            }
                        }
                        if (afterBase && typeof base === 'undefined') {
                            base = normalizeRef(attributeValue);
                            if (base && documentContext) {
                                base = documentContext.resolveReference(base, document.uri);
                            }
                        }
                        afterBase = false;
                        lastAttributeName = undefined;
                    }
                    else if (lastAttributeName === 'id') {
                        var id = normalizeRef(scanner.getTokenText());
                        idLocations[id] = scanner.getTokenOffset();
                    }
                    break;
            }
            token = scanner.scan();
        }
        // change local links with ids to actual positions
        for (var _i = 0, newLinks_1 = newLinks; _i < newLinks_1.length; _i++) {
            var link = newLinks_1[_i];
            var localWithHash = document.uri + '#';
            if (link.target && strings.startsWith(link.target, localWithHash)) {
                var target = link.target.substr(localWithHash.length);
                var offset = idLocations[target];
                if (offset !== undefined) {
                    var pos = document.positionAt(offset);
                    link.target = "" + localWithHash + (pos.line + 1) + "," + (pos.character + 1);
                }
            }
        }
        return newLinks;
    }
    exports.findDocumentLinks = findDocumentLinks;
});
