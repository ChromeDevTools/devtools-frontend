/**
 * @typedef RemoveDescParams
 * @property {boolean=} removeAny
 */
export const name: "removeDesc";
export const description: "removes <desc>";
/**
 * Removes <desc>.
 * Removes only standard editors content or empty elements because it can be
 * used for accessibility. Enable parameter 'removeAny' to remove any
 * description.
 *
 * @author Daniel Wabyick
 * @see https://developer.mozilla.org/docs/Web/SVG/Element/desc
 *
 * @type {import('../lib/types.js').Plugin<RemoveDescParams>}
 */
export const fn: import("../lib/types.js").Plugin<RemoveDescParams>;
export type RemoveDescParams = {
    removeAny?: boolean | undefined;
};
