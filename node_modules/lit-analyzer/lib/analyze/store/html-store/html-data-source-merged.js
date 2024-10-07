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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
exports.HtmlDataSourceMerged = exports.HtmlDataSourceKind = void 0;
var html_tag_js_1 = require("../../parse/parse-html-data/html-tag.js");
var general_util_js_1 = require("../../util/general-util.js");
var iterable_util_js_1 = require("../../util/iterable-util.js");
var html_data_source_js_1 = require("./html-data-source.js");
var HtmlDataSourceKind;
(function (HtmlDataSourceKind) {
    HtmlDataSourceKind[HtmlDataSourceKind["DECLARED"] = 0] = "DECLARED";
    HtmlDataSourceKind[HtmlDataSourceKind["USER"] = 1] = "USER";
    HtmlDataSourceKind[HtmlDataSourceKind["BUILT_IN"] = 2] = "BUILT_IN";
    HtmlDataSourceKind[HtmlDataSourceKind["BUILT_IN_DECLARED"] = 3] = "BUILT_IN_DECLARED";
})(HtmlDataSourceKind || (exports.HtmlDataSourceKind = HtmlDataSourceKind = {}));
var HtmlDataSourceMerged = /** @class */ (function () {
    function HtmlDataSourceMerged() {
        this.subclassExtensions = new Map();
        this.htmlDataSources = (function () {
            var array = [];
            array[HtmlDataSourceKind.BUILT_IN] = new html_data_source_js_1.HtmlDataSource();
            array[HtmlDataSourceKind.BUILT_IN_DECLARED] = new html_data_source_js_1.HtmlDataSource();
            array[HtmlDataSourceKind.USER] = new html_data_source_js_1.HtmlDataSource();
            array[HtmlDataSourceKind.DECLARED] = new html_data_source_js_1.HtmlDataSource();
            return array;
        })();
        this.combinedHtmlDataSource = new html_data_source_js_1.HtmlDataSource();
        this.relatedForTagName = {
            attrs: new Map(),
            events: new Map(),
            slots: new Map(),
            props: new Map(),
            cssParts: new Map(),
            cssProperties: new Map()
        };
    }
    Object.defineProperty(HtmlDataSourceMerged.prototype, "globalTags", {
        get: function () {
            return this.combinedHtmlDataSource.globalTags;
        },
        enumerable: false,
        configurable: true
    });
    HtmlDataSourceMerged.prototype.invalidateCache = function (collection) {
        var e_1, _a, e_2, _b;
        var tags = collection.tags, _c = collection.global, attributes = _c.attributes, events = _c.events, cssParts = _c.cssParts;
        if (tags && tags.length > 0) {
            var allCaches = Object.values(this.relatedForTagName);
            try {
                for (var tags_1 = __values(tags), tags_1_1 = tags_1.next(); !tags_1_1.done; tags_1_1 = tags_1.next()) {
                    var tagName = tags_1_1.value;
                    try {
                        // Clear caches for the tag name
                        for (var allCaches_1 = (e_2 = void 0, __values(allCaches)), allCaches_1_1 = allCaches_1.next(); !allCaches_1_1.done; allCaches_1_1 = allCaches_1.next()) {
                            var map = allCaches_1_1.value;
                            map.delete(tagName);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (allCaches_1_1 && !allCaches_1_1.done && (_b = allCaches_1.return)) _b.call(allCaches_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    // "events", "css parts" and "css custom properties" are all considered "global" when returning matches
                    // Therefore we clear all caches if any invalidated tag included those
                    var tag = this.getHtmlTag(tagName);
                    if (tag != null) {
                        if ((tag.events.length || 0) > 0) {
                            this.relatedForTagName.events.clear();
                        }
                        if ((tag.cssParts.length || 0) > 0) {
                            this.relatedForTagName.cssParts.clear();
                        }
                        if ((tag.cssProperties.length || 0) > 0) {
                            this.relatedForTagName.cssProperties.clear();
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (tags_1_1 && !tags_1_1.done && (_a = tags_1.return)) _a.call(tags_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        if (attributes && attributes.length > 0) {
            this.relatedForTagName.attrs.clear();
        }
        if (events && events.length > 0) {
            this.relatedForTagName.events.clear();
        }
        if (cssParts && cssParts.length > 0) {
            this.relatedForTagName.cssParts.clear();
        }
    };
    HtmlDataSourceMerged.prototype.mergeDataSourcesAndInvalidate = function (collection) {
        var e_3, _a, e_4, _b, e_5, _c, e_6, _d, e_7, _e, e_8, _f, e_9, _g;
        var tags = collection.tags, _h = collection.global, events = _h.events, attributes = _h.attributes, properties = _h.properties, slots = _h.slots, cssParts = _h.cssParts, cssProperties = _h.cssProperties;
        this.invalidateCache(collection);
        if (tags != null) {
            var _loop_1 = function (tagName) {
                var allTags = (0, iterable_util_js_1.iterableDefined)(this_1.htmlDataSources.map(function (r) { return r.getGlobalTag(tagName); }));
                if (allTags.length > 0) {
                    var mergedTags = allTags.length === 1 ? allTags : (0, html_tag_js_1.mergeHtmlTags)(allTags);
                    this_1.combinedHtmlDataSource.absorbCollection({ tags: mergedTags });
                }
            };
            var this_1 = this;
            try {
                for (var tags_2 = __values(tags), tags_2_1 = tags_2.next(); !tags_2_1.done; tags_2_1 = tags_2.next()) {
                    var tagName = tags_2_1.value;
                    _loop_1(tagName);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (tags_2_1 && !tags_2_1.done && (_a = tags_2.return)) _a.call(tags_2);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        if (attributes != null) {
            var _loop_2 = function (attrName) {
                var allAttrs = (0, iterable_util_js_1.iterableDefined)(this_2.htmlDataSources.map(function (r) { return r.getGlobalAttribute(attrName); }));
                if (allAttrs.length > 0) {
                    var mergedAttrs = allAttrs.length === 1 ? allAttrs : (0, html_tag_js_1.mergeHtmlAttrs)(allAttrs);
                    this_2.combinedHtmlDataSource.absorbCollection({ global: { attributes: mergedAttrs } });
                }
            };
            var this_2 = this;
            try {
                for (var attributes_1 = __values(attributes), attributes_1_1 = attributes_1.next(); !attributes_1_1.done; attributes_1_1 = attributes_1.next()) {
                    var attrName = attributes_1_1.value;
                    _loop_2(attrName);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (attributes_1_1 && !attributes_1_1.done && (_b = attributes_1.return)) _b.call(attributes_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        if (events != null) {
            var _loop_3 = function (eventName) {
                var allEvents = (0, iterable_util_js_1.iterableDefined)(this_3.htmlDataSources.map(function (r) { return r.getGlobalEvent(eventName); }));
                if (allEvents.length > 0) {
                    var mergedEvents = allEvents.length === 1 ? allEvents : (0, html_tag_js_1.mergeHtmlEvents)(allEvents);
                    this_3.combinedHtmlDataSource.absorbCollection({ global: { events: mergedEvents } });
                }
            };
            var this_3 = this;
            try {
                for (var events_1 = __values(events), events_1_1 = events_1.next(); !events_1_1.done; events_1_1 = events_1.next()) {
                    var eventName = events_1_1.value;
                    _loop_3(eventName);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (events_1_1 && !events_1_1.done && (_c = events_1.return)) _c.call(events_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
        if (properties != null) {
            var _loop_4 = function (propName) {
                var allProps = (0, iterable_util_js_1.iterableDefined)(this_4.htmlDataSources.map(function (r) { return r.getGlobalProperty(propName); }));
                if (allProps.length > 0) {
                    var mergedProps = allProps.length === 1 ? allProps : (0, html_tag_js_1.mergeHtmlProps)(allProps);
                    this_4.combinedHtmlDataSource.absorbCollection({ global: { properties: mergedProps } });
                }
            };
            var this_4 = this;
            try {
                for (var properties_1 = __values(properties), properties_1_1 = properties_1.next(); !properties_1_1.done; properties_1_1 = properties_1.next()) {
                    var propName = properties_1_1.value;
                    _loop_4(propName);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (properties_1_1 && !properties_1_1.done && (_d = properties_1.return)) _d.call(properties_1);
                }
                finally { if (e_6) throw e_6.error; }
            }
        }
        if (slots != null) {
            var _loop_5 = function (slotName) {
                var allSlots = (0, iterable_util_js_1.iterableDefined)(this_5.htmlDataSources.map(function (r) { return r.getGlobalSlot(slotName); }));
                if (allSlots.length > 0) {
                    var mergedSlots = allSlots.length === 1 ? allSlots : (0, html_tag_js_1.mergeHtmlSlots)(allSlots);
                    this_5.combinedHtmlDataSource.absorbCollection({ global: { slots: mergedSlots } });
                }
            };
            var this_5 = this;
            try {
                for (var slots_1 = __values(slots), slots_1_1 = slots_1.next(); !slots_1_1.done; slots_1_1 = slots_1.next()) {
                    var slotName = slots_1_1.value;
                    _loop_5(slotName);
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (slots_1_1 && !slots_1_1.done && (_e = slots_1.return)) _e.call(slots_1);
                }
                finally { if (e_7) throw e_7.error; }
            }
        }
        if (cssProperties != null) {
            var _loop_6 = function (cssPartName) {
                var allCssProps = (0, iterable_util_js_1.iterableDefined)(this_6.htmlDataSources.map(function (r) { return r.getGlobalCssProperty(cssPartName); }));
                if (allCssProps.length > 0) {
                    var mergedCssProps = allCssProps.length === 1 ? allCssProps : (0, html_tag_js_1.mergeCssProperties)(allCssProps);
                    this_6.combinedHtmlDataSource.absorbCollection({ global: { cssProperties: mergedCssProps } });
                }
            };
            var this_6 = this;
            try {
                for (var cssProperties_1 = __values(cssProperties), cssProperties_1_1 = cssProperties_1.next(); !cssProperties_1_1.done; cssProperties_1_1 = cssProperties_1.next()) {
                    var cssPartName = cssProperties_1_1.value;
                    _loop_6(cssPartName);
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (cssProperties_1_1 && !cssProperties_1_1.done && (_f = cssProperties_1.return)) _f.call(cssProperties_1);
                }
                finally { if (e_8) throw e_8.error; }
            }
        }
        if (cssParts != null) {
            var _loop_7 = function (cssPartName) {
                var allCssParts = (0, iterable_util_js_1.iterableDefined)(this_7.htmlDataSources.map(function (r) { return r.getGlobalCssPart(cssPartName); }));
                if (allCssParts.length > 0) {
                    var mergedCssParts = allCssParts.length === 1 ? allCssParts : (0, html_tag_js_1.mergeCssParts)(allCssParts);
                    this_7.combinedHtmlDataSource.absorbCollection({ global: { cssParts: mergedCssParts } });
                }
            };
            var this_7 = this;
            try {
                for (var cssParts_1 = __values(cssParts), cssParts_1_1 = cssParts_1.next(); !cssParts_1_1.done; cssParts_1_1 = cssParts_1.next()) {
                    var cssPartName = cssParts_1_1.value;
                    _loop_7(cssPartName);
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (cssParts_1_1 && !cssParts_1_1.done && (_g = cssParts_1.return)) _g.call(cssParts_1);
                }
                finally { if (e_9) throw e_9.error; }
            }
        }
    };
    HtmlDataSourceMerged.prototype.forgetCollection = function (collection, dataSource) {
        if (dataSource == null) {
            this.htmlDataSources.forEach(function (ds) { return ds.forgetCollection(collection); });
        }
        else {
            this.htmlDataSources[dataSource].forgetCollection(collection);
        }
        this.mergeDataSourcesAndInvalidate(collection);
        this.combinedHtmlDataSource.forgetCollection(collection);
    };
    HtmlDataSourceMerged.prototype.absorbCollection = function (collection, register) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        this.htmlDataSources[register].absorbCollection(collection);
        this.mergeDataSourcesAndInvalidate({
            tags: collection.tags.map(function (t) { return t.tagName; }),
            global: {
                events: (_b = (_a = collection.global) === null || _a === void 0 ? void 0 : _a.events) === null || _b === void 0 ? void 0 : _b.map(function (t) { return t.name; }),
                attributes: (_d = (_c = collection.global) === null || _c === void 0 ? void 0 : _c.attributes) === null || _d === void 0 ? void 0 : _d.map(function (a) { return a.name; }),
                properties: (_f = (_e = collection.global) === null || _e === void 0 ? void 0 : _e.properties) === null || _f === void 0 ? void 0 : _f.map(function (p) { return p.name; }),
                slots: (_h = (_g = collection.global) === null || _g === void 0 ? void 0 : _g.slots) === null || _h === void 0 ? void 0 : _h.map(function (s) { return s.name; }),
                cssParts: (_k = (_j = collection.global) === null || _j === void 0 ? void 0 : _j.cssParts) === null || _k === void 0 ? void 0 : _k.map(function (s) { return s.name; }),
                cssProperties: (_m = (_l = collection.global) === null || _l === void 0 ? void 0 : _l.cssProperties) === null || _m === void 0 ? void 0 : _m.map(function (s) { return s.name; })
            }
        });
    };
    HtmlDataSourceMerged.prototype.getHtmlTag = function (tagName) {
        return this.combinedHtmlDataSource.getGlobalTag(tagName);
    };
    HtmlDataSourceMerged.prototype.absorbSubclassExtension = function (name, extension) {
        this.subclassExtensions.set(name, extension);
    };
    HtmlDataSourceMerged.prototype.getSubclassExtensions = function (tagName) {
        // Right now, always return "HTMLElement" subclass extension
        var extension = this.subclassExtensions.get("HTMLElement");
        return extension != null ? [extension] : [];
    };
    HtmlDataSourceMerged.prototype.getAllAttributesForTag = function (tagName) {
        if (!this.relatedForTagName.attrs.has(tagName)) {
            this.relatedForTagName.attrs.set(tagName, mergeRelatedMembers(this.iterateAllAttributesForNode(tagName)));
        }
        return this.relatedForTagName.attrs.get(tagName);
    };
    HtmlDataSourceMerged.prototype.getAllPropertiesForTag = function (tagName) {
        if (!this.relatedForTagName.props.has(tagName)) {
            this.relatedForTagName.props.set(tagName, mergeRelatedMembers(this.iterateAllPropertiesForNode(tagName)));
        }
        return this.relatedForTagName.props.get(tagName);
    };
    HtmlDataSourceMerged.prototype.getAllEventsForTag = function (tagName) {
        if (!this.relatedForTagName.events.has(tagName)) {
            this.relatedForTagName.events.set(tagName, mergeRelatedEvents(this.iterateAllEventsForNode(tagName)));
        }
        return this.relatedForTagName.events.get(tagName);
    };
    HtmlDataSourceMerged.prototype.getAllSlotForTag = function (tagName) {
        if (!this.relatedForTagName.slots.has(tagName)) {
            this.relatedForTagName.slots.set(tagName, mergeRelatedSlots(this.iterateAllSlotsForNode(tagName)));
        }
        return this.relatedForTagName.slots.get(tagName);
    };
    HtmlDataSourceMerged.prototype.getAllCssPartsForTag = function (tagName) {
        if (!this.relatedForTagName.cssParts.has(tagName)) {
            this.relatedForTagName.cssParts.set(tagName, mergeRelatedCssParts(this.iterateAllCssPartsForNode(tagName)));
        }
        return this.relatedForTagName.cssParts.get(tagName);
    };
    HtmlDataSourceMerged.prototype.getAllCssPropertiesForTag = function (tagName) {
        if (!this.relatedForTagName.cssProperties.has(tagName)) {
            this.relatedForTagName.cssProperties.set(tagName, mergeRelatedCssProperties(this.iterateAllCssPropertiesForNode(tagName)));
        }
        return this.relatedForTagName.cssProperties.get(tagName);
    };
    HtmlDataSourceMerged.prototype.iterateGlobalAttributes = function () {
        return this.combinedHtmlDataSource.globalAttributes.values();
    };
    HtmlDataSourceMerged.prototype.iterateGlobalEvents = function () {
        return this.combinedHtmlDataSource.globalEvents.values();
    };
    HtmlDataSourceMerged.prototype.iterateGlobalProperties = function () {
        return this.combinedHtmlDataSource.globalProperties.values();
    };
    HtmlDataSourceMerged.prototype.iterateGlobalSlots = function () {
        return this.combinedHtmlDataSource.globalSlots.values();
    };
    HtmlDataSourceMerged.prototype.iterateGlobalCssParts = function () {
        return this.combinedHtmlDataSource.globalCssParts.values();
    };
    HtmlDataSourceMerged.prototype.iterateGlobalCssProperties = function () {
        return this.combinedHtmlDataSource.globalCssProperties.values();
    };
    HtmlDataSourceMerged.prototype.iterateAllPropertiesForNode = function (tagName) {
        var htmlTag, extensions, extensions_1, extensions_1_1, extTag, e_10_1;
        var e_10, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    htmlTag = this.getHtmlTag(tagName);
                    if (!(htmlTag != null)) return [3 /*break*/, 2];
                    return [5 /*yield**/, __values(htmlTag.properties)];
                case 1:
                    _b.sent();
                    _b.label = 2;
                case 2:
                    extensions = this.getSubclassExtensions(tagName);
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 8, 9, 10]);
                    extensions_1 = __values(extensions), extensions_1_1 = extensions_1.next();
                    _b.label = 4;
                case 4:
                    if (!!extensions_1_1.done) return [3 /*break*/, 7];
                    extTag = extensions_1_1.value;
                    return [5 /*yield**/, __values(extTag.properties)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    extensions_1_1 = extensions_1.next();
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_10_1 = _b.sent();
                    e_10 = { error: e_10_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (extensions_1_1 && !extensions_1_1.done && (_a = extensions_1.return)) _a.call(extensions_1);
                    }
                    finally { if (e_10) throw e_10.error; }
                    return [7 /*endfinally*/];
                case 10: 
                // Global propertjes
                return [5 /*yield**/, __values(this.iterateGlobalProperties())];
                case 11:
                    // Global propertjes
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    };
    HtmlDataSourceMerged.prototype.iterateAllEventsForNode = function (tagName) {
        var htmlTag, extensions, extensions_2, extensions_2_1, extTag, e_11_1, _a, _b, tag, e_12_1, eventNameSet, _c, _d, tag, _e, _f, evt, e_13_1, e_14_1, _g, _h, evt, e_15_1;
        var e_11, _j, e_12, _k, e_14, _l, e_13, _m, e_15, _o;
        return __generator(this, function (_p) {
            switch (_p.label) {
                case 0:
                    htmlTag = this.getHtmlTag(tagName);
                    if (!(htmlTag != null)) return [3 /*break*/, 2];
                    return [5 /*yield**/, __values(htmlTag.events)];
                case 1:
                    _p.sent();
                    _p.label = 2;
                case 2:
                    extensions = this.getSubclassExtensions(tagName);
                    _p.label = 3;
                case 3:
                    _p.trys.push([3, 8, 9, 10]);
                    extensions_2 = __values(extensions), extensions_2_1 = extensions_2.next();
                    _p.label = 4;
                case 4:
                    if (!!extensions_2_1.done) return [3 /*break*/, 7];
                    extTag = extensions_2_1.value;
                    return [5 /*yield**/, __values(extTag.events)];
                case 5:
                    _p.sent();
                    _p.label = 6;
                case 6:
                    extensions_2_1 = extensions_2.next();
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_11_1 = _p.sent();
                    e_11 = { error: e_11_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (extensions_2_1 && !extensions_2_1.done && (_j = extensions_2.return)) _j.call(extensions_2);
                    }
                    finally { if (e_11) throw e_11.error; }
                    return [7 /*endfinally*/];
                case 10:
                    if (!(htmlTag == null || htmlTag.events.length === 0)) return [3 /*break*/, 20];
                    _p.label = 11;
                case 11:
                    _p.trys.push([11, 16, 17, 18]);
                    _a = __values(this.globalTags.values()), _b = _a.next();
                    _p.label = 12;
                case 12:
                    if (!!_b.done) return [3 /*break*/, 15];
                    tag = _b.value;
                    if (!(tag.tagName !== tagName)) return [3 /*break*/, 14];
                    return [5 /*yield**/, __values(tag.events)];
                case 13:
                    _p.sent();
                    _p.label = 14;
                case 14:
                    _b = _a.next();
                    return [3 /*break*/, 12];
                case 15: return [3 /*break*/, 18];
                case 16:
                    e_12_1 = _p.sent();
                    e_12 = { error: e_12_1 };
                    return [3 /*break*/, 18];
                case 17:
                    try {
                        if (_b && !_b.done && (_k = _a.return)) _k.call(_a);
                    }
                    finally { if (e_12) throw e_12.error; }
                    return [7 /*endfinally*/];
                case 18: 
                // Global events
                return [5 /*yield**/, __values(this.iterateGlobalEvents())];
                case 19:
                    // Global events
                    _p.sent();
                    return [3 /*break*/, 41];
                case 20:
                    eventNameSet = new Set(htmlTag.events.map(function (e) { return e.name; }));
                    _p.label = 21;
                case 21:
                    _p.trys.push([21, 32, 33, 34]);
                    _c = __values(this.globalTags.values()), _d = _c.next();
                    _p.label = 22;
                case 22:
                    if (!!_d.done) return [3 /*break*/, 31];
                    tag = _d.value;
                    if (!(tag.tagName !== tagName)) return [3 /*break*/, 30];
                    _p.label = 23;
                case 23:
                    _p.trys.push([23, 28, 29, 30]);
                    _e = (e_13 = void 0, __values(tag.events)), _f = _e.next();
                    _p.label = 24;
                case 24:
                    if (!!_f.done) return [3 /*break*/, 27];
                    evt = _f.value;
                    if (!!eventNameSet.has(evt.name)) return [3 /*break*/, 26];
                    return [4 /*yield*/, evt];
                case 25:
                    _p.sent();
                    _p.label = 26;
                case 26:
                    _f = _e.next();
                    return [3 /*break*/, 24];
                case 27: return [3 /*break*/, 30];
                case 28:
                    e_13_1 = _p.sent();
                    e_13 = { error: e_13_1 };
                    return [3 /*break*/, 30];
                case 29:
                    try {
                        if (_f && !_f.done && (_m = _e.return)) _m.call(_e);
                    }
                    finally { if (e_13) throw e_13.error; }
                    return [7 /*endfinally*/];
                case 30:
                    _d = _c.next();
                    return [3 /*break*/, 22];
                case 31: return [3 /*break*/, 34];
                case 32:
                    e_14_1 = _p.sent();
                    e_14 = { error: e_14_1 };
                    return [3 /*break*/, 34];
                case 33:
                    try {
                        if (_d && !_d.done && (_l = _c.return)) _l.call(_c);
                    }
                    finally { if (e_14) throw e_14.error; }
                    return [7 /*endfinally*/];
                case 34:
                    _p.trys.push([34, 39, 40, 41]);
                    _g = __values(this.iterateGlobalEvents()), _h = _g.next();
                    _p.label = 35;
                case 35:
                    if (!!_h.done) return [3 /*break*/, 38];
                    evt = _h.value;
                    if (!!eventNameSet.has(evt.name)) return [3 /*break*/, 37];
                    return [4 /*yield*/, evt];
                case 36:
                    _p.sent();
                    _p.label = 37;
                case 37:
                    _h = _g.next();
                    return [3 /*break*/, 35];
                case 38: return [3 /*break*/, 41];
                case 39:
                    e_15_1 = _p.sent();
                    e_15 = { error: e_15_1 };
                    return [3 /*break*/, 41];
                case 40:
                    try {
                        if (_h && !_h.done && (_o = _g.return)) _o.call(_g);
                    }
                    finally { if (e_15) throw e_15.error; }
                    return [7 /*endfinally*/];
                case 41: return [2 /*return*/];
            }
        });
    };
    HtmlDataSourceMerged.prototype.iterateAllAttributesForNode = function (tagName) {
        var htmlTag, extensions, extensions_3, extensions_3_1, extTag, e_16_1;
        var e_16, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    htmlTag = this.getHtmlTag(tagName);
                    if (!(htmlTag != null)) return [3 /*break*/, 2];
                    return [5 /*yield**/, __values(htmlTag.attributes)];
                case 1:
                    _b.sent();
                    _b.label = 2;
                case 2:
                    extensions = this.getSubclassExtensions(tagName);
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 8, 9, 10]);
                    extensions_3 = __values(extensions), extensions_3_1 = extensions_3.next();
                    _b.label = 4;
                case 4:
                    if (!!extensions_3_1.done) return [3 /*break*/, 7];
                    extTag = extensions_3_1.value;
                    return [5 /*yield**/, __values(extTag.attributes)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    extensions_3_1 = extensions_3.next();
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_16_1 = _b.sent();
                    e_16 = { error: e_16_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (extensions_3_1 && !extensions_3_1.done && (_a = extensions_3.return)) _a.call(extensions_3);
                    }
                    finally { if (e_16) throw e_16.error; }
                    return [7 /*endfinally*/];
                case 10: 
                // Global attributes
                return [5 /*yield**/, __values(this.iterateGlobalAttributes())];
                case 11:
                    // Global attributes
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    };
    HtmlDataSourceMerged.prototype.iterateAllSlotsForNode = function (tagName) {
        var htmlTag, extensions, extensions_4, extensions_4_1, extTag, e_17_1;
        var e_17, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    htmlTag = this.getHtmlTag(tagName);
                    if (!(htmlTag != null)) return [3 /*break*/, 2];
                    return [5 /*yield**/, __values(htmlTag.slots)];
                case 1:
                    _b.sent();
                    _b.label = 2;
                case 2:
                    extensions = this.getSubclassExtensions(tagName);
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 8, 9, 10]);
                    extensions_4 = __values(extensions), extensions_4_1 = extensions_4.next();
                    _b.label = 4;
                case 4:
                    if (!!extensions_4_1.done) return [3 /*break*/, 7];
                    extTag = extensions_4_1.value;
                    return [5 /*yield**/, __values(extTag.slots)];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6:
                    extensions_4_1 = extensions_4.next();
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 10];
                case 8:
                    e_17_1 = _b.sent();
                    e_17 = { error: e_17_1 };
                    return [3 /*break*/, 10];
                case 9:
                    try {
                        if (extensions_4_1 && !extensions_4_1.done && (_a = extensions_4.return)) _a.call(extensions_4);
                    }
                    finally { if (e_17) throw e_17.error; }
                    return [7 /*endfinally*/];
                case 10: 
                // Global slots
                return [5 /*yield**/, __values(this.iterateGlobalSlots())];
                case 11:
                    // Global slots
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    };
    HtmlDataSourceMerged.prototype.iterateAllCssPartsForNode = function (tagName) {
        var _a, _b, tag, e_18_1, htmlTag, extensions, extensions_5, extensions_5_1, extTag, e_19_1;
        var e_18, _c, e_19, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!(tagName === "")) return [3 /*break*/, 9];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 6, 7, 8]);
                    _a = __values(this.combinedHtmlDataSource.globalTags.values()), _b = _a.next();
                    _e.label = 2;
                case 2:
                    if (!!_b.done) return [3 /*break*/, 5];
                    tag = _b.value;
                    return [5 /*yield**/, __values(tag.cssParts)];
                case 3:
                    _e.sent();
                    _e.label = 4;
                case 4:
                    _b = _a.next();
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 8];
                case 6:
                    e_18_1 = _e.sent();
                    e_18 = { error: e_18_1 };
                    return [3 /*break*/, 8];
                case 7:
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_18) throw e_18.error; }
                    return [7 /*endfinally*/];
                case 8: return [3 /*break*/, 11];
                case 9:
                    htmlTag = this.getHtmlTag(tagName);
                    if (!(htmlTag != null)) return [3 /*break*/, 11];
                    return [5 /*yield**/, __values(htmlTag.cssParts)];
                case 10:
                    _e.sent();
                    _e.label = 11;
                case 11:
                    extensions = this.getSubclassExtensions(tagName);
                    _e.label = 12;
                case 12:
                    _e.trys.push([12, 17, 18, 19]);
                    extensions_5 = __values(extensions), extensions_5_1 = extensions_5.next();
                    _e.label = 13;
                case 13:
                    if (!!extensions_5_1.done) return [3 /*break*/, 16];
                    extTag = extensions_5_1.value;
                    return [5 /*yield**/, __values(extTag.cssParts)];
                case 14:
                    _e.sent();
                    _e.label = 15;
                case 15:
                    extensions_5_1 = extensions_5.next();
                    return [3 /*break*/, 13];
                case 16: return [3 /*break*/, 19];
                case 17:
                    e_19_1 = _e.sent();
                    e_19 = { error: e_19_1 };
                    return [3 /*break*/, 19];
                case 18:
                    try {
                        if (extensions_5_1 && !extensions_5_1.done && (_d = extensions_5.return)) _d.call(extensions_5);
                    }
                    finally { if (e_19) throw e_19.error; }
                    return [7 /*endfinally*/];
                case 19: 
                // Global slots
                return [5 /*yield**/, __values(this.iterateGlobalCssParts())];
                case 20:
                    // Global slots
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    };
    HtmlDataSourceMerged.prototype.iterateAllCssPropertiesForNode = function (tagName) {
        var _a, _b, tag, e_20_1, htmlTag, extensions, extensions_6, extensions_6_1, extTag, e_21_1;
        var e_20, _c, e_21, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!(tagName === "")) return [3 /*break*/, 9];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 6, 7, 8]);
                    _a = __values(this.combinedHtmlDataSource.globalTags.values()), _b = _a.next();
                    _e.label = 2;
                case 2:
                    if (!!_b.done) return [3 /*break*/, 5];
                    tag = _b.value;
                    return [5 /*yield**/, __values(tag.cssProperties)];
                case 3:
                    _e.sent();
                    _e.label = 4;
                case 4:
                    _b = _a.next();
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 8];
                case 6:
                    e_20_1 = _e.sent();
                    e_20 = { error: e_20_1 };
                    return [3 /*break*/, 8];
                case 7:
                    try {
                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                    }
                    finally { if (e_20) throw e_20.error; }
                    return [7 /*endfinally*/];
                case 8: return [3 /*break*/, 11];
                case 9:
                    htmlTag = this.getHtmlTag(tagName);
                    if (!(htmlTag != null)) return [3 /*break*/, 11];
                    return [5 /*yield**/, __values(htmlTag.cssProperties)];
                case 10:
                    _e.sent();
                    _e.label = 11;
                case 11:
                    extensions = this.getSubclassExtensions(tagName);
                    _e.label = 12;
                case 12:
                    _e.trys.push([12, 17, 18, 19]);
                    extensions_6 = __values(extensions), extensions_6_1 = extensions_6.next();
                    _e.label = 13;
                case 13:
                    if (!!extensions_6_1.done) return [3 /*break*/, 16];
                    extTag = extensions_6_1.value;
                    return [5 /*yield**/, __values(extTag.cssProperties)];
                case 14:
                    _e.sent();
                    _e.label = 15;
                case 15:
                    extensions_6_1 = extensions_6.next();
                    return [3 /*break*/, 13];
                case 16: return [3 /*break*/, 19];
                case 17:
                    e_21_1 = _e.sent();
                    e_21 = { error: e_21_1 };
                    return [3 /*break*/, 19];
                case 18:
                    try {
                        if (extensions_6_1 && !extensions_6_1.done && (_d = extensions_6.return)) _d.call(extensions_6);
                    }
                    finally { if (e_21) throw e_21.error; }
                    return [7 /*endfinally*/];
                case 19: 
                // Global slots
                return [5 /*yield**/, __values(this.iterateGlobalCssProperties())];
                case 20:
                    // Global slots
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    };
    return HtmlDataSourceMerged;
}());
exports.HtmlDataSourceMerged = HtmlDataSourceMerged;
function mergeRelatedMembers(members) {
    var e_22, _a;
    var mergedMembers = new Map();
    var _loop_8 = function (member) {
        // For now, lowercase all names because "parse5" doesn't distinguish between uppercase and lowercase
        var name = member.name.toLowerCase();
        var existingMember = mergedMembers.get(name);
        if (existingMember == null) {
            mergedMembers.set(name, member);
        }
        else {
            var prevType_1 = existingMember.getType;
            mergedMembers.set(name, __assign(__assign({}, existingMember), { description: undefined, required: existingMember.required && member.required, builtIn: existingMember.required && member.required, fromTagName: existingMember.fromTagName || member.fromTagName, getType: (0, general_util_js_1.lazy)(function () { return mergeRelatedTypeToUnion(prevType_1(), member.getType()); }), related: existingMember.related == null ? [existingMember, member] : __spreadArray(__spreadArray([], __read(existingMember.related), false), [member], false) }));
        }
    };
    try {
        for (var members_1 = __values(members), members_1_1 = members_1.next(); !members_1_1.done; members_1_1 = members_1.next()) {
            var member = members_1_1.value;
            _loop_8(member);
        }
    }
    catch (e_22_1) { e_22 = { error: e_22_1 }; }
    finally {
        try {
            if (members_1_1 && !members_1_1.done && (_a = members_1.return)) _a.call(members_1);
        }
        finally { if (e_22) throw e_22.error; }
    }
    return mergedMembers;
}
function mergeRelatedTypeToUnion(typeA, typeB) {
    if (typeA.kind === typeB.kind) {
        switch (typeA.kind) {
            case "ANY":
                return typeA;
        }
    }
    switch (typeA.kind) {
        case "UNION":
            if (typeB.kind === "ANY" && typeA.types.find(function (t) { return t.kind === "ANY"; }) != null) {
                return typeA;
            }
            else {
                return __assign(__assign({}, typeA), { types: __spreadArray(__spreadArray([], __read(typeA.types), false), [typeB], false) });
            }
    }
    return {
        kind: "UNION",
        types: [typeA, typeB]
    };
}
function mergeNamedRelated(items) {
    var e_23, _a;
    var merged = new Map();
    try {
        for (var items_1 = __values(items), items_1_1 = items_1.next(); !items_1_1.done; items_1_1 = items_1.next()) {
            var item = items_1_1.value;
            // For now, lowercase all names because "parse5" doesn't distinguish between uppercase and lowercase
            var name = item.name.toLowerCase();
            var existingItem = merged.get(name);
            if (existingItem != null) {
                merged.set(name, __assign(__assign({}, item), { related: existingItem.related == null ? [existingItem, item] : [existingItem.related, item] }));
            }
            else {
                merged.set(name, item);
            }
        }
    }
    catch (e_23_1) { e_23 = { error: e_23_1 }; }
    finally {
        try {
            if (items_1_1 && !items_1_1.done && (_a = items_1.return)) _a.call(items_1);
        }
        finally { if (e_23) throw e_23.error; }
    }
    return merged;
}
function mergeRelatedSlots(slots) {
    return mergeNamedRelated(slots);
}
function mergeRelatedCssParts(cssParts) {
    return mergeNamedRelated(cssParts);
}
function mergeRelatedCssProperties(cssProperties) {
    return mergeNamedRelated(cssProperties);
}
function mergeRelatedEvents(events) {
    var e_24, _a;
    var mergedAttrs = new Map();
    var _loop_9 = function (event) {
        // For now, lowercase all names because "parse5" doesn't distinguish between uppercase and lowercase
        var name = event.name.toLowerCase();
        var existingEvent = mergedAttrs.get(name);
        if (existingEvent == null) {
            mergedAttrs.set(name, event);
        }
        else {
            var prevType_2 = existingEvent.getType;
            mergedAttrs.set(name, __assign(__assign({}, existingEvent), { global: existingEvent.global && event.global, description: undefined, getType: (0, general_util_js_1.lazy)(function () { return mergeRelatedTypeToUnion(prevType_2(), event.getType()); }), related: existingEvent.related == null ? [existingEvent, event] : __spreadArray(__spreadArray([], __read(existingEvent.related), false), [event], false), fromTagName: existingEvent.fromTagName || event.fromTagName }));
        }
    };
    try {
        for (var events_2 = __values(events), events_2_1 = events_2.next(); !events_2_1.done; events_2_1 = events_2.next()) {
            var event = events_2_1.value;
            _loop_9(event);
        }
    }
    catch (e_24_1) { e_24 = { error: e_24_1 }; }
    finally {
        try {
            if (events_2_1 && !events_2_1.done && (_a = events_2.return)) _a.call(events_2);
        }
        finally { if (e_24) throw e_24.error; }
    }
    return mergedAttrs;
}
