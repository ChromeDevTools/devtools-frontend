export type Node = import('./node.js').Node;
export type SimplifyFn = (node: Node) => Node;
/**
 * @typedef {import('./node.js').Node} Node
 *
 * Recursive simplifier reference, threaded into Sum/Product/Call. Lets
 * leaf fold modules avoid circular imports of the entry function.
 * @typedef {(node: Node) => Node} SimplifyFn
 */
/**
 * @param {Node} node
 * @return {Node}
 */
declare function simplify(node: Node): Node;
export { simplify };
