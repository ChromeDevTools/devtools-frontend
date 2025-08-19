/**
 * @typedef Usage
 * @property {boolean=} force
 * @property {boolean=} ids
 * @property {boolean=} classes
 * @property {boolean=} tags
 *
 * @typedef MinifyStylesParams
 * @property {boolean=} restructure Disable or enable a structure optimizations.
 * @property {boolean=} forceMediaMerge
 *   Enables merging of `@media` rules with the same media query split by other
 *   rules. Unsafe in general, but should work fine in most cases. Use it on
 *   your own risk.
 * @property {'exclamation' | 'first-exclamation' | boolean=} comments
 *   Specify what comments to leave:
 *   - `'exclamation'` or `true` — leave all exclamation comments
 *   - `'first-exclamation'` — remove every comment except first one
 *   - `false` — remove all comments
 * @property {boolean | Usage=} usage Advanced optimizations.
 */
export const name: "minifyStyles";
export const description: "minifies styles and removes unused styles";
/**
 * Minifies styles (<style> element + style attribute) using CSSO.
 *
 * @author strarsis <strarsis@gmail.com>
 * @type {import('../lib/types.js').Plugin<MinifyStylesParams>}
 */
export const fn: import("../lib/types.js").Plugin<MinifyStylesParams>;
export type Usage = {
    force?: boolean | undefined;
    ids?: boolean | undefined;
    classes?: boolean | undefined;
    tags?: boolean | undefined;
};
export type MinifyStylesParams = {
    /**
     * Disable or enable a structure optimizations.
     */
    restructure?: boolean | undefined;
    /**
     *  Enables merging of `@media` rules with the same media query split by other
     *  rules. Unsafe in general, but should work fine in most cases. Use it on
     *  your own risk.
     */
    forceMediaMerge?: boolean | undefined;
    /**
     *  Specify what comments to leave:
     *  - `'exclamation'` or `true` — leave all exclamation comments
     *  - `'first-exclamation'` — remove every comment except first one
     *  - `false` — remove all comments
     */
    comments?: ("exclamation" | "first-exclamation" | boolean) | undefined;
    /**
     * Advanced optimizations.
     */
    usage?: (boolean | Usage) | undefined;
};
