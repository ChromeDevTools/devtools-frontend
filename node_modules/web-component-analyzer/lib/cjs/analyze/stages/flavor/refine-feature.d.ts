import { AnalyzerVisitContext } from "../../analyzer-visit-context";
import { AnalyzerDeclarationVisitContext, FeatureVisitReturnTypeMap } from "../../flavors/analyzer-flavor";
import { ComponentFeature, ComponentFeatureBase } from "../../types/features/component-feature";
export type RefineFeatureEmitMap = {
    [K in ComponentFeature]: (result: FeatureVisitReturnTypeMap[K]) => void;
};
/**
 * Uses flavors to refine a feature
 * Flavors can also remove a feature
 * @param featureKind
 * @param value
 * @param context
 * @param emitMap
 */
export declare function refineFeature<FeatureKind extends ComponentFeature, ValueType extends ComponentFeatureBase = FeatureVisitReturnTypeMap[FeatureKind]>(featureKind: FeatureKind, value: ValueType | ValueType[], context: AnalyzerVisitContext | AnalyzerDeclarationVisitContext, emitMap: Partial<RefineFeatureEmitMap>): void;
//# sourceMappingURL=refine-feature.d.ts.map