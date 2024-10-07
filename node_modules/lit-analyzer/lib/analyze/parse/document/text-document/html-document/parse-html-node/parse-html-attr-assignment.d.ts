import { HtmlNodeAttrAssignment } from "../../../../../types/html-node/html-node-attr-assignment-types.js";
import { HtmlNodeAttr } from "../../../../../types/html-node/html-node-attr-types.js";
import { IP5NodeAttr, IP5TagNode } from "../parse-html-p5/parse-html-types.js";
import { ParseHtmlContext } from "./parse-html-context.js";
/**
 * Parses a html attribute assignment.
 * @param p5Node
 * @param p5Attr
 * @param htmlAttr
 * @param context
 */
export declare function parseHtmlAttrAssignment(p5Node: IP5TagNode, p5Attr: IP5NodeAttr, htmlAttr: HtmlNodeAttr, context: ParseHtmlContext): HtmlNodeAttrAssignment | undefined;
//# sourceMappingURL=parse-html-attr-assignment.d.ts.map