export type Node = import('../node.js').Node;
export type Num = import('../node.js').Num;
export type Dim = import('../node.js').Dim;
export type BaseType = import('../convertUnits.js').BaseType;
/** @typedef {import('../node.js').Node} Node */
/** @typedef {import('../node.js').Num} Num */
/** @typedef {import('../node.js').Dim} Dim */
/** @typedef {import('../convertUnits.js').BaseType} BaseType */
/**
 * Construct a Num or Dim node from a folded result.
 * @param {{ unit: string }} fold
 * @param {number} value
 * @return {Num | Dim}
 */
declare function foldResult(fold: {
    unit: string;
}, value: number): Num | Dim;
/**
 * @param {Node[]} args
 * @return {{ values: number[], unit: string } | null}
 */
declare function foldConstArgs(args: Node[]): {
    values: number[];
    unit: string;
} | null;
export { foldConstArgs, foldResult };
