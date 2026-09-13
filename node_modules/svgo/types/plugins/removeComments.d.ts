export type RemoveCommentsParams = {
    preservePatterns?: (ReadonlyArray<RegExp | string> | false) | undefined;
};
/**
 * @typedef RemoveCommentsParams
 * @property {ReadonlyArray<RegExp | string> | false=} preservePatterns
 */
export declare const name = "removeComments";
export declare const description = "removes comments";
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
 * @since 0.0.1
 */
export declare const fn: import('../lib/types.js').Plugin<RemoveCommentsParams>;
