import { LitHtmlAttributeModifier } from "../../constants.js";
import { HtmlDocument } from "../../parse/document/text-document/html-document/html-document.js";
import { Range } from "../range.js";
import { HtmlNodeAttrAssignment } from "./html-node-attr-assignment-types.js";
import { HtmlNode } from "./html-node-types.js";
export declare enum HtmlNodeAttrKind {
    EVENT_LISTENER = "EVENT_LISTENER",
    ATTRIBUTE = "ATTRIBUTE",
    BOOLEAN_ATTRIBUTE = "BOOLEAN_ATTRIBUTE",
    PROPERTY = "PROPERTY"
}
export interface IHtmlNodeAttrSourceCodeLocation extends Range {
    name: Range;
}
export interface IHtmlNodeAttrBase {
    name: string;
    modifier?: LitHtmlAttributeModifier;
    location: IHtmlNodeAttrSourceCodeLocation;
    assignment?: HtmlNodeAttrAssignment;
    htmlNode: HtmlNode;
    document: HtmlDocument;
}
export interface IHtmlNodeAttrEventListener extends IHtmlNodeAttrBase {
    kind: HtmlNodeAttrKind.EVENT_LISTENER;
    modifier: "@";
}
export interface IHtmlNodeAttrProp extends IHtmlNodeAttrBase {
    kind: HtmlNodeAttrKind.PROPERTY;
    modifier: ".";
}
export interface IHtmlNodeBooleanAttribute extends IHtmlNodeAttrBase {
    kind: HtmlNodeAttrKind.BOOLEAN_ATTRIBUTE;
    modifier: "?";
}
export interface IHtmlNodeAttr extends IHtmlNodeAttrBase {
    kind: HtmlNodeAttrKind.ATTRIBUTE;
    modifier: undefined;
}
export type HtmlNodeAttr = IHtmlNodeAttrEventListener | IHtmlNodeAttrProp | IHtmlNodeAttr | IHtmlNodeBooleanAttribute;
export declare function isHTMLAttr(obj: object): obj is IHtmlNodeAttrBase;
//# sourceMappingURL=html-node-attr-types.d.ts.map