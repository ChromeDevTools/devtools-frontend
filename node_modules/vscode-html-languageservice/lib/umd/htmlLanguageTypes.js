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
        define(["require", "exports", "vscode-languageserver-types", "vscode-languageserver-textdocument", "vscode-languageserver-types"], factory);
    }
})(function (require, exports) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    var vscode_languageserver_types_1 = require("vscode-languageserver-types");
    var vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
    exports.TextDocument = vscode_languageserver_textdocument_1.TextDocument;
    __export(require("vscode-languageserver-types"));
    var TokenType;
    (function (TokenType) {
        TokenType[TokenType["StartCommentTag"] = 0] = "StartCommentTag";
        TokenType[TokenType["Comment"] = 1] = "Comment";
        TokenType[TokenType["EndCommentTag"] = 2] = "EndCommentTag";
        TokenType[TokenType["StartTagOpen"] = 3] = "StartTagOpen";
        TokenType[TokenType["StartTagClose"] = 4] = "StartTagClose";
        TokenType[TokenType["StartTagSelfClose"] = 5] = "StartTagSelfClose";
        TokenType[TokenType["StartTag"] = 6] = "StartTag";
        TokenType[TokenType["EndTagOpen"] = 7] = "EndTagOpen";
        TokenType[TokenType["EndTagClose"] = 8] = "EndTagClose";
        TokenType[TokenType["EndTag"] = 9] = "EndTag";
        TokenType[TokenType["DelimiterAssign"] = 10] = "DelimiterAssign";
        TokenType[TokenType["AttributeName"] = 11] = "AttributeName";
        TokenType[TokenType["AttributeValue"] = 12] = "AttributeValue";
        TokenType[TokenType["StartDoctypeTag"] = 13] = "StartDoctypeTag";
        TokenType[TokenType["Doctype"] = 14] = "Doctype";
        TokenType[TokenType["EndDoctypeTag"] = 15] = "EndDoctypeTag";
        TokenType[TokenType["Content"] = 16] = "Content";
        TokenType[TokenType["Whitespace"] = 17] = "Whitespace";
        TokenType[TokenType["Unknown"] = 18] = "Unknown";
        TokenType[TokenType["Script"] = 19] = "Script";
        TokenType[TokenType["Styles"] = 20] = "Styles";
        TokenType[TokenType["EOS"] = 21] = "EOS";
    })(TokenType = exports.TokenType || (exports.TokenType = {}));
    var ScannerState;
    (function (ScannerState) {
        ScannerState[ScannerState["WithinContent"] = 0] = "WithinContent";
        ScannerState[ScannerState["AfterOpeningStartTag"] = 1] = "AfterOpeningStartTag";
        ScannerState[ScannerState["AfterOpeningEndTag"] = 2] = "AfterOpeningEndTag";
        ScannerState[ScannerState["WithinDoctype"] = 3] = "WithinDoctype";
        ScannerState[ScannerState["WithinTag"] = 4] = "WithinTag";
        ScannerState[ScannerState["WithinEndTag"] = 5] = "WithinEndTag";
        ScannerState[ScannerState["WithinComment"] = 6] = "WithinComment";
        ScannerState[ScannerState["WithinScriptContent"] = 7] = "WithinScriptContent";
        ScannerState[ScannerState["WithinStyleContent"] = 8] = "WithinStyleContent";
        ScannerState[ScannerState["AfterAttributeName"] = 9] = "AfterAttributeName";
        ScannerState[ScannerState["BeforeAttributeValue"] = 10] = "BeforeAttributeValue";
    })(ScannerState = exports.ScannerState || (exports.ScannerState = {}));
    var ClientCapabilities;
    (function (ClientCapabilities) {
        ClientCapabilities.LATEST = {
            textDocument: {
                completion: {
                    completionItem: {
                        documentationFormat: [vscode_languageserver_types_1.MarkupKind.Markdown, vscode_languageserver_types_1.MarkupKind.PlainText]
                    }
                },
                hover: {
                    contentFormat: [vscode_languageserver_types_1.MarkupKind.Markdown, vscode_languageserver_types_1.MarkupKind.PlainText]
                }
            }
        };
    })(ClientCapabilities = exports.ClientCapabilities || (exports.ClientCapabilities = {}));
    var FileType;
    (function (FileType) {
        /**
         * The file type is unknown.
         */
        FileType[FileType["Unknown"] = 0] = "Unknown";
        /**
         * A regular file.
         */
        FileType[FileType["File"] = 1] = "File";
        /**
         * A directory.
         */
        FileType[FileType["Directory"] = 2] = "Directory";
        /**
         * A symbolic link to a file.
         */
        FileType[FileType["SymbolicLink"] = 64] = "SymbolicLink";
    })(FileType = exports.FileType || (exports.FileType = {}));
});
