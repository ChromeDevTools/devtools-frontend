export type ConvertStyleToAttrsParams = {
    keepImportant?: boolean | undefined;
};
/**
 * @typedef ConvertStyleToAttrsParams
 * @property {boolean=} keepImportant
 */
export declare const name = "convertStyleToAttrs";
export declare const description = "converts style to attributes";
/**
 * Convert style in attributes. Cleanups comments and illegal declarations (without colon) as a side effect.
 *
 * @example
 * <g style="fill:#000; color: #fff;">
 *  ⬇
 * <g fill="#000" color="#fff">
 *
 * @example
 * <g style="fill:#000; color: #fff; -webkit-blah: blah">
 *  ⬇
 * <g fill="#000" color="#fff" style="-webkit-blah: blah">
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<ConvertStyleToAttrsParams>}
 * @since 0.0.1
 */
export declare const fn: import('../lib/types.js').Plugin<ConvertStyleToAttrsParams>;
