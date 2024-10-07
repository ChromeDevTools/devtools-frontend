import { Node } from "typescript";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
import { AnalyzerDeclarationVisitContext, AnalyzerFlavor, FeatureVisitReturnTypeMap } from "../../flavors/analyzer-flavor";
import { ComponentFeature } from "../../types/features/component-feature";
export type VisitFeatureEmitMap = {
    [K in ComponentFeature]: (result: FeatureVisitReturnTypeMap[K][]) => void;
};
/**
 * Uses flavors to find features for a node
 * @param node
 * @param context
 * @param emitMap
 */
export declare function visitFeatures<ReturnType>(node: Node, context: AnalyzerDeclarationVisitContext, emitMap: Partial<VisitFeatureEmitMap>): void;
/**
 * Uses flavors to find features for a node, using a visit map
 * @param node
 * @param context
 * @param visitMaps
 * @param emitMap
 */
export declare function visitFeaturesWithVisitMaps<ReturnType>(node: Node, context: AnalyzerVisitContext, visitMaps: NonNullable<AnalyzerFlavor["discoverFeatures"]>[], emitMap: Partial<VisitFeatureEmitMap>): void;
//# sourceMappingURL=visit-features.d.ts.map