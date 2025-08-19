/**
 * @typedef {[number, number]} Point
 *
 * @typedef Circle
 * @property {Point} center
 * @property {number} radius
 *
 * @typedef MakeArcs
 * @property {number} threshold
 * @property {number} tolerance
 *
 * @typedef ConvertPathDataParams
 * @property {boolean=} applyTransforms
 * @property {boolean=} applyTransformsStroked
 * @property {MakeArcs=} makeArcs
 * @property {boolean=} straightCurves
 * @property {boolean=} convertToQ
 * @property {boolean=} lineShorthands
 * @property {boolean=} convertToZ
 * @property {boolean=} curveSmoothShorthands
 * @property {number | false=} floatPrecision
 * @property {number=} transformPrecision
 * @property {boolean=} smartArcRounding
 * @property {boolean=} removeUseless
 * @property {boolean=} collapseRepeated
 * @property {boolean=} utilizeAbsolute
 * @property {boolean=} leadingZero
 * @property {boolean=} negativeExtraSpace
 * @property {boolean=} noSpaceAfterFlags
 * @property {boolean=} forceAbsolutePath
 *
 * @typedef {Required<ConvertPathDataParams>} InternalParams
 */
export const name: "convertPathData";
export const description: "optimizes path data: writes in shorter form, applies transformations";
/**
 * Convert absolute Path to relative,
 * collapse repeated instructions,
 * detect and convert Lineto shorthands,
 * remove useless instructions like "l0,0",
 * trim useless delimiters and leading zeros,
 * decrease accuracy of floating-point numbers.
 *
 * @see https://www.w3.org/TR/SVG11/paths.html#PathData
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<ConvertPathDataParams>}
 */
export const fn: import("../lib/types.js").Plugin<ConvertPathDataParams>;
export type Point = [number, number];
export type Circle = {
    center: Point;
    radius: number;
};
export type MakeArcs = {
    threshold: number;
    tolerance: number;
};
export type ConvertPathDataParams = {
    applyTransforms?: boolean | undefined;
    applyTransformsStroked?: boolean | undefined;
    makeArcs?: MakeArcs | undefined;
    straightCurves?: boolean | undefined;
    convertToQ?: boolean | undefined;
    lineShorthands?: boolean | undefined;
    convertToZ?: boolean | undefined;
    curveSmoothShorthands?: boolean | undefined;
    floatPrecision?: (number | false) | undefined;
    transformPrecision?: number | undefined;
    smartArcRounding?: boolean | undefined;
    removeUseless?: boolean | undefined;
    collapseRepeated?: boolean | undefined;
    utilizeAbsolute?: boolean | undefined;
    leadingZero?: boolean | undefined;
    negativeExtraSpace?: boolean | undefined;
    noSpaceAfterFlags?: boolean | undefined;
    forceAbsolutePath?: boolean | undefined;
};
export type InternalParams = Required<ConvertPathDataParams>;
