import { SimpleType } from "ts-simple-type";
import { ComponentCssPart, ComponentCssProperty, ComponentDeclaration, ComponentEvent, ComponentMember, ComponentSlot } from "web-component-analyzer";
export interface HtmlDataFeatures {
    attributes: HtmlAttr[];
    properties: HtmlProp[];
    events: HtmlEvent[];
    slots: HtmlSlot[];
    cssParts: HtmlCssPart[];
    cssProperties: HtmlCssProperty[];
}
export interface HtmlDataCollection {
    tags: HtmlTag[];
    global: Partial<HtmlDataFeatures>;
}
export interface NamedHtmlDataCollection {
    tags: string[];
    global: Partial<Record<keyof HtmlDataFeatures, string[]>>;
}
export interface HtmlTag extends HtmlDataFeatures {
    tagName: string;
    description?: string;
    builtIn?: boolean;
    global?: boolean;
    declaration?: ComponentDeclaration;
}
export type HtmlTagMemberKind = "attribute" | "property";
export interface HtmlMemberBase {
    kind: HtmlTagMemberKind;
    builtIn?: boolean;
    required?: boolean;
    description?: string;
    declaration?: ComponentMember;
    name?: string;
    fromTagName?: string;
    related?: HtmlMember[];
    getType(): SimpleType;
}
export interface HtmlAttr extends HtmlMemberBase {
    kind: "attribute";
    name: string;
    related?: HtmlMember[];
}
export interface HtmlProp extends HtmlMemberBase {
    kind: "property";
    name: string;
    related?: HtmlMember[];
}
export type HtmlMember = HtmlAttr | HtmlProp;
export interface HtmlEvent {
    name: string;
    description?: string;
    declaration?: ComponentEvent;
    builtIn?: boolean;
    global?: boolean;
    fromTagName?: string;
    related?: HtmlEvent[];
    getType(): SimpleType;
}
export interface HtmlSlot {
    name: string;
    fromTagName?: string;
    description?: string;
    declaration?: ComponentSlot;
    related?: HtmlCssPart[];
}
export interface HtmlCssPart {
    name: string;
    fromTagName?: string;
    description?: string;
    declaration?: ComponentCssPart;
    related?: HtmlCssPart[];
}
export interface HtmlCssProperty {
    name: string;
    fromTagName?: string;
    description?: string;
    typeHint?: string;
    declaration?: ComponentCssProperty;
    related?: HtmlCssProperty[];
}
export type HtmlAttrTarget = HtmlEvent | HtmlMember;
export declare function isHtmlMember(target: HtmlAttrTarget): target is HtmlMember;
export declare function isHtmlAttr(target: HtmlAttrTarget): target is HtmlAttr;
export declare function isHtmlProp(target: HtmlAttrTarget): target is HtmlProp;
export declare function isHtmlEvent(target: HtmlAttrTarget): target is HtmlEvent;
export declare function litAttributeModifierForTarget(target: HtmlAttrTarget): string;
export interface DescriptionOptions {
    markdown?: boolean;
}
export declare function documentationForCssPart(cssPart: HtmlCssPart, options?: DescriptionOptions): string | undefined;
export declare function documentationForCssProperty(cssProperty: HtmlCssProperty, options?: DescriptionOptions): string | undefined;
export declare function documentationForHtmlTag(htmlTag: HtmlTag, options?: DescriptionOptions): string | undefined;
export declare function documentationForTarget(target: HtmlAttrTarget, options?: DescriptionOptions & {
    modifier?: string;
}): string | undefined;
export declare function descriptionForTarget(target: HtmlAttrTarget, options?: DescriptionOptions): string | undefined;
export declare function targetKindAndTypeText(target: HtmlAttrTarget, options?: DescriptionOptions & {
    modifier?: string;
}): string;
export declare function targetKindText(target: HtmlAttrTarget): string;
export declare function mergeHtmlAttrs(attrs: HtmlAttr[]): HtmlAttr[];
export declare function mergeHtmlProps(props: HtmlProp[]): HtmlProp[];
export declare function mergeHtmlEvents(events: HtmlEvent[]): HtmlEvent[];
export declare function mergeHtmlSlots(slots: HtmlSlot[]): HtmlSlot[];
export declare function mergeCssParts(cssParts: HtmlCssPart[]): HtmlCssPart[];
export declare function mergeCssProperties(cssProperties: HtmlCssProperty[]): HtmlCssProperty[];
export declare function mergeHtmlTags(tags: HtmlTag[]): HtmlTag[];
//# sourceMappingURL=html-tag.d.ts.map