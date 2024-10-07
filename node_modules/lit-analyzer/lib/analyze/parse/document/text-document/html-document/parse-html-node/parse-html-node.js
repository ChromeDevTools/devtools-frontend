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
exports.parseHtmlNode = exports.parseHtmlNodes = void 0;
var constants_js_1 = require("../../../../../constants.js");
var html_node_types_js_1 = require("../../../../../types/html-node/html-node-types.js");
var parse_html_js_1 = require("../parse-html-p5/parse-html.js");
var parse_html_types_js_1 = require("../parse-html-p5/parse-html-types.js");
var parse_html_attribute_js_1 = require("./parse-html-attribute.js");
/**
 * Parses multiple p5Nodes into multiple html nodes.
 * @param p5Nodes
 * @param parent
 * @param context
 */
function parseHtmlNodes(p5Nodes, parent, context) {
    var e_1, _a;
    var htmlNodes = [];
    var ignoreNextNode = false;
    try {
        for (var p5Nodes_1 = __values(p5Nodes), p5Nodes_1_1 = p5Nodes_1.next(); !p5Nodes_1_1.done; p5Nodes_1_1 = p5Nodes_1.next()) {
            var p5Node = p5Nodes_1_1.value;
            // Check ts-ignore comments and indicate that we wan't to ignore the next node
            if ((0, parse_html_js_1.isCommentNode)(p5Node)) {
                if (p5Node.data != null && p5Node.data.includes(constants_js_1.TS_IGNORE_FLAG)) {
                    ignoreNextNode = true;
                }
            }
            if ((0, parse_html_js_1.isTagNode)(p5Node)) {
                if (!ignoreNextNode) {
                    var htmlNode = parseHtmlNode(p5Node, parent, context);
                    if (htmlNode != null) {
                        htmlNodes.push(htmlNode);
                    }
                }
                else {
                    ignoreNextNode = false;
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (p5Nodes_1_1 && !p5Nodes_1_1.done && (_a = p5Nodes_1.return)) _a.call(p5Nodes_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return htmlNodes;
}
exports.parseHtmlNodes = parseHtmlNodes;
/**
 * Parses a single p5Node into a html node.
 * @param p5Node
 * @param parent
 * @param context
 */
function parseHtmlNode(p5Node, parent, context) {
    // `sourceCodeLocation` will be undefined if the element was implicitly created by the parser.
    if ((0, parse_html_types_js_1.getSourceLocation)(p5Node) == null)
        return undefined;
    var htmlNodeBase = {
        tagName: p5Node.tagName.toLowerCase(),
        selfClosed: isSelfClosed(p5Node, context),
        attributes: [],
        location: makeHtmlNodeLocation(p5Node, context),
        children: [],
        document: context.document,
        parent: parent
    };
    var htmlNode = parseHtmlNodeBase(htmlNodeBase);
    // Don't parse children of <style> and <svg> as of now
    if (htmlNode.kind === html_node_types_js_1.HtmlNodeKind.NODE) {
        htmlNode.children = parseHtmlNodes(p5Node.childNodes || [], htmlNode, context);
    }
    htmlNode.attributes = (0, parse_html_attribute_js_1.parseHtmlNodeAttrs)(p5Node, __assign(__assign({}, context), { htmlNode: htmlNode }));
    return htmlNode;
}
exports.parseHtmlNode = parseHtmlNode;
/**
 * Returns if this node is self-closed.
 * @param p5Node
 * @param context
 */
function isSelfClosed(p5Node, context) {
    var isEmpty = p5Node.childNodes == null || p5Node.childNodes.length === 0;
    var isSelfClosed = (0, parse_html_types_js_1.getSourceLocation)(p5Node).startTag.endOffset === (0, parse_html_types_js_1.getSourceLocation)(p5Node).endOffset;
    return isEmpty && isSelfClosed;
}
/**
 * Creates source code location from a p5Node.
 * @param p5Node
 * @param context
 */
function makeHtmlNodeLocation(p5Node, context) {
    var loc = (0, parse_html_types_js_1.getSourceLocation)(p5Node);
    return {
        start: loc.startOffset,
        end: loc.endOffset,
        name: {
            start: loc.startTag.startOffset + 1,
            end: loc.startTag.startOffset + 1 + p5Node.tagName.length
        },
        startTag: {
            start: loc.startTag.startOffset,
            end: loc.startTag.endOffset
        },
        endTag: loc.endTag == null
            ? undefined
            : {
                start: loc.endTag.startOffset,
                end: loc.endTag.endOffset
            }
    };
}
function parseHtmlNodeBase(htmlNodeBase) {
    if (htmlNodeBase.tagName === "style") {
        return __assign(__assign({ kind: html_node_types_js_1.HtmlNodeKind.STYLE }, htmlNodeBase), { children: [] });
    }
    else if (htmlNodeBase.tagName === "svg") {
        // Ignore children of "svg" for now
        return __assign(__assign({ kind: html_node_types_js_1.HtmlNodeKind.SVG }, htmlNodeBase), { children: [] });
    }
    return __assign({ kind: html_node_types_js_1.HtmlNodeKind.NODE }, htmlNodeBase);
    /*if (component != null) {
     return {
     ...htmlNodeBase,
     kind: HtmlNodeKind.COMPONENT,
     component
     };
     }

     if (isBuiltInTag(htmlNodeBase.tagName)) {
     // For now: opt out of svg and style children tags
     // TODO: Handle svg and style tags
     const isBlacklisted = ["svg", "style"].includes(htmlNodeBase.tagName);

     return {
     ...htmlNodeBase,
     kind: HtmlNodeKind.BUILT_IN,
     children: isBlacklisted ? [] : htmlNodeBase.children
     };
     }*/
    /*return {
     kind: HtmlNodeKind.UNKNOWN,
     ...htmlNodeBase
     };*/
}
