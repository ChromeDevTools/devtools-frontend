export type ConvertShapeToPathParams = {
    convertArcs?: boolean | undefined;
    floatPrecision?: number | undefined;
};
/**
 * @typedef ConvertShapeToPathParams
 * @property {boolean=} convertArcs
 * @property {number=} floatPrecision
 */
export declare const name = "convertShapeToPath";
export declare const description = "converts basic shapes to more compact path form";
/**
 * Converts basic shape to more compact path. It also allows further
 * optimizations like combining paths with similar attributes.
 *
 * @see https://www.w3.org/TR/SVG11/shapes.html
 *
 * @author Lev Solntsev
 *
 * @type {import('../lib/types.js').Plugin<ConvertShapeToPathParams>}
 * @since 0.4.3
 */
export declare const fn: import('../lib/types.js').Plugin<ConvertShapeToPathParams>;
