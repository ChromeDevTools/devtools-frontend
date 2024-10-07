"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var is_valid_name_js_1 = require("../analyze/util/is-valid-name.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
var rule = {
    id: "no-invalid-attribute-name",
    meta: {
        priority: "low"
    },
    visitComponentMember: function (member, context) {
        var _a, _b;
        // Check if the tag name is invalid
        var attrName;
        var attrNameNode;
        if (member.kind === "attribute") {
            attrName = member.attrName;
            attrNameNode = member.node;
        }
        else if (typeof ((_a = member.meta) === null || _a === void 0 ? void 0 : _a.attribute) === "string") {
            attrName = member.meta.attribute;
            attrNameNode = ((_b = member.meta.node) === null || _b === void 0 ? void 0 : _b.attribute) || member.node;
        }
        if (attrName != null && attrNameNode != null && attrNameNode.getSourceFile() === context.file && !(0, is_valid_name_js_1.isValidAttributeName)(attrName)) {
            context.report({
                location: (0, range_util_js_1.rangeFromNode)(attrNameNode),
                message: "'".concat(attrName, "' is not a valid attribute name.")
            });
        }
    }
};
exports.default = rule;
