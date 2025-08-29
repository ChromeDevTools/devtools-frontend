export const name: "collapseGroups";
export const description: "collapses useless groups";
/**
 * Collapse useless groups.
 *
 * @example
 * <g>
 *     <g attr1="val1">
 *         <path d="..."/>
 *     </g>
 * </g>
 *  ⬇
 * <g>
 *     <g>
 *         <path attr1="val1" d="..."/>
 *     </g>
 * </g>
 *  ⬇
 * <path attr1="val1" d="..."/>
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin}
 */
export const fn: import("../lib/types.js").Plugin;
