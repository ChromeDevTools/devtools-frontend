"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAssignableInPrimitiveArray = exports.isAssignableToTypeWithStringCoercion = exports.isAssignableInAttributeBinding = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var html_node_attr_assignment_types_js_1 = require("../../../analyze/types/html-node/html-node-attr-assignment-types.js");
var range_util_js_1 = require("../../../analyze/util/range-util.js");
var type_util_js_1 = require("../../../analyze/util/type-util.js");
var is_lit_directive_js_1 = require("../directive/is-lit-directive.js");
var is_assignable_binding_under_security_system_js_1 = require("./is-assignable-binding-under-security-system.js");
var is_assignable_to_type_js_1 = require("./is-assignable-to-type.js");
function isAssignableInAttributeBinding(htmlAttr, _a, context) {
    var typeA = _a.typeA, typeB = _a.typeB;
    var assignment = htmlAttr.assignment;
    if (assignment == null)
        return undefined;
    if (assignment.kind === html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.BOOLEAN) {
        if (!(0, is_assignable_to_type_js_1.isAssignableToType)({ typeA: typeA, typeB: typeB }, context)) {
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: "Type '".concat((0, ts_simple_type_1.typeToString)(typeB), "' is not assignable to '").concat((0, ts_simple_type_1.typeToString)(typeA), "'")
            });
            return false;
        }
    }
    else {
        if (assignment.kind !== html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.STRING) {
            // Purely static attributes are never security checked, they're handled
            // in the lit-html internals as trusted by default, because they can
            // not contain untrusted data, they were written by the developer.
            //
            // For everything else, we may need to apply a different type comparison
            // for some security-sensitive built in attributes and properties (like
            // <script src>).
            var securitySystemResult = (0, is_assignable_binding_under_security_system_js_1.isAssignableBindingUnderSecuritySystem)(htmlAttr, { typeA: typeA, typeB: typeB }, context);
            if (securitySystemResult !== undefined) {
                // The security diagnostics take precedence here,
                // and we should not do any more checking.
                return securitySystemResult;
            }
        }
        var primitiveArrayTypeResult = isAssignableInPrimitiveArray(assignment, { typeA: typeA, typeB: typeB }, context);
        if (primitiveArrayTypeResult !== undefined) {
            return primitiveArrayTypeResult;
        }
        if (!(0, is_assignable_to_type_js_1.isAssignableToType)({ typeA: typeA, typeB: typeB }, context, { isAssignable: isAssignableToTypeWithStringCoercion })) {
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: "Type '".concat((0, ts_simple_type_1.typeToString)(typeB), "' is not assignable to '").concat((0, ts_simple_type_1.typeToString)(typeA), "'")
            });
            return false;
        }
    }
    return true;
}
exports.isAssignableInAttributeBinding = isAssignableInAttributeBinding;
/**
 * Assignability check that simulates string coercion
 * This is used to type check attribute bindings
 * @param typeA
 * @param typeB
 * @param options
 */
function isAssignableToTypeWithStringCoercion(typeA, typeB, options) {
    var safeOptions = __assign(__assign({}, options), { isAssignable: undefined });
    switch (typeB.kind) {
        /*case "NULL":
         return _isAssignableToType(typeA, { kind: "STRING_LITERAL", value: "null" }, safeOptions);

         case "UNDEFINED":
         return _isAssignableToType(typeA, { kind: "STRING_LITERAL", value: "undefined" }, safeOptions);
         */
        case "ALIAS":
        case "FUNCTION":
        case "GENERIC_ARGUMENTS":
            // Always return true if this is a lit directive
            if ((0, is_lit_directive_js_1.isLitDirective)(typeB)) {
                return true;
            }
            break;
        case "OBJECT":
        case "CLASS":
        case "INTERFACE":
            // This allows for types like: string | (part: Part) => void
            return (0, ts_simple_type_1.isAssignableToType)(typeA, {
                kind: "STRING_LITERAL",
                value: "[object Object]"
            }, safeOptions);
        case "STRING_LITERAL":
            /*if (typeA.kind === "ARRAY" && typeA.type.kind === "STRING_LITERAL") {
            }*/
            // Take into account that the empty string is is equal to true
            if (typeB.value.length === 0) {
                if ((0, ts_simple_type_1.isAssignableToType)(typeA, { kind: "BOOLEAN_LITERAL", value: true }, safeOptions)) {
                    return true;
                }
            }
            // Test if a potential string literal is a assignable to a number
            // Example: max="123"
            if (!isNaN(typeB.value)) {
                if ((0, ts_simple_type_1.isAssignableToType)(typeA, {
                    kind: "NUMBER_LITERAL",
                    value: Number(typeB.value)
                }, safeOptions)) {
                    return true;
                }
            }
            break;
        case "BOOLEAN":
            // Test if a boolean coerced string is possible.
            // Example: aria-expanded="${this.open}"
            return (0, ts_simple_type_1.isAssignableToType)(typeA, {
                kind: "UNION",
                types: [
                    {
                        kind: "STRING_LITERAL",
                        value: "true"
                    },
                    { kind: "STRING_LITERAL", value: "false" }
                ]
            }, safeOptions);
        case "BOOLEAN_LITERAL":
            /**
             * Test if a boolean literal coerced to string is possible
             * Example: aria-expanded="${this.open}"
             */
            return (0, ts_simple_type_1.isAssignableToType)(typeA, {
                kind: "STRING_LITERAL",
                value: String(typeB.value)
            }, safeOptions);
        case "NUMBER":
            // Test if a number coerced to string is possible
            // Example: value="${this.max}"
            if ((0, ts_simple_type_1.isAssignableToType)(typeA, { kind: "STRING" }, safeOptions)) {
                return true;
            }
            break;
        case "NUMBER_LITERAL":
            // Test if a number literal coerced to string is possible
            // Example: value="${this.max}"
            if ((0, ts_simple_type_1.isAssignableToType)(typeA, {
                kind: "STRING_LITERAL",
                value: String(typeB.value)
            }, safeOptions)) {
                return true;
            }
            break;
    }
    return undefined;
}
exports.isAssignableToTypeWithStringCoercion = isAssignableToTypeWithStringCoercion;
/**
 * Certain attributes like "role" are string literals, but should be type checked
 *   by comparing each item in the white-space-separated array against typeA
 * @param assignment
 * @param typeA
 * @param typeB
 * @param context
 */
