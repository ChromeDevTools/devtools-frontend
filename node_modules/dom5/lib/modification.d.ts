import { ASTNode as Node } from 'parse5';
export { ASTNode as Node } from 'parse5';
export declare function cloneNode(node: Node): Node;
export declare function replace(oldNode: Node, newNode: Node): void;
export declare function remove(node: Node): void;
export declare function insertBefore(parent: Node, target: Node, newNode: Node): void;
export declare function insertAfter(parent: Node, target: Node, newNode: Node): void;
/**
 * Removes a node and places its children in its place.  If the node
 * has no parent, the operation is impossible and no action takes place.
 */
export declare function removeNodeSaveChildren(node: Node): void;
/**
 * When parse5 parses an HTML document with `parse`, it injects missing root
 * elements (html, head and body) if they are missing.  This function removes
 * these from the AST if they have no location info, so it requires that
 * the `parse5.parse` be used with the `locationInfo` option of `true`.
 */
export declare function removeFakeRootElements(ast: Node): void;
export declare function append(parent: Node, newNode: Node): void;
export declare const constructors: {
    text: (value: string) => Node;
    comment: (comment: string) => Node;
    element: (tagName: string, namespace?: string | undefined) => Node;
    fragment: () => Node;
};
