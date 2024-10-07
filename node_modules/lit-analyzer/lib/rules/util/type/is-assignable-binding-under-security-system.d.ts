import { SimpleType } from "ts-simple-type";
import { HtmlNodeAttr } from "../../../analyze/types/html-node/html-node-attr-types.js";
import { RuleModuleContext } from "../../../analyze/types/rule/rule-module-context.js";
/**
 * If the user's security policy overrides normal type checking for this
 * attribute binding, returns a (possibly empty) array of diagnostics.
 *
 * If the security policy does not apply to this binding, then
 */
export declare function isAssignableBindingUnderSecuritySystem(htmlAttr: HtmlNodeAttr, { typeA, typeB }: {
    typeA: SimpleType;
    typeB: SimpleType;
}, context: RuleModuleContext): boolean | undefined;
//# sourceMappingURL=is-assignable-binding-under-security-system.d.ts.map