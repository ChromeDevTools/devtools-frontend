/**
 * @typedef MergePathsParams
 * @property {boolean=} force
 * @property {number=} floatPrecision
 * @property {boolean=} noSpaceAfterFlags
 */
export const name: "mergePaths";
export const description: "merges multiple paths in one if possible";
/**
 * Merge multiple Paths into one.
 *
 * @author Kir Belevich, Lev Solntsev
 *
 * @type {import('../lib/types.js').Plugin<MergePathsParams>}
 */
export const fn: import("../lib/types.js").Plugin<MergePathsParams>;
export type MergePathsParams = {
    force?: boolean | undefined;
    floatPrecision?: number | undefined;
    noSpaceAfterFlags?: boolean | undefined;
};
