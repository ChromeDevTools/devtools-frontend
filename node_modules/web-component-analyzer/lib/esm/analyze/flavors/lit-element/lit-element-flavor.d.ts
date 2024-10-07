import { AnalyzerFlavor } from "../analyzer-flavor";
import { discoverDefinitions } from "./discover-definitions";
import { discoverMembers } from "./discover-members";
import { excludeNode } from "./exclude-node";
/**
 * Flavors for analyzing LitElement related features: https://lit-element.polymer-project.org/
 */
export declare class LitElementFlavor implements AnalyzerFlavor {
    excludeNode: typeof excludeNode;
    discoverDefinitions: typeof discoverDefinitions;
    discoverFeatures: {
        member: typeof discoverMembers;
    };
    refineFeature: Partial<import("../analyzer-flavor").FeatureRefineVisitMap> | undefined;
}
//# sourceMappingURL=lit-element-flavor.d.ts.map