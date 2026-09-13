import { RgbaColor, LabaColor, InputObject } from "../types";
/**
 * Clamps LAB axis values as defined in CSS Color Level 4 specs.
 * https://www.w3.org/TR/css-color-4/#specifying-lab-lch
 */
export declare const clampLaba: (laba: LabaColor) => LabaColor;
export declare const roundLaba: (laba: LabaColor) => LabaColor;
export declare const parseLaba: ({ l, a, b, alpha }: InputObject) => RgbaColor | null;
/**
 * Performs RGB → CIEXYZ → LAB color conversion
 * https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
export declare const rgbaToLaba: (rgba: RgbaColor) => LabaColor;
/**
 * Performs LAB → CIEXYZ → RGB color conversion
 * https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
export declare const labaToRgba: (laba: LabaColor) => RgbaColor;
