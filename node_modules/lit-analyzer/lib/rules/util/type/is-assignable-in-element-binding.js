"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAssignableInElementBinding = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var range_util_js_1 = require("../../../analyze/util/range-util.js");
var is_lit_directive_js_1 = require("../directive/is-lit-directive.js");
/**
 * Checks that the type represents a Lit 2 directive, which is the only valid
 * value for element expressions.
 */
function isAssignableInElementBinding(htmlAttr, type, context) {
    // TODO (justinfagnani): is there a better way to determine if the
    // type *contains* any, rather than *is* any?
    if (!(0, is_lit_directive_js_1.isLit2Directive)(type) && type.kind !== "ANY") {
        if ((0, is_lit_directive_js_1.isLit1Directive)(type)) {
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: "Type '".concat((0, ts_simple_type_1.typeToString)(type), "' is a lit-html 1.0 directive, not a Lit 2 directive'")
            });
        }
        else {
            context.report({
                location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
                message: "Type '".concat((0, ts_simple_type_1.typeToString)(type), "' is not a Lit 2 directive'")
            });
        }
        return false;
    }
    return true;
}
exports.isAssignableInElementBinding = isAssignableInElementBinding;
