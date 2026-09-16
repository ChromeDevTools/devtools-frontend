import { baseOf, convert } from '../convertUnits.js';

/**
 * If `dims` contain exactly one numerator / one denominator pair with the
 * same base type and convertible units, return the numeric factor produced
 * by cancelling them and the list of remaining (uncancelled) dims.
 * Otherwise return null. Used by `simplifyProduct` for typed division
 * (§10.2). More complex cancellation (e.g. `px^2 / px`) is left
 * unreduced — consumers rarely rely on it and the spec doesn't require it.
 * @template {{ exponent: 1 | -1, value: number, unit: string }} D
 * @param {D[]} dims
 * @return {{ factor: number, remaining: D[] } | null}
 */
function tryCancelPair(dims) {
  if (dims.length !== 2) {
    return null;
  }
  const [a, b] = /** @type {[D, D]} */ (dims);
  if (a.exponent === b.exponent) {
    return null;
  }
  const numerator = a.exponent === 1 ? a : b;
  const denominator = a.exponent === 1 ? b : a;
  const numBase = baseOf(numerator.unit);
  const denBase = baseOf(denominator.unit);
  if (!numBase || numBase !== denBase) {
    return null;
  }
  const converted = convert(numerator.value, numerator.unit, denominator.unit);
  if (converted === null) {
    return null;
  }
  // denominator.value === 0 yields ±Infinity / NaN naturally (§10.9.1).
  return { factor: converted / denominator.value, remaining: [] };
}

export { tryCancelPair };
