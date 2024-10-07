"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlDataSource = void 0;
var HtmlDataSource = /** @class */ (function () {
    function HtmlDataSource() {
        this._globalTags = new Map();
        this._globalAttributes = new Map();
        this._globalEvents = new Map();
        this._globalProperties = new Map();
        this._globalSlots = new Map();
        this._globalCssParts = new Map();
        this._globalCssProperties = new Map();
    }
    Object.defineProperty(HtmlDataSource.prototype, "globalTags", {
        get: function () {
            return this._globalTags;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(HtmlDataSource.prototype, "globalAttributes", {
        get: function () {
            return this._globalAttributes;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(HtmlDataSource.prototype, "globalEvents", {
        get: function () {
            return this._globalEvents;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(HtmlDataSource.prototype, "globalProperties", {
        get: function () {
            return this._globalProperties;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(HtmlDataSource.prototype, "globalSlots", {
        get: function () {
            return this._globalSlots;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(HtmlDataSource.prototype, "globalCssParts", {
        get: function () {
            return this._globalCssParts;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(HtmlDataSource.prototype, "globalCssProperties", {
        get: function () {
            return this._globalCssProperties;
        },
        enumerable: false,
        configurable: true
    });
    HtmlDataSource.prototype.absorbCollection = function (collection) {
        var _this = this;
        var _a, _b, _c, _d, _e, _f;
        if (collection.tags != null) {
            // For now, lowercase all names because "parse5" doesn't distinguish when parsing
            collection.tags.forEach(function (tag) { return _this._globalTags.set(tag.tagName.toLowerCase(), tag); });
        }
        if (((_a = collection.global) === null || _a === void 0 ? void 0 : _a.attributes) != null) {
            // For now, lowercase all names because "parse5" doesn't distinguish when parsing
            collection.global.attributes.forEach(function (attr) { return _this._globalAttributes.set(attr.name.toLowerCase(), attr); });
        }
        if (((_b = collection.global) === null || _b === void 0 ? void 0 : _b.events) != null) {
            // For now, lowercase all names because "parse5" doesn't distinguish when parsing
            collection.global.events.forEach(function (evt) { return _this._globalEvents.set(evt.name.toLowerCase(), evt); });
        }
        if (((_c = collection.global) === null || _c === void 0 ? void 0 : _c.properties) != null) {
            // For now, lowercase all names because "parse5" doesn't distinguish when parsing
            collection.global.properties.forEach(function (prop) { return _this._globalProperties.set(prop.name.toLowerCase(), prop); });
        }
        if (((_d = collection.global) === null || _d === void 0 ? void 0 : _d.slots) != null) {
            // For now, lowercase all names because "parse5" doesn't distinguish when parsing
            collection.global.slots.forEach(function (slot) { return _this._globalSlots.set(slot.name.toLowerCase(), slot); });
        }
        if (((_e = collection.global) === null || _e === void 0 ? void 0 : _e.cssParts) != null) {
            // For now, lowercase all names because "parse5" doesn't distinguish when parsing
            collection.global.cssParts.forEach(function (cssPart) { return _this._globalCssParts.set(cssPart.name.toLowerCase(), cssPart); });
        }
        if (((_f = collection.global) === null || _f === void 0 ? void 0 : _f.cssProperties) != null) {
            // For now, lowercase all names because "parse5" doesn't distinguish when parsing
            collection.global.cssProperties.forEach(function (cssProperty) { return _this._globalCssProperties.set(cssProperty.name.toLowerCase(), cssProperty); });
        }
    };
    HtmlDataSource.prototype.forgetCollection = function (_a) {
        var _this = this;
        var tags = _a.tags, _b = _a.global, events = _b.events, attributes = _b.attributes, slots = _b.slots, properties = _b.properties, cssParts = _b.cssParts, cssProperties = _b.cssProperties;
        if (tags != null)
            tags.forEach(function (tagName) { return _this._globalTags.delete(tagName.toLowerCase()); });
        if (events != null)
            events.forEach(function (eventName) { return _this._globalEvents.delete(eventName.toLowerCase()); });
        if (attributes != null)
            attributes.forEach(function (attrName) { return _this._globalAttributes.delete(attrName.toLowerCase()); });
        if (properties != null)
            properties.forEach(function (propName) { return _this._globalProperties.delete(propName.toLowerCase()); });
        if (slots != null)
            slots.forEach(function (slotName) { return _this._globalSlots.delete(slotName.toLowerCase()); });
        if (cssParts != null)
            cssParts.forEach(function (partName) { return _this._globalCssParts.delete(partName.toLowerCase()); });
        if (cssProperties != null)
            cssProperties.forEach(function (cssPropName) { return _this._globalCssProperties.delete(cssPropName.toLowerCase()); });
    };
    HtmlDataSource.prototype.getGlobalTag = function (tagName) {
        return this._globalTags.get(tagName.toLowerCase());
    };
    HtmlDataSource.prototype.getGlobalAttribute = function (attrName) {
        return this._globalAttributes.get(attrName.toLowerCase());
    };
    HtmlDataSource.prototype.getGlobalEvent = function (eventName) {
        return this._globalEvents.get(eventName.toLowerCase());
    };
    HtmlDataSource.prototype.getGlobalProperty = function (propName) {
        return this._globalProperties.get(propName.toLowerCase());
    };
    HtmlDataSource.prototype.getGlobalSlot = function (slotName) {
        return this._globalSlots.get(slotName.toLowerCase());
    };
    HtmlDataSource.prototype.getGlobalCssPart = function (partName) {
        return this._globalCssParts.get(partName.toLowerCase());
    };
    HtmlDataSource.prototype.getGlobalCssProperty = function (propName) {
        return this._globalCssProperties.get(propName.toLowerCase());
    };
    return HtmlDataSource;
}());
exports.HtmlDataSource = HtmlDataSource;
