import * as csstree from 'css-tree';
/**
 * Compares selector specificities.
 * Derived from https://github.com/keeganstreet/specificity/blob/8757133ddd2ed0163f120900047ff0f92760b536/specificity.js#L207
 *
 * @param {import('./types.js').Specificity} a
 * @param {import('./types.js').Specificity} b
 * @returns {number}
 */
export declare const compareSpecificity: (a: import('./types.js').Specificity, b: import('./types.js').Specificity) => number;
/**
 * @param {import('./types.js').XastRoot} root
 * @returns {import('./types.js').Stylesheet}
 */
export declare const collectStylesheet: (root: import('./types.js').XastRoot) => import('./types.js').Stylesheet;
/**
 * @param {import('./types.js').Stylesheet} stylesheet
 * @param {import('./types.js').XastElement} node
 * @returns {import('./types.js').ComputedStyles}
 */
export declare const computeStyle: (stylesheet: import('./types.js').Stylesheet, node: import('./types.js').XastElement) => import('./types.js').ComputedStyles;
/**
 * Determines if the CSS selector includes or traverses the given attribute.
 *
 * Classes and IDs are generated as attribute selectors, so you can check for if
 * a `.class` or `#id` is included by passing `name=class` or `name=id`
 * respectively.
 *
 * @param {csstree.ListItem<csstree.CssNode> | string} selector
 * @param {string} name
 * @param {?string} value
 * @param {boolean} traversed
 * @returns {boolean}
 */
export declare const includesAttrSelector: (selector: csstree.ListItem<csstree.CssNode> | string, name: string, value?: string | null, traversed?: boolean) => boolean;
