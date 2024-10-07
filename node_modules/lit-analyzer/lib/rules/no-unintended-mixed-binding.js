"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var html_node_attr_assignment_types_js_1 = require("../analyze/types/html-node/html-node-attr-assignment-types.js");
var html_node_attr_types_js_1 = require("../analyze/types/html-node/html-node-attr-types.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
var CONTROL_CHARACTERS = ["'", '"', "}", "/"];
/**
 * This rule validates that bindings are not followed by certain characters that indicate typos.
 *
 * Examples:
 *   <input value=${val}' />
 *   <input value='${val}'' />
 *   <input value=${val}} />
 */
var rule = {
    id: "no-unintended-mixed-binding",
    meta: {
        priority: "high"
    },
    visitHtmlAssignment: function (assignment, context) {
        // Check only mixed bindings
        if (assignment.kind !== html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.MIXED) {
            return;
        }
        // Only check mixed bindings with 2 values
        if (assignment.values.length !== 2) {
            return;
        }
        // Event listener binding ignores mixed bindings.
        // This kind of binding only uses the first expression present in the mixed binding.
        if (assignment.htmlAttr.kind === html_node_attr_types_js_1.HtmlNodeAttrKind.EVENT_LISTENER) {
            return;
        }
        // Ensure the last value is a string literal
        var secondAssignment = assignment.values[1];
        if (typeof secondAssignment !== "string") {
            return;
        }
        // Report error if the string literal is one of the control characters
        if (CONTROL_CHARACTERS.includes(secondAssignment)) {
            var quoteChar_1 = secondAssignment === "'" ? '"' : "'";
            var message = (function () {
                switch (secondAssignment) {
                    case "/":
                        return "This binding is directly followed by a '/' which is probably unintended.";
                    default:
                        return "This binding is directly followed by an unmatched ".concat(quoteChar_1).concat(secondAssignment).concat(quoteChar_1, " which is probably unintended.");
                }
            })();
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(assignment.htmlAttr),
                message: message
            });
        }
        return;
    }
};
exports.default = rule;
