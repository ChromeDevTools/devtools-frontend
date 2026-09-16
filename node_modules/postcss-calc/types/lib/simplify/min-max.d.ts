export type Node = import('../node.js').Node;
/** @typedef {import('../node.js').Node} Node */
/**
 * @param {string} name
 * @param {Node[]} args
 * @return {Node}
 */
declare function simplifyMinMax(name: string, args: Node[]): Node;
export { simplifyMinMax };
