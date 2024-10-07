"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirective = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var html_node_attr_assignment_types_js_1 = require("../../../analyze/types/html-node/html-node-attr-assignment-types.js");
var general_util_js_1 = require("../../../analyze/util/general-util.js");
var remove_undefined_from_type_js_1 = require("../type/remove-undefined-from-type.js");
var is_lit_directive_js_1 = require("./is-lit-directive.js");
function getDirective(assignment, context) {
    var ts = context.ts, program = context.program;
    var checker = program.getTypeChecker();
    if (assignment.kind !== html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.EXPRESSION)
        return;
    // Type check lit-html directives
    if (ts.isCallExpression(assignment.expression)) {
        var functionName = assignment.expression.expression.getText();
        var args_1 = Array.from(assignment.expression.arguments);
        switch (functionName) {
            case "ifDefined": {
                // Example: html`<img src="${ifDefined(imageUrl)}">`;
                // Take the argument to ifDefined and remove undefined from the type union (if possible).
                // This new type becomes the actual type of the expression
                var actualType = (0, general_util_js_1.lazy)(function () {
                    if (args_1.length >= 1) {
                        var returnType = (0, ts_simple_type_1.toSimpleType)(checker.getTypeAtLocation(args_1[0]), checker);
                        return (0, remove_undefined_from_type_js_1.removeUndefinedFromType)(returnType);
                    }
                    return undefined;
                });
                return {
                    kind: "ifDefined",
                    actualType: actualType,
                    args: args_1
                };
            }
            case "live": {
                // Example: html`<input .value=${live(x)}>`
                // The actual type will be the type of the first argument to live
                var actualType = (0, general_util_js_1.lazy)(function () {
                    if (args_1.length >= 1) {
                        return (0, ts_simple_type_1.toSimpleType)(checker.getTypeAtLocation(args_1[0]), checker);
                    }
                    return undefined;
                });
                return {
                    kind: "live",
                    actualType: actualType,
                    args: args_1
                };
            }
            case "guard": {
                // Example: html`<img src="${guard([imageUrl], () => Math.random() > 0.5 ? imageUrl : "nothing.png")}>`;
                // The return type of the function becomes the actual type of the expression
                var actualType = (0, general_util_js_1.lazy)(function () {
                    if (args_1.length >= 2) {
                        var returnFunctionType = (0, ts_simple_type_1.toSimpleType)(checker.getTypeAtLocation(args_1[1]), checker);
                        if ("call" in returnFunctionType && returnFunctionType.call != null) {
                            returnFunctionType = returnFunctionType.call;
                        }
                        if (returnFunctionType.kind === "FUNCTION") {
                            return returnFunctionType.returnType;
                        }
                    }
                    return undefined;
                });
                return {
                    kind: "guard",
                    actualType: actualType,
                    args: args_1
                };
            }
            case "classMap":
            case "styleMap":
                return {
                    kind: functionName,
                    actualType: function () { return ({ kind: "STRING" }); },
                    args: args_1
                };
            case "unsafeHTML":
            case "unsafeSVG":
            case "cache":
            case "repeat":
            case "templateContent":
            case "asyncReplace":
            case "asyncAppend":
                return {
                    kind: functionName,
                    args: args_1
                };
            default:
                // Grab the type of the expression and get a SimpleType
                if (assignment.kind === html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.EXPRESSION) {
                    var typeB_1 = (0, ts_simple_type_1.toSimpleType)(checker.getTypeAtLocation(assignment.expression), checker);
                    if ((0, is_lit_directive_js_1.isLitDirective)(typeB_1)) {
                        // Factories can mark which parameters might be assigned to the property with the generic type in DirectiveFn<T>
                        // Here we get the actual type of the directive if the it is a generic directive with type. Example: DirectiveFn<string>
                        // Read more: https://github.com/Polymer/lit-html/pull/1151
                        var actualType = typeB_1.kind === "GENERIC_ARGUMENTS" && typeB_1.target.name === "DirectiveFn" && typeB_1.typeArguments.length > 0 // && typeB.typeArguments[0].kind !== "UNKNOWN"
                            ? function () { return typeB_1.typeArguments[0]; }
                            : undefined;
                        // Now we have an unknown (user defined) directive.
                        return {
                            kind: {
                                name: functionName
                            },
                            args: args_1,
                            actualType: actualType
                        };
                    }
                }
        }
    }
    return;
}
exports.getDirective = getDirective;
