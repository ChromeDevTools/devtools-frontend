"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAssignableInPropertyBinding = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var range_util_js_1 = require("../../../analyze/util/range-util.js");
var is_assignable_binding_under_security_system_js_1 = require("./is-assignable-binding-under-security-system.js");
var is_assignable_to_type_js_1 = require("./is-assignable-to-type.js");
function isAssignableInPropertyBinding(htmlAttr, _a, context) {
    var typeA = _a.typeA, typeB = _a.typeB;
    var securitySystemResult = (0, is_assignable_binding_under_security_system_js_1.isAssignableBindingUnderSecuritySystem)(htmlAttr, { typeA: typeA, typeB: typeB }, context);
    if (securitySystemResult !== undefined) {
        // The security diagnostics take precedence here,
        //   and we should not do any more checking.
        return securitySystemResult;
    }
    if (!(0, is_assignable_to_type_js_1.isAssignableToType)({ typeA: typeA, typeB: typeB }, context)) {
        context.report({
            location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
            message: "Type '".concat((0, ts_simple_type_1.typeToString)(typeB), "' is not assignable to '").concat((0, ts_simple_type_1.typeToString)(typeA), "'")
        });
        return false;
    }
    return true;
}
exports.isAssignableInPropertyBinding = isAssignableInPropertyBinding;
