"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAssignableInBooleanBinding = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var range_util_js_1 = require("../../../analyze/util/range-util.js");
var is_assignable_to_type_js_1 = require("./is-assignable-to-type.js");
function isAssignableInBooleanBinding(htmlAttr, _a, context) {
    var typeA = _a.typeA, typeB = _a.typeB;
    // Test if the user is trying to use ? modifier on a non-boolean type.
    if (!(0, is_assignable_to_type_js_1.isAssignableToType)({ typeA: { kind: "UNION", types: [{ kind: "BOOLEAN" }, { kind: "UNDEFINED" }, { kind: "NULL" }] }, typeB: typeB }, context)) {
        context.report({
            location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
            message: "Type '".concat((0, ts_simple_type_1.typeToString)(typeB), "' is not assignable to 'boolean'")
        });
        return false;
    }
    // Test if the user is trying to use the ? modifier on a non-boolean type.
    if (!(0, is_assignable_to_type_js_1.isAssignableToType)({ typeA: typeA, typeB: { kind: "BOOLEAN" } }, context)) {
        context.report({
            location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
            message: "You are using a boolean binding on a non boolean type '".concat((0, ts_simple_type_1.typeToString)(typeA), "'"),
            fix: function () {
                var htmlAttrTarget = context.htmlStore.getHtmlAttrTarget(htmlAttr);
                var newModifier = htmlAttrTarget == null ? "." : "";
                return {
                    message: newModifier.length === 0 ? "Remove '".concat(htmlAttr.modifier || "", "' modifier") : "Use '".concat(newModifier, "' modifier instead"),
                    actions: [
                        {
                            kind: "changeAttributeModifier",
                            htmlAttr: htmlAttr,
                            newModifier: newModifier
                        }
                    ]
                };
            }
        });
        return false;
    }
    return true;
}
exports.isAssignableInBooleanBinding = isAssignableInBooleanBinding;
