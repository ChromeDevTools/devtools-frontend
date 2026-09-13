import { InputObject, RgbaColor, XyzColor, XyzaColor } from "../types";
export declare const D50: {
    x: number;
    y: number;
    z: number;
};
/**
 * Limits XYZ axis values assuming XYZ is relative to D50.
 */
export declare const clampXyza: (xyza: XyzaColor) => XyzaColor;
export declare const roundXyza: (xyza: XyzaColor) => XyzaColor;
export declare const parseXyza: ({ x, y, z, a }: InputObject) => RgbaColor | null;
/**
 * Performs Bradford chromatic adaptation from D65 to D50
 */
export declare const adaptXyzaToD50: (xyza: XyzaColor) => XyzaColor;
/**
 * Performs Bradford chromatic adaptation from D50 to D65
 */
export declare const adaptXyzToD65: (xyza: XyzColor) => XyzColor;
/**
 * Converts an CIE XYZ color (D50) to RGBA color space (D65)
 * https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
export declare const xyzaToRgba: (sourceXyza: XyzaColor) => RgbaColor;
/**
 * Converts an RGB color (D65) to CIE XYZ (D50)
 * https://image-engineering.de/library/technotes/958-how-to-convert-between-srgb-and-ciexyz
 */
export declare const rgbaToXyza: (rgba: RgbaColor) => XyzaColor;
