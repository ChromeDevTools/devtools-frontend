import { IP5CommentNode, IP5DocumentFragmentNode, IP5NodeBase, IP5TagNode, IP5TextNode, P5Node } from "./parse-html-types.js";
/**
 * Returns if a p5Node is a tag node.
 * @param node
 */
export declare function isTagNode(node: P5Node): node is IP5TagNode;
/**
 * Returns if a p5Node is a document fragment.
 * @param node
 */
export declare function isDocumentFragmentNode(node: IP5NodeBase): node is IP5DocumentFragmentNode;
/**
 * Returns if a p5Node is a text node.
 * @param node
 */
export declare function isTextNode(node: P5Node): node is IP5TextNode;
/**
 * Returns if a p5Node is a comment node.
 * @param node
 */
export declare function isCommentNode(node: P5Node): node is IP5CommentNode;
/**
 * Parse a html string into p5Nodes.
 * @param html
 */
export declare function parseHtml(html: string): IP5DocumentFragmentNode;
//# sourceMappingURL=parse-html.d.ts.map