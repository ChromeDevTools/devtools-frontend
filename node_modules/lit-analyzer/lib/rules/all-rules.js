"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_RULES = void 0;
var no_boolean_in_attribute_binding_js_1 = __importDefault(require("./no-boolean-in-attribute-binding.js"));
var no_complex_attribute_binding_js_1 = __importDefault(require("./no-complex-attribute-binding.js"));
var no_expressionless_property_binding_js_1 = __importDefault(require("./no-expressionless-property-binding.js"));
var no_incompatible_property_type_js_1 = __importDefault(require("./no-incompatible-property-type.js"));
var no_incompatible_type_binding_js_1 = __importDefault(require("./no-incompatible-type-binding.js"));
var no_invalid_attribute_name_js_1 = __importDefault(require("./no-invalid-attribute-name.js"));
var no_invalid_directive_binding_js_1 = __importDefault(require("./no-invalid-directive-binding.js"));
var no_invalid_tag_name_js_1 = __importDefault(require("./no-invalid-tag-name.js"));
var no_legacy_attribute_js_1 = __importDefault(require("./no-legacy-attribute.js"));
var no_missing_element_type_definition_js_1 = __importDefault(require("./no-missing-element-type-definition.js"));
var no_missing_import_js_1 = __importDefault(require("./no-missing-import.js"));
var no_noncallable_event_binding_js_1 = __importDefault(require("./no-noncallable-event-binding.js"));
var no_nullable_attribute_binding_js_1 = __importDefault(require("./no-nullable-attribute-binding.js"));
var no_property_visibility_mismatch_js_1 = __importDefault(require("./no-property-visibility-mismatch.js"));
var no_unclosed_tag_js_1 = __importDefault(require("./no-unclosed-tag.js"));
var no_unintended_mixed_binding_js_1 = __importDefault(require("./no-unintended-mixed-binding.js"));
var no_unknown_attribute_js_1 = __importDefault(require("./no-unknown-attribute.js"));
var no_unknown_event_js_1 = __importDefault(require("./no-unknown-event.js"));
var no_unknown_property_js_1 = __importDefault(require("./no-unknown-property.js"));
var no_unknown_slot_js_1 = __importDefault(require("./no-unknown-slot.js"));
var no_unknown_tag_name_js_1 = __importDefault(require("./no-unknown-tag-name.js"));
exports.ALL_RULES = [
    no_expressionless_property_binding_js_1.default,
    no_unintended_mixed_binding_js_1.default,
    no_unknown_slot_js_1.default,
    no_noncallable_event_binding_js_1.default,
    no_nullable_attribute_binding_js_1.default,
    no_complex_attribute_binding_js_1.default,
    no_boolean_in_attribute_binding_js_1.default,
    no_invalid_directive_binding_js_1.default,
    no_incompatible_type_binding_js_1.default,
    no_missing_import_js_1.default,
    no_unclosed_tag_js_1.default,
    no_unknown_tag_name_js_1.default,
    no_unknown_attribute_js_1.default,
    no_unknown_property_js_1.default,
    no_unknown_event_js_1.default,
    no_incompatible_property_type_js_1.default,
    no_invalid_tag_name_js_1.default,
    no_invalid_attribute_name_js_1.default,
    no_property_visibility_mismatch_js_1.default,
    no_legacy_attribute_js_1.default,
    no_missing_element_type_definition_js_1.default
];
