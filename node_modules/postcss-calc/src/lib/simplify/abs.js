import { num, dim, call } from '../node.js';

/** @typedef {import('../node.js').Node} Node */

/**
 * @param {Node[]} args
 * @return {Node}
 */
function simplifyAbs(args) {
  if (args.length !== 1) {
    return call('abs', args);
  }
  const a = args[0];
  if (a.type === 'Num') {
    return num(Math.abs(a.value));
  }
  if (a.type === 'Dim' && a.unit !== '%') {
    return dim(Math.abs(a.value), a.unit);
  }
  return call('abs', [a]);
}

export { simplifyAbs };
