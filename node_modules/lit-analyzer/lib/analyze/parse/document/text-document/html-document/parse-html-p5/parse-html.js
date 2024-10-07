"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseHtml = exports.isCommentNode = exports.isTextNode = exports.isDocumentFragmentNode = exports.isTagNode = void 0;
var parseFragment = require("parse5").parseFragment;
/**
 * Returns if a p5Node is a tag node.
 * @param node
 */
function isTagNode(node) {
    return !node.nodeName.includes("#");
}
exports.isTagNode = isTagNode;
/**
 * Returns if a p5Node is a document fragment.
 * @param node
 */
function isDocumentFragmentNode(node) {
    return node.nodeName === "#document-fragment";
}
exports.isDocumentFragmentNode = isDocumentFragmentNode;
/**
 * Returns if a p5Node is a text node.
 * @param node
 */
function isTextNode(node) {
    return node.nodeName === "#text";
}
exports.isTextNode = isTextNode;
/**
 * Returns if a p5Node is a comment node.
 * @param node
 */
function isCommentNode(node) {
    return node.nodeName === "#comment";
}
exports.isCommentNode = isCommentNode;
/**
 * Parse a html string into p5Nodes.
 * @param html
 */
function parseHtml(html) {
    return parseFragment(html, { sourceCodeLocationInfo: true, locationInfo: true });
}
exports.parseHtml = parseHtml;
