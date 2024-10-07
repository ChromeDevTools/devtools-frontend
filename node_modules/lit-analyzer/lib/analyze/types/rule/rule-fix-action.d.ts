import { Identifier, SourceFile } from "typescript";
import { HtmlNodeAttrAssignment } from "../html-node/html-node-attr-assignment-types.js";
import { HtmlNodeAttr } from "../html-node/html-node-attr-types.js";
import { HtmlNode } from "../html-node/html-node-types.js";
import { SourceFileRange } from "../range.js";
export type RuleFixActionKind = "changeTagName" | "addAttribute" | "changeAttributeName" | "changeAttributeModifier" | "changeAssignment" | "import" | "extendGlobalDeclaration" | "changeRange" | "changeIdentifier";
export interface RuleFixActionBase {
    kind: RuleFixActionKind;
    file?: SourceFile;
}
export interface RuleFixActionChangeTagName extends RuleFixActionBase {
    kind: "changeTagName";
    htmlNode: HtmlNode;
    newName: string;
}
export interface RuleFixActionAddAttribute extends RuleFixActionBase {
    kind: "addAttribute";
    htmlNode: HtmlNode;
    name: string;
    value?: string;
}
export interface RuleFixActionChangeAttributeName extends RuleFixActionBase {
    kind: "changeAttributeName";
    htmlAttr: HtmlNodeAttr;
    newName: string;
}
export interface RuleFixActionChangeAttributeModifier extends RuleFixActionBase {
    kind: "changeAttributeModifier";
    htmlAttr: HtmlNodeAttr;
    newModifier: string;
}
export interface RuleFixActionChangeAssignment extends RuleFixActionBase {
    kind: "changeAssignment";
    assignment: HtmlNodeAttrAssignment;
    newValue: string;
}
export interface RuleFixActionChangeIdentifier extends RuleFixActionBase {
    kind: "changeIdentifier";
    identifier: Identifier;
    newText: string;
}
export interface RuleFixActionImport extends RuleFixActionBase {
    kind: "import";
    file: SourceFile;
    path: string;
    identifiers?: string[];
}
export interface RuleFixActionChangeRange extends RuleFixActionBase {
    kind: "changeRange";
    range: SourceFileRange;
    newText: string;
}
export interface RuleFixActionExtendGlobalDeclaration extends RuleFixActionBase {
    kind: "extendGlobalDeclaration";
    name: string;
    newMembers: string[];
}
export type RuleFixAction = RuleFixActionChangeTagName | RuleFixActionAddAttribute | RuleFixActionChangeAttributeName | RuleFixActionImport | RuleFixActionChangeAttributeModifier | RuleFixActionChangeAssignment | RuleFixActionChangeIdentifier | RuleFixActionExtendGlobalDeclaration | RuleFixActionChangeRange;
//# sourceMappingURL=rule-fix-action.d.ts.map