import { num, call } from '../node.js';

/** @typedef {import('../node.js').Node} Node */

/**
 * @param {Node[]} args
 * @return {Node}
 */
function simplifyExp(args) {
  if (args.length !== 1 || args[0].type !== 'Num') {
    return call('exp', args);
  }
  return num(Math.exp(args[0].value));
}

export { simplifyExp };
