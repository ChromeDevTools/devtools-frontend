// Spec: https://www.w3.org/TR/css-values-4/#calc-simplification
// One top-down pass over a canonical AST. Per-concern fold modules in
// ./simplify/; this file is the entry + dispatch only.

import { simplifySum } from './simplify/sum.js';
import { simplifyProduct } from './simplify/product.js';
import { simplifyCall } from './simplify/call.js';

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
function simplify(node) {
  switch (node.type) {
    case 'Num':
    case 'Dim':
    case 'Ident':
      return node;
    case 'Call':
      return simplifyCall(node, simplify);
    case 'Sum':
      return simplifySum(node, simplify);
    case 'Product':
      return simplifyProduct(node, simplify);
  }
}

export { simplify };
