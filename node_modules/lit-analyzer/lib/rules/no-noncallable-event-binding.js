"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_type_1 = require("ts-simple-type");
var html_node_attr_types_js_1 = require("../analyze/types/html-node/html-node-attr-types.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
var extract_binding_types_js_1 = require("./util/type/extract-binding-types.js");
/**
 * This rule validates that only callable types are used within event binding expressions.
 * This rule catches typos like: @click="onClick()"
 */
var rule = {
    id: "no-noncallable-event-binding",
    meta: {
        priority: "high"
    },
    visitHtmlAssignment: function (assignment, context) {
        // Only validate event listener bindings.
        var htmlAttr = assignment.htmlAttr;
        if (htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.EVENT_LISTENER)
            return;
        var typeB = (0, extract_binding_types_js_1.extractBindingTypes)(assignment, context).typeB;
        // Make sure that the expression given to the event listener binding a function or an object with "handleEvent" property.
        if (!isTypeBindableToEventListener(typeB)) {
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: "You are setting up an event listener with a non-callable type '".concat((0, ts_simple_type_1.typeToString)(typeB), "'")
            });
        }
    }
};
exports.default = rule;
/**
 * Returns if this type can be used in a event listener binding
 * @param type
 */
function isTypeBindableToEventListener(type) {
    // Return "true" if the type has a call signature
    if ("call" in type && type.call != null) {
        return true;
    }
    // Callable types can be used in the binding
    if ((0, ts_simple_type_1.isAssignableToSimpleTypeKind)(type, ["FUNCTION", "METHOD", "UNKNOWN"], { matchAny: true })) {
        return true;
    }
    return (0, ts_simple_type_1.validateType)(type, function (simpleType) {
        switch (simpleType.kind) {
            // Object types with attributes for the setup function of the event listener can be used
            case "OBJECT":
            case "INTERFACE": {
                // The "handleEvent" property must be present
                var handleEventFunction = simpleType.members != null ? simpleType.members.find(function (m) { return m.name === "handleEvent"; }) : undefined;
                // The "handleEvent" property must be callable
                if (handleEventFunction != null) {
                    return isTypeBindableToEventListener(handleEventFunction.type);
                }
            }
        }
        return undefined;
    });
}
