"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_type_1 = require("ts-simple-type");
var array_util_js_1 = require("../analyze/util/array-util.js");
var general_util_js_1 = require("../analyze/util/general-util.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
var rule = {
    id: "no-incompatible-property-type",
    meta: {
        priority: "low"
    },
    visitComponentMember: function (member, context) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (member.kind !== "property" || ((_a = member.modifiers) === null || _a === void 0 ? void 0 : _a.has("static")) || member.meta == null)
            return;
        if (((_d = ((_c = (_b = member.meta.node) === null || _b === void 0 ? void 0 : _b.type) !== null && _c !== void 0 ? _c : member.node)) === null || _d === void 0 ? void 0 : _d.getSourceFile()) !== context.file)
            return;
        // Grab the type and fallback to "any"
        var type = ((_e = member.type) === null || _e === void 0 ? void 0 : _e.call(member)) || { kind: "ANY" };
        return validateLitPropertyConfig(((_f = member.meta.node) === null || _f === void 0 ? void 0 : _f.type) || ((_h = (_g = member.meta.node) === null || _g === void 0 ? void 0 : _g.decorator) === null || _h === void 0 ? void 0 : _h.expression) || member.node, member.meta, {
            propName: member.propName,
            simplePropType: (0, ts_simple_type_1.isSimpleType)(type) ? type : (0, ts_simple_type_1.toSimpleType)(type, context.program.getTypeChecker())
        }, context);
    }
};
/**
 * Returns a string, that can be used in a lit @property decorator for the type key, representing the simple type kind.
 * @param simpleTypeKind
 */
function toLitPropertyTypeString(simpleTypeKind) {
    switch (simpleTypeKind) {
        case "STRING":
            return "String";
        case "NUMBER":
            return "Number";
        case "BOOLEAN":
            return "Boolean";
        case "ARRAY":
            return "Array";
        case "OBJECT":
            return "Object";
        default:
            return "";
    }
}
/**
 * Prepares functions that can lazily test assignability against simple type kinds.
 * This tester function uses a cache for performance.
 * @param simpleType
 */
function prepareSimpleAssignabilityTester(simpleType) {
    // Test assignments to all possible type kinds
    var _isAssignableToCache = new Map();
    function isAssignableTo(simpleTypeKind) {
        if (_isAssignableToCache.has(simpleTypeKind)) {
            return _isAssignableToCache.get(simpleTypeKind);
        }
        var result = (function () {
            switch (simpleTypeKind) {
                case "STRING":
                    return (0, ts_simple_type_1.isAssignableToSimpleTypeKind)(simpleType, ["STRING", "STRING_LITERAL"]);
                case "NUMBER":
                    return (0, ts_simple_type_1.isAssignableToSimpleTypeKind)(simpleType, ["NUMBER", "NUMBER_LITERAL"]);
                case "BOOLEAN":
                    return (0, ts_simple_type_1.isAssignableToSimpleTypeKind)(simpleType, ["BOOLEAN", "BOOLEAN_LITERAL"]);
                case "ARRAY":
                    return (0, ts_simple_type_1.isAssignableToSimpleTypeKind)(simpleType, ["ARRAY", "TUPLE"]);
                case "OBJECT":
                    return (0, ts_simple_type_1.isAssignableToSimpleTypeKind)(simpleType, ["OBJECT", "INTERFACE"]);
                case "ANY":
                    return (0, ts_simple_type_1.isAssignableToSimpleTypeKind)(simpleType, "ANY");
                default:
                    return false;
            }
        })();
        _isAssignableToCache.set(simpleTypeKind, result);
        return result;
    }
    // Collect type kinds that can be used in as "type" in the @property decorator
    var acceptedTypeKinds = (0, general_util_js_1.lazy)(function () {
        return ["STRING", "NUMBER", "BOOLEAN", "ARRAY", "OBJECT", "ANY"]
            .filter(function (kind) { return kind !== "ANY"; })
            .filter(function (kind) { return isAssignableTo(kind); });
    });
    return { acceptedTypeKinds: acceptedTypeKinds, isAssignableTo: isAssignableTo };
}
/**
 * Runs through a lit configuration and validates against the "simplePropType".
 * Emits diagnostics through the context.
 * @param node
 * @param litConfig
 * @param propName
 * @param simplePropType
 * @param context
 */
function validateLitPropertyConfig(node, litConfig, _a, context) {
    var propName = _a.propName, simplePropType = _a.simplePropType;
    // Check if "type" is one of the built in default type converter hint
    if (typeof litConfig.type === "string" && !litConfig.hasConverter) {
        context.report({
            location: (0, range_util_js_1.rangeFromNode)(node),
            message: "'".concat(litConfig.type, "' is not a valid type for the default converter."),
            fixMessage: litConfig.attribute !== false ? "Have you considered '{attribute: false}' instead?" : "Have you considered removing 'type'?"
        });
    }
    // Don't continue if we don't know the property type (eg if we are in a js file)
    // Don't continue if this property has a custom converter (because then we don't know how the value will be converted)
    if (simplePropType == null || litConfig.hasConverter || typeof litConfig.type === "string") {
        return;
    }
    var _b = prepareSimpleAssignabilityTester(simplePropType), acceptedTypeKinds = _b.acceptedTypeKinds, isAssignableTo = _b.isAssignableTo;
    // Test the @property type against the actual type if a type has been provided
    if (litConfig.type != null) {
        // Report error if the @property type is not assignable to the actual type
        if (!isAssignableTo(litConfig.type.kind) && !isAssignableTo("ANY")) {
            // Suggest what to use instead
            if (acceptedTypeKinds().length >= 1) {
                var potentialKindText = (0, array_util_js_1.joinArray)(acceptedTypeKinds().map(function (kind) { return "'".concat(toLitPropertyTypeString(kind), "'"); }), ", ", "or");
                context.report({
                    location: (0, range_util_js_1.rangeFromNode)(node),
                    message: "@property type should be ".concat(potentialKindText, " instead of '").concat(toLitPropertyTypeString(litConfig.type.kind), "'")
                });
            }
            // If no suggesting can be provided, report that they are not assignable
            // The OBJECT @property type is an escape from this error
            else if (litConfig.type.kind !== "OBJECT") {
                context.report({
                    location: (0, range_util_js_1.rangeFromNode)(node),
                    message: "@property type '".concat((0, ts_simple_type_1.typeToString)(litConfig.type), "' is not assignable to the actual type '").concat((0, ts_simple_type_1.typeToString)(simplePropType), "'")
                });
            }
        }
    }
    // If no type has been specified, suggest what to use as the @property type
    else if (litConfig.attribute !== false) {
        // Don't do anything if there are multiple possibilities for a type.
        if (isAssignableTo("ANY")) {
            return;
        }
        // Don't report errors because String conversion is default
        else if (isAssignableTo("STRING")) {
            return;
        }
        // Suggest what to use instead if there are multiple accepted @property types for this property
        else if (acceptedTypeKinds().length > 0) {
            // Suggest types to use and include "{attribute: false}" if the @property type is ARRAY or OBJECT
            var acceptedTypeText = (0, array_util_js_1.joinArray)(__spreadArray(__spreadArray([], __read(acceptedTypeKinds().map(function (kind) { return "'{type: ".concat(toLitPropertyTypeString(kind), "}'"); })), false), __read((isAssignableTo("ARRAY") || isAssignableTo("OBJECT") ? ["'{attribute: false}'"] : [])), false), ", ", "or");
            context.report({
                location: (0, range_util_js_1.rangeFromNode)(node),
                message: "Missing ".concat(acceptedTypeText, " on @property decorator for '").concat(propName, "'")
            });
        }
        else {
            context.report({
                location: (0, range_util_js_1.rangeFromNode)(node),
                message: "The built in converter doesn't handle the property type '".concat((0, ts_simple_type_1.typeToString)(simplePropType), "'."),
                fixMessage: "Please add '{attribute: false}' on @property decorator for '".concat(propName, "'")
            });
        }
    }
    // message: `You need to add '{attribute: false}' to @property decorator for '${propName}' because '${toTypeString(simplePropType)}' type is not a primitive`
}
exports.default = rule;
