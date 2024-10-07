import { Node } from "typescript";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
import { InheritanceResult } from "../../flavors/analyzer-flavor";
/**
 * Uses flavors to find inheritance for a node
 * @param node
 * @param context
 * @param emit
 * @param visitSet
 */
export declare function visitInheritance(node: Node, context: AnalyzerVisitContext, emit: (result: InheritanceResult) => void, visitSet?: Set<Node>): void;
//# sourceMappingURL=visit-inheritance.d.ts.map