import { Node } from "typescript";
import { AnalyzerVisitContext } from "../analyzer-visit-context";
import { ComponentDeclaration } from "../types/component-declaration";
/**
 * Discovers features on component declaration nodes
 * @param initialDeclarationNodes
 * @param baseContext
 * @param options
 */
export declare function analyzeComponentDeclaration(initialDeclarationNodes: Node[], baseContext: AnalyzerVisitContext, options?: {
    visitedNodes?: Set<Node>;
}): ComponentDeclaration | undefined;
//# sourceMappingURL=analyze-declaration.d.ts.map