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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVscodeHtmlData = void 0;
var general_util_js_1 = require("../../util/general-util.js");
function parseVscodeHtmlData(data, config) {
    if (config === void 0) { config = {}; }
    switch (data.version) {
        case 1:
        case 1.1:
            return parseVscodeDataV1(data, config);
    }
}
exports.parseVscodeHtmlData = parseVscodeHtmlData;
function parseVscodeDataV1(data, config) {
    var e_1, _a;
    var valueSetTypeMap = valueSetsToTypeMap(data.valueSets || []);
    valueSetTypeMap.set("v", { kind: "BOOLEAN" });
    // Transfer existing typemap to new typemap
    if (config.typeMap != null) {
        try {
            for (var _b = __values(config.typeMap.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), k = _d[0], v = _d[1];
                valueSetTypeMap.set(k, v);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    var newConfig = __assign(__assign({}, config), { typeMap: valueSetTypeMap });
    var globalAttributes = (data.globalAttributes || []).map(function (tagDataAttr) { return tagDataToHtmlTagAttr(tagDataAttr, newConfig); });
    var globalEvents = attrsToEvents(globalAttributes).map(function (evt) { return (__assign(__assign({}, evt), { global: true })); });
    return {
        tags: (data.tags || []).map(function (tagData) { return tagDataToHtmlTag(tagData, newConfig); }),
        global: {
            attributes: globalAttributes,
            events: globalEvents
        }
    };
}
function tagDataToHtmlTag(tagData, config) {
    var name = tagData.name, description = tagData.description;
    var attributes = tagData.attributes.map(function (tagDataAttr) { return tagDataToHtmlTagAttr(tagDataAttr, config, name); });
    var events = attrsToEvents(attributes);
    return {
        tagName: name,
        description: stringOrMarkupContentToString(description),
        attributes: attributes,
        events: events,
        properties: [],
        slots: [],
        builtIn: config.builtIn,
        cssParts: [],
        cssProperties: []
    };
}
function tagDataToHtmlTagAttr(tagDataAttr, config, fromTagName) {
    var _a;
    var name = tagDataAttr.name, description = tagDataAttr.description, valueSet = tagDataAttr.valueSet, values = tagDataAttr.values;
    var type = valueSet != null ? (_a = config.typeMap) === null || _a === void 0 ? void 0 : _a.get(valueSet) : values != null ? attrValuesToUnion(values) : undefined;
    return {
        kind: "attribute",
        name: name,
        description: stringOrMarkupContentToString(description),
        fromTagName: fromTagName,
        getType: (0, general_util_js_1.lazy)(function () { return type || { kind: "ANY" }; }),
        builtIn: config.builtIn
    };
}
function valueSetsToTypeMap(valueSets) {
    var entries = valueSets.map(function (valueSet) { return [valueSet.name, attrValuesToUnion(valueSet.values)]; });
    return new Map(entries);
}
function attrValuesToUnion(attrValues) {
    return {
        kind: "UNION",
        types: attrValues.map(function (value) {
            return ({
                value: value.name,
                kind: "STRING_LITERAL"
            });
        })
    };
}
function stringOrMarkupContentToString(str) {
    if (str == null || typeof str === "string") {
        return str;
    }
    return str.value;
}
function attrsToEvents(htmlAttrs) {
    return htmlAttrs
        .filter(function (htmlAttr) { return htmlAttr.name.startsWith("on"); })
        .map(function (htmlAttr) { return ({
        name: htmlAttr.name.replace(/^on/, ""),
        description: htmlAttr.description,
        fromTagName: htmlAttr.fromTagName,
        getType: (0, general_util_js_1.lazy)(function () { return ({ kind: "ANY" }); }),
        builtIn: htmlAttr.builtIn
    }); });
}
