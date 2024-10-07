import { SimpleType } from "ts-simple-type";
import { Type, TypeChecker } from "typescript";
import { HtmlNodeAttrAssignment } from "../../../analyze/types/html-node/html-node-attr-assignment-types.js";
import { RuleModuleContext } from "../../../analyze/types/rule/rule-module-context.js";
export declare function extractBindingTypes(assignment: HtmlNodeAttrAssignment, context: RuleModuleContext): {
    typeA: SimpleType;
    typeB: SimpleType;
};
export declare function inferTypeFromAssignment(assignment: HtmlNodeAttrAssignment, checker: TypeChecker): SimpleType | Type;
/**
 * Relax the type so that for example "string literal" become "string" and "function" become "any"
 * This is used for javascript files to provide type checking with Typescript type inferring
 * @param type
 */
export declare function relaxType(type: SimpleType): SimpleType;
//# sourceMappingURL=extract-binding-types.d.ts.map