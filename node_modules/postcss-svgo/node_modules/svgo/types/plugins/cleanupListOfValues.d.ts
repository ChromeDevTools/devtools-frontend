/**
 * @typedef CleanupListOfValuesParams
 * @property {number=} floatPrecision
 * @property {boolean=} leadingZero
 * @property {boolean=} defaultPx
 * @property {boolean=} convertToPx
 */
export const name: "cleanupListOfValues";
export const description: "rounds list of values to the fixed precision";
/**
 * Round list of values to the fixed precision.
 *
 * @example
 * <svg viewBox="0 0 200.28423 200.28423" enable-background="new 0 0 200.28423 200.28423">
 *  ⬇
 * <svg viewBox="0 0 200.284 200.284" enable-background="new 0 0 200.284 200.284">
 *
 * <polygon points="208.250977 77.1308594 223.069336 ... "/>
 *  ⬇
 * <polygon points="208.251 77.131 223.069 ... "/>
 *
 * @author kiyopikko
 *
 * @type {import('../lib/types.js').Plugin<CleanupListOfValuesParams>}
 */
export const fn: import("../lib/types.js").Plugin<CleanupListOfValuesParams>;
export type CleanupListOfValuesParams = {
    floatPrecision?: number | undefined;
    leadingZero?: boolean | undefined;
    defaultPx?: boolean | undefined;
    convertToPx?: boolean | undefined;
};
