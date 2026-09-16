/* §10.10 phase 2: merge convertible same-base unit buckets into the
   first-encountered unit (px absorbs cm/in/pt/pc, deg absorbs
   rad/grad/turn, …). Buckets with `base === null` (relative or unknown
   units) keep their own slot.
 */

import { convert } from '../convertUnits.js';

/**
 * @typedef {object} UnitBucket
 * @property {string} unit
 * @property {number} total
 * @property {number} scale largest |term| accumulated into `total`, for noise detection
 * @property {import('../convertUnits.js').BaseType | null} base
 * @property {number} order
 */

/** Mutates `buckets` in place — totals of survivor buckets accumulate the
 *  converted values of merged neighbors. Caller must not reuse the input.
 * @param {UnitBucket[]} buckets
 * @return {UnitBucket[]}
 */
function mergeConvertibleBuckets(buckets) {
  const ordered = buckets.sort((a, b) => a.order - b.order);
  /** @type {Set<string>} */ const merged = new Set();
  /** @type {UnitBucket[]} */ const out = [];
  for (const b of ordered) {
    const keyB = b.unit.toLowerCase();
    if (merged.has(keyB)) {
      continue;
    }
    merged.add(keyB);
    if (b.base !== null) {
      for (const other of ordered) {
        const keyO = other.unit.toLowerCase();
        if (merged.has(keyO)) {
          continue;
        }
        if (other.base !== b.base) {
          continue;
        }
        const converted = convert(other.total, other.unit, b.unit);
        if (converted !== null) {
          b.total += converted;
          merged.add(keyO);
        }
      }
    }
    out.push(b);
  }
  return out;
}

export { mergeConvertibleBuckets };
