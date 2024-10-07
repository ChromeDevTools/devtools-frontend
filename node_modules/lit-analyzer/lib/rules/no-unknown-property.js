"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var html_tag_js_1 = require("../analyze/parse/parse-html-data/html-tag.js");
var html_node_attr_types_js_1 = require("../analyze/types/html-node/html-node-attr-types.js");
var html_node_types_js_1 = require("../analyze/types/html-node/html-node-types.js");
var attribute_util_js_1 = require("../analyze/util/attribute-util.js");
var iterable_util_js_1 = require("../analyze/util/iterable-util.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
/**
 * This rule validates that only known properties are used in bindings.
 */
var rule = {
    id: "no-unknown-property",
    meta: {
        priority: "low"
    },
    visitHtmlAttribute: function (htmlAttr, context) {
        var htmlStore = context.htmlStore, config = context.config, definitionStore = context.definitionStore;
        // Ignore "style" and "svg" attrs because I don't yet have all data for them.
        if (htmlAttr.htmlNode.kind !== html_node_types_js_1.HtmlNodeKind.NODE)
            return;
        // Only validate property bindings.
        if (htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.PROPERTY)
            return;
        // Report a diagnostic if the target is unknown.
        var htmlAttrTarget = htmlStore.getHtmlAttrTarget(htmlAttr);
        if (htmlAttrTarget == null) {
            // Don't report unknown properties on unknown tags
            var htmlTag = htmlStore.getHtmlTag(htmlAttr.htmlNode);
            if (htmlTag == null)
                return;
            // Get suggested target because the name could be a typo.
            var suggestedTarget = (0, attribute_util_js_1.suggestTargetForHtmlAttr)(htmlAttr, htmlStore);
            var suggestedModifier_1 = suggestedTarget == null ? undefined : (0, html_tag_js_1.litAttributeModifierForTarget)(suggestedTarget);
            var suggestedMemberName_1 = suggestedTarget == null ? undefined : suggestedTarget.name;
            var suggestion = getSuggestionText({ config: config, definitionStore: definitionStore, htmlTag: htmlTag });
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: "Unknown property '".concat(htmlAttr.name, "'."),
                fixMessage: suggestedMemberName_1 == null ? undefined : "Did you mean '".concat(suggestedModifier_1).concat(suggestedMemberName_1, "'?"),
                suggestion: suggestion,
                fix: suggestedMemberName_1 == null
                    ? undefined
                    : function () {
                        return ({
                            message: "Change property to '".concat(suggestedModifier_1).concat(suggestedMemberName_1, "'"),
                            actions: [
                                {
                                    kind: "changeAttributeModifier",
                                    newModifier: suggestedModifier_1,
                                    htmlAttr: htmlAttr
                                },
                                {
                                    kind: "changeAttributeName",
                                    newName: suggestedMemberName_1,
                                    htmlAttr: htmlAttr
                                }
                            ]
                        });
                    }
            });
        }
        return;
    }
};
exports.default = rule;
/**
 * Generates a suggestion for the unknown property rule.
 * @param config
 * @param definitionStore
 * @param htmlTag
 */
function getSuggestionText(_a) {
    var _b, _c;
    var config = _a.config, definitionStore = _a.definitionStore, htmlTag = _a.htmlTag;
    // Don't generate suggestion if config changes has been disabled.
    if (config.dontSuggestConfigChanges) {
        return undefined;
    }
    var tagHasDeclaration = htmlTag.declaration != null;
    var tagIsBuiltIn = htmlTag.builtIn || false;
    var tagIsFromLibrary = ((_c = (0, iterable_util_js_1.iterableFirst)((_b = definitionStore.getDefinitionForTagName(htmlTag.tagName)) === null || _b === void 0 ? void 0 : _b.identifierNodes)) === null || _c === void 0 ? void 0 : _c.getSourceFile().isDeclarationFile) || false;
    return tagIsBuiltIn
        ? "This is a built in tag. Please consider disabling the 'no-unknown-property' rule."
        : tagIsFromLibrary
            ? "If you are not the author of this component please consider disabling the 'no-unknown-property' rule."
            : tagHasDeclaration
                ? "Please consider adding a '@prop' tag to jsdoc on the component class or disabling the 'no-unknown-property' rule."
                : "Please consider disabling the 'no-unknown-property' rule.";
}
