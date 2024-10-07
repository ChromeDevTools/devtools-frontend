"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_type_1 = require("ts-simple-type");
var html_node_attr_assignment_types_js_1 = require("../analyze/types/html-node/html-node-attr-assignment-types.js");
var html_node_attr_types_js_1 = require("../analyze/types/html-node/html-node-attr-types.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
var is_lit_directive_js_1 = require("./util/directive/is-lit-directive.js");
var extract_binding_types_js_1 = require("./util/type/extract-binding-types.js");
var is_assignable_binding_under_security_system_js_1 = require("./util/type/is-assignable-binding-under-security-system.js");
/**
 * This rule validates that complex types are not used within an expression in an attribute binding.
 */
var rule = {
    id: "no-complex-attribute-binding",
    meta: {
        priority: "medium"
    },
    visitHtmlAssignment: function (assignment, context) {
        // Only validate attribute bindings, because you are able to assign complex types in property bindings.
        var htmlAttr = assignment.htmlAttr;
        if (htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE)
            return;
        // Ignore element expressions
        if (assignment.kind === html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.ELEMENT_EXPRESSION)
            return;
        var _a = (0, extract_binding_types_js_1.extractBindingTypes)(assignment, context), typeA = _a.typeA, typeB = _a.typeB;
        // Don't validate directives in this rule, because they are assignable even though they are complex types (functions).
        if ((0, is_lit_directive_js_1.isLitDirective)(typeB))
            return;
        // Only primitive types should be allowed as "typeB"
        if (!(0, ts_simple_type_1.isAssignableToPrimitiveType)(typeB)) {
            if ((0, is_assignable_binding_under_security_system_js_1.isAssignableBindingUnderSecuritySystem)(htmlAttr, { typeA: typeA, typeB: typeB }, context) !== undefined) {
                // This is binding via a security sanitization system, let it do
                // this check. Apparently complex values are OK to assign here.
                return;
            }
            var message = "You are binding a non-primitive type '".concat((0, ts_simple_type_1.typeToString)(typeB), "'. This could result in binding the string \"[object Object]\".");
            var newModifier_1 = ".";
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: message,
                fixMessage: "Use '".concat(newModifier_1, "' binding instead?"),
                fix: function () { return ({
                    message: "Use '".concat(newModifier_1, "' modifier instead"),
                    actions: [
                        {
                            kind: "changeAttributeModifier",
                            htmlAttr: htmlAttr,
                            newModifier: newModifier_1
                        }
                    ]
                }); }
            });
        }
        // Only primitive types should be allowed as "typeA"
        else if (!(0, ts_simple_type_1.isAssignableToPrimitiveType)(typeA)) {
            var message = "You are assigning the primitive '".concat((0, ts_simple_type_1.typeToString)(typeB), "' to a non-primitive type '").concat((0, ts_simple_type_1.typeToString)(typeA), "'.");
            var newModifier_2 = ".";
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: message,
                fixMessage: "Use '".concat(newModifier_2, "' binding instead?"),
                fix: function () { return ({
                    message: "Use '".concat(newModifier_2, "' modifier instead"),
                    actions: [
                        {
                            kind: "changeAttributeModifier",
                            htmlAttr: htmlAttr,
                            newModifier: newModifier_2
                        }
                    ]
                }); }
            });
        }
    }
};
exports.default = rule;
