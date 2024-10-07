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
exports.completionsAtOffset = void 0;
var get_position_context_in_document_js_1 = require("../../../util/get-position-context-in-document.js");
var range_util_js_1 = require("../../../util/range-util.js");
var completions_for_html_attr_values_js_1 = require("./completions-for-html-attr-values.js");
var completions_for_html_attrs_js_1 = require("./completions-for-html-attrs.js");
var completions_for_html_nodes_js_1 = require("./completions-for-html-nodes.js");
function completionsAtOffset(document, offset, context) {
    var positionContext = (0, get_position_context_in_document_js_1.getPositionContextInDocument)(document, offset);
    var beforeWord = positionContext.beforeWord;
    // Get possible intersecting html attribute or attribute area.
    var intersectingAttr = document.htmlAttrNameAtOffset(offset);
    var intersectingAttrAreaNode = document.htmlAttrAreaAtOffset(offset);
    var intersectingAttrAssignment = document.htmlAttrAssignmentAtOffset(offset);
    var intersectingClosestNode = document.htmlNodeClosestToOffset(offset);
    // Get entries from the extensions
    if (intersectingAttr != null) {
        var entries = (0, completions_for_html_attrs_js_1.completionsForHtmlAttrs)(intersectingAttr.htmlNode, positionContext, context);
        // Make sure that every entry overwrites the entire attribute name.
        return entries.map(function (entry) { return (__assign(__assign({}, entry), { range: (0, range_util_js_1.rangeFromHtmlNodeAttr)(intersectingAttr) })); });
    }
    else if (intersectingAttrAssignment != null) {
        return (0, completions_for_html_attr_values_js_1.completionsForHtmlAttrValues)(intersectingAttrAssignment, positionContext, context);
    }
    else if (intersectingAttrAreaNode != null) {
        return (0, completions_for_html_attrs_js_1.completionsForHtmlAttrs)(intersectingAttrAreaNode, positionContext, context);
    }
    else if (beforeWord === "<" || beforeWord === "/") {
        return (0, completions_for_html_nodes_js_1.completionsForHtmlNodes)(document, intersectingClosestNode, positionContext, context);
    }
    return [];
}
exports.completionsAtOffset = completionsAtOffset;
