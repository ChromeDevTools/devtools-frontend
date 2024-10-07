import { SimpleType } from "ts-simple-type";
import { Node, Type } from "typescript";
import { PriorityKind } from "../../flavors/analyzer-flavor";
import { ModifierKind } from "../modifier-kind";
import { VisibilityKind } from "../visibility-kind";
import { ComponentFeatureBase } from "./component-feature";
import { LitElementPropertyConfig } from "./lit-element-property-config";
export type ComponentMemberKind = "property" | "attribute";
export type ComponentMemberReflectKind = "to-attribute" | "to-property" | "both";
export interface ComponentMemberBase extends ComponentFeatureBase {
    kind: ComponentMemberKind;
    node: Node;
    priority?: PriorityKind;
    typeHint?: string;
    type: undefined | (() => Type | SimpleType);
    meta?: LitElementPropertyConfig;
    visibility?: VisibilityKind;
    reflect?: ComponentMemberReflectKind;
    required?: boolean;
    deprecated?: boolean | string;
    default?: unknown;
    modifiers?: Set<ModifierKind>;
}
export interface ComponentMemberProperty extends ComponentMemberBase {
    kind: "property";
    propName: string;
    attrName?: string;
}
export interface ComponentMemberAttribute extends ComponentMemberBase {
    kind: "attribute";
    attrName: string;
    propName?: undefined;
    modifiers?: undefined;
}
export type ComponentMember = ComponentMemberProperty | ComponentMemberAttribute;
//# sourceMappingURL=component-member.d.ts.map