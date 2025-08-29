export const name: "sortDefsChildren";
export const description: "Sorts children of <defs> to improve compression";
/**
 * Sorts children of defs in order to improve compression. Sorted first by
 * frequency then by element name length then by element name (to ensure
 * grouping).
 *
 * @author David Leston
 *
 * @type {import('../lib/types.js').Plugin}
 */
export const fn: import("../lib/types.js").Plugin;
