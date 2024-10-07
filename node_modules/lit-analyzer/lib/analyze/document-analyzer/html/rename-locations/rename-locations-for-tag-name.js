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
exports.renameLocationsForTagName = void 0;
var html_document_js_1 = require("../../../parse/document/text-document/html-document/html-document.js");
var ast_util_js_1 = require("../../../util/ast-util.js");
var iterable_util_js_1 = require("../../../util/iterable-util.js");
var range_util_js_1 = require("../../../util/range-util.js");
function renameLocationsForTagName(tagName, context) {
    var e_1, _a, e_2, _b;
    var locations = [];
    try {
        for (var _c = __values(context.program.getSourceFiles()), _d = _c.next(); !_d.done; _d = _c.next()) {
            var sourceFile = _d.value;
            var documents = context.documentStore.getDocumentsInFile(sourceFile, context.config);
            var _loop_1 = function (document) {
                if (document instanceof html_document_js_1.HtmlDocument) {
                    document.rootNodes.forEach(function (rootNode) {
                        return visitHtmlNode(rootNode, {
                            document: document,
                            tagName: tagName,
                            emitRenameLocation: function (location) {
                                locations.push(location);
                            }
                        });
                    });
                }
            };
            try {
                for (var documents_1 = (e_2 = void 0, __values(documents)), documents_1_1 = documents_1.next(); !documents_1_1.done; documents_1_1 = documents_1.next()) {
                    var document = documents_1_1.value;
                    _loop_1(document);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (documents_1_1 && !documents_1_1.done && (_b = documents_1.return)) _b.call(documents_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var definition = context.definitionStore.getDefinitionForTagName(tagName);
    if (definition != null) {
        // TODO
        var definitionNode = (0, iterable_util_js_1.iterableFirst)(definition.tagNameNodes);
        if (definitionNode != null) {
            var fileName = definitionNode.getSourceFile().fileName;
            if (context.ts.isCallLikeExpression(definitionNode)) {
                var stringLiteralNode = (0, ast_util_js_1.findChild)(definitionNode, function (child) { return context.ts.isStringLiteralLike(child) && child.text === tagName; });
                if (stringLiteralNode != null) {
                    locations.push({
                        fileName: fileName,
                        range: (0, range_util_js_1.makeSourceFileRange)({ start: stringLiteralNode.getStart() + 1, end: stringLiteralNode.getEnd() - 1 })
                    });
                }
            }
            else if (definitionNode.kind === context.ts.SyntaxKind.JSDocTag) {
                var jsDocTagNode = definitionNode;
                if (jsDocTagNode.comment != null) {
                    var start = jsDocTagNode.tagName.getEnd() + 1;
                    locations.push({
                        fileName: fileName,
                        range: (0, range_util_js_1.makeSourceFileRange)({ start: start, end: start + jsDocTagNode.comment.length })
                    });
                }
            }
            else if (context.ts.isInterfaceDeclaration(definitionNode)) {
                var stringLiteralNode = (0, ast_util_js_1.findChild)(definitionNode, function (child) { return context.ts.isStringLiteralLike(child) && child.text === tagName; });
                if (stringLiteralNode != null) {
                    locations.push({
                        fileName: fileName,
                        range: (0, range_util_js_1.makeSourceFileRange)({ start: stringLiteralNode.getStart() + 1, end: stringLiteralNode.getEnd() - 1 })
                    });
                }
            }
        }
    }
    return locations;
}
exports.renameLocationsForTagName = renameLocationsForTagName;
function visitHtmlNode(node, context) {
    if (node.tagName === context.tagName) {
        context.emitRenameLocation({
            range: (0, range_util_js_1.documentRangeToSFRange)(context.document, node.location.name),
            fileName: context.document.virtualDocument.fileName
        });
        if (node.location.endTag != null) {
            var _a = node.location.endTag, start = _a.start, end = _a.end;
            context.emitRenameLocation({
                range: (0, range_util_js_1.documentRangeToSFRange)(context.document, { start: start + 2, end: end - 1 }),
                fileName: context.document.virtualDocument.fileName
            });
        }
    }
    node.children.forEach(function (childNode) { return visitHtmlNode(childNode, context); });
}
