"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var is_valid_name_js_1 = require("../analyze/util/is-valid-name.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
/**
 * This rule validates that all tags are closed properly.
 */
var rule = {
    id: "no-unclosed-tag",
    meta: {
        priority: "low"
    },
    visitHtmlNode: function (htmlNode, context) {
        if (!htmlNode.selfClosed && htmlNode.location.endTag == null) {
            // Report specifically that a custom element cannot be self closing
            //   if the user is trying to close a custom element.
            var isCustomElement = (0, is_valid_name_js_1.isCustomElementTagName)(htmlNode.tagName);
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNode)(htmlNode),
                message: "This tag isn't closed.".concat(isCustomElement ? " Custom elements cannot be self closing." : "")
            });
        }
        return;
    }
};
exports.default = rule;
