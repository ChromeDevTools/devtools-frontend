import { SimpleType, SimpleTypeComparisonOptions } from "ts-simple-type";
import { HtmlNodeAttrAssignment } from "../../../analyze/types/html-node/html-node-attr-assignment-types.js";
import { HtmlNodeAttr } from "../../../analyze/types/html-node/html-node-attr-types.js";
import { RuleModuleContext } from "../../../analyze/types/rule/rule-module-context.js";
export declare function isAssignableInAttributeBinding(htmlAttr: HtmlNodeAttr, { typeA, typeB }: {
    typeA: SimpleType;
    typeB: SimpleType;
}, context: RuleModuleContext): boolean | undefined;
/**
 * Assignability check that simulates string coercion
 * This is used to type check attribute bindings
 * @param typeA
 * @param typeB
 * @param options
 */
export declare function isAssignableToTypeWithStringCoercion(typeA: SimpleType, typeB: SimpleType, options: SimpleTypeComparisonOptions): boolean | undefined;
/**
 * Certain attributes like "role" are string literals, but should be type checked
 *   by comparing each item in the white-space-separated array against typeA
 * @param assignment
 * @param typeA
 * @param typeB
 * @param context
 */
export declare function isAssignableInPrimitiveArray(assignment: HtmlNodeAttrAssignment, { typeA, typeB }: {
    typeA: SimpleType;
    typeB: SimpleType;
}, context: RuleModuleContext): boolean | undefined;
//# sourceMappingURL=is-assignable-in-attribute-binding.d.ts.map