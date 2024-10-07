import { SimpleType } from "ts-simple-type";
import { HtmlNodeAttr } from "../../../analyze/types/html-node/html-node-attr-types.js";
import { RuleModuleContext } from "../../../analyze/types/rule/rule-module-context.js";
/**
 * Checks that the type represents a Lit 2 directive, which is the only valid
 * value for element expressions.
 */
export declare function isAssignableInElementBinding(htmlAttr: HtmlNodeAttr, type: SimpleType, context: RuleModuleContext): boolean | undefined;
//# sourceMappingURL=is-assignable-in-element-binding.d.ts.map