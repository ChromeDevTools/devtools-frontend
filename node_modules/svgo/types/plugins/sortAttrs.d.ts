/**
 * @typedef SortAttrsParams
 * @property {ReadonlyArray<string>=} order
 * @property {'front' | 'alphabetical'=} xmlnsOrder
 */
export type SortAttrsParams = {
    order?: ReadonlyArray<string> | undefined;
    xmlnsOrder?: ('front' | 'alphabetical') | undefined;
};
export declare const name = "sortAttrs";
export declare const description = "Sort element attributes for better compression";
/**
 * Sort element attributes for better compression
 *
 * @author Nikolay Frantsev
 *
 * @type {import('../lib/types.js').Plugin<SortAttrsParams>}
 * @since 0.3.2
 */
export declare const fn: import('../lib/types.js').Plugin<SortAttrsParams>;
