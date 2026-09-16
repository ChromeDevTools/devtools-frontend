import { num, call } from '../node.js';

/** @typedef {import('../node.js').Node} Node */

/**
 * @param {Node[]} args
 * @return {Node}
 */
function simplifySign(args) {
  if (args.length !== 1) {
    return call('sign', args);
  }
  const a = args[0];
  if (a.type === 'Num') {
    return num(Math.sign(a.value));
  }
  // %: sign is property-context-dependent (§10.6) — opaque.
  if (a.type === 'Dim' && a.unit !== '%') {
    return num(Math.sign(a.value));
  }
  return call('sign', [a]);
}

export { simplifySign };