function isAssignableInPrimitiveArray(assignment, _a, context) {
    var e_1, _b;
    var typeA = _a.typeA, typeB = _a.typeB;
    // Only check "STRING" and "EXPRESSION" for now
    if (assignment.kind !== html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.STRING && assignment.kind !== html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.EXPRESSION) {
        return undefined;
    }
    // Check if typeA is marked as a "primitive array type"
    if ((0, type_util_js_1.isPrimitiveArrayType)(typeA) && typeB.kind === "STRING_LITERAL") {
        // Split a value like: "button listitem" into ["button", " ", "listitem"]
        var valuesAndWhitespace = typeB.value.split(/(\s+)/g);
        var valuesNotAssignable = [];
        var startOffset = assignment.location.start;
        var offset = 0;
        try {
            for (var valuesAndWhitespace_1 = __values(valuesAndWhitespace), valuesAndWhitespace_1_1 = valuesAndWhitespace_1.next(); !valuesAndWhitespace_1_1.done; valuesAndWhitespace_1_1 = valuesAndWhitespace_1.next()) {
                var value = valuesAndWhitespace_1_1.value;
                // Check all non-whitespace values
                if (value.match(/\s+/) == null && value !== "") {
                    // Make sure that the the value is assignable to the union
                    if (!(0, is_assignable_to_type_js_1.isAssignableToType)({ typeA: typeA, typeB: { kind: "STRING_LITERAL", value: value } }, context, { isAssignable: isAssignableToTypeWithStringCoercion })) {
                        valuesNotAssignable.push(value);
                        // If the assignment kind is "STRING" we can report diagnostics directly on the value in the HTML
                        if (assignment.kind === "STRING") {
                            context.report({
                                location: (0, range_util_js_1.documentRangeToSFRange)(assignment.htmlAttr.document, {
                                    start: startOffset + offset,
                                    end: startOffset + offset + value.length
                                }),
                                message: "The value '".concat(value, "' is not assignable to '").concat((0, ts_simple_type_1.typeToString)(typeA), "'")
                            });
                        }
                    }
                }
                offset += value.length;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (valuesAndWhitespace_1_1 && !valuesAndWhitespace_1_1.done && (_b = valuesAndWhitespace_1.return)) _b.call(valuesAndWhitespace_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // If the assignment kind as "EXPRESSION" report a single diagnostic on the attribute name
        if (assignment.kind === "EXPRESSION" && valuesNotAssignable.length > 0) {
            var multiple = valuesNotAssignable.length > 1;
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(assignment.htmlAttr),
                message: "The value".concat(multiple ? "s" : "", " ").concat(valuesNotAssignable.map(function (v) { return "'".concat(v, "'"); }).join(", "), " ").concat(multiple ? "are" : "is", " not assignable to '").concat((0, ts_simple_type_1.typeToString)(typeA), "'")
            });
        }
        return valuesNotAssignable.length === 0;
    }
    return undefined;
}
exports.isAssignableInPrimitiveArray = isAssignableInPrimitiveArray;
