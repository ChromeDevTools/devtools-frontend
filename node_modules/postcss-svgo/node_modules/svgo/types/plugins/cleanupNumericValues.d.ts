/**
 * @typedef CleanupNumericValuesParams
 * @property {number=} floatPrecision
 * @property {boolean=} leadingZero
 * @property {boolean=} defaultPx
 * @property {boolean=} convertToPx
 */
export const name: "cleanupNumericValues";
export const description: "rounds numeric values to the fixed precision, removes default \"px\" units";
/**
 * Round numeric values to the fixed precision, remove default 'px' units.
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<CleanupNumericValuesParams>}
 */
export const fn: import("../lib/types.js").Plugin<CleanupNumericValuesParams>;
export type CleanupNumericValuesParams = {
    floatPrecision?: number | undefined;
    leadingZero?: boolean | undefined;
    defaultPx?: boolean | undefined;
    convertToPx?: boolean | undefined;
};
