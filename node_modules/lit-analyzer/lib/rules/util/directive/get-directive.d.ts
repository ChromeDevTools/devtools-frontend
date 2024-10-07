import { SimpleType } from "ts-simple-type";
import { Expression } from "typescript";
import { HtmlNodeAttrAssignment } from "../../../analyze/types/html-node/html-node-attr-assignment-types.js";
import { RuleModuleContext } from "../../../analyze/types/rule/rule-module-context.js";
export type BuiltInDirectiveKind = "ifDefined" | "guard" | "classMap" | "styleMap" | "unsafeHTML" | "cache" | "repeat" | "live" | "templateContent" | "unsafeSVG" | "asyncReplace" | "asyncAppend";
export interface UserDefinedDirectiveKind {
    name: string;
}
interface Directive {
    kind: BuiltInDirectiveKind | UserDefinedDirectiveKind;
    actualType?: () => SimpleType | undefined;
    args: Expression[];
}
export declare function getDirective(assignment: HtmlNodeAttrAssignment, context: RuleModuleContext): Directive | undefined;
export {};
//# sourceMappingURL=get-directive.d.ts.map