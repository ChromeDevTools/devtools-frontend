import { JSDocTag, Node } from "typescript";
import { JsDocTagParsed } from "../../types/js-doc";
import { AnalyzerVisitContext } from "../../analyzer-visit-context";
/**
 * Transforms jsdoc tags to a T array using a "transform"
 * @param node
 * @param tagNames
 * @param transform
 * @param context
 */
export declare function parseJsDocForNode<T>(node: Node, tagNames: string[], transform: (tagNode: JSDocTag | undefined, parsed: JsDocTagParsed) => T | undefined, context: AnalyzerVisitContext): T[] | undefined;
//# sourceMappingURL=parse-js-doc-for-node.d.ts.map