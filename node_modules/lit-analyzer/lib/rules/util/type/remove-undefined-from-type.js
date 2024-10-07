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
exports.removeUndefinedFromType = void 0;
var ts_simple_type_1 = require("ts-simple-type");
function removeUndefinedFromType(type) {
    switch (type.kind) {
        case "ALIAS":
            return __assign(__assign({}, type), { target: removeUndefinedFromType(type.target) });
        case "UNION":
            return __assign(__assign({}, type), { types: type.types.filter(function (t) { return !(0, ts_simple_type_1.isAssignableToSimpleTypeKind)(t, "UNDEFINED"); }) });
    }
    return type;
}
exports.removeUndefinedFromType = removeUndefinedFromType;
