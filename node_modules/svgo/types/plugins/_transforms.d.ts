export type TransformItem = {
    name: string;
    data: number[];
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
/**
 * Convert transform string to JS representation.
 *
 * @param {string} transformString
 * @returns {TransformItem[]} Object representation of transform, or an empty array if it was malformed.
 */
export declare const transform2js: (transformString: string) => TransformItem[];
/**
 * Multiply transforms into one.
 *
 * @param {ReadonlyArray<TransformItem>} transforms
 * @returns {TransformItem}
 */
export declare const transformsMultiply: (transforms: ReadonlyArray<TransformItem>) => TransformItem;
/**
 * Decompose matrix into simple transforms and optimize.
 * @param {TransformItem} origMatrix
 * @param {TransformParams} params
 * @returns {TransformItem[]}
 */
export declare const matrixToTransform: (origMatrix: TransformItem, params: TransformParams) => TransformItem[];
/**
 * Applies transformation to an arc. To do so, we represent ellipse as a matrix,
 * multiply it by the transformation matrix and use a singular value
 * decomposition to represent in a form rotate(θ)·scale(a b)·rotate(φ). This
 * gives us new ellipse params a, b and θ. SVD is being done with the formulae
 * provided by Wolfram|Alpha (svd {{m0, m2}, {m1, m3}})
 *
 * @param {[number, number]} cursor
 * @param {number[]} arc
 * @param {ReadonlyArray<number>} transform
 * @returns {number[]}
 */
export declare const transformArc: (cursor: [number, number], arc: number[], transform: ReadonlyArray<number>) => number[];
/**
 * @param {TransformItem} transform
 * @param {TransformParams} params
 * @returns {TransformItem}
 */
export declare const roundTransform: (transform: TransformItem, params: TransformParams) => TransformItem;
/**
 * Convert transforms JS representation to string.
 *
 * @param {ReadonlyArray<TransformItem>} transformJS
 * @param {TransformParams} params
 * @returns {string}
 */
export declare const js2transform: (transformJS: ReadonlyArray<TransformItem>, params: TransformParams) => string;
