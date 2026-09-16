export type Node = import('./node.js').Node;
export type Sum = import('./node.js').Sum;
export type Product = import('./node.js').Product;
export type ProductFactor = import('./node.js').ProductFactor;
export type SerializeOptions = {
    /**
     * Decimal places for numbers. `false` disables rounding. Default 5.
     */
    precision?: number | false;
    /**
     * Wrapper name to use when `calc()` is needed. Default `'calc'`.
     */
    calcName?: string;
    /**
     * Serialize finite negative scalars without a wrapper. Internal selector-only mode.
     */
    unwrapSingleNegativeNumber?: boolean;
};
/**
 * @param {Node} node
 * @param {SerializeOptions} [opts]
 * @return {string}
 */
declare function serialize(node: Node, opts?: SerializeOptions): string;
export { serialize };
