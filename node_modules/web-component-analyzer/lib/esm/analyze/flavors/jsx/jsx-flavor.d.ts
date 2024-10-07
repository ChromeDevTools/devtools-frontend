import { AnalyzerFlavor } from "../analyzer-flavor";
import { discoverDefinitions } from "./discover-definitions";
/**
 * Flavors for analyzing jsx related features
 */
export declare class JSXFlavor implements AnalyzerFlavor {
    discoverDefinitions: typeof discoverDefinitions;
    discoverGlobalFeatures: Partial<import("../analyzer-flavor").FeatureDiscoverVisitMap<import("../..").AnalyzerVisitContext>> | undefined;
}
//# sourceMappingURL=jsx-flavor.d.ts.map