/**
 * @param {import('./types.js').XastParent} node Element to query the children of.
 * @param {string} selector CSS selector string.
 * @param {Map<import('./types.js').XastNode, import('./types.js').XastParent>=} parents
 * @returns {import('./types.js').XastChild[]} All matching elements.
 */
export declare const querySelectorAll: (node: import('./types.js').XastParent, selector: string, parents?: Map<import('./types.js').XastNode, import('./types.js').XastParent> | undefined) => import('./types.js').XastChild[];
/**
 * @param {import('./types.js').XastParent} node Element to query the children of.
 * @param {string} selector CSS selector string.
 * @param {Map<import('./types.js').XastNode, import('./types.js').XastParent>=} parents
 * @returns {?import('./types.js').XastChild} First match, or null if there was no match.
 */
export declare const querySelector: (node: import('./types.js').XastParent, selector: string, parents?: Map<import('./types.js').XastNode, import('./types.js').XastParent> | undefined) => import('./types.js').XastChild | null;
/**
 * @param {import('./types.js').XastElement} node
 * @param {string} selector
 * @param {Map<import('./types.js').XastNode, import('./types.js').XastParent>=} parents
 * @returns {boolean}
 */
export declare const matches: (node: import('./types.js').XastElement, selector: string, parents?: Map<import('./types.js').XastNode, import('./types.js').XastParent> | undefined) => boolean;
/**
 * @param {import('./types.js').XastChild} node
 * @param {import('./types.js').XastParent} parentNode
 */
export declare const detachNodeFromParent: (node: import('./types.js').XastChild, parentNode: import('./types.js').XastParent) => void;
