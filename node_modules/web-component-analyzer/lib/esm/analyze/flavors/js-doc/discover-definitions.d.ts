import { Node } from "typescript";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
import { DefinitionNodeResult } from "../analyzer-flavor";
/**
 * Discovers definitions using "@customElement" or "@element" jsdoc
 * @param node
 * @param context
 */
export declare function discoverDefinitions(node: Node, context: AnalyzerVisitContext): DefinitionNodeResult[] | undefined;
//# sourceMappingURL=discover-definitions.d.ts.map