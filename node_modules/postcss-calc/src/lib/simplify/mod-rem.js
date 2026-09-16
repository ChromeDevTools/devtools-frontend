import { num, call } from '../node.js';
import { foldConstArgs, foldResult } from './fold.js';

/** @typedef {import('../node.js').Node} Node */

/**
 * @param {'mod' | 'rem'} name
 * @param {Node[]} args
 * @return {Node}
 */
function simplifyModRem(name, args) {
  if (args.length !== 2) {
    return call(name, args);
  }
  const fold = foldConstArgs(args);
  if (fold === null) {
    return call(name, args);
  }
  const [a, b] = /** @type {[number, number]} */ (fold.values);
  const result = applyModRem(name, a, b);
  // NaN results drop the unit (`mod(5px, 0px)` → `calc(NaN)`, not
  // `calc(NaN * 1px)`). §10.12 unit-preserving form is a known divergence.
  if (Number.isNaN(result)) {
    return num(Number.NaN);
  }
  return foldResult(fold, result);
}

/**
 * @param {'mod' | 'rem'} name
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function applyModRem(name, a, b) {
  if (b === 0) {
    return Number.NaN;
  }
  if (!Number.isFinite(a)) {
    return Number.NaN;
  }
  if (!Number.isFinite(b)) {
    // mod: result is NaN when A has opposite sign to B; otherwise A.
    // rem: result is A regardless of signs.
    if (name === 'mod' && a !== 0 && Math.sign(a) !== Math.sign(b)) {
      return Number.NaN;
    }
    return a;
  }
  if (name === 'rem') {
    return a % b; // sign follows dividend
  }
  // sign follows divisor
  return a - b * Math.floor(a / b);
}

export { simplifyModRem };
