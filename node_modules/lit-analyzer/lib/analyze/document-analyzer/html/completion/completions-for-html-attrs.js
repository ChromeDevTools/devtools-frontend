"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completionsForHtmlAttrs = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var constants_js_1 = require("../../../constants.js");
var html_tag_js_1 = require("../../../parse/parse-html-data/html-tag.js");
var iterable_util_js_1 = require("../../../util/iterable-util.js");
var general_util_js_1 = require("../../../util/general-util.js");
function completionsForHtmlAttrs(htmlNode, location, _a) {
    var htmlStore = _a.htmlStore;
    var onTagName = htmlNode.tagName;
    // Code completions for ".[...]";
    if (location.word.startsWith(constants_js_1.LIT_HTML_PROP_ATTRIBUTE_MODIFIER)) {
        var alreadyUsedPropNames_1 = htmlNode.attributes.filter(function (a) { return a.modifier === constants_js_1.LIT_HTML_PROP_ATTRIBUTE_MODIFIER; }).map(function (a) { return a.name; });
        var unusedProps = (0, iterable_util_js_1.iterableFilter)(htmlStore.getAllPropertiesForTag(htmlNode), function (prop) { return !alreadyUsedPropNames_1.includes(prop.name); });
        return Array.from((0, iterable_util_js_1.iterableMap)(unusedProps, function (prop) {
            return targetToCompletion(prop, {
                modifier: constants_js_1.LIT_HTML_PROP_ATTRIBUTE_MODIFIER,
                onTagName: onTagName
            });
        }));
    }
    // Code completions for "?[...]";
    else if (location.word.startsWith(constants_js_1.LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER)) {
        var alreadyUsedAttrNames_1 = htmlNode.attributes
            .filter(function (a) { return a.modifier === constants_js_1.LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER || a.modifier == null; })
            .map(function (a) { return a.name; });
        var unusedAttrs_1 = (0, iterable_util_js_1.iterableFilter)(htmlStore.getAllAttributesForTag(htmlNode), function (prop) { return !alreadyUsedAttrNames_1.includes(prop.name); });
        var booleanAttributes = (0, iterable_util_js_1.iterableFilter)(unusedAttrs_1, function (prop) { return isAssignableToBoolean(prop.getType()); });
        return Array.from((0, iterable_util_js_1.iterableMap)(booleanAttributes, function (attr) {
            return targetToCompletion(attr, {
                modifier: constants_js_1.LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER,
                onTagName: onTagName
            });
        }));
    }
    // Code completions for "@[...]";
    else if (location.word.startsWith(constants_js_1.LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER)) {
        var alreadyUsedEventNames_1 = htmlNode.attributes.filter(function (a) { return a.modifier === constants_js_1.LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER; }).map(function (a) { return a.name; });
        var unusedEvents = (0, iterable_util_js_1.iterableFilter)(htmlStore.getAllEventsForTag(htmlNode), function (prop) { return !alreadyUsedEventNames_1.includes(prop.name); });
        return Array.from((0, iterable_util_js_1.iterableMap)(unusedEvents, function (prop) {
            return targetToCompletion(prop, {
                modifier: constants_js_1.LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER,
                onTagName: onTagName
            });
        }));
    }
    var alreadyUsedAttrNames = htmlNode.attributes.filter(function (a) { return a.modifier == null; }).map(function (a) { return a.name; });
    var unusedAttrs = (0, iterable_util_js_1.iterableFilter)(htmlStore.getAllAttributesForTag(htmlNode), function (prop) { return !alreadyUsedAttrNames.includes(prop.name); });
    return Array.from((0, iterable_util_js_1.iterableMap)(unusedAttrs, function (prop) { return targetToCompletion(prop, { modifier: "", onTagName: onTagName }); }));
}
exports.completionsForHtmlAttrs = completionsForHtmlAttrs;
function isAssignableToBoolean(type, _a) {
    var _b = _a === void 0 ? { matchAny: true } : _a, matchAny = _b.matchAny;
    return (0, ts_simple_type_1.isAssignableToSimpleTypeKind)(type, ["BOOLEAN", "BOOLEAN_LITERAL"], {
        matchAny: matchAny
    });
}
function targetToCompletion(target, _a) {
    var modifier = _a.modifier, insertModifier = _a.insertModifier, onTagName = _a.onTagName;
    if (modifier == null) {
        if ((0, html_tag_js_1.isHtmlAttr)(target)) {
            if (isAssignableToBoolean(target.getType(), { matchAny: false })) {
                modifier = constants_js_1.LIT_HTML_BOOLEAN_ATTRIBUTE_MODIFIER;
            }
            else {
                modifier = "";
            }
        }
        else if ((0, html_tag_js_1.isHtmlProp)(target)) {
            modifier = constants_js_1.LIT_HTML_PROP_ATTRIBUTE_MODIFIER;
        }
        else if ((0, html_tag_js_1.isHtmlEvent)(target)) {
            modifier = constants_js_1.LIT_HTML_EVENT_LISTENER_ATTRIBUTE_MODIFIER;
        }
    }
    var isMember = onTagName && target.fromTagName === onTagName;
    var isBuiltIn = target.builtIn;
    return {
        name: "".concat(modifier || "").concat(target.name).concat("required" in target && target.required ? "!" : ""),
        insert: "".concat(insertModifier ? modifier : "").concat(target.name),
        kind: isBuiltIn ? "enumElement" : isMember ? "member" : "label",
        importance: isBuiltIn ? "low" : isMember ? "high" : "medium",
        documentation: (0, general_util_js_1.lazy)(function () { return (0, html_tag_js_1.documentationForTarget)(target, { modifier: modifier }); })
    };
}
