import { Node } from "typescript";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
/**
 * Excludes nodes from "lib.dom.d.ts" if analyzeLibDom is false
 * @param node
 * @param context
 */
export declare function excludeNode(node: Node, context: AnalyzerVisitContext): boolean | undefined;
//# sourceMappingURL=exclude-node.d.ts.map