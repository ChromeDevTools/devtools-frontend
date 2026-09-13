export declare const name = "moveElemsAttrsToGroup";
export declare const description = "Move common attributes of group children to the group";
/**
 * Move common attributes of group children to the group
 *
 * @example
 * <g attr1="val1">
 *     <g attr2="val2">
 *         text
 *     </g>
 *     <circle attr2="val2" attr3="val3"/>
 * </g>
 *  ⬇
 * <g attr1="val1" attr2="val2">
 *     <g>
 *         text
 *     </g>
 *    <circle attr3="val3"/>
 * </g>
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin}
 * @since 0.0.1
 */
export declare const fn: import('../lib/types.js').Plugin;
