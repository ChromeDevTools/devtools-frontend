// Pre-simplify args once, route by name. Leaf folds receive simplified
// args so they don't need to recurse into `simplify` themselves.

import { simplifyMinMax } from './min-max.js';
import { simplifyClamp } from './clamp.js';
import { simplifyAbs } from './abs.js';
import { simplifySign } from './sign.js';
import { simplifyModRem } from './mod-rem.js';
import { simplifyRound } from './round.js';
import { simplifyTrig } from './trig.js';
import { simplifyInverseTrig } from './inverse-trig.js';
import { simplifyAtan2 } from './atan2.js';
import { simplifyPow } from './pow.js';
import { simplifySqrt } from './sqrt.js';
import { simplifyExp } from './exp.js';
import { simplifyLog } from './log.js';
import { simplifyHypot } from './hypot.js';

import { call } from '../node.js';

/** @typedef {import('../node.js').Node} Node */
/** @typedef {import('../simplify.js').SimplifyFn} SimplifyFn */

/** @typedef {(name: string, args: Node[]) => Node} MathSimplifier */

// Bare CSS math functions with implemented simplification semantics, keyed
// by lowercase name. calc() and its vendor-prefixed forms are handled
// separately as wrappers in simplifyCall. This map is the single source of
// truth for dispatch, `isSupportedMathFunction`, and `QUICK_MATH_TEST`.
/** @type {Map<string, MathSimplifier>} */
const MATH_SIMPLIFIERS = new Map([
  ['min', simplifyMinMax],
  ['max', simplifyMinMax],
  ['clamp', (_name, args) => simplifyClamp(args)],
  ['abs', (_name, args) => simplifyAbs(args)],
  ['sign', (_name, args) => simplifySign(args)],
  ['mod', (_name, args) => simplifyModRem('mod', args)],
  ['rem', (_name, args) => simplifyModRem('rem', args)],
  ['round', (_name, args) => simplifyRound(args)],
  ['sin', (_name, args) => simplifyTrig('sin', args)],
  ['cos', (_name, args) => simplifyTrig('cos', args)],
  ['tan', (_name, args) => simplifyTrig('tan', args)],
  ['asin', (_name, args) => simplifyInverseTrig('asin', args)],
  ['acos', (_name, args) => simplifyInverseTrig('acos', args)],
  ['atan', (_name, args) => simplifyInverseTrig('atan', args)],
  ['atan2', (_name, args) => simplifyAtan2(args)],
  ['pow', (_name, args) => simplifyPow(args)],
  ['sqrt', (_name, args) => simplifySqrt(args)],
  ['hypot', (_name, args) => simplifyHypot(args)],
  ['log', (_name, args) => simplifyLog(args)],
  ['exp', (_name, args) => simplifyExp(args)],
]);

const mathFnNames = [...MATH_SIMPLIFIERS.keys()].sort(
  (a, b) => b.length - a.length
);

const QUICK_MATH_TEST = new RegExp(
  `(?:-(?:webkit|moz)-)?(?:calc|${mathFnNames.join('|')})\\(`,
  'i'
);

/**
 * Fast check to determine whether a CSS component value could contain
 * a supported calculation or math function call (or an escape sequence
 * that could decode to one).
 *
 * @param {string} value
 * @return {boolean}
 */
function hasPotentialMathFunction(value) {
  return (
    value.includes('(') && (QUICK_MATH_TEST.test(value) || value.includes('\\'))
  );
}

/**
 * Whether a bare CSS math function has an implemented simplifier.
 *
 * @param {string} name
 * @return {boolean}
 */
function isSupportedMathFunction(name) {
  return MATH_SIMPLIFIERS.has(name.toLowerCase());
}

/**
 * @param {Extract<Node, { type: 'Call' }>} node
 * @param {SimplifyFn} simplify
 * @return {Node}
 */
function simplifyCall(node, simplify) {
  const name = node.name.toLowerCase();

  if (name === 'calc' || name === '-webkit-calc' || name === '-moz-calc') {
    if (node.args.length !== 1) {
      throw new Error(`${node.name}() takes exactly one argument`);
    }
    return simplify(node.args[0]);
  }

  const args = node.args.map((a) => simplify(a));

  const simplifier = MATH_SIMPLIFIERS.get(name);
  if (simplifier) {
    // min/max preserve the call's original casing in their opaque-args
    // fallback; the rest normalize to lowercase internally.
    return simplifier(
      name === 'min' || name === 'max' ? node.name : name,
      args
    );
  }

  return call(node.name, args);
}

export {
  isSupportedMathFunction,
  simplifyCall,
  hasPotentialMathFunction,
  QUICK_MATH_TEST,
};
