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
        define(["require", "exports", "vscode-languageserver-types"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var vscode_languageserver_types_1 = require("vscode-languageserver-types");
    function findOnTypeRenameRanges(document, position, htmlDocument) {
        var offset = document.offsetAt(position);
        var node = htmlDocument.findNodeAt(offset);
        if (!node.tag) {
            return null;
        }
        if (!node.endTagStart) {
            return null;
        }
        if (
        // Within open tag, compute close tag
        (node.start + '<'.length <= offset && offset <= node.start + '<'.length + node.tag.length) ||
            // Within closing tag, compute open tag
            node.endTagStart + '</'.length <= offset && offset <= node.endTagStart + '</'.length + node.tag.length) {
            return [
                vscode_languageserver_types_1.Range.create(document.positionAt(node.start + '<'.length), document.positionAt(node.start + '<'.length + node.tag.length)),
                vscode_languageserver_types_1.Range.create(document.positionAt(node.endTagStart + '</'.length), document.positionAt(node.endTagStart + '</'.length + node.tag.length))
            ];
        }
        return null;
    }
    exports.findOnTypeRenameRanges = findOnTypeRenameRanges;
});
