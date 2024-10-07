import { HtmlNodeAttr } from "../../../../../types/html-node/html-node-attr-types.js";
import { IP5NodeAttr, IP5TagNode } from "../parse-html-p5/parse-html-types.js";
import { ParseHtmlAttrContext } from "./parse-html-attr-context.js";
/**
 * Creates multiple html attributes based on multiple p5Attributes.
 * @param p5Node
 * @param context
 */
export declare function parseHtmlNodeAttrs(p5Node: IP5TagNode, context: ParseHtmlAttrContext): HtmlNodeAttr[];
/**
 * Creates a html attr based on a p5Attr.
 * @param p5Node
 * @param p5Attr
 * @param context
 */
export declare function parseHtmlNodeAttr(p5Node: IP5TagNode, p5Attr: IP5NodeAttr, context: ParseHtmlAttrContext): HtmlNodeAttr | undefined;
//# sourceMappingURL=parse-html-attribute.d.ts.map