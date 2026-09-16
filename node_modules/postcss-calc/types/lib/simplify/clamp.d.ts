export type Node = import('../node.js').Node;
/** @typedef {import('../node.js').Node} Node */
/**
 * @param {Node[]} args
 * @return {Node}
 */
declare function simplifyClamp(args: Node[]): Node;
export { simplifyClamp };
