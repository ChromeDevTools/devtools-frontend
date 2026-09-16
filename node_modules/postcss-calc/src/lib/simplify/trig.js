// §10.4 — sin/cos/tan. <number> is radians; <angle> dim is converted.

import { num, call } from '../node.js';
import { baseOf, convert } from '../convertUnits.js';

/** @typedef {import('../node.js').Node} Node */

const TRIG_OPS = /** @type {const} */ ({
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
});

/**
 * @param {'sin' | 'cos' | 'tan'} name
 * @param {Node[]} args
 * @return {Node}
 */
function simplifyTrig(name, args) {
  if (args.length !== 1) {
    return call(name, args);
  }
  const a = args[0];
  /** @type {number | null} */ let radians = null;
  if (a.type === 'Num') {
    radians = a.value;
  } else if (a.type === 'Dim' && a.unit !== '%' && baseOf(a.unit) === 'angle') {
    // The `baseOf === 'angle'` check and the `inDeg !== null` guard below
    // are observationally equivalent under current type tables (every
    // angle unit has a TO_CANONICAL entry). Stryker flags both as
    // equivalent-mutant survivors — keep them; they're load-bearing
    // defense against future unit additions.
    const inDeg = convert(a.value, a.unit, 'deg');
    if (inDeg !== null) {
      radians = (inDeg * Math.PI) / 180;
    }
  }
  if (radians === null) {
    return call(name, args);
  }
  return num(TRIG_OPS[name](radians));
}

export { simplifyTrig };
