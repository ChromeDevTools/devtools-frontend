export declare const name = "collapseGroups";
export declare const description = "collapses useless groups";
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
 * @since 0.0.1
 */
export declare const fn: import('../lib/types.js').Plugin;
