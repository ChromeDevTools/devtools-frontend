"use strict";
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
var html_tag_js_1 = require("../analyze/parse/parse-html-data/html-tag.js");
var html_node_attr_assignment_types_js_1 = require("../analyze/types/html-node/html-node-attr-assignment-types.js");
var html_node_attr_types_js_1 = require("../analyze/types/html-node/html-node-attr-types.js");
var html_node_types_js_1 = require("../analyze/types/html-node/html-node-types.js");
var attribute_util_js_1 = require("../analyze/util/attribute-util.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
/**
 * This rule validates that only known attributes are used in attribute bindings.
 */
var rule = {
    id: "no-unknown-attribute",
    meta: {
        priority: "low"
    },
    visitHtmlAttribute: function (htmlAttr, context) {
        var _a;
        var htmlStore = context.htmlStore, config = context.config, definitionStore = context.definitionStore;
        // Ignore "style" and "svg" attrs because I don't yet have all data for them.
        if (htmlAttr.htmlNode.kind !== html_node_types_js_1.HtmlNodeKind.NODE)
            return;
        // Only validate attribute bindings.
        if (htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE && htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.BOOLEAN_ATTRIBUTE)
            return;
        // Report a diagnostic if the target is unknown
        var htmlAttrTarget = htmlStore.getHtmlAttrTarget(htmlAttr);
        if (htmlAttrTarget == null) {
            // Don't report unknown attributes on unknown tag names
            var htmlTag = htmlStore.getHtmlTag(htmlAttr.htmlNode);
            if (htmlTag == null)
                return;
            // Ignore unknown "data-" attributes
            if (htmlAttr.name.startsWith("data-"))
                return;
            // Ignore element expressions
            if (((_a = htmlAttr.assignment) === null || _a === void 0 ? void 0 : _a.kind) === html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.ELEMENT_EXPRESSION)
                return;
            // Get suggested target
            var suggestedTarget = (0, attribute_util_js_1.suggestTargetForHtmlAttr)(htmlAttr, htmlStore);
            var suggestedModifier_1 = suggestedTarget == null ? undefined : (0, html_tag_js_1.litAttributeModifierForTarget)(suggestedTarget);
            var suggestedMemberName_1 = suggestedTarget == null ? undefined : suggestedTarget.name;
            var suggestion = getSuggestionText({ config: config, htmlTag: htmlTag, definitionStore: definitionStore });
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: "Unknown attribute '".concat(htmlAttr.name, "'."),
                fixMessage: suggestedMemberName_1 == null ? undefined : "Did you mean '".concat(suggestedModifier_1).concat(suggestedMemberName_1, "'?"),
                suggestion: suggestion,
                fix: function () {
                    return __spreadArray([
                        {
                            message: "Change attribute to 'data-".concat(htmlAttr.name, "'"),
                            actions: [
                                {
                                    kind: "changeAttributeName",
                                    newName: "data-".concat(htmlAttr.name),
                                    htmlAttr: htmlAttr
                                }
                            ]
                        }
                    ], __read((suggestedMemberName_1 == null
                        ? []
                        : [
                            {
                                message: "Change attribute to '".concat(suggestedModifier_1).concat(suggestedMemberName_1, "'"),
                                actions: [
                                    {
                                        kind: "changeAttributeName",
                                        newName: suggestedMemberName_1,
                                        htmlAttr: htmlAttr
                                    },
                                    {
                                        kind: "changeAttributeModifier",
                                        newModifier: suggestedModifier_1,
                                        htmlAttr: htmlAttr
                                    }
                                ]
                            }
                        ])), false);
                }
            });
        }
        return;
    }
};
exports.default = rule;
/**
 * Returns are suggestion for the unknown attribute rule.
 * @param config
 * @param definitionStore
 * @param htmlTag
 */
function getSuggestionText(_a) {
    var _b, _c;
    var config = _a.config, definitionStore = _a.definitionStore, htmlTag = _a.htmlTag;
    if (config.dontSuggestConfigChanges) {
        return "Please consider using a data-* attribute.";
    }
    var tagHasDeclaration = htmlTag.declaration != null;
    var tagIsBuiltIn = htmlTag.builtIn || false;
    var tagIsFromLibrary = ((_c = (_b = definitionStore.getDefinitionForTagName(htmlTag.tagName)) === null || _b === void 0 ? void 0 : _b.sourceFile) === null || _c === void 0 ? void 0 : _c.isDeclarationFile) || false;
    return tagIsBuiltIn
        ? "This is a built in tag. Please consider using a 'data-*' attribute, adding the attribute to 'globalAttributes' or disabling the 'no-unknown-attribute' rule."
        : tagIsFromLibrary
            ? "If you are not the author of this component please consider using a 'data-*' attribute, adding the attribute to 'globalAttributes' or disabling the 'no-unknown-attribute' rule."
            : tagHasDeclaration
                ? "Please consider adding it as an attribute on the component, adding '@attr' tag to jsdoc on the component class or using a 'data-*' attribute instead."
                : "Please consider using a 'data-*' attribute.";
}
