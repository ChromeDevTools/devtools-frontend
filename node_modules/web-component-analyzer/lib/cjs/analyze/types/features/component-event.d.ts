import { SimpleType } from "ts-simple-type";
import { Node, Type } from "typescript";
import { VisibilityKind } from "../visibility-kind";
import { ComponentFeatureBase } from "./component-feature";
export interface ComponentEvent extends ComponentFeatureBase {
    name: string;
    node: Node;
    type?: () => SimpleType | Type;
    typeHint?: string;
    visibility?: VisibilityKind;
    deprecated?: boolean | string;
}
//# sourceMappingURL=component-event.d.ts.map