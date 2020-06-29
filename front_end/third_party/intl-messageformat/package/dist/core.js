"use strict";
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
/* jslint esnext: true */
var compiler_1 = require("./compiler");
// -- MessageFormat --------------------------------------------------------
function resolveLocale(locales) {
    if (typeof locales === 'string') {
        locales = [locales];
    }
    try {
        return Intl.NumberFormat.supportedLocalesOf(locales, {
            // IE11 localeMatcher `lookup` seems to convert `en` -> `en-US`
            // but not other browsers,
            localeMatcher: 'best fit'
        })[0];
    }
    catch (e) {
        return IntlMessageFormat.defaultLocale;
    }
}
function formatPatterns(pattern, values) {
    var result = '';
    for (var _i = 0, pattern_1 = pattern; _i < pattern_1.length; _i++) {
        var part = pattern_1[_i];
        // Exist early for string parts.
        if (typeof part === 'string') {
            result += part;
            continue;
        }
        var id = part.id;
        // Enforce that all required values are provided by the caller.
        if (!(values && id in values)) {
            throw new FormatError("A value must be provided for: " + id, id);
        }
        var value = values[id];
        // Recursively format plural and select parts' option — which can be a
        // nested pattern structure. The choosing of the option to use is
        // abstracted-by and delegated-to the part helper object.
        if (compiler_1.isSelectOrPluralFormat(part)) {
            result += formatPatterns(part.getOption(value), values);
        }
        else {
            result += part.format(value);
        }
    }
    return result;
}
function mergeConfig(c1, c2) {
    if (!c2) {
        return c1;
    }
    return __assign({}, (c1 || {}), (c2 || {}), Object.keys(c1).reduce(function (all, k) {
        all[k] = __assign({}, c1[k], (c2[k] || {}));
        return all;
    }, {}));
}
function mergeConfigs(defaultConfig, configs) {
    if (!configs) {
        return defaultConfig;
    }
    return Object.keys(defaultConfig).reduce(function (all, k) {
        all[k] = mergeConfig(defaultConfig[k], configs[k]);
        return all;
    }, __assign({}, defaultConfig));
}
var FormatError = /** @class */ (function (_super) {
    __extends(FormatError, _super);
    function FormatError(msg, variableId) {
        var _this = _super.call(this, msg) || this;
        _this.variableId = variableId;
        return _this;
    }
    return FormatError;
}(Error));
function createDefaultFormatters() {
    return {
        getNumberFormat: function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return new ((_a = Intl.NumberFormat).bind.apply(_a, [void 0].concat(args)))();
        },
        getDateTimeFormat: function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return new ((_a = Intl.DateTimeFormat).bind.apply(_a, [void 0].concat(args)))();
        },
        getPluralRules: function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return new ((_a = Intl.PluralRules).bind.apply(_a, [void 0].concat(args)))();
        }
    };
}
exports.createDefaultFormatters = createDefaultFormatters;
var IntlMessageFormat = /** @class */ (function () {
    function IntlMessageFormat(message, locales, overrideFormats, opts) {
        var _this = this;
        if (locales === void 0) { locales = IntlMessageFormat.defaultLocale; }
        this.format = function (values) {
            try {
                return formatPatterns(_this.pattern, values);
            }
            catch (e) {
                if (e.variableId) {
                    throw new Error("The intl string context variable '" + e.variableId + "' was not provided to the string '" + _this.message + "'");
                }
                else {
                    throw e;
                }
            }
        };
        if (typeof message === 'string') {
            if (!IntlMessageFormat.__parse) {
                throw new TypeError('IntlMessageFormat.__parse must be set to process `message` of type `string`');
            }
            // Parse string messages into an AST.
            this.ast = IntlMessageFormat.__parse(message);
        }
        else {
            this.ast = message;
        }
        this.message = message;
        if (!(this.ast && this.ast.type === 'messageFormatPattern')) {
            throw new TypeError('A message must be provided as a String or AST.');
        }
        // Creates a new object with the specified `formats` merged with the default
        // formats.
        var formats = mergeConfigs(IntlMessageFormat.formats, overrideFormats);
        // Defined first because it's used to build the format pattern.
        this.locale = resolveLocale(locales || []);
        var formatters = (opts && opts.formatters) || createDefaultFormatters();
        // Compile the `ast` to a pattern that is highly optimized for repeated
        // `format()` invocations. **Note:** This passes the `locales` set provided
        // to the constructor instead of just the resolved locale.
        this.pattern = new compiler_1.default(locales, formats, formatters).compile(this.ast);
        // "Bind" `format()` method to `this` so it can be passed by reference like
        // the other `Intl` APIs.
    }
    IntlMessageFormat.prototype.resolvedOptions = function () {
        return { locale: this.locale };
    };
    IntlMessageFormat.prototype.getAst = function () {
        return this.ast;
    };
    IntlMessageFormat.defaultLocale = 'en';
    IntlMessageFormat.__parse = undefined;
    // Default format options used as the prototype of the `formats` provided to the
    // constructor. These are used when constructing the internal Intl.NumberFormat
    // and Intl.DateTimeFormat instances.
    IntlMessageFormat.formats = {
        number: {
            currency: {
                style: 'currency'
            },
            percent: {
                style: 'percent'
            }
        },
        date: {
            short: {
                month: 'numeric',
                day: 'numeric',
                year: '2-digit'
            },
            medium: {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            },
            long: {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            },
            full: {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }
        },
        time: {
            short: {
                hour: 'numeric',
                minute: 'numeric'
            },
            medium: {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric'
            },
            long: {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                timeZoneName: 'short'
            },
            full: {
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                timeZoneName: 'short'
            }
        }
    };
    return IntlMessageFormat;
}());
exports.IntlMessageFormat = IntlMessageFormat;
exports.default = IntlMessageFormat;
//# sourceMappingURL=core.js.map