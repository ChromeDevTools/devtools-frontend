"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAssignableBindingUnderSecuritySystem = void 0;
var ts_simple_type_1 = require("ts-simple-type");
var is_lit_directive_js_1 = require("../directive/is-lit-directive.js");
var range_util_js_1 = require("../../../analyze/util/range-util.js");
/**
 * If the user's security policy overrides normal type checking for this
 * attribute binding, returns a (possibly empty) array of diagnostics.
 *
 * If the security policy does not apply to this binding, then
 */
function isAssignableBindingUnderSecuritySystem(htmlAttr, _a, context) {
    var typeA = _a.typeA, typeB = _a.typeB;
    var securityPolicy = context.config.securitySystem;
    switch (securityPolicy) {
        case "off":
            return undefined; // No security checks apply.
        case "ClosureSafeTypes":
            return checkClosureSecurityAssignability(typeB, htmlAttr, context);
        default: {
            var never = securityPolicy;
            context.logger.error("Unexpected security policy: ".concat(never));
            return undefined;
        }
    }
}
exports.isAssignableBindingUnderSecuritySystem = isAssignableBindingUnderSecuritySystem;
var closureScopedOverrides = {
    iframe: {
        src: ["TrustedResourceUrl"]
    },
    a: {
        href: ["TrustedResourceUrl", "SafeUrl", "string"]
    },
    img: {
        src: ["TrustedResourceUrl", "SafeUrl", "string"]
    },
    script: {
        src: ["TrustedResourceUrl"]
    },
    source: {
        src: ["TrustedResourceUrl", "SafeUrl"]
    }
};
var closureGlobalOverrides = {
    style: ["SafeStyle", "string"]
};
function checkClosureSecurityAssignability(typeB, htmlAttr, context) {
    var scopedOverride = closureScopedOverrides[htmlAttr.htmlNode.tagName];
    var overriddenTypes = (scopedOverride && scopedOverride[htmlAttr.name]) || closureGlobalOverrides[htmlAttr.name];
    if (overriddenTypes === undefined) {
        return undefined;
    }
    // `any` is allowed to bind to anything.
    if (typeB.kind === "ANY") {
        return undefined;
    }
    // Directives are responsible for their own security.
    if ((0, is_lit_directive_js_1.isLitDirective)(typeB)) {
        return undefined;
    }
    var typeMatch = matchesAtLeastOneNominalType(overriddenTypes, typeB);
    if (typeMatch === false) {
        /*const nominalType: SimpleType = {
            kind: SimpleTypeKind.INTERFACE,
            members: [],
            name: "A security type"
        };*/
        context.report({
            location: (0, range_util_js_1.rangeFromHtmlNodeAttr)(htmlAttr),
            message: "Type '".concat((0, ts_simple_type_1.typeToString)(typeB), "' is not assignable to '").concat(overriddenTypes.join(" | "), "'. This is due to Closure Safe Type enforcement.")
        });
        return false;
    }
    return true;
}
function normalizeTypeName(typeName) {
    // Attempt to take a clutz type name for a goog.module type, which looks like
    // module$contents$goog$html$SafeUrl_SafeUrl and extract the
    // actual type name (SafeUrl in that case)
    var match = typeName.match(/module\$.*_(.*)/);
    if (match == null) {
        return undefined;
    }
    return match[1];
}
function matchesAtLeastOneNominalType(typeNames, typeB) {
    // Check if typeB.name is in typeNames, either before or after normalization.
    var typeBName = typeB.name;
    if (typeBName !== undefined) {
        if (typeNames.includes(typeBName)) {
            return true;
        }
        var normalized = normalizeTypeName(typeBName);
        if (normalized !== undefined && typeNames.includes(normalized)) {
            return true;
        }
    }
    // Otherwise, check for other cases beyond just a simple named type.
    switch (typeB.kind) {
        case "UNION":
            return typeB.types.every(function (t) { return matchesAtLeastOneNominalType(typeNames, t); });
        case "STRING_LITERAL":
        case "STRING":
            return typeNames.includes("string");
        case "GENERIC_ARGUMENTS":
            return matchesAtLeastOneNominalType(typeNames, typeB.target);
        default:
            return false;
    }
}
