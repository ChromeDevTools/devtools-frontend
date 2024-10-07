"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
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
exports.DefaultLitAnalyzerLogger = exports.LitAnalyzerLoggerLevel = void 0;
var LitAnalyzerLoggerLevel;
(function (LitAnalyzerLoggerLevel) {
    LitAnalyzerLoggerLevel[LitAnalyzerLoggerLevel["OFF"] = 0] = "OFF";
    LitAnalyzerLoggerLevel[LitAnalyzerLoggerLevel["ERROR"] = 1] = "ERROR";
    LitAnalyzerLoggerLevel[LitAnalyzerLoggerLevel["WARN"] = 2] = "WARN";
    LitAnalyzerLoggerLevel[LitAnalyzerLoggerLevel["DEBUG"] = 3] = "DEBUG";
    LitAnalyzerLoggerLevel[LitAnalyzerLoggerLevel["VERBOSE"] = 4] = "VERBOSE";
})(LitAnalyzerLoggerLevel || (exports.LitAnalyzerLoggerLevel = LitAnalyzerLoggerLevel = {}));
var DefaultLitAnalyzerLogger = /** @class */ (function () {
    function DefaultLitAnalyzerLogger() {
        this.level = LitAnalyzerLoggerLevel.OFF;
    }
    /**
     * Logs if this.level >= DEBUG
     * @param args
     */
    DefaultLitAnalyzerLogger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.log.apply(this, __spreadArray([LitAnalyzerLoggerLevel.DEBUG], __read(args), false));
    };
    /**
     * Logs if this.level >= ERROR
     * @param args
     */
    DefaultLitAnalyzerLogger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.log.apply(this, __spreadArray([LitAnalyzerLoggerLevel.ERROR], __read(args), false));
    };
    /**
     * Logs if level >= WARN
     * @param args
     */
    DefaultLitAnalyzerLogger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.log.apply(this, __spreadArray([LitAnalyzerLoggerLevel.WARN], __read(args), false));
    };
    /**
     * Logs if level >= VERBOSE
     * @param args
     */
    DefaultLitAnalyzerLogger.prototype.verbose = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.log.apply(this, __spreadArray([LitAnalyzerLoggerLevel.VERBOSE], __read(args), false));
    };
    DefaultLitAnalyzerLogger.prototype.log = function (level) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        // Only log for the set level
        if (level > this.level) {
            return;
        }
        var prefix = "[".concat(this.severityPrefix(level), "]");
        switch (level) {
            case LitAnalyzerLoggerLevel.VERBOSE:
                // eslint-disable-next-line no-console
                console.log.apply(console, __spreadArray([prefix], __read(args), false));
                return;
            case LitAnalyzerLoggerLevel.DEBUG:
                // eslint-disable-next-line no-console
                console.debug.apply(console, __spreadArray([prefix], __read(args), false));
                return;
            case LitAnalyzerLoggerLevel.WARN:
                // eslint-disable-next-line no-console
                console.warn.apply(console, __spreadArray([prefix], __read(args), false));
                return;
            case LitAnalyzerLoggerLevel.ERROR:
                // eslint-disable-next-line no-console
                console.error.apply(console, __spreadArray([prefix], __read(args), false));
                return;
            case LitAnalyzerLoggerLevel.OFF:
                return;
        }
    };
    DefaultLitAnalyzerLogger.prototype.severityPrefix = function (level) {
        switch (level) {
            case LitAnalyzerLoggerLevel.VERBOSE:
                return "\x1b[36mVERBOSE\x1b[0m"; // CYAN
            case LitAnalyzerLoggerLevel.DEBUG:
                return "\x1b[33mDEBUG\x1b[0m"; // YELLOW
            case LitAnalyzerLoggerLevel.WARN:
                return "\x1b[35mWARN\x1b[0m"; // PURPLE
            case LitAnalyzerLoggerLevel.ERROR:
                return "\x1b[31mERROR\x1b[0m"; // RED
            case LitAnalyzerLoggerLevel.OFF:
                return "";
        }
    };
    return DefaultLitAnalyzerLogger;
}());
exports.DefaultLitAnalyzerLogger = DefaultLitAnalyzerLogger;
