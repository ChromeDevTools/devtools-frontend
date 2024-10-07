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
Object.defineProperty(exports, "__esModule", { value: true });
exports.relaxType = exports.inferTypeFromAssignment = exports.extractBindingTypes = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var html_node_attr_assignment_types_js_1 = require("../../../analyze/types/html-node/html-node-attr-assignment-types.js");
var html_node_attr_types_js_1 = require("../../../analyze/types/html-node/html-node-attr-types.js");
var get_directive_js_1 = require("../directive/get-directive.js");
var cache = new WeakMap();
function extractBindingTypes(assignment, context) {
    var _a;
    if (cache.has(assignment)) {
        return cache.get(assignment);
    }
    var checker = context.program.getTypeChecker();
    // Relax the type we are looking at an expression in javascript files
    //const inJavascriptFile = request.file.fileName.endsWith(".js");
    //const shouldRelaxTypeB = 1 !== 1 && inJavascriptFile && assignment.kind === HtmlNodeAttrAssignmentKind.EXPRESSION;
    var shouldRelaxTypeB = false; // Disable for now while collecting requirements
    // Infer the type of the RHS
    //const typeBInferred = shouldRelaxTypeB ? ({ kind: "ANY" } as SimpleType) : inferTypeFromAssignment(assignment, checker);
    var typeBInferred = inferTypeFromAssignment(assignment, checker);
    // Convert typeB to SimpleType
    var typeB = (function () {
        var type = (0, ts_simple_type_1.isSimpleType)(typeBInferred) ? typeBInferred : (0, ts_simple_type_1.toSimpleType)(typeBInferred, checker);
        return shouldRelaxTypeB ? relaxType(type) : type;
    })();
    // Find a corresponding target for this attribute
    var htmlAttrTarget = context.htmlStore.getHtmlAttrTarget(assignment.htmlAttr);
    //if (htmlAttrTarget == null) return [];
    var typeA = htmlAttrTarget == null ? { kind: "ANY" } : htmlAttrTarget.getType();
    // Handle directives
    var directive = (0, get_directive_js_1.getDirective)(assignment, context);
    var directiveType = (_a = directive === null || directive === void 0 ? void 0 : directive.actualType) === null || _a === void 0 ? void 0 : _a.call(directive);
    if (directiveType != null) {
        typeB = directiveType;
    }
    // Cache the result
    var result = { typeA: typeA, typeB: typeB };
    cache.set(assignment, result);
    return result;
}
exports.extractBindingTypes = extractBindingTypes;
function inferTypeFromAssignment(assignment, checker) {
    switch (assignment.kind) {
        case html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.STRING:
            return { kind: "STRING_LITERAL", value: assignment.value };
        case html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.BOOLEAN:
            return { kind: "BOOLEAN_LITERAL", value: true };
        case html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.ELEMENT_EXPRESSION:
            return checker.getTypeAtLocation(assignment.expression);
        case html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.EXPRESSION:
            return checker.getTypeAtLocation(assignment.expression);
        case html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.MIXED:
            // Event bindings always looks at the first expression
            // Therefore, return the type of the first expression
            if (assignment.htmlAttr.kind === html_node_attr_types_js_1.HtmlNodeAttrKind.EVENT_LISTENER) {
                var expression = assignment.values.find(function (val) { return typeof val !== "string"; });
                if (expression != null) {
                    return checker.getTypeAtLocation(expression);
                }
            }
            return { kind: "STRING" };
    }
}
exports.inferTypeFromAssignment = inferTypeFromAssignment;
/**
 * Relax the type so that for example "string literal" become "string" and "function" become "any"
 * This is used for javascript files to provide type checking with Typescript type inferring
 * @param type
 */
function relaxType(type) {
    switch (type.kind) {
        case "INTERSECTION":
        case "UNION":
            return __assign(__assign({}, type), { types: type.types.map(function (t) { return relaxType(t); }) });
        case "ENUM":
            return __assign(__assign({}, type), { types: type.types.map(function (t) { return relaxType(t); }) });
        case "ARRAY":
            return __assign(__assign({}, type), { type: relaxType(type.type) });
        case "PROMISE":
            return __assign(__assign({}, type), { type: relaxType(type.type) });
        case "INTERFACE":
        case "OBJECT":
        case "FUNCTION":
        case "CLASS":
            return {
                kind: "ANY"
            };
        case "NUMBER_LITERAL":
            return { kind: "NUMBER" };
        case "STRING_LITERAL":
            return { kind: "STRING" };
        case "BOOLEAN_LITERAL":
            return { kind: "BOOLEAN" };
        case "BIG_INT_LITERAL":
            return { kind: "BIG_INT" };
        case "ENUM_MEMBER":
            return __assign(__assign({}, type), { type: relaxType(type.type) });
        case "ALIAS":
            return __assign(__assign({}, type), { target: relaxType(type.target) });
        default:
            return type;
    }
}
exports.relaxType = relaxType;
