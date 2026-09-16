import { call } from '../node.js';
import { foldConstArgs, foldResult } from './fold.js';
import { simplifyMinMax } from './min-max.js';

/** @typedef {import('../node.js').Node} Node */

/**
 * @param {Node[]} args
 * @return {Node}
 */
function simplifyClamp(args) {
  if (args.length === 3) {
    const minNone = isNone(args[0]);
    const maxNone = isNone(args[2]);

    if (minNone && maxNone) {
      return args[1];
    }
    if (minNone) {
      return simplifyMinMax('min', [args[1], args[2]]);
    }
    if (maxNone) {
      return simplifyMinMax('max', [args[0], args[1]]);
    }

    const fold = foldConstArgs(args);
    if (fold !== null) {
      const [lo, v, hi] = /** @type {[number, number, number]} */ (fold.values);
      // Spec §10.8: clamp(MIN, VAL, MAX) = max(MIN, min(VAL, MAX)). The
      // outer max(MIN, …) means MIN wins when MIN > MAX — not MAX.
      const clamped = Math.max(lo, Math.min(v, hi));
      return foldResult(fold, clamped);
    }
  }
  return call('clamp', args);
}

/**
 * @param {Node} node
 * @return {boolean}
 */
function isNone(node) {
  return node.type === 'Ident' && node.name.toLowerCase() === 'none';
}

export { simplifyClamp };
