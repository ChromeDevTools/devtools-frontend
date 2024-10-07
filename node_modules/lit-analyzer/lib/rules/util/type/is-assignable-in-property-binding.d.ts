import { SimpleType } from "ts-simple-type";
import { HtmlNodeAttr } from "../../../analyze/types/html-node/html-node-attr-types.js";
import { RuleModuleContext } from "../../../analyze/types/rule/rule-module-context.js";
export declare function isAssignableInPropertyBinding(htmlAttr: HtmlNodeAttr, { typeA, typeB }: {
    typeA: SimpleType;
    typeB: SimpleType;
}, context: RuleModuleContext): boolean | undefined;
//# sourceMappingURL=is-assignable-in-property-binding.d.ts.map