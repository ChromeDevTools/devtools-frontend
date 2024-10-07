import { AnalyzerFlavor } from "../analyzer-flavor";
import { discoverMembers } from "./discover-members";
import { discoverDefinitions } from "./discover-definitions";
/**
 * Flavors for analyzing LWC related features: https://lwc.dev/
 */
export declare class LwcFlavor implements AnalyzerFlavor {
    discoverDefinitions: typeof discoverDefinitions;
    discoverFeatures: {
        member: typeof discoverMembers;
    };
    refineFeature: Partial<import("../analyzer-flavor").FeatureRefineVisitMap> | undefined;
}
//# sourceMappingURL=lwc-flavor.d.ts.map