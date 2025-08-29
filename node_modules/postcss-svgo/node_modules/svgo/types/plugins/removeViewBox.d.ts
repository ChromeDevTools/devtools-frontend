export const name: "removeViewBox";
export const description: "removes viewBox attribute when possible";
/**
 * Remove viewBox attr which coincides with a width/height box.
 *
 * @see https://www.w3.org/TR/SVG11/coords.html#ViewBoxAttribute
 *
 * @example
 * <svg width="100" height="50" viewBox="0 0 100 50">
 *  ⬇
 * <svg width="100" height="50">
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin}
 */
export const fn: import("../lib/types.js").Plugin;
