"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replacePrefix = exports.caseInsensitiveEquals = void 0;
/**
 * Compares two strings case insensitive.
 * @param strA
 * @param strB
 */
function caseInsensitiveEquals(strA, strB) {
    return strA.localeCompare(strB, undefined, { sensitivity: "accent" }) === 0;
}
exports.caseInsensitiveEquals = caseInsensitiveEquals;
function replacePrefix(str, prefix) {
    return str.replace(new RegExp("^" + escapeRegExp(prefix)), "");
}
exports.replacePrefix = replacePrefix;
function escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
