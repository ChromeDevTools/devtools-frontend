"use strict";
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
exports.joinArray = exports.arrayDefined = exports.arrayFlat = void 0;
/**
 * Flattens an array.
 * Use this function to keep support for node 10
 * @param items
 */
function arrayFlat(items) {
    var e_1, _a;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ("flat" in items) {
        return items.flat();
    }
    var flattenArray = [];
    try {
        for (var items_1 = __values(items), items_1_1 = items_1.next(); !items_1_1.done; items_1_1 = items_1.next()) {
            var item = items_1_1.value;
            if (Array.isArray(item)) {
                flattenArray.push.apply(flattenArray, __spreadArray([], __read(item), false));
            }
            else {
                flattenArray.push(item);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (items_1_1 && !items_1_1.done && (_a = items_1.return)) _a.call(items_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return flattenArray;
}
exports.arrayFlat = arrayFlat;
/**
 * Filters an array returning only defined items
 * @param array
 */
function arrayDefined(array) {
    return array.filter(function (item) { return item != null; });
}
exports.arrayDefined = arrayDefined;
/**
 * Joins an array with a custom final splitter
 * @param items
 * @param splitter
 * @param finalSplitter
 */
function joinArray(items, splitter, finalSplitter) {
    if (splitter === void 0) { splitter = ", "; }
    if (finalSplitter === void 0) { finalSplitter = "or"; }
    return items.join(splitter).replace(/, ([^,]*)$/, " ".concat(finalSplitter, " $1"));
}
exports.joinArray = joinArray;
