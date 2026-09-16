export type Node = import('../node.js').Node;
export type RoundStrategy = 'nearest' | 'up' | 'down' | 'to-zero';
/** @typedef {'nearest' | 'up' | 'down' | 'to-zero'} RoundStrategy */
/**
 * @param {Node[]} args
 * @return {Node}
 */
declare function simplifyRound(args: Node[]): Node;
export { simplifyRound };
