/**
 * @typedef CleanupAttrsParams
 * @property {boolean=} newlines
 * @property {boolean=} trim
 * @property {boolean=} spaces
 */
export type CleanupAttrsParams = {
    newlines?: boolean | undefined;
    trim?: boolean | undefined;
    spaces?: boolean | undefined;
};
export declare const name = "cleanupAttrs";
export declare const description = "cleanups attributes from newlines, trailing and repeating spaces";
/**
 * Cleanup attributes values from newlines, trailing and repeating spaces.
 *
 * @author Kir Belevich
 * @type {import('../lib/types.js').Plugin<CleanupAttrsParams>}
 * @since 0.0.1
 */
export declare const fn: import('../lib/types.js').Plugin<CleanupAttrsParams>;
