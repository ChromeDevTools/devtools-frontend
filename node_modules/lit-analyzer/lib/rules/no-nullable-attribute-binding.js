"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_type_1 = require("ts-simple-type");
var html_node_attr_assignment_types_js_1 = require("../analyze/types/html-node/html-node-attr-assignment-types.js");
var html_node_attr_types_js_1 = require("../analyze/types/html-node/html-node-attr-types.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
var extract_binding_types_js_1 = require("./util/type/extract-binding-types.js");
/**
 * This rule validates that "null" and "undefined" types are not bound in an attribute binding.
 */
var rule = {
    id: "no-nullable-attribute-binding",
    meta: {
        priority: "high"
    },
    visitHtmlAssignment: function (assignment, context) {
        // Only validate "expression" kind bindings.
        if (assignment.kind !== html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.EXPRESSION)
            return;
        // Only validate "attribute" bindings because these will coerce null|undefined to a string.
        var htmlAttr = assignment.htmlAttr;
        if (htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE)
            return;
        var typeB = (0, extract_binding_types_js_1.extractBindingTypes)(assignment, context).typeB;
        var isAssignableToNull = (0, ts_simple_type_1.isAssignableToSimpleTypeKind)(typeB, "NULL");
        // Test if removing "undefined" or "null" from typeB would work and suggest using "ifDefined".
        if (isAssignableToNull || (0, ts_simple_type_1.isAssignableToSimpleTypeKind)(typeB, "UNDEFINED")) {
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: "This attribute binds the type '".concat((0, ts_simple_type_1.typeToString)(typeB), "' which can end up binding the string '").concat(isAssignableToNull ? "null" : "undefined", "'."),
                fixMessage: "Use the 'ifDefined' directive?",
                fix: function () { return ({
                    message: "Use the 'ifDefined' directive.",
                    actions: [{ kind: "changeAssignment", assignment: assignment, newValue: "ifDefined(".concat(assignment.expression.getText(), ")") }]
                }); }
            });
        }
    }
};
exports.default = rule;
