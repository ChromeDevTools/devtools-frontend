export type MergePathsParams = {
    force?: boolean | undefined;
    floatPrecision?: number | undefined;
    noSpaceAfterFlags?: boolean | undefined;
};
/**
 * @typedef MergePathsParams
 * @property {boolean=} force
 * @property {number=} floatPrecision
 * @property {boolean=} noSpaceAfterFlags
 */
export declare const name = "mergePaths";
export declare const description = "merges multiple paths in one if possible";
/**
 * Merge multiple Paths into one.
 *
 * @author Kir Belevich, Lev Solntsev
 *
 * @type {import('../lib/types.js').Plugin<MergePathsParams>}
 * @since 0.3.0
 */
export declare const fn: import('../lib/types.js').Plugin<MergePathsParams>;
