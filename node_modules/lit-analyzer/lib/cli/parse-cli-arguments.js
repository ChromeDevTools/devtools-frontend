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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCliArguments = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
var util_js_1 = require("./util.js");
/**
 * Parses CLI arguments.
 * @param args
 */
function parseCliArguments(args) {
    var result = { _: [] };
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        // Parses: "--key", "-k", "--key=value", "--key value"
        if (arg.startsWith("-")) {
            // Parses: "--key=value"
            if (arg.includes("=")) {
                var _a = __read(arg.split("="), 2), key = _a[0], value = _a[1];
                assignValue(result, key, value);
            }
            // Parses: "--key value", "--key", "-k
            else {
                var key = transformKey(arg);
                // Parses: "--key value"
                if (i < args.length - 1) {
                    var value = args[i + 1];
                    if (!value.startsWith("-")) {
                        assignValue(result, key, value);
                        i++;
                        continue;
                    }
                }
                // Parses: "--key", "-k"
                assignValue(result, key, true);
            }
        }
        // Parses: "arg1", "arg2", ...
        else {
            result._.push(arg);
        }
    }
    return result;
}
exports.parseCliArguments = parseCliArguments;
/**
 * Transform a string to a primitive type.
 * @param value
 */
function transformValue(value) {
    if (typeof value === "boolean") {
        return value;
    }
    else if (!isNaN(Number(value))) {
        return Number(value);
    }
    else if (value === "true" || value === "false") {
        return value === "true";
    }
    return value;
}
/**
 * Transform a key by removing the first "-" characters.
 * @param key
 */
function transformKey(key) {
    return (0, util_js_1.dashToCamelCase)(key.replace(/^-*/g, ""));
}
/**
 * Assigns a value on a specific key and transforms the value at the same time.
 * @param obj
 * @param key
 * @param value
 */
function assignValue(obj, key, value) {
    // The key could be "nested.key"
    var keys = transformKey(key).split(".");
    keys.forEach(function (k, i) {
        // Assign the final value
        if (i >= keys.length - 1) {
            obj[k] = transformValue(value);
        }
        // Create nested objects
        else {
            if (!(k in obj)) {
                obj[k] = {};
            }
            obj = obj[k];
        }
    });
}
