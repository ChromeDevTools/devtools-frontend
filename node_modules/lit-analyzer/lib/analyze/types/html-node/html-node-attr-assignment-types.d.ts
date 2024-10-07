import { Expression } from "typescript";
import { Range } from "../range.js";
import { HtmlNodeAttr } from "./html-node-attr-types.js";
export declare enum HtmlNodeAttrAssignmentKind {
    BOOLEAN = "BOOLEAN",
    EXPRESSION = "EXPRESSION",
    STRING = "STRING",
    MIXED = "MIXED",
    ELEMENT_EXPRESSION = "ELEMENT_EXPRESSION"
}
export interface IHtmlNodeAttrAssignmentBase {
    location?: Range;
    htmlAttr: HtmlNodeAttr;
}
export interface IHtmlNodeAttrAssignmentExpression extends IHtmlNodeAttrAssignmentBase {
    kind: HtmlNodeAttrAssignmentKind.EXPRESSION;
    location: Range;
    expression: Expression;
}
export interface IHtmlNodeAttrAssignmentElement extends IHtmlNodeAttrAssignmentBase {
    kind: HtmlNodeAttrAssignmentKind.ELEMENT_EXPRESSION;
    expression: Expression;
}
export interface IHtmlNodeAttrAssignmentString extends IHtmlNodeAttrAssignmentBase {
    kind: HtmlNodeAttrAssignmentKind.STRING;
    location: Range;
    value: string;
}
export interface IHtmlNodeAttrAssignmentBoolean extends IHtmlNodeAttrAssignmentBase {
    kind: HtmlNodeAttrAssignmentKind.BOOLEAN;
}
export interface IHtmlNodeAttrAssignmentMixed extends IHtmlNodeAttrAssignmentBase {
    kind: HtmlNodeAttrAssignmentKind.MIXED;
    location: Range;
    values: (Expression | string)[];
}
export type HtmlNodeAttrAssignment = IHtmlNodeAttrAssignmentBoolean | IHtmlNodeAttrAssignmentExpression | IHtmlNodeAttrAssignmentString | IHtmlNodeAttrAssignmentMixed | IHtmlNodeAttrAssignmentElement;
//# sourceMappingURL=html-node-attr-assignment-types.d.ts.map