"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var constants_js_1 = require("../analyze/constants.js");
var html_node_attr_assignment_types_js_1 = require("../analyze/types/html-node/html-node-attr-assignment-types.js");
var extract_binding_types_js_1 = require("./util/type/extract-binding-types.js");
var is_assignable_in_attribute_binding_js_1 = require("./util/type/is-assignable-in-attribute-binding.js");
var is_assignable_in_boolean_binding_js_1 = require("./util/type/is-assignable-in-boolean-binding.js");
var is_assignable_in_property_binding_js_1 = require("./util/type/is-assignable-in-property-binding.js");
var is_assignable_in_element_binding_js_1 = require("./util/type/is-assignable-in-element-binding.js");
/**
 * This rule validate if the types of a binding are assignable.
 */
var rule = {
    id: "no-incompatible-type-binding",
    meta: {
        priority: "low"
    },
    visitHtmlAssignment: function (assignment, context) {
        var htmlAttr = assignment.htmlAttr;
        if (assignment.kind === html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.ELEMENT_EXPRESSION) {
            // For element bindings we only care about the expression type
            var typeB_1 = (0, extract_binding_types_js_1.extractBindingTypes)(assignment, context).typeB;
            (0, is_assignable_in_element_binding_js_1.isAssignableInElementBinding)(htmlAttr, typeB_1, context);
        }
        if (context.htmlStore.getHtmlAttrTarget(htmlAttr) == null) {
            return;
        }
        var _a = (0, extract_binding_types_js_1.extractBindingTypes)(assignment, context), typeA = _a.typeA, typeB = _a.typeB;
        // Validate types based on the binding in which they appear
        switch (htmlAttr.modifier) {
            case constants_js_1.LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER:
                (0, is_assignable_in_boolean_binding_js_1.isAssignableInBooleanBinding)(htmlAttr, { typeA: typeA, typeB: typeB }, context);
                break;
            case constants_js_1.LIT_HTML_PROP_ATTRIBUTE_MODIFIER:
                (0, is_assignable_in_property_binding_js_1.isAssignableInPropertyBinding)(htmlAttr, { typeA: typeA, typeB: typeB }, context);
                break;
            case constants_js_1.LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER:
                break;
            default: {
                (0, is_assignable_in_attribute_binding_js_1.isAssignableInAttributeBinding)(htmlAttr, { typeA: typeA, typeB: typeB }, context);
                break;
            }
        }
    }
};
exports.default = rule;
