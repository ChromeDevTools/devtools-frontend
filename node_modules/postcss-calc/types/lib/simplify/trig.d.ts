export type Node = import('../node.js').Node;
/**
 * @param {'sin' | 'cos' | 'tan'} name
 * @param {Node[]} args
 * @return {Node}
 */
declare function simplifyTrig(name: 'sin' | 'cos' | 'tan', args: Node[]): Node;
export { simplifyTrig };
