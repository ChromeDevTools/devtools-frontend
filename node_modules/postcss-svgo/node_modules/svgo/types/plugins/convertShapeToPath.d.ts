/**
 * @typedef ConvertShapeToPathParams
 * @property {boolean=} convertArcs
 * @property {number=} floatPrecision
 */
export const name: "convertShapeToPath";
export const description: "converts basic shapes to more compact path form";
/**
 * Converts basic shape to more compact path. It also allows further
 * optimizations like combining paths with similar attributes.
 *
 * @see https://www.w3.org/TR/SVG11/shapes.html
 *
 * @author Lev Solntsev
 *
 * @type {import('../lib/types.js').Plugin<ConvertShapeToPathParams>}
 */
export const fn: import("../lib/types.js").Plugin<ConvertShapeToPathParams>;
export type ConvertShapeToPathParams = {
    convertArcs?: boolean | undefined;
    floatPrecision?: number | undefined;
};
