import { AnalyzerFlavor } from "../analyzer-flavor";
import { discoverDefinitions } from "./discover-definitions";
import { refineDeclaration } from "./refine-declaration";
/**
 * Flavors for analyzing jsdoc related features
 */
export declare class JsDocFlavor implements AnalyzerFlavor {
    discoverDefinitions: typeof discoverDefinitions;
    discoverFeatures: Partial<import("../analyzer-flavor").FeatureDiscoverVisitMap<import("../..").AnalyzerVisitContext>>;
    discoverGlobalFeatures: Partial<import("../analyzer-flavor").FeatureDiscoverVisitMap<import("../..").AnalyzerVisitContext>> | undefined;
    refineFeature: Partial<import("../analyzer-flavor").FeatureRefineVisitMap> | undefined;
    refineDeclaration: typeof refineDeclaration;
}
//# sourceMappingURL=js-doc-flavor.d.ts.map