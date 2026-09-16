// Canonical AST. N-ary Sum and Product with signed numeric leaves.
// Invariants enforced by the constructors below:
//
//   - Num/Dim values may be any finite number (negatives allowed); a `-5`
//     is `Num(-5)`, never `Sum([{sign:-1, Num(5)}])`. One form per value.
//   - In a SumTerm with Num/Dim node, sign is always +1; the sign slot is
//     reserved for opaque nodes (Ident, Call, Product, multi-term Sum).
//   - No ungrouped Sum directly contains another Sum (flattened on
//     construction). A grouped Sum is retained so a later negative sign
//     cannot be distributed across opaque terms.
//   - No Product directly contains another Product (flattened).
//   - A Sum/Product with one positive element collapses to that element.
//   - A Sum/Product with no elements collapses to Num(0) / Num(1).
//   - Zero-valued Nums are dropped from sums (they contribute nothing).
//     Zero-valued Dims are kept — the unit carries type info.

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
function num(value) {
  return { type: 'Num', value };
}

/**
 * @param {number} value
 * @param {string} unit
 * @return {Dim}
 */
function dim(value, unit) {
  return { type: 'Dim', value, unit };
}

/**
 * @param {string} name
 * @return {Ident}
 */
function ident(name) {
  return { type: 'Ident', name };
}

/**
 * @param {string} name
 * @param {Node[]} args
 * @return {Call}
 */
function call(name, args) {
  return { type: 'Call', name, args };
}

/**
 * @param {SumTerm[]} rawTerms
 * @return {Node}
 */
function mkSum(rawTerms) {
  /** @type {SumTerm[]} */
  const flat = [];
  for (const t of rawTerms) {
    pushSumTerm(flat, t);
  }
  if (flat.length === 0) {
    return num(0);
  }
  if (flat.length === 1 && flat[0].sign === 1) {
    return flat[0].node;
  }
  return { type: 'Sum', terms: flat };
}

/**
 * @param {SumTerm[]} out
 * @param {SumTerm} term
 * @return {void}
 */
function pushSumTerm(out, term) {
  let { sign, node } = term;

  if (node.type === 'Sum' && !node.grouped) {
    for (const inner of node.terms) {
      pushSumTerm(out, {
        sign: /** @type {1 | -1} */ (sign * inner.sign),
        node: inner.node,
      });
    }
    return;
  }

  // sign=-1 around a Num/Dim leaf collapses into the value's sign — the
  // canonical-form rule downstream code relies on.
  if (sign === -1) {
    if (node.type === 'Num') {
      node = num(-node.value);
      sign = 1;
    } else if (node.type === 'Dim') {
      node = dim(-node.value, node.unit);
      sign = 1;
    }
  }

  // Drop zero-valued Nums. Dims with value 0 stay — the unit carries type.
  if (node.type === 'Num' && node.value === 0) {
    return;
  }

  out.push({ sign, node });
}

/**
 * @param {ProductFactor[]} rawFactors
 * @return {Node}
 */
function mkProduct(rawFactors) {
  /** @type {ProductFactor[]} */
  const flat = [];
  for (const f of rawFactors) {
    pushProductFactor(flat, f);
  }
  if (flat.length === 0) {
    return num(1);
  }
  if (flat.length === 1 && flat[0].exponent === 1) {
    return flat[0].node;
  }
  return { type: 'Product', factors: flat };
}

/**
 * @param {ProductFactor[]} out
 * @param {ProductFactor} f
 * @return {void}
 */
function pushProductFactor(out, f) {
  const n = f.node;
  if (n.type === 'Product') {
    for (const inner of n.factors) {
      out.push({
        exponent: /** @type {1 | -1} */ (f.exponent * inner.exponent),
        node: inner.node,
      });
    }
    return;
  }
  // Factor of 1 contributes nothing regardless of exponent (1/1 = 1).
  if (n.type === 'Num' && n.value === 1) {
    return;
  }
  out.push(f);
}

/**
 * Negate any node, preserving canonical form.
 * @param {Node} node
 * @return {Node}
 */
function negate(node) {
  if (node.type === 'Num') {
    return num(-node.value);
  }
  if (node.type === 'Dim') {
    return dim(-node.value, node.unit);
  }
  if (node.type === 'Sum') {
    const result = mkSum(
      node.terms.map((t) => ({
        sign: /** @type {1 | -1} */ (-t.sign),
        node: t.node,
      }))
    );
    return node.grouped && result.type === 'Sum'
      ? { ...result, grouped: true }
      : result;
  }
  // Opaque (Ident, Call, Product): wrap as a single negative-sign term —
  // the only case where sign=-1 remains on a SumTerm.
  return mkSum([{ sign: -1, node }]);
}

export { num, dim, ident, call, mkSum, mkProduct, negate };
