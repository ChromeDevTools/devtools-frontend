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
exports.suggestTargetForHtmlAttr = void 0;
var html_node_attr_types_js_1 = require("../types/html-node/html-node-attr-types.js");
var find_best_match_js_1 = require("./find-best-match.js");
function suggestTargetForHtmlAttr(htmlNodeAttr, htmlStore) {
    var properties = htmlStore.getAllPropertiesForTag(htmlNodeAttr.htmlNode);
    var attributes = htmlStore.getAllAttributesForTag(htmlNodeAttr.htmlNode);
    var events = htmlStore.getAllEventsForTag(htmlNodeAttr.htmlNode);
    switch (htmlNodeAttr.kind) {
        case html_node_attr_types_js_1.HtmlNodeAttrKind.EVENT_LISTENER:
            return findSuggestedTarget(htmlNodeAttr.name, [events]);
        case html_node_attr_types_js_1.HtmlNodeAttrKind.PROPERTY:
            return findSuggestedTarget(htmlNodeAttr.name, [properties, attributes]);
        case html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE:
        case html_node_attr_types_js_1.HtmlNodeAttrKind.BOOLEAN_ATTRIBUTE:
            return findSuggestedTarget(htmlNodeAttr.name, [attributes, properties]);
    }
}
exports.suggestTargetForHtmlAttr = suggestTargetForHtmlAttr;
function findSuggestedTarget(name, tests) {
    var e_1, _a;
    try {
        for (var tests_1 = __values(tests), tests_1_1 = tests_1.next(); !tests_1_1.done; tests_1_1 = tests_1.next()) {
            var test = tests_1_1.value;
            var items = __spreadArray([], __read(test), false);
            // If the search string starts with "on"/"aria", only check members starting with "on"/"aria"
            // If not, remove members starting with "on"/"aria" from the list of items
            if (name.startsWith("on")) {
                items = items.filter(function (item) { return item.name.startsWith("on"); });
            }
            else if (name.startsWith("aria")) {
                items = items.filter(function (item) { return item.name.startsWith("aria"); });
            }
            else {
                items = items.filter(function (item) { return !item.name.startsWith("on") && !item.name.startsWith("aria"); });
            }
            var match = (0, find_best_match_js_1.findBestMatch)(name, items, { matchKey: "name", caseSensitive: false });
            if (match != null) {
                return match;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (tests_1_1 && !tests_1_1.done && (_a = tests_1.return)) _a.call(tests_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return;
}
