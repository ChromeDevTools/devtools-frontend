"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseHtmlDocument = exports.parseHtmlDocuments = void 0;
var virtual_html_document_js_1 = require("../../virtual-document/virtual-html-document.js");
var html_document_js_1 = require("./html-document.js");
var parse_html_node_js_1 = require("./parse-html-node/parse-html-node.js");
var parse_html_js_1 = require("./parse-html-p5/parse-html.js");
function parseHtmlDocuments(nodes) {
    return nodes.map(parseHtmlDocument);
}
exports.parseHtmlDocuments = parseHtmlDocuments;
function parseHtmlDocument(node) {
    var virtualDocument = new virtual_html_document_js_1.VirtualAstHtmlDocument(node);
    var html = virtualDocument.text;
    var htmlAst = (0, parse_html_js_1.parseHtml)(html);
    var document = new html_document_js_1.HtmlDocument(virtualDocument, []);
    var context = {
        html: html,
        document: document,
        getPartsAtOffsetRange: function (range) {
            return virtualDocument.getPartsAtDocumentRange(range);
        }
    };
    document.rootNodes = (0, parse_html_node_js_1.parseHtmlNodes)(htmlAst.childNodes, undefined, context);
    return document;
}
exports.parseHtmlDocument = parseHtmlDocument;
