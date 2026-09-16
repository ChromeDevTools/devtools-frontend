export type Node = import('../node.js').Node;
export type Product = import('../node.js').Product;
export type ProductFactor = import('../node.js').ProductFactor;
export type SimplifyFn = import('../simplify.js').SimplifyFn;
/**
 * @typedef {import('../node.js').Node} Node
 * @typedef {import('../node.js').Product} Product
 * @typedef {import('../node.js').ProductFactor} ProductFactor
 * @typedef {import('../simplify.js').SimplifyFn} SimplifyFn
 */
/**
 * @param {Product} product
 * @param {SimplifyFn} simplify
 * @return {Node}
 */
declare function simplifyProduct(product: Product, simplify: SimplifyFn): Node;
export { simplifyProduct };
