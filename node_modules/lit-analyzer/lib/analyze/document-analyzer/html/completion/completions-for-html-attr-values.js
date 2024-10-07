"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completionsForHtmlAttrValues = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var html_node_attr_assignment_types_js_1 = require("../../../types/html-node/html-node-attr-assignment-types.js");
var html_node_attr_types_js_1 = require("../../../types/html-node/html-node-attr-types.js");
function completionsForHtmlAttrValues(htmlNodeAttr, location, _a) {
    var htmlStore = _a.htmlStore;
    // There is not point in showing completions for event listener bindings
    if (htmlNodeAttr.kind === html_node_attr_types_js_1.HtmlNodeAttrKind.EVENT_LISTENER)
        return [];
    // Don't show completions inside assignments with expressions
    if (htmlNodeAttr.assignment && htmlNodeAttr.assignment.kind === html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.EXPRESSION)
        return [];
    var htmlTagMember = htmlStore.getHtmlAttrTarget(htmlNodeAttr);
    if (htmlTagMember == null)
        return [];
    // Special case for handling slot attr as we need to look at its parent
    if (htmlNodeAttr.name === "slot") {
        var parentHtmlTag = htmlNodeAttr.htmlNode.parent && htmlStore.getHtmlTag(htmlNodeAttr.htmlNode.parent);
        if (parentHtmlTag != null && parentHtmlTag.slots.length > 0) {
            return parentHtmlTag.slots.map(function (slot) {
                return ({
                    name: slot.name || " ",
                    insert: slot.name || "",
                    documentation: function () { return slot.description; },
                    kind: "enumElement"
                });
            });
        }
    }
    var options = getOptionsFromType(htmlTagMember.getType());
    return options.map(function (option) {
        return ({
            name: option,
            insert: option,
            kind: "enumElement"
        });
    });
}
exports.completionsForHtmlAttrValues = completionsForHtmlAttrValues;
function getOptionsFromType(type) {
    switch (type.kind) {
        case "UNION":
            return type.types.filter(ts_simple_type_1.isSimpleTypeLiteral).map(function (t) { return t.value.toString(); });
        case "ENUM":
            return type.types
                .map(function (m) { return m.type; })
                .filter(ts_simple_type_1.isSimpleTypeLiteral)
                .map(function (t) { return t.value.toString(); });
        case "ALIAS":
            return getOptionsFromType(type.target);
    }
    return [];
}
