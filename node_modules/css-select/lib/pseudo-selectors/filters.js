"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filters = void 0;
var nth_check_1 = __importDefault(require("nth-check"));
var boolbase_1 = require("boolbase");
var attributes_1 = require("../attributes");
var checkAttrib = attributes_1.attributeRules.equals;
function getAttribFunc(name, value) {
    var data = {
        type: "attribute",
        action: "equals",
        ignoreCase: false,
        namespace: null,
        name: name,
        value: value,
    };
    return function attribFunc(next, _rule, options) {
        return checkAttrib(next, data, options);
    };
}
function getChildFunc(next, adapter) {
    return function (elem) {
        var parent = adapter.getParent(elem);
        return !!parent && adapter.isTag(parent) && next(elem);
    };
}
exports.filters = {
    contains: function (next, text, _a) {
        var adapter = _a.adapter;
        return function contains(elem) {
            return next(elem) && adapter.getText(elem).includes(text);
        };
    },
    icontains: function (next, text, _a) {
        var adapter = _a.adapter;
        var itext = text.toLowerCase();
        return function icontains(elem) {
            return (next(elem) &&
                adapter.getText(elem).toLowerCase().includes(itext));
        };
    },
    // Location specific methods
    "nth-child": function (next, rule, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        var func = nth_check_1.default(rule);
        if (func === boolbase_1.falseFunc)
            return boolbase_1.falseFunc;
        if (func === boolbase_1.trueFunc)
            return getChildFunc(next, adapter);
        return function nthChild(elem) {
            var siblings = adapter.getSiblings(elem);
            var pos = 0;
            for (var i = 0; i < siblings.length; i++) {
                if (equals(elem, siblings[i]))
                    break;
                if (adapter.isTag(siblings[i])) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    "nth-last-child": function (next, rule, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        var func = nth_check_1.default(rule);
        if (func === boolbase_1.falseFunc)
            return boolbase_1.falseFunc;
        if (func === boolbase_1.trueFunc)
            return getChildFunc(next, adapter);
        return function nthLastChild(elem) {
            var siblings = adapter.getSiblings(elem);
            var pos = 0;
            for (var i = siblings.length - 1; i >= 0; i--) {
                if (equals(elem, siblings[i]))
                    break;
                if (adapter.isTag(siblings[i])) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    "nth-of-type": function (next, rule, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        var func = nth_check_1.default(rule);
        if (func === boolbase_1.falseFunc)
            return boolbase_1.falseFunc;
        if (func === boolbase_1.trueFunc)
            return getChildFunc(next, adapter);
        return function nthOfType(elem) {
            var siblings = adapter.getSiblings(elem);
            var pos = 0;
            for (var i = 0; i < siblings.length; i++) {
                var currentSibling = siblings[i];
                if (equals(elem, currentSibling))
                    break;
                if (adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === adapter.getName(elem)) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    "nth-last-of-type": function (next, rule, _a) {
        var adapter = _a.adapter, equals = _a.equals;
        var func = nth_check_1.default(rule);
        if (func === boolbase_1.falseFunc)
            return boolbase_1.falseFunc;
        if (func === boolbase_1.trueFunc)
            return getChildFunc(next, adapter);
        return function nthLastOfType(elem) {
            var siblings = adapter.getSiblings(elem);
            var pos = 0;
            for (var i = siblings.length - 1; i >= 0; i--) {
                var currentSibling = siblings[i];
                if (equals(elem, currentSibling))
                    break;
                if (adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === adapter.getName(elem)) {
                    pos++;
                }
            }
            return func(pos) && next(elem);
        };
    },
    // TODO determine the actual root element
    root: function (next, _rule, _a) {
        var adapter = _a.adapter;
        return function (elem) {
            var parent = adapter.getParent(elem);
            return (parent == null || !adapter.isTag(parent)) && next(elem);
        };
    },
    scope: function (next, rule, options, context) {
        var equals = options.equals;
        if (!context || context.length === 0) {
            // Equivalent to :root
            return exports.filters.root(next, rule, options);
        }
        if (context.length === 1) {
            // NOTE: can't be unpacked, as :has uses this for side-effects
            return function (elem) { return equals(context[0], elem) && next(elem); };
        }
        return function (elem) { return context.includes(elem) && next(elem); };
    },
    // JQuery extensions (others follow as pseudos)
    checkbox: getAttribFunc("type", "checkbox"),
    file: getAttribFunc("type", "file"),
    password: getAttribFunc("type", "password"),
    radio: getAttribFunc("type", "radio"),
    reset: getAttribFunc("type", "reset"),
    image: getAttribFunc("type", "image"),
    submit: getAttribFunc("type", "submit"),
    // Dynamic state pseudos. These depend on optional Adapter methods.
    hover: function (next, _rule, _a) {
        var adapter = _a.adapter;
        var isHovered = adapter.isHovered;
        if (typeof isHovered !== "function") {
            return boolbase_1.falseFunc;
        }
        return function hover(elem) {
            return isHovered(elem) && next(elem);
        };
    },
    visited: function (next, _rule, _a) {
        var adapter = _a.adapter;
        var isVisited = adapter.isVisited;
        if (typeof isVisited !== "function") {
            return boolbase_1.falseFunc;
        }
        return function visited(elem) {
            return isVisited(elem) && next(elem);
        };
    },
    active: function (next, _rule, _a) {
        var adapter = _a.adapter;
        var isActive = adapter.isActive;
        if (typeof isActive !== "function") {
            return boolbase_1.falseFunc;
        }
        return function active(elem) {
            return isActive(elem) && next(elem);
        };
    },
};
