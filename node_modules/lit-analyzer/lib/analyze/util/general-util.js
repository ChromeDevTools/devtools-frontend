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
exports.lazy = exports.parseLitAttrName = void 0;
/**
 * Parses an attribute name returning a name and eg. a modifier.
 * Examples:
 *  - ?disabled="..."
 *  - .myProp="..."
 *  - @click="..."
 * @param attributeName
 */
function parseLitAttrName(attributeName) {
    var _a = __read(attributeName.match(/^([.?@])?(.*)/) || ["", "", ""], 3), modifier = _a[1], name = _a[2];
    return { name: name, modifier: modifier };
}
exports.parseLitAttrName = parseLitAttrName;
function lazy(func) {
    var called = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    var value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (called)
            return value;
        called = true;
        return (value = func.apply(void 0, __spreadArray([], __read(args), false)));
    });
}
exports.lazy = lazy;
