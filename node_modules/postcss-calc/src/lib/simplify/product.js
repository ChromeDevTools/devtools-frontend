import { mkSum, mkProduct, num, dim } from '../node.js';
import { tryCancelPair } from './cancel.js';

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
function simplifyProduct(product, simplify) {
  let coeff = 1;
  /** @type {{exponent: 1 | -1, value: number, unit: string}[]} */
  const dims = [];
  /** @type {ProductFactor[]} */
  const opaque = [];
  /** @type {{exponent: 1 | -1, value: number}[]} */
  const scalarChain = [];

  /**
   * @param {1 | -1} exponent
   * @param {Node} n
   * @return {void}
   */
  function processFactor(exponent, n) {
    if (n.type === 'Product') {
      for (const inner of n.factors) {
        processFactor(
          /** @type {1 | -1} */ (exponent * inner.exponent),
          inner.node
        );
      }
      return;
    }
    // Canonical negation form (see node.js's `negate`); flatten through it
    // like a nested Product so cancellation below can see what's inside.
    if (n.type === 'Sum' && n.terms.length === 1) {
      processFactor(exponent, num(-1));
      processFactor(exponent, n.terms[0].node);
      return;
    }
    if (n.type === 'Num') {
      if (exponent === 1) {
        coeff *= n.value;
      } else {
        coeff /= n.value; // §10.9.1: 1/0 → ±Infinity, 0/0 → NaN per IEEE-754
      }
      scalarChain.push({ exponent, value: n.value });
      return;
    }
    if (n.type === 'Dim') {
      dims.push({ exponent, value: n.value, unit: n.unit });
      scalarChain.push({ exponent, value: n.value });
      return;
    }
    opaque.push({ exponent, node: n });
  }

  for (const f of product.factors) {
    processFactor(f.exponent, simplify(f.node));
  }

  // §10.2 typed division. Higher-power cancellation (`px^2 / px`) is left
  // unreduced — consumers don't rely on it and the spec doesn't require it.
  const cancelled = tryCancelPair(dims);
  if (cancelled !== null) {
    coeff *= cancelled.factor;
  }
  const remainingDims = cancelled ? cancelled.remaining : dims;

  // §10.10 distributive multiplication: `0.5 * (100vw - 10px)` → `50vw - 5px`.
  // Only distribute when every Sum term is Num/Dim — partial distribution
  // over opaque terms matches neither the legacy implementation nor csstools.
  if (
    remainingDims.length === 0 &&
    opaque.length === 1 &&
    opaque[0].exponent === 1 &&
    opaque[0].node.type === 'Sum' &&
    opaque[0].node.terms.every(
      (t) => t.node.type === 'Num' || t.node.type === 'Dim'
    )
  ) {
    const sum = opaque[0].node;
    const distributed = sum.terms.map((t) => ({
      sign: t.sign,
      node: simplify(
        mkProduct([
          { exponent: 1, node: num(coeff) },
          { exponent: 1, node: t.node },
        ])
      ),
    }));
    return mkSum(distributed);
  }

  if (
    remainingDims.length === 1 &&
    remainingDims[0].exponent === 1 &&
    opaque.length === 0
  ) {
    const d = remainingDims[0];
    let value = 1;
    for (const f of scalarChain) {
      if (f.exponent === 1) {
        value = value * f.value;
      } else {
        value = value / f.value;
      }
    }
    return dim(value, d.unit);
  }

  if (remainingDims.length === 0 && opaque.length === 0) {
    return num(coeff);
  }

  /** @type {ProductFactor[]} */
  const factors = [];
  if (coeff !== 1) {
    factors.push({ exponent: 1, node: num(coeff) });
  }
  for (const d of remainingDims) {
    factors.push({ exponent: d.exponent, node: dim(d.value, d.unit) });
  }
  factors.push(...opaque);

  return mkProduct(factors);
}

export { simplifyProduct };
