import { AnalyzerFlavor } from "../analyzer-flavor";
import { discoverDefinitions } from "./discover-definitions";
import { discoverEvents } from "./discover-events";
import { discoverInheritance } from "./discover-inheritance";
import { discoverMembers } from "./discover-members";
import { discoverMethods } from "./discover-methods";
import { excludeNode } from "./exclude-node";
/**
 * A flavor that discovers using standard custom element rules
 */
export declare class CustomElementFlavor implements AnalyzerFlavor {
    excludeNode: typeof excludeNode;
    discoverDefinitions: typeof discoverDefinitions;
    discoverFeatures: {
        member: typeof discoverMembers;
        event: typeof discoverEvents;
        method: typeof discoverMethods;
    };
    discoverGlobalFeatures: Partial<import("../analyzer-flavor").FeatureDiscoverVisitMap<import("../..").AnalyzerVisitContext>> | undefined;
    discoverInheritance: typeof discoverInheritance;
}
//# sourceMappingURL=custom-element-flavor.d.ts.map