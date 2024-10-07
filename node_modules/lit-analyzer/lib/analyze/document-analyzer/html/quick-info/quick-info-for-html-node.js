"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickInfoForHtmlNode = void 0;
var html_tag_js_1 = require("../../../parse/parse-html-data/html-tag.js");
var range_util_js_1 = require("../../../util/range-util.js");
function quickInfoForHtmlNode(htmlNode, _a) {
    var htmlStore = _a.htmlStore;
    var htmlTag = htmlStore.getHtmlTag(htmlNode);
    if (htmlTag == null)
        return undefined;
    return {
        range: (0, range_util_js_1.rangeFromHtmlNode)(htmlNode),
        primaryInfo: "<".concat(htmlNode.tagName, ">"),
        secondaryInfo: (0, html_tag_js_1.documentationForHtmlTag)(htmlTag, { markdown: true })
    };
}
exports.quickInfoForHtmlNode = quickInfoForHtmlNode;
