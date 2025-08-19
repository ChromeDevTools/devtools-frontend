/**
 * @typedef InlineStylesParams
 * @property {boolean=} onlyMatchedOnce Inlines selectors that match once only.
 * @property {boolean=} removeMatchedSelectors
 *   Clean up matched selectors. Unused selects are left as-is.
 * @property {string[]=} useMqs
 *   Media queries to use. An empty string indicates all selectors outside of
 *   media queries.
 * @property {string[]=} usePseudos
 *   Pseudo-classes and elements to use. An empty string indicates all
 *   non-pseudo-classes and elements.
 */
export const name: "inlineStyles";
export const description: "inline styles (additional options)";
/**
 * Merges styles from style nodes into inline styles.
 *
 * @type {import('../lib/types.js').Plugin<InlineStylesParams>}
 * @author strarsis <strarsis@gmail.com>
 */
export const fn: import("../lib/types.js").Plugin<InlineStylesParams>;
export type InlineStylesParams = {
    /**
     * Inlines selectors that match once only.
     */
    onlyMatchedOnce?: boolean | undefined;
    /**
     *   Clean up matched selectors. Unused selects are left as-is.
     */
    removeMatchedSelectors?: boolean | undefined;
    /**
     *   Media queries to use. An empty string indicates all selectors outside of
     *   media queries.
     */
    useMqs?: string[] | undefined;
    /**
     *   Pseudo-classes and elements to use. An empty string indicates all
     *   non-pseudo-classes and elements.
     */
    usePseudos?: string[] | undefined;
};
