import { Node } from "typescript";
import { AnalyzerVisitContext } from "../analyzer-visit-context";
import { InheritanceResult } from "../flavors/analyzer-flavor";
/**
 * Uses flavors in order to discover inheritance from one of more nodes.
 * @param startNode
 * @param visitedNodes
 * @param context
 */
export declare function discoverInheritance(startNode: Node | Node[], visitedNodes: Set<Node>, context: AnalyzerVisitContext): Required<InheritanceResult>;
//# sourceMappingURL=discover-inheritance.d.ts.map