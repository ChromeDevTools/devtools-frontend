import { num, call } from '../node.js';

/** @typedef {import('../node.js').Node} Node */
/**
 * @param {Node[]} args
 * @return {Node}
 */
function simplifySqrt(args) {
  if (args.length !== 1 || args[0].type !== 'Num') {
    return call('sqrt', args);
  }
  return num(Math.sqrt(args[0].value));
}

export { simplifySqrt };
