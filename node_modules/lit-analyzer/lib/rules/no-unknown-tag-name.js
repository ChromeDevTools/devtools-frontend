"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var html_node_types_js_1 = require("../analyze/types/html-node/html-node-types.js");
var find_best_match_js_1 = require("../analyze/util/find-best-match.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
/**
 * This rule checks that all tag names used in a template are defined.
 */
var rule = {
    id: "no-unknown-tag-name",
    meta: {
        priority: "low"
    },
    visitHtmlNode: function (htmlNode, context) {
        var htmlStore = context.htmlStore, config = context.config;
        // Don't validate style and svg yet
        if (htmlNode.kind !== html_node_types_js_1.HtmlNodeKind.NODE)
            return;
        // Get the html tag from the html store
        var htmlTag = htmlStore.getHtmlTag(htmlNode);
        // Add diagnostics if the tag couldn't be found (not defined anywhere)
        if (htmlTag == null) {
            // Find a suggested name in the set of defined tag names. Maybe this tag name is a typo?
            var suggestedName_1 = (0, find_best_match_js_1.findBestStringMatch)(htmlNode.tagName, Array.from(htmlStore.getGlobalTags()).map(function (tag) { return tag.tagName; }));
            // Build a suggestion text
            var suggestion = "Check that you've imported the element, and that it's declared on the HTMLElementTagNameMap.";
            if (!config.dontSuggestConfigChanges) {
                suggestion += " If it can't be imported, consider adding it to the 'globalTags' plugin configuration or disabling the 'no-unknown-tag' rule.";
            }
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNode)(htmlNode),
                message: "Unknown tag <".concat(htmlNode.tagName, ">."),
                fixMessage: suggestedName_1 == null ? undefined : "Did you mean <".concat(suggestedName_1, ">?"),
                suggestion: suggestion,
                fix: suggestedName_1 == null
                    ? undefined
                    : function () { return ({
                        message: "Change tag name to '".concat(suggestedName_1, "'"),
                        actions: [
                            {
                                kind: "changeTagName",
                                htmlNode: htmlNode,
                                newName: suggestedName_1
                            }
                        ]
                    }); }
            });
        }
        return;
    }
};
exports.default = rule;
