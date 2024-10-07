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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseHtmlNodeAttr = exports.parseHtmlNodeAttrs = void 0;
var constants_js_1 = require("../../../../../constants.js");
var html_node_attr_types_js_1 = require("../../../../../types/html-node/html-node-attr-types.js");
var general_util_js_1 = require("../../../../../util/general-util.js");
var parse_html_types_js_1 = require("../parse-html-p5/parse-html-types.js");
var parse_html_attr_assignment_js_1 = require("./parse-html-attr-assignment.js");
/**
 * Creates multiple html attributes based on multiple p5Attributes.
 * @param p5Node
 * @param context
 */
function parseHtmlNodeAttrs(p5Node, context) {
    return p5Node.attrs
        .map(function (htmlAttr) {
        return parseHtmlNodeAttr(p5Node, htmlAttr, __assign(__assign({}, context), { htmlNode: context.htmlNode }));
    })
        .filter(function (attr) { return attr != null; });
}
exports.parseHtmlNodeAttrs = parseHtmlNodeAttrs;
/**
 * Creates a html attr based on a p5Attr.
 * @param p5Node
 * @param p5Attr
 * @param context
 */
function parseHtmlNodeAttr(p5Node, p5Attr, context) {
    var htmlNode = context.htmlNode;
    var _a = (0, general_util_js_1.parseLitAttrName)(p5Attr.name), name = _a.name, modifier = _a.modifier;
    var location = makeHtmlAttrLocation(p5Node, p5Attr, context);
    if (location == null) {
        return undefined;
    }
    var htmlAttrBase = {
        name: name.toLowerCase(),
        document: context.document,
        modifier: modifier,
        htmlNode: htmlNode,
        location: location
    };
    var htmlAttr = parseHtmlAttrBase(htmlAttrBase);
    htmlAttr.assignment = (0, parse_html_attr_assignment_js_1.parseHtmlAttrAssignment)(p5Node, p5Attr, htmlAttr, context);
    return htmlAttr;
}
exports.parseHtmlNodeAttr = parseHtmlNodeAttr;
/**
 * Returns source code location based on a p5Node.
 * @param p5Node
 * @param p5Attr
 * @param context
 */
function makeHtmlAttrLocation(p5Node, p5Attr, context) {
    var _a = (0, general_util_js_1.parseLitAttrName)(p5Attr.name), name = _a.name, modifier = _a.modifier;
    var sourceLocation = (0, parse_html_types_js_1.getSourceLocation)(p5Node);
    if (sourceLocation == null) {
        return undefined;
    }
    // Explicitly call "toLowerCase()" because of inconsistencies in parse5.
    // Parse5 lowercases source code location attr keys but doesnt lowercase the attr name when it comes to svg.
    // It would be correct not to lowercase the attr names because svg is case sensitive
    var sourceCodeLocationName = "".concat(p5Attr.prefix || "").concat((p5Attr.prefix && ":") || "").concat(p5Attr.name).toLowerCase();
    var htmlAttrLocation = (sourceLocation.startTag.attrs || {})[sourceCodeLocationName];
    var start = htmlAttrLocation.startOffset;
    var end = htmlAttrLocation.endOffset;
    return {
        start: start,
        end: end,
        name: {
            start: start + (modifier ? modifier.length : 0),
            end: start + (modifier ? modifier.length : 0) + name.length
        }
    };
}
function parseHtmlAttrBase(htmlAttrBase) {
    var modifier = htmlAttrBase.modifier;
    switch (modifier) {
        case constants_js_1.LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER:
            return __assign(__assign({ kind: html_node_attr_types_js_1.HtmlNodeAttrKind.EVENT_LISTENER }, htmlAttrBase), { modifier: modifier });
        case constants_js_1.LIT_HTML_PROP_ATTRIBUTE_MODIFIER:
            return __assign(__assign({ kind: html_node_attr_types_js_1.HtmlNodeAttrKind.PROPERTY }, htmlAttrBase), { modifier: modifier });
        case constants_js_1.LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER:
            return __assign(__assign({ kind: html_node_attr_types_js_1.HtmlNodeAttrKind.BOOLEAN_ATTRIBUTE }, htmlAttrBase), { modifier: modifier });
        default:
            return __assign(__assign({ kind: html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE }, htmlAttrBase), { modifier: undefined });
    }
}
