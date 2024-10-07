"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var is_valid_name_js_1 = require("../analyze/util/is-valid-name.js");
var iterable_util_js_1 = require("../analyze/util/iterable-util.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
var rule = {
    id: "no-invalid-tag-name",
    meta: {
        priority: "low"
    },
    visitComponentDefinition: function (definition, context) {
        // Check if the tag name is invalid
        if (!(0, is_valid_name_js_1.isValidCustomElementName)(definition.tagName) && definition.tagName !== "") {
            var node = (0, iterable_util_js_1.iterableFirst)(definition.tagNameNodes) || (0, iterable_util_js_1.iterableFirst)(definition.identifierNodes);
            // Only report diagnostic if the tag is not built in,
            //  because this function among other things tests for missing "-" in custom element names
            var tag = context.htmlStore.getHtmlTag(definition.tagName);
            if (node != null && tag != null && !tag.builtIn) {
                context.report({
                    location: (0, range_util_js_1.rangeFromNode)(node),
                    message: "The tag name '".concat(definition.tagName, "' is not a valid custom element name. Remember that a hyphen (-) is required.")
                });
            }
        }
    }
};
exports.default = rule;
