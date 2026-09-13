export type CleanupNumericValuesParams = {
    floatPrecision?: number | undefined;
    leadingZero?: boolean | undefined;
    defaultPx?: boolean | undefined;
    convertToPx?: boolean | undefined;
};
/**
 * @typedef CleanupNumericValuesParams
 * @property {number=} floatPrecision
 * @property {boolean=} leadingZero
 * @property {boolean=} defaultPx
 * @property {boolean=} convertToPx
 */
export declare const name = "cleanupNumericValues";
export declare const description = "rounds numeric values to the fixed precision, removes default \"px\" units";
/**
 * Round numeric values to the fixed precision, remove default 'px' units.
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<CleanupNumericValuesParams>}
 * @since 0.1.3
 */
export declare const fn: import('../lib/types.js').Plugin<CleanupNumericValuesParams>;
