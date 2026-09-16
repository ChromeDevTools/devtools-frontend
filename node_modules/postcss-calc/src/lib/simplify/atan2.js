/* §10.4 — atan2. foldConstArgs already rejects percentages (property-
 context-resolved) and enforces shared base + static convertibility. */

import { num, dim, call } from '../node.js';
import { foldConstArgs } from './fold.js';

/** @typedef {import('../node.js').Node} Node */

/**
 * @param {Node[]} args
 * @return {Node}
 */
function simplifyAtan2(args) {
  if (args.length !== 2) {
    return call('atan2', args);
  }
  const fold = foldConstArgs(args);
  if (fold === null) {
    return call('atan2', args);
  }
  const [y, x] = /** @type {[number, number]} */ (fold.values);
  const radians = Math.atan2(y, x);
  if (Number.isNaN(radians)) {
    return num(Number.NaN);
  }
  return dim((radians * 180) / Math.PI, 'deg');
}

export { simplifyAtan2 };
