import { HtmlNode } from "../../../../../types/html-node/html-node-types.js";
import { IP5TagNode, P5Node } from "../parse-html-p5/parse-html-types.js";
import { ParseHtmlContext } from "./parse-html-context.js";
/**
 * Parses multiple p5Nodes into multiple html nodes.
 * @param p5Nodes
 * @param parent
 * @param context
 */
export declare function parseHtmlNodes(p5Nodes: P5Node[], parent: HtmlNode | undefined, context: ParseHtmlContext): HtmlNode[];
/**
 * Parses a single p5Node into a html node.
 * @param p5Node
 * @param parent
 * @param context
 */
export declare function parseHtmlNode(p5Node: IP5TagNode, parent: HtmlNode | undefined, context: ParseHtmlContext): HtmlNode | undefined;
//# sourceMappingURL=parse-html-node.d.ts.map