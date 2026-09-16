import { num, ident, call } from '../node.js';
import { foldConstArgs, foldResult } from './fold.js';

/** @typedef {import('../node.js').Node} Node */

const ROUND_STRATEGIES = new Set(['nearest', 'up', 'down', 'to-zero']);
/** @typedef {'nearest' | 'up' | 'down' | 'to-zero'} RoundStrategy */

/**
 * @param {Node[]} args
 * @return {Node}
 */
function simplifyRound(args) {
  /** @type {RoundStrategy} */ let strategy = 'nearest';
  let rest = args;
  const first = args[0];
  if (first?.type === 'Ident') {
    const n = first.name.toLowerCase();
    if (!ROUND_STRATEGIES.has(n)) {
      // Unrecognized strategy ident — opaque rather than guessing intent.
      return call('round', args);
    }
    strategy = /** @type {RoundStrategy} */ (n);
    rest = args.slice(1);
  }

  /** @type {() => Node} */
  const passthrough = () =>
    call('round', strategy === 'nearest' ? rest : [ident(strategy), ...rest]);

  // B omitted: defaults to 1 when A is <number>; else opaque.
  const argsForFold = argsForRoundFold(rest);
  const fold = argsForFold && foldConstArgs(argsForFold);
  if (!fold) {
    return passthrough();
  }

  const [a, b] = /** @type {[number, number]} */ (fold.values);
  // Spec §10.7.1 non-finite step: NaN propagates; both infinite cancels to
  // NaN. Infinite step with finite A is strategy-dependent — the multiples
  // of an infinite step are {-∞, 0, +∞}, so `up` (ceiling) lands on +∞ for
  // positive A and `down` (floor) lands on -∞ for negative A; every other
  // case folds to ±0 carrying A's sign. Infinite-A / finite-B falls through
  // to applyRound, where floor*b===ceil*b===±∞ collapses back to A
  // (§10.3.1 "result is the same infinity").
  if (Number.isNaN(b)) {
    return num(Number.NaN);
  }
  if (!Number.isFinite(b)) {
    if (!Number.isFinite(a)) {
      return num(Number.NaN);
    }
    let result;
    if (strategy === 'up' && a > 0) {
      result = Infinity;
    } else if (strategy === 'down' && a < 0) {
      result = -Infinity;
    } else {
      result = a < 0 || Object.is(a, -0) ? -0 : 0;
    }
    return foldResult(fold, result);
  }

  const result = applyRound(strategy, a, b);
  if (Number.isNaN(result)) {
    return num(Number.NaN);
  }
  return foldResult(fold, result);
}

/**
 * @param {Node[]} args
 * @return {Node[] | null}
 */
function argsForRoundFold(args) {
  if (args.length === 2) {
    return args;
  }
  if (args.length === 1 && args[0].type === 'Num') {
    return [args[0], num(1)];
  }
  return null;
}

/**
 * @param {RoundStrategy} strategy
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function applyRound(strategy, a, b) {
  if (b === 0) {
    return Number.NaN;
  }
  const q = a / b;
  const c1 = Math.floor(q) * b;
  const c2 = Math.ceil(q) * b;
  // With negative B, floor*B > ceil*B; spec defines lower as closer to -∞.
  const lower = Math.min(c1, c2);
  const upper = Math.max(c1, c2);
  if (lower === upper) {
    return a;
  }
  switch (strategy) {
    case 'up':
      return upper;
    case 'down':
      return lower;
    case 'to-zero':
      return Math.abs(lower) <= Math.abs(upper) ? lower : upper;
    case 'nearest': {
      const dl = a - lower;
      const du = upper - a;
      return du <= dl ? upper : lower; // tie → upper (§10.3 line 978)
    }
  }
}

export { simplifyRound };
