import { Node } from "typescript";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
import { DefinitionNodeResult } from "../analyzer-flavor";
/**
 * Visits custom element definitions.
 * @param node
 * @param ts
 * @param checker
 */
export declare function discoverDefinitions(node: Node, { ts, checker }: AnalyzerVisitContext): DefinitionNodeResult[] | undefined;
//# sourceMappingURL=discover-definitions.d.ts.map