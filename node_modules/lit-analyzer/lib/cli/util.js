"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.camelToDashCase = exports.dashToCamelCase = void 0;
/**
 * Converts from snake case to camel case
 * @param str
 */
function dashToCamelCase(str) {
    return str.replace(/(-\w)/g, function (m) { return m[1].toUpperCase(); });
}
exports.dashToCamelCase = dashToCamelCase;
/**
 * Converts from camel case to snake case
 * @param str
 */
function camelToDashCase(str) {
    return str.replace(/[A-Z]/g, function (m) { return "-".concat(m.toLowerCase()); });
}
exports.camelToDashCase = camelToDashCase;
