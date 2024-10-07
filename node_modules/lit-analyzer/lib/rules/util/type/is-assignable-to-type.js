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
exports.isAssignableToType = void 0;
var ts_simple_type_1 = require("ts-simple-type");
function isAssignableToType(_a, context, options) {
    var typeA = _a.typeA, typeB = _a.typeB;
    var inJsFile = context.file.fileName.endsWith(".js");
    var expandedOptions = __assign(__assign(__assign({}, (inJsFile ? { strict: false } : {})), { options: context.ts }), (options || {}));
    return (0, ts_simple_type_1.isAssignableToType)(typeA, typeB, context.program, expandedOptions);
}
exports.isAssignableToType = isAssignableToType;
