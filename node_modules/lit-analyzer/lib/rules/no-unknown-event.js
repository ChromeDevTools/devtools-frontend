"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var html_tag_js_1 = require("../analyze/parse/parse-html-data/html-tag.js");
var html_node_attr_types_js_1 = require("../analyze/types/html-node/html-node-attr-types.js");
var html_node_types_js_1 = require("../analyze/types/html-node/html-node-types.js");
var attribute_util_js_1 = require("../analyze/util/attribute-util.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
/**
 * This rule validates that only known events are used in event listener bindings.
 */
var rule = {
    id: "no-unknown-event",
    meta: {
        priority: "low"
    },
    visitHtmlAttribute: function (htmlAttr, context) {
        var htmlStore = context.htmlStore, config = context.config, definitionStore = context.definitionStore;
        // Ignore "style" and "svg" attrs because I don't yet have all data for them.
        if (htmlAttr.htmlNode.kind !== html_node_types_js_1.HtmlNodeKind.NODE)
            return;
        // Only validate event listener bindings.
        if (htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.EVENT_LISTENER)
            return;
        // Report a diagnostic if the target is unknown
        var htmlAttrTarget = htmlStore.getHtmlAttrTarget(htmlAttr);
        if (htmlAttrTarget == null) {
            // Don't report unknown properties on unknown tags
            var htmlTag = htmlStore.getHtmlTag(htmlAttr.htmlNode);
            if (htmlTag == null)
                return;
            // Get suggested target
            var suggestedTarget = (0, attribute_util_js_1.suggestTargetForHtmlAttr)(htmlAttr, htmlStore);
            var suggestedMemberName_1 = (suggestedTarget && "".concat((0, html_tag_js_1.litAttributeModifierForTarget)(suggestedTarget)).concat(suggestedTarget.name)) || undefined;
            var suggestion = getSuggestionText({ config: config, definitionStore: definitionStore, htmlTag: htmlTag });
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: "Unknown event '".concat(htmlAttr.name, "'."),
                fixMessage: suggestedMemberName_1 == null ? undefined : "Did you mean '".concat(suggestedMemberName_1, "'?"),
                suggestion: suggestion,
                fix: suggestedMemberName_1 == null
                    ? undefined
                    : function () { return ({
                        message: "Change event to '".concat(suggestedMemberName_1, "'"),
                        actions: [
                            {
                                kind: "changeAttributeName",
                                newName: suggestedMemberName_1,
                                htmlAttr: htmlAttr
                            }
                        ]
                    }); }
            });
        }
    }
};
exports.default = rule;
/**
 * Returns a suggestion text for the unknown event rule.
 * @param config
 * @param definitionStore
 * @param htmlTag
 */
function getSuggestionText(_a) {
    var config = _a.config, definitionStore = _a.definitionStore, htmlTag = _a.htmlTag;
    if (config.dontSuggestConfigChanges) {
        return "Please consider adding '@fires ".concat(htmlTag.tagName, "' to the jsdoc on a component class");
    }
    return "Please consider adding '@fires ".concat(htmlTag.tagName, "' to the jsdoc on a component class, adding it to 'globalEvents' or disabling the 'no-unknown-event' rule.");
}
