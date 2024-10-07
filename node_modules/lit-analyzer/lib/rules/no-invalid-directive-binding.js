"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_type_1 = require("ts-simple-type");
var html_node_attr_assignment_types_js_1 = require("../analyze/types/html-node/html-node-attr-assignment-types.js");
var html_node_attr_types_js_1 = require("../analyze/types/html-node/html-node-attr-types.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
var get_directive_js_1 = require("./util/directive/get-directive.js");
/**
 * This rule validates that directives are used properly.
 */
var rule = {
    id: "no-invalid-directive-binding",
    meta: {
        priority: "high"
    },
    visitHtmlAssignment: function (assignment, context) {
        var _a;
        var htmlAttr = assignment.htmlAttr;
        // Only validate expression because this is where directives can be used.
        if (assignment.kind !== html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.EXPRESSION)
            return;
        // Check if the expression is a directive
        var directive = (0, get_directive_js_1.getDirective)(assignment, context);
        if (directive == null)
            return;
        // Validate built-in directive kind
        if (typeof directive.kind === "string") {
            switch (directive.kind) {
                case "ifDefined":
                    // Example: html`<img src="${ifDefined(imageUrl)}">`;
                    // Take the argument to ifDefined and remove undefined from the type union (if possible).
                    // Then test if this result is now assignable to the attribute type.
                    if (directive.args.length === 1) {
                        // "ifDefined" only has an effect on "attribute" bindings
                        if (htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE) {
                            context.report({
                                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                                message: "The 'ifDefined' directive has no effect here."
                            });
                        }
                    }
                    break;
                case "live":
                    switch (htmlAttr.kind) {
                        case html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE: {
                            // Make sure that only strings are passed in when using the live directive in attribute bindings
                            var typeB = (_a = directive.actualType) === null || _a === void 0 ? void 0 : _a.call(directive);
                            if (typeB != null && !(0, ts_simple_type_1.isAssignableToType)({ kind: "STRING" }, typeB)) {
                                context.report({
                                    location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                                    message: "If you use the 'live' directive in an attribute binding, make sure that only strings are passed in, or the binding will update every render"
                                });
                            }
                            break;
                        }
                        case html_node_attr_types_js_1.HtmlNodeAttrKind.EVENT_LISTENER:
                            context.report({
                                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                                message: "The 'live' directive can only be used in attribute and property bindings"
                            });
                    }
                    break;
                case "classMap":
                    // Report error if "classMap" is not being used on the "class" attribute.
                    if (htmlAttr.name !== "class" || htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE) {
                        context.report({
                            location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                            message: "The 'classMap' directive can only be used in an attribute binding for the 'class' attribute"
                        });
                    }
                    break;
                case "styleMap":
                    // Report error if "styleMap" is not being used on the "style" attribute.
                    if (htmlAttr.name !== "style" || htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE) {
                        context.report({
                            location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                            message: "The 'styleMap' directive can only be used in an attribute binding for the 'style' attribute"
                        });
                    }
                    break;
                case "unsafeHTML":
                case "unsafeSVG":
                case "cache":
                case "repeat":
                case "templateContent":
                case "asyncReplace":
                case "asyncAppend":
                    // These directives can only be used within a text binding.
                    // This function validating assignments is per definition used NOT in a text binding
                    context.report({
                        location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                        message: "The '".concat(directive.kind, "' directive can only be used within a text binding.")
                    });
            }
        }
        else {
            // Now we have an unknown (user defined) directive.
            // This needs no further type checking, so break the chain
            // Don't break if the "actualType" was found. Then we can do further type checking.
            if (directive.actualType == null) {
                context.break();
            }
        }
    }
};
exports.default = rule;
