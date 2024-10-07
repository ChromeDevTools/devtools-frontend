import { Node } from "typescript";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
type ComponentRef = {
    tagName: string;
};
export declare function getLwcComponent(node: Node, context: AnalyzerVisitContext): ComponentRef | undefined;
/**
 * Checks if the element has an lwc property decorator (@api).
 * @param node
 * @param context
 */
export declare function hasLwcApiPropertyDecorator(node: Node, context: AnalyzerVisitContext): boolean;
export {};
//# sourceMappingURL=utils.d.ts.map