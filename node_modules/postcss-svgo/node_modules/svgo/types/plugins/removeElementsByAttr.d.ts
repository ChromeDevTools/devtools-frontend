/**
 * @typedef RemoveElementsByAttrParams
 * @property {string | string[]=} id
 * @property {string | string[]=} class
 */
export const name: "removeElementsByAttr";
export const description: "removes arbitrary elements by ID or className (disabled by default)";
/**
 * Remove arbitrary SVG elements by ID or className.
 *
 * @example id
 *     > single: remove element with ID of `elementID`
 *     ---
 *     removeElementsByAttr:
 *       id: 'elementID'
 *
 *     > list: remove multiple elements by ID
 *     ---
 *     removeElementsByAttr:
 *       id:
 *         - 'elementID'
 *         - 'anotherID'
 *
 * @example class
 *     > single: remove all elements with class of `elementClass`
 *     ---
 *     removeElementsByAttr:
 *       class: 'elementClass'
 *
 *     > list: remove all elements with class of `elementClass` or `anotherClass`
 *     ---
 *     removeElementsByAttr:
 *       class:
 *         - 'elementClass'
 *         - 'anotherClass'
 *
 * @author Eli Dupuis (@elidupuis)
 *
 * @type {import('../lib/types.js').Plugin<RemoveElementsByAttrParams>}
 */
export const fn: import("../lib/types.js").Plugin<RemoveElementsByAttrParams>;
export type RemoveElementsByAttrParams = {
    id?: (string | string[]) | undefined;
    class?: (string | string[]) | undefined;
};
