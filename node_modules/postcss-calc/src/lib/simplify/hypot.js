// §10.5 — hypot. Empty args return null from foldConstArgs naturally.

import { call } from '../node.js';
import { foldConstArgs, foldResult } from './fold.js';

/** @typedef {import('../node.js').Node} Node */

/**
 * @param {Node[]} args
 * @return {Node}
 */
function simplifyHypot(args) {
  const fold = foldConstArgs(args);
  if (fold === null) {
    return call('hypot', args);
  }
  const sumSq = fold.values.reduce((acc, v) => acc + v * v, 0);
  const result = Math.sqrt(sumSq);
  return foldResult(fold, result);
}

export { simplifyHypot };
