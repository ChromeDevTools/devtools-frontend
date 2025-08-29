/**
 * Apply transformation(s) to the Path data.
 *
 * @type {import('../lib/types.js').Plugin<{
 *   transformPrecision: number,
 *   applyTransformsStroked: boolean,
 * }>}
 */
export const applyTransforms: import("../lib/types.js").Plugin<{
    transformPrecision: number;
    applyTransformsStroked: boolean;
}>;
