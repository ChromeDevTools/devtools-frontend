import { SimpleType } from "ts-simple-type";
import { Node, Type } from "typescript";
import { VisibilityKind } from "../visibility-kind";
import { ComponentFeatureBase } from "./component-feature";
export interface ComponentMethod extends ComponentFeatureBase {
    name: string;
    node?: Node;
    type?: () => SimpleType | Type;
    visibility?: VisibilityKind;
}
//# sourceMappingURL=component-method.d.ts.map