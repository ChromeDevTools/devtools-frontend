import { Node } from "typescript";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
import { DefinitionNodeResult } from "../analyzer-flavor";
/**
 * Visits lit-element related definitions.
 * Specifically it finds the usage of the @customElement decorator.
 * @param node
 * @param context
 */
export declare function discoverDefinitions(node: Node, context: AnalyzerVisitContext): DefinitionNodeResult[] | undefined;
//# sourceMappingURL=discover-definitions.d.ts.map