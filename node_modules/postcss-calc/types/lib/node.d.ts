export type Num = {
    type: 'Num';
    value: number;
};
export type Dim = {
    type: 'Dim';
    value: number;
    unit: string;
};
export type Ident = {
    type: 'Ident';
    name: string;
};
export type Call = {
    type: 'Call';
    name: string;
    args: Node[];
};
export type SumTerm = {
    sign: 1 | -1;
    node: Node;
};
export type Sum = {
    type: 'Sum';
    terms: SumTerm[];
    grouped?: boolean;
};
export type ProductFactor = {
    exponent: 1 | -1;
    node: Node;
};
export type Product = {
    type: 'Product';
    factors: ProductFactor[];
};
export type Node = Num | Dim | Ident | Call | Sum | Product;
/**
 * @typedef {{type: 'Num', value: number}} Num
 * @typedef {{type: 'Dim', value: number, unit: string}} Dim
 * @typedef {{type: 'Ident', name: string}} Ident
 * @typedef {{type: 'Call', name: string, args: Node[]}} Call
 * @typedef {{sign: 1 | -1, node: Node}} SumTerm Sign is always +1 when node is Num or Dim.
 * @typedef {{type: 'Sum', terms: SumTerm[], grouped?: boolean}} Sum
 * @typedef {{exponent: 1 | -1, node: Node}} ProductFactor exponent +1 = numerator, -1 = denominator.
 * @typedef {{type: 'Product', factors: ProductFactor[]}} Product
 * @typedef {Num | Dim | Ident | Call | Sum | Product} Node
 */
/**
 * @param {number} value
 * @return {Num}
 */
declare function num(value: number): Num;
/**
 * @param {number} value
 * @param {string} unit
 * @return {Dim}
 */
declare function dim(value: number, unit: string): Dim;
/**
 * @param {string} name
 * @return {Ident}
 */
declare function ident(name: string): Ident;
/**
 * @param {string} name
 * @param {Node[]} args
 * @return {Call}
 */
declare function call(name: string, args: Node[]): Call;
/**
 * @param {SumTerm[]} rawTerms
 * @return {Node}
 */
declare function mkSum(rawTerms: SumTerm[]): Node;
/**
 * @param {ProductFactor[]} rawFactors
 * @return {Node}
 */
declare function mkProduct(rawFactors: ProductFactor[]): Node;
/**
 * Negate any node, preserving canonical form.
 * @param {Node} node
 * @return {Node}
 */
declare function negate(node: Node): Node;
export { num, dim, ident, call, mkSum, mkProduct, negate };
