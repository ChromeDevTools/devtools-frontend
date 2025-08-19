export const name: "removeUnusedNS";
export const description: "removes unused namespaces declaration";
/**
 * Remove unused namespaces declaration from svg element
 * which are not used in elements or attributes
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin}
 */
export const fn: import("../lib/types.js").Plugin;
