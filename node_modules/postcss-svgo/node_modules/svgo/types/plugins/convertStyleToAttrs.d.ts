/**
 * @typedef ConvertStyleToAttrsParams
 * @property {boolean=} keepImportant
 */
export const name: "convertStyleToAttrs";
export const description: "converts style to attributes";
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
 */
export const fn: import("../lib/types.js").Plugin<ConvertStyleToAttrsParams>;
export type ConvertStyleToAttrsParams = {
    keepImportant?: boolean | undefined;
};
