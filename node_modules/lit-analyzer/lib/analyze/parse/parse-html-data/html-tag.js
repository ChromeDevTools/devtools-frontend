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
exports.mergeHtmlTags = exports.mergeCssProperties = exports.mergeCssParts = exports.mergeHtmlSlots = exports.mergeHtmlEvents = exports.mergeHtmlProps = exports.mergeHtmlAttrs = exports.targetKindText = exports.targetKindAndTypeText = exports.descriptionForTarget = exports.documentationForTarget = exports.documentationForHtmlTag = exports.documentationForCssProperty = exports.documentationForCssPart = exports.litAttributeModifierForTarget = exports.isHtmlEvent = exports.isHtmlProp = exports.isHtmlAttr = exports.isHtmlMember = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var constants_js_1 = require("../../constants.js");
var iterable_util_js_1 = require("../../util/iterable-util.js");
function isHtmlMember(target) {
    return "kind" in target;
}
exports.isHtmlMember = isHtmlMember;
function isHtmlAttr(target) {
    return isHtmlMember(target) && target.kind === "attribute";
}
exports.isHtmlAttr = isHtmlAttr;
function isHtmlProp(target) {
    return isHtmlMember(target) && target.kind === "property";
}
exports.isHtmlProp = isHtmlProp;
function isHtmlEvent(target) {
    return !isHtmlMember(target);
}
exports.isHtmlEvent = isHtmlEvent;
function litAttributeModifierForTarget(target) {
    if (isHtmlAttr(target)) {
        if ((0, ts_simple_type_1.isAssignableToSimpleTypeKind)(target.getType(), "BOOLEAN")) {
            return constants_js_1.LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER;
        }
        return "";
    }
    else if (isHtmlProp(target)) {
        return constants_js_1.LIT_HTML_PROP_ATTRIBUTE_MODIFIER;
    }
    else {
        return constants_js_1.LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER;
    }
}
exports.litAttributeModifierForTarget = litAttributeModifierForTarget;
function descriptionHeader(title, titleLevel, _a) {
    if (titleLevel === void 0) { titleLevel = 0; }
    var markdown = _a.markdown;
    return markdown ? (titleLevel === 0 ? "**".concat(title.trim(), "**") : "".concat("#".repeat(titleLevel), " ").concat(title)) : title;
}
function descriptionListItem(item, _a) {
    var markdown = _a.markdown;
    return markdown ? " * ".concat(item.replace("\n", " ")) : " * ".concat(item);
}
function descriptionList(title, items, toString, options) {
    var itemsDesc = items.map(function (item) { return descriptionListItem(toString(item), options); }).join("\n");
    return "".concat(descriptionHeader("".concat(title, ":"), 0, options), "\n").concat(itemsDesc);
}
function documentationForCssPart(cssPart, options) {
    if (options === void 0) { options = {}; }
    var relatedText = (function () {
        var _a;
        if ((((_a = cssPart.related) === null || _a === void 0 ? void 0 : _a.length) || 0) > 0) {
            return "From multiple elements: ".concat(cssPart.related.map(function (p) { return "<".concat(p.fromTagName, ">"); }).join(", "));
        }
        else if (cssPart.fromTagName != null) {
            return "From: <".concat(cssPart.fromTagName, ">");
        }
        return undefined;
    })();
    return (0, iterable_util_js_1.iterableDefined)([cssPart.description, relatedText]).join("\n\n");
}
exports.documentationForCssPart = documentationForCssPart;
function documentationForCssProperty(cssProperty, options) {
    if (options === void 0) { options = {}; }
    var relatedText = (function () {
        var _a;
        if ((((_a = cssProperty.related) === null || _a === void 0 ? void 0 : _a.length) || 0) > 0) {
            return "From multiple elements: ".concat(cssProperty.related.map(function (p) { return "<".concat(p.fromTagName, ">"); }).join(", "));
        }
        else if (cssProperty.fromTagName != null) {
            return "From: <".concat(cssProperty.fromTagName, ">");
        }
        return undefined;
    })();
    return (0, iterable_util_js_1.iterableDefined)([cssProperty.description, cssProperty.typeHint, relatedText]).join("\n\n");
}
exports.documentationForCssProperty = documentationForCssProperty;
function documentationForHtmlTag(htmlTag, options) {
    if (options === void 0) { options = {}; }
    var desc = htmlTag.description || "";
    if (htmlTag.slots.length > 0) {
        var items = htmlTag.slots.sort(function (a, b) { return a.name.localeCompare(b.name); });
        desc += "\n\n".concat(descriptionList("Slots", items, function (slot) { return "".concat(descriptionHeader("@slot ".concat(slot.name), 0, options)).concat(slot.description ? " - ".concat(slot.description) : ""); }, options));
    }
    if (htmlTag.events.length > 0) {
        var items = htmlTag.events.sort(function (a, b) { return a.name.localeCompare(b.name); });
        desc += "\n\n".concat(descriptionList("Events", items, function (event) { return "".concat(descriptionHeader("@fires ".concat(event.name), 0, options)).concat(event.description ? " - ".concat(event.description) : ""); }, options));
    }
    return desc || undefined;
}
exports.documentationForHtmlTag = documentationForHtmlTag;
function documentationForTarget(target, options) {
    if (options === void 0) { options = {}; }
    var typeText = targetKindAndTypeText(target, options);
    var documentation = descriptionForTarget(target, options);
    return "".concat(typeText).concat(documentation != null ? " \n\n".concat(documentation) : "");
}
exports.documentationForTarget = documentationForTarget;
function descriptionForTarget(target, options) {
    if (options === void 0) { options = {}; }
    if (target.related != null && target.related.length > 1) {
        var subDocumentation = target.related
            .map(function (t) { return "".concat(t.fromTagName ? "<".concat(t.fromTagName, ">: ") : "(global): ").concat(t.description || "[no documentation]"); })
            .map(function (doc, i) { return "".concat(i + 1, ". ").concat(doc); });
        return "".concat(descriptionHeader("Multiple declarations (best match first):", 0, options), "\n").concat(subDocumentation.join("\n"));
    }
    return target.description;
}
exports.descriptionForTarget = descriptionForTarget;
function targetKindAndTypeText(target, options) {
    if (options === void 0) { options = {}; }
    var prefix = "(".concat(targetKindText(target), ") ").concat(options.modifier || "").concat(target.name);
    if ((0, ts_simple_type_1.isAssignableToSimpleTypeKind)(target.getType(), "ANY")) {
        return "".concat(prefix);
    }
    return "".concat(prefix, ": ").concat((0, ts_simple_type_1.typeToString)(target.getType()));
}
exports.targetKindAndTypeText = targetKindAndTypeText;
function targetKindText(target) {
    if (isHtmlMember(target)) {
        return target.kind === "property" ? "property" : "attribute";
    }
    else if (isHtmlEvent(target)) {
        return "event";
    }
    return "unknown";
}
exports.targetKindText = targetKindText;
function mergeFirstUnique(items, uniqueOn) {
    var unique = new Set();
    return items.filter(function (item) {
        var identity = uniqueOn(item);
        if (!unique.has(identity)) {
            unique.add(identity);
            return true;
        }
        return false;
    });
}
function mergeHtmlAttrs(attrs) {
    return mergeFirstUnique(attrs, function (attr) { return attr.name; });
}
exports.mergeHtmlAttrs = mergeHtmlAttrs;
function mergeHtmlProps(props) {
    return mergeFirstUnique(props, function (prop) { return prop.name; });
}
exports.mergeHtmlProps = mergeHtmlProps;
function mergeHtmlEvents(events) {
    return mergeFirstUnique(events, function (event) { return event.name; });
}
exports.mergeHtmlEvents = mergeHtmlEvents;
function mergeHtmlSlots(slots) {
    return mergeFirstUnique(slots, function (event) { return event.name; });
}
exports.mergeHtmlSlots = mergeHtmlSlots;
function mergeCssParts(cssParts) {
    return mergeFirstUnique(cssParts, function (cssPart) { return cssPart.name; });
}
exports.mergeCssParts = mergeCssParts;
function mergeCssProperties(cssProperties) {
    return mergeFirstUnique(cssProperties, function (cssProp) { return cssProp.name; });
}
exports.mergeCssProperties = mergeCssProperties;
function mergeHtmlTags(tags) {
    var e_1, _a;
    var mergedTags = new Map();
    try {
        for (var tags_1 = __values(tags), tags_1_1 = tags_1.next(); !tags_1_1.done; tags_1_1 = tags_1.next()) {
            var tag = tags_1_1.value;
            var existingTag = mergedTags.get(tag.tagName);
            if (existingTag != null) {
                mergedTags.set(tag.tagName, __assign(__assign({}, tag), { builtIn: tag.builtIn || existingTag.builtIn, global: tag.global || existingTag.global, declaration: tag.declaration || existingTag.declaration, description: tag.description || existingTag.description, attributes: mergeHtmlAttrs(__spreadArray(__spreadArray([], __read(tag.attributes), false), __read(existingTag.attributes), false)), properties: mergeHtmlProps(__spreadArray(__spreadArray([], __read(tag.properties), false), __read(existingTag.properties), false)), events: mergeHtmlEvents(__spreadArray(__spreadArray([], __read(tag.events), false), __read(existingTag.events), false)), slots: mergeHtmlSlots(__spreadArray(__spreadArray([], __read(tag.slots), false), __read(existingTag.slots), false)) }));
            }
            else {
                mergedTags.set(tag.tagName, tag);
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
    return Array.from(mergedTags.values());
}
exports.mergeHtmlTags = mergeHtmlTags;
