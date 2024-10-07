"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var html_node_attr_assignment_types_js_1 = require("../analyze/types/html-node/html-node-attr-assignment-types.js");
var html_node_attr_types_js_1 = require("../analyze/types/html-node/html-node-attr-types.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
/**
 * This rule validates that non-attribute bindings are always used with an expression.
 */
var rule = {
    id: "no-expressionless-property-binding",
    meta: {
        priority: "high"
    },
    visitHtmlAssignment: function (assignment, context) {
        var htmlAttr = assignment.htmlAttr;
        // Only make this check non-expression type assignments.
        switch (assignment.kind) {
            case html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.STRING:
            case html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.BOOLEAN:
                switch (htmlAttr.kind) {
                    case html_node_attr_types_js_1.HtmlNodeAttrKind.EVENT_LISTENER:
                        context.report({
                            location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                            message: "You are using an event listener binding without an expression"
                        });
                        break;
                    case html_node_attr_types_js_1.HtmlNodeAttrKind.BOOLEAN_ATTRIBUTE:
                        context.report({
                            location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                            message: "You are using a boolean attribute binding without an expression"
                        });
                        break;
                    case html_node_attr_types_js_1.HtmlNodeAttrKind.PROPERTY:
                        context.report({
                            location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                            message: "You are using a property binding without an expression"
                        });
                        break;
                }
        }
    }
};
exports.default = rule;
