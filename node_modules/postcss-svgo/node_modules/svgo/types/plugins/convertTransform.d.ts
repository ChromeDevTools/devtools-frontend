/**
 * @typedef ConvertTransformParams
 * @property {boolean=} convertToShorts
 * @property {number=} degPrecision
 * @property {number=} floatPrecision
 * @property {number=} transformPrecision
 * @property {boolean=} matrixToTransform
 * @property {boolean=} shortTranslate
 * @property {boolean=} shortScale
 * @property {boolean=} shortRotate
 * @property {boolean=} removeUseless
 * @property {boolean=} collapseIntoOne
 * @property {boolean=} leadingZero
 * @property {boolean=} negativeExtraSpace
 *
 * @typedef TransformParams
 * @property {boolean} convertToShorts
 * @property {number=} degPrecision
 * @property {number} floatPrecision
 * @property {number} transformPrecision
 * @property {boolean} matrixToTransform
 * @property {boolean} shortTranslate
 * @property {boolean} shortScale
 * @property {boolean} shortRotate
 * @property {boolean} removeUseless
 * @property {boolean} collapseIntoOne
 * @property {boolean} leadingZero
 * @property {boolean} negativeExtraSpace
 *
 * @typedef TransformItem
 * @property {string} name
 * @property {number[]} data
 */
export const name: "convertTransform";
export const description: "collapses multiple transformations and optimizes it";
/**
 * Convert matrices to the short aliases,
 * convert long translate, scale or rotate transform notations to the shorts ones,
 * convert transforms to the matrices and multiply them all into one,
 * remove useless transforms.
 *
 * @see https://www.w3.org/TR/SVG11/coords.html#TransformMatrixDefined
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<ConvertTransformParams>}
 */
export const fn: import("../lib/types.js").Plugin<ConvertTransformParams>;
export type ConvertTransformParams = {
    convertToShorts?: boolean | undefined;
    degPrecision?: number | undefined;
    floatPrecision?: number | undefined;
    transformPrecision?: number | undefined;
    matrixToTransform?: boolean | undefined;
    shortTranslate?: boolean | undefined;
    shortScale?: boolean | undefined;
    shortRotate?: boolean | undefined;
    removeUseless?: boolean | undefined;
    collapseIntoOne?: boolean | undefined;
    leadingZero?: boolean | undefined;
    negativeExtraSpace?: boolean | undefined;
};
export type TransformParams = {
    convertToShorts: boolean;
    degPrecision?: number | undefined;
    floatPrecision: number;
    transformPrecision: number;
    matrixToTransform: boolean;
    shortTranslate: boolean;
    shortScale: boolean;
    shortRotate: boolean;
    removeUseless: boolean;
    collapseIntoOne: boolean;
    leadingZero: boolean;
    negativeExtraSpace: boolean;
};
export type TransformItem = {
    name: string;
    data: number[];
};
