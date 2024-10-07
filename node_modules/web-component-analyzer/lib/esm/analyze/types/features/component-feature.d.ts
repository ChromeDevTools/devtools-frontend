import { ComponentDeclaration } from "../component-declaration";
import { JsDoc } from "../js-doc";
export type ComponentFeature = "member" | "method" | "cssproperty" | "csspart" | "event" | "slot";
export declare const ALL_COMPONENT_FEATURES: ComponentFeature[];
export interface ComponentFeatureBase {
    jsDoc?: JsDoc;
    declaration?: ComponentDeclaration;
}
//# sourceMappingURL=component-feature.d.ts.map