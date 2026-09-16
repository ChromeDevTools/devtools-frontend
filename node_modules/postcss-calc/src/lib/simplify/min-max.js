import { call } from '../node.js';
import { foldConstArgs, foldResult } from './fold.js';

/** @typedef {import('../node.js').Node} Node */

/**
 * @param {string} name
 * @param {Node[]} args
 * @return {Node}
 */
function simplifyMinMax(name, args) {
  const fold = foldConstArgs(args);
  if (fold !== null) {
    const fn = name.toLowerCase() === 'min' ? Math.min : Math.max;
    const value = fn(...fold.values);
    return foldResult(fold, value);
  }
  return call(name, args);
}

export { simplifyMinMax };
