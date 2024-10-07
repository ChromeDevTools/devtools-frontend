"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completionsForHtmlNodes = void 0;
var html_tag_js_1 = require("../../../parse/parse-html-data/html-tag.js");
var general_util_js_1 = require("../../../util/general-util.js");
var is_valid_name_js_1 = require("../../../util/is-valid-name.js");
var range_util_js_1 = require("../../../util/range-util.js");
function completionsForHtmlNodes(document, intersectingClosestNode, _a, _b) {
    var offset = _a.offset, leftWord = _a.leftWord, rightWord = _a.rightWord, beforeWord = _a.beforeWord, afterWord = _a.afterWord;
    var htmlStore = _b.htmlStore;
    var isClosingTag = beforeWord === "/";
    // This case handles closing the closest intersecting node.
    // For this case we only suggest closing the closest intersecting node: so 1 single suggestion.
    // Example:   <my-element></|
    // This doesn't handle:   <my-element></my-el|ement> , because in that case we would like to show all options to the user.
    if (isClosingTag && leftWord === "" && rightWord === "" && afterWord !== ">" && intersectingClosestNode != null) {
        var insert = "</".concat(intersectingClosestNode.tagName, ">");
        return [
            {
                name: insert,
                insert: insert,
                kind: "enumElement",
                importance: "high",
                range: (0, range_util_js_1.documentRangeToSFRange)(document, {
                    start: offset - leftWord.length - 2,
                    end: offset + rightWord.length
                }),
                documentation: (0, general_util_js_1.lazy)(function () {
                    var htmlTag = htmlStore.getHtmlTag(intersectingClosestNode);
                    return htmlTag != null ? (0, html_tag_js_1.documentationForHtmlTag)(htmlTag) : undefined;
                })
            }
        ];
    }
    var htmlTags = Array.from(htmlStore.getGlobalTags());
    return htmlTags.map(function (htmlTag) {
        var isBuiltIn = !(0, is_valid_name_js_1.isCustomElementTagName)(htmlTag.tagName);
        var hasDeclaration = htmlTag.declaration != null;
        var insert = isClosingTag ? "</" + htmlTag.tagName + ">" : htmlTag.tagName;
        return {
            name: insert,
            insert: insert,
            kind: isBuiltIn ? "enumElement" : hasDeclaration ? "member" : "label",
            importance: isBuiltIn ? "low" : hasDeclaration ? "high" : "medium",
            range: (0, range_util_js_1.documentRangeToSFRange)(document, {
                start: offset - leftWord.length - (isClosingTag ? 2 : 0),
                end: offset + rightWord.length + (isClosingTag && afterWord === ">" ? 1 : 0)
            }),
            documentation: (0, general_util_js_1.lazy)(function () { return (0, html_tag_js_1.documentationForHtmlTag)(htmlTag); })
        };
    });
}
exports.completionsForHtmlNodes = completionsForHtmlNodes;
