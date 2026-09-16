import { mkSum, num, dim } from '../node.js';
import { baseOf } from '../convertUnits.js';
import { mergeConvertibleBuckets } from './bucket.js';

/**
 * @typedef {import('../node.js').Node} Node
 * @typedef {import('../node.js').Sum} Sum
 * @typedef {import('../node.js').SumTerm} SumTerm
 * @typedef {import('../simplify.js').SimplifyFn} SimplifyFn
 * @typedef {import('./bucket.js').UnitBucket} UnitBucket
 */

// Subtracting near-equal terms leaves float dust: `0.07 * 1e7 - 700000` is
// 1.16e-10, not 0. Snap a total that's tiny next to its terms back to 0.
const NOISE_REL = Number.EPSILON * 8;

/**
 * @param {number} total
 * @param {number} scale largest |term| accumulated into `total`
 * @return {number}
 */
function denoise(total, scale) {
  return Math.abs(total) < scale * NOISE_REL ? 0 : total;
}

/**
 * @param {Sum} sum
 * @param {SimplifyFn} simplify
 * @return {Node}
 */
function simplifySum(sum, simplify) {
  // §10.10 two-phase dim handling: phase 1 buckets by exact unit (`1em + 1em`
  // → `2em`); phase 2 merges convertible same-base buckets into the first-
  // encountered unit. `100vh - 5rem - 10rem - 100px` → `-15rem` in phase 1,
  // then vh/rem/px stay separate in phase 2 (none convert to each other).
  let numTotal = 0;
  let numScale = 0;
  /** @type {Map<string, UnitBucket>} */
  const byUnit = new Map();
  /** @type {SumTerm[]} */
  const opaque = [];
  let bucketOrder = 0;

  /**
   * @param {1 | -1} sign
   * @param {Node} n
   * @return {void}
   */
  function processTerm(sign, n) {
    if (n.type === 'Sum') {
      // Parentheses around a sum are normally algebraically disposable. Keep
      // them only for an opaque sum used negatively: distributing that sign
      // changes the CSS value when a var() contains a sum of its own.
      if (
        n.grouped &&
        sign === -1 &&
        n.terms.some((t) => t.node.type !== 'Num' && t.node.type !== 'Dim')
      ) {
        opaque.push({ sign, node: n });
        return;
      }
      for (const inner of n.terms) {
        processTerm(/** @type {1 | -1} */ (sign * inner.sign), inner.node);
      }
      return;
    }
    if (n.type === 'Num') {
      numTotal += sign * n.value;
      numScale = Math.max(numScale, Math.abs(n.value));
      return;
    }
    if (n.type === 'Dim') {
      const key = n.unit.toLowerCase();
      const existing = byUnit.get(key);
      if (existing) {
        existing.total += sign * n.value;
        existing.scale = Math.max(existing.scale, Math.abs(n.value));
      } else {
        byUnit.set(key, {
          unit: n.unit,
          total: sign * n.value,
          scale: Math.abs(n.value),
          base: baseOf(n.unit),
          order: bucketOrder++,
        });
      }
      return;
    }
    opaque.push({ sign, node: n });
  }

  for (const t of sum.terms) {
    processTerm(t.sign, simplify(t.node));
  }

  // mkSum drops zero-valued Nums, so pushing the numeric total
  // unconditionally is harmless. Zero-valued unit buckets are kept for
  // type info (WPT calc-serialization-002).
  /** @type {SumTerm[]} */
  const terms = [{ sign: 1, node: num(denoise(numTotal, numScale)) }];
  for (const bucket of mergeConvertibleBuckets([...byUnit.values()])) {
    terms.push({
      sign: 1,
      node: dim(denoise(bucket.total, bucket.scale), bucket.unit),
    });
  }
  terms.push(...opaque);

  const result = mkSum(terms);
  // Keep the source grouping available to an enclosing subtraction. Numeric
  // groups have already folded and therefore do not need the marker.
  if (sum.grouped && result.type === 'Sum' && opaque.length > 0) {
    return { ...result, grouped: true };
  }
  return result;
}

export { simplifySum };
