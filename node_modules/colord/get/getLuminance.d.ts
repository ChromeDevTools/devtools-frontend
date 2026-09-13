import { RgbaColor } from "../types";
/**
 * Returns the perceived luminance of a color [0-1] according to WCAG 2.0.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export declare const getLuminance: (rgba: RgbaColor) => number;
