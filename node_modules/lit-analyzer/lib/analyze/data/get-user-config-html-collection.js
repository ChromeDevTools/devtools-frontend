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
exports.getUserConfigHtmlCollection = void 0;
var fs_1 = require("fs");
var html_tag_js_1 = require("../parse/parse-html-data/html-tag.js");
var parse_vscode_html_data_js_1 = require("../parse/parse-html-data/parse-vscode-html-data.js");
var general_util_js_1 = require("../util/general-util.js");
function getUserConfigHtmlCollection(config) {
    var collection = (function () {
        var e_1, _a;
        var collection = { tags: [], global: {} };
        try {
            for (var _b = __values(Array.isArray(config.customHtmlData) ? config.customHtmlData : [config.customHtmlData]), _c = _b.next(); !_c.done; _c = _b.next()) {
                var customHtmlData = _c.value;
                try {
                    var data = typeof customHtmlData === "string" && (0, fs_1.existsSync)(customHtmlData)
                        ? JSON.parse((0, fs_1.readFileSync)(customHtmlData, "utf8").toString())
                        : customHtmlData;
                    var parsedCollection = (0, parse_vscode_html_data_js_1.parseVscodeHtmlData)(data);
                    collection = {
                        tags: (0, html_tag_js_1.mergeHtmlTags)(__spreadArray(__spreadArray([], __read(collection.tags), false), __read(parsedCollection.tags), false)),
                        global: {
                            attributes: (0, html_tag_js_1.mergeHtmlAttrs)(__spreadArray(__spreadArray([], __read((collection.global.attributes || [])), false), __read((parsedCollection.global.attributes || [])), false)),
                            events: (0, html_tag_js_1.mergeHtmlEvents)(__spreadArray(__spreadArray([], __read((collection.global.events || [])), false), __read((parsedCollection.global.events || [])), false))
                        }
                    };
                }
                catch (e) {
                    //logger.error("Error parsing user configuration 'customHtmlData'", e, customHtmlData);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return collection;
    })();
    var tags = config.globalTags.map(function (tagName) {
        return ({
            tagName: tagName,
            properties: [],
            attributes: [],
            events: [],
            slots: [],
            cssParts: [],
            cssProperties: []
        });
    });
    var attrs = config.globalAttributes.map(function (attrName) {
        return ({
            name: attrName,
            kind: "attribute",
            getType: (0, general_util_js_1.lazy)(function () { return ({ kind: "ANY" }); })
        });
    });
    var events = config.globalEvents.map(function (eventName) {
        return ({
            name: eventName,
            kind: "event",
            getType: (0, general_util_js_1.lazy)(function () { return ({ kind: "ANY" }); })
        });
    });
    return {
        tags: __spreadArray(__spreadArray([], __read(tags), false), __read(collection.tags), false),
        global: {
            attributes: __spreadArray(__spreadArray([], __read(attrs), false), __read((collection.global.attributes || [])), false),
            events: __spreadArray(__spreadArray([], __read(events), false), __read((collection.global.events || [])), false)
        }
    };
}
exports.getUserConfigHtmlCollection = getUserConfigHtmlCollection;
