export type Node = import('../node.js').Node;
export type SimplifyFn = import('../simplify.js').SimplifyFn;
export type MathSimplifier = (name: string, args: Node[]) => Node;
declare const QUICK_MATH_TEST: RegExp;
/**
 * Fast check to determine whether a CSS component value could contain
 * a supported calculation or math function call (or an escape sequence
 * that could decode to one).
 *
 * @param {string} value
 * @return {boolean}
 */
declare function hasPotentialMathFunction(value: string): boolean;
/**
 * Whether a bare CSS math function has an implemented simplifier.
 *
 * @param {string} name
 * @return {boolean}
 */
declare function isSupportedMathFunction(name: string): boolean;
/**
 * @param {Extract<Node, { type: 'Call' }>} node
 * @param {SimplifyFn} simplify
 * @return {Node}
 */
declare function simplifyCall(node: Extract<Node, {
    type: 'Call';
}>, simplify: SimplifyFn): Node;
export { isSupportedMathFunction, simplifyCall, hasPotentialMathFunction, QUICK_MATH_TEST, };
