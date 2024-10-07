"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLit2Directive = exports.isLit1Directive = exports.isLitDirective = void 0;
var partTypeNames = new Set([
    "Part",
    "NodePart",
    "AttributePart",
    "BooleanAttributePart",
    "PropertyPart",
    "EventPart"
]);
/**
 * Checks whether a type is a lit-html 1.x or Lit 2 directive.
 */
function isLitDirective(type) {
    return isLit1Directive(type) || isLit2Directive(type);
}
exports.isLitDirective = isLitDirective;
/**
 * Checks whether a type is a lit-html 1.x directive.
 */
function isLit1Directive(type) {
    switch (type.kind) {
        case "ALIAS":
            return type.name === "DirectiveFn" || isLit1Directive(type.target);
        case "OBJECT":
            return type.call != null && isLit1Directive(type.call);
        case "FUNCTION": {
            // We expect a directive to be a function with at least one argument that
            // returns void.
            if (type.kind !== "FUNCTION" ||
                type.parameters == null ||
                type.parameters.length === 0 ||
                type.returnType == null ||
                type.returnType.kind !== "VOID") {
                return false;
            }
            // And that one argument must all be lit Part types.
            var firstArg = type.parameters[0].type;
            if (firstArg.kind === "UNION") {
                return firstArg.types.every(function (t) { return partTypeNames.has(t.name); });
            }
            return partTypeNames.has(firstArg.name);
        }
        case "GENERIC_ARGUMENTS":
            // Test for the built in type from lit-html: Directive<NodePart>
            return (type.target.kind === "FUNCTION" && type.target.name === "Directive") || isLit1Directive(type.target);
        default:
            return false;
    }
}
exports.isLit1Directive = isLit1Directive;
/**
 * Checks whether a type is a Lit 2 directive.
 */
function isLit2Directive(type) {
    switch (type.kind) {
        case "INTERFACE": {
            return type.name === "DirectiveResult";
        }
        case "GENERIC_ARGUMENTS": {
            return isLit2Directive(type.target);
        }
        default:
            return false;
    }
}
exports.isLit2Directive = isLit2Directive;
