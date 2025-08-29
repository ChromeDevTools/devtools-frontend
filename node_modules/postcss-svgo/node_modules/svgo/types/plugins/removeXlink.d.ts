/**
 * @typedef RemoveXlinkParams
 * @property {boolean=} includeLegacy
 *   By default this plugin ignores legacy elements that were deprecated or
 *   removed in SVG 2. Set to true to force performing operations on those too.
 */
export const name: "removeXlink";
export const description: "remove xlink namespace and replaces attributes with the SVG 2 equivalent where applicable";
/**
 * Removes XLink namespace prefixes and converts references to XLink attributes
 * to the native SVG equivalent.
 *
 * XLink namespace is deprecated in SVG 2.
 *
 * @type {import('../lib/types.js').Plugin<RemoveXlinkParams>}
 * @see https://developer.mozilla.org/docs/Web/SVG/Attribute/xlink:href
 */
export const fn: import("../lib/types.js").Plugin<RemoveXlinkParams>;
export type RemoveXlinkParams = {
    /**
     *   By default this plugin ignores legacy elements that were deprecated or
     *   removed in SVG 2. Set to true to force performing operations on those too.
     */
    includeLegacy?: boolean | undefined;
};
