/**
 * @typedef SortAttrsParams
 * @property {ReadonlyArray<string>=} order
 * @property {'front' | 'alphabetical'=} xmlnsOrder
 */
export const name: "sortAttrs";
export const description: "Sort element attributes for better compression";
/**
 * Sort element attributes for better compression
 *
 * @author Nikolay Frantsev
 *
 * @type {import('../lib/types.js').Plugin<SortAttrsParams>}
 */
export const fn: import("../lib/types.js").Plugin<SortAttrsParams>;
export type SortAttrsParams = {
    order?: ReadonlyArray<string> | undefined;
    xmlnsOrder?: ("front" | "alphabetical") | undefined;
};
