/**
 * @typedef ConvertColorsParams
 * @property {boolean | string | RegExp=} currentColor
 * @property {boolean=} names2hex
 * @property {boolean=} rgb2hex
 * @property {false | 'lower' | 'upper'=} convertCase
 * @property {boolean=} shorthex
 * @property {boolean=} shortname
 */
export const name: "convertColors";
export const description: "converts colors: rgb() to #rrggbb and #rrggbb to #rgb";
/**
 * Convert different colors formats in element attributes to hex.
 *
 * @see https://www.w3.org/TR/SVG11/types.html#DataTypeColor
 * @see https://www.w3.org/TR/SVG11/single-page.html#types-ColorKeywords
 *
 * @example
 * Convert color name keyword to long hex:
 * fuchsia ➡ #ff00ff
 *
 * Convert rgb() to long hex:
 * rgb(255, 0, 255) ➡ #ff00ff
 * rgb(50%, 100, 100%) ➡ #7f64ff
 *
 * Convert long hex to short hex:
 * #aabbcc ➡ #abc
 *
 * Convert hex to short name
 * #000080 ➡ navy
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<ConvertColorsParams>}
 */
export const fn: import("../lib/types.js").Plugin<ConvertColorsParams>;
export type ConvertColorsParams = {
    currentColor?: (boolean | string | RegExp) | undefined;
    names2hex?: boolean | undefined;
    rgb2hex?: boolean | undefined;
    convertCase?: (false | "lower" | "upper") | undefined;
    shorthex?: boolean | undefined;
    shortname?: boolean | undefined;
};
