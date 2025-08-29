/**
 * @typedef RemoveCommentsParams
 * @property {ReadonlyArray<RegExp | string> | false=} preservePatterns
 */
export const name: "removeComments";
export const description: "removes comments";
/**
 * Remove comments.
 *
 * @example
 * <!-- Generator: Adobe Illustrator 15.0.0, SVG Export
 * Plug-In . SVG Version: 6.00 Build 0)  -->
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<RemoveCommentsParams>}
 */
export const fn: import("../lib/types.js").Plugin<RemoveCommentsParams>;
export type RemoveCommentsParams = {
    preservePatterns?: (ReadonlyArray<RegExp | string> | false) | undefined;
};
