/**
 * @typedef CleanupAttrsParams
 * @property {boolean=} newlines
 * @property {boolean=} trim
 * @property {boolean=} spaces
 */
export const name: "cleanupAttrs";
export const description: "cleanups attributes from newlines, trailing and repeating spaces";
/**
 * Cleanup attributes values from newlines, trailing and repeating spaces.
 *
 * @author Kir Belevich
 * @type {import('../lib/types.js').Plugin<CleanupAttrsParams>}
 */
export const fn: import("../lib/types.js").Plugin<CleanupAttrsParams>;
export type CleanupAttrsParams = {
    newlines?: boolean | undefined;
    trim?: boolean | undefined;
    spaces?: boolean | undefined;
};
