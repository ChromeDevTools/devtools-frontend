"use strict";
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
exports.parseDocumentsInSourceFile = void 0;
var html_node_types_js_1 = require("../../types/html-node/html-node-types.js");
var array_util_js_1 = require("../../util/array-util.js");
var range_util_js_1 = require("../../util/range-util.js");
var find_tagged_templates_js_1 = require("../tagged-template/find-tagged-templates.js");
var css_document_js_1 = require("./text-document/css-document/css-document.js");
var html_document_js_1 = require("./text-document/html-document/html-document.js");
var parse_html_document_js_1 = require("./text-document/html-document/parse-html-document.js");
var virtual_css_document_js_1 = require("./virtual-document/virtual-css-document.js");
function parseDocumentsInSourceFile(sourceFile, options, position) {
    // Parse html tags in the relevant source file
    var templateTags = __spreadArray(__spreadArray([], __read(options.cssTags), false), __read(options.htmlTags), false);
    var taggedTemplates = (0, find_tagged_templates_js_1.findTaggedTemplates)(sourceFile, templateTags, position);
    var result = undefined;
    if (taggedTemplates == null) {
        return undefined;
    }
    else if (Array.isArray(taggedTemplates)) {
        result = taggedTemplates.map(function (t) { return taggedTemplateToDocument(t, options); });
    }
    else {
        result = taggedTemplateToDocument(taggedTemplates, options);
    }
    if (result == null)
        return undefined;
    if (Array.isArray(result)) {
        return (0, array_util_js_1.arrayFlat)(result.map(function (document) {
            var res = unpackHtmlDocument(document, position);
            return __spreadArray([document], __read((res == null ? [] : Array.isArray(res) ? res : [res])), false);
        }));
    }
    else {
        var nestedDocuments = unpackHtmlDocument(result, position);
        if (position != null && nestedDocuments != null) {
            return nestedDocuments;
        }
    }
    return result;
}
exports.parseDocumentsInSourceFile = parseDocumentsInSourceFile;
function taggedTemplateToDocument(taggedTemplate, _a) {
    var cssTags = _a.cssTags;
    var tag = taggedTemplate.tag.getText();
    if (cssTags.includes(tag)) {
        return new css_document_js_1.CssDocument(new virtual_css_document_js_1.VirtualAstCssDocument(taggedTemplate));
    }
    else {
        return (0, parse_html_document_js_1.parseHtmlDocument)(taggedTemplate);
    }
}
function unpackHtmlDocument(textDocument, position) {
    var e_1, _a;
    var documents = [];
    if (textDocument instanceof html_document_js_1.HtmlDocument) {
        try {
            for (var _b = __values(textDocument.rootNodes), _c = _b.next(); !_c.done; _c = _b.next()) {
                var rootNode = _c.value;
                if (rootNode.kind === html_node_types_js_1.HtmlNodeKind.STYLE && rootNode.location.endTag != null) {
                    if (position == null) {
                        var nestedDocument = styleHtmlNodeToCssDocument(textDocument, rootNode);
                        if (nestedDocument != null) {
                            documents.push(nestedDocument);
                        }
                    }
                    else if ((0, range_util_js_1.intersects)(textDocument.virtualDocument.sfPositionToDocumentOffset(position), {
                        start: rootNode.location.startTag.end,
                        end: rootNode.location.endTag.start
                    })) {
                        return styleHtmlNodeToCssDocument(textDocument, rootNode);
                    }
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
    if (position != null)
        return undefined;
    return documents;
}
function styleHtmlNodeToCssDocument(htmlDocument, styleNode) {
    if (styleNode.location.endTag == null)
        return undefined;
    var cssDocumentParts = htmlDocument.virtualDocument.getPartsAtDocumentRange((0, range_util_js_1.makeDocumentRange)({
        start: styleNode.location.startTag.start,
        end: styleNode.location.endTag.start
    }));
    var cssVirtualDocument = new virtual_css_document_js_1.VirtualAstCssDocument(cssDocumentParts, (0, range_util_js_1.documentRangeToSFRange)(htmlDocument, styleNode.location.startTag), htmlDocument.virtualDocument.fileName);
    return new css_document_js_1.CssDocument(cssVirtualDocument);
}
