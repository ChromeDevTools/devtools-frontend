"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var html_node_attr_assignment_types_js_1 = require("../analyze/types/html-node/html-node-attr-assignment-types.js");
var html_node_attr_types_js_1 = require("../analyze/types/html-node/html-node-attr-types.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
/**
 * This rule checks validates the slot attribute
 *   and makes sure that slot names used have been defined using jsdoc.
 */
var rule = {
    id: "no-unknown-slot",
    meta: {
        priority: "high"
    },
    visitHtmlNode: function (htmlNode, context) {
        var htmlStore = context.htmlStore;
        // This visitor function validates that a "slot" attribute is present on children elements if a slot name is required.
        // Get available slot names from the parent node of this node, because this node defined what slots are available.
        // Example: <my-element><input slot="footer" /></my-element>
        var slots = htmlNode.parent && Array.from(htmlStore.getAllSlotsForTag(htmlNode.parent.tagName));
        // Validate slots for this attribute if any slots have been defined on the parent element, else opt out.
        if (slots == null || slots.length === 0)
            return;
        // Find out if it's possible to use an unnamed slot.
        var unnamedSlot = slots.find(function (s) { return s.name === ""; });
        if (unnamedSlot == null) {
            // If it's not possible to use an unnamed slot, see if there is a "slot" attribute present.
            var slotAttr = htmlNode.attributes.find(function (a) { return a.name === "slot"; });
            if (slotAttr == null) {
                var parentTagName = (htmlNode.parent && htmlNode.parent.tagName) || "";
                // The slot attribute is missing, and it's not possible to use an unnamed slot.
                var validSlotNames_1 = slots.map(function (s) { return s.name; });
                context.report({
                    location: (0, range_util_js_1.rangeFromHtmlNode)(htmlNode),
                    message: "Missing slot attribute. Parent element <".concat(parentTagName, "> only allows named slots as children."),
                    fixMessage: "Add slot attribute with: ".concat(validSlotNames_1.map(function (n) { return "'".concat(n, "'"); }).join(" | "), "?"),
                    fix: function () {
                        return validSlotNames_1.map(function (slotName) { return ({
                            message: "Add slot attribute for '".concat(slotName, "'."),
                            actions: [
                                {
                                    kind: "addAttribute",
                                    htmlNode: htmlNode,
                                    name: "slot",
                                    value: "\"".concat(slotName, "\"")
                                }
                            ]
                        }); });
                    }
                });
            }
        }
    },
    visitHtmlAssignment: function (assignment, context) {
        // This visitor function validates that the value of a "slot" attribute is valid.
        var htmlAttr = assignment.htmlAttr;
        // Only validate attributes with the name "slot"
        if (htmlAttr.name !== "slot")
            return;
        // Only validate attributes that are bound to the attribute
        if (htmlAttr.kind !== html_node_attr_types_js_1.HtmlNodeAttrKind.ATTRIBUTE)
            return;
        // Only validate assignments of kind "string"
        if (assignment.kind !== html_node_attr_assignment_types_js_1.HtmlNodeAttrAssignmentKind.STRING)
            return;
        // Grab the parent node of this attribute. The parent node defines what slot names are valid.
        var parent = htmlAttr.htmlNode.parent;
        if (parent == null)
            return;
        // Validate slots for this attribute if any slots have been defined on the parent element, else opt out.
        var parentHtmlTag = context.htmlStore.getHtmlTag(parent.tagName);
        if (parentHtmlTag == null || parentHtmlTag.slots.length === 0)
            return;
        // Grab the slot name of the "slot" attribute.
        var slotName = assignment.value;
        // Find which slots names are valid, and find if the slot name matches any of these.
        var validSlots = Array.from(context.htmlStore.getAllSlotsForTag(parentHtmlTag.tagName));
        var matchingSlot = validSlots.find(function (slot) { return slot.name === slotName; });
        if (matchingSlot == null) {
            // The slot name doesn't mach any slots! Generate a diagnostic.
            var validSlotNames = validSlots.map(function (s) { return s.name; });
            var message = validSlotNames.length === 1 && validSlotNames[0].length === 0
                ? "Invalid slot name '".concat(slotName, "'. Only the unnamed slot is valid for <").concat(parentHtmlTag.tagName, ">")
                : "Invalid slot name '".concat(slotName, "'. Valid slot names for <").concat(parentHtmlTag.tagName, "> are: ").concat(validSlotNames.map(function (n) { return "'".concat(n, "'"); }).join(" | "));
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: message
            });
        }
    }
};
exports.default = rule;
