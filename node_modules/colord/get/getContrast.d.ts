import { RgbaColor } from "../types";
/**
 * Returns a contrast ratio for a color pair [1-21].
 * http://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export declare const getContrast: (rgb1: RgbaColor, rgb2: RgbaColor) => number;
