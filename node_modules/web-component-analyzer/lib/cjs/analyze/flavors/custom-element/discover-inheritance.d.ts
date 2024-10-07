import { Node } from "typescript";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
import { InheritanceResult } from "../analyzer-flavor";
/**
 * Discovers inheritance from a node by looking at "extends" and "implements"
 * @param node
 * @param baseContext
 */
export declare function discoverInheritance(node: Node, baseContext: AnalyzerVisitContext): InheritanceResult | undefined;
//# sourceMappingURL=discover-inheritance.d.ts.map