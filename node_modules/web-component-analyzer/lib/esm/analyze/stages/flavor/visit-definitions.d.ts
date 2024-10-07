import { Node } from "typescript";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
import { DefinitionNodeResult } from "../../flavors/analyzer-flavor";
/**
 * Uses flavors to visit definitions
 * @param node
 * @param context
 * @param emit
 */
export declare function visitDefinitions(node: Node, context: AnalyzerVisitContext, emit: (results: DefinitionNodeResult[]) => void): void;
//# sourceMappingURL=visit-definitions.d.ts.map