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
exports.isPrimitiveArrayType = exports.makePrimitiveArrayType = void 0;
var PRIMITIVE_STRING_ARRAY_TYPE_BRAND = Symbol("PRIMITIVE_STRING_ARRAY_TYPE");
/**
 * Brands a union as a primitive array type
 * This type is used for the "role" attribute that is a whitespace separated list
 * @param union
 */
function makePrimitiveArrayType(union) {
    var extendedUnion = __assign({}, union);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extendedUnion[PRIMITIVE_STRING_ARRAY_TYPE_BRAND] = true;
    return extendedUnion;
}
exports.makePrimitiveArrayType = makePrimitiveArrayType;
/**
 * Returns if a simple type is branded as a primitive array type
 * @param simpleType
 */
function isPrimitiveArrayType(simpleType) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return simpleType.kind === "UNION" && simpleType[PRIMITIVE_STRING_ARRAY_TYPE_BRAND] === true;
}
exports.isPrimitiveArrayType = isPrimitiveArrayType;
