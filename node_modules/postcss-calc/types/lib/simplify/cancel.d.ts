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
declare function tryCancelPair<D extends {
    exponent: 1 | -1;
    value: number;
    unit: string;
}>(dims: D[]): {
    factor: number;
    remaining: D[];
} | null;
export { tryCancelPair };
