import { RgbaColor, InputObject, LchaColor } from "../types";
/**
 * Limits LCH axis values.
 * https://www.w3.org/TR/css-color-4/#specifying-lab-lch
 * https://lea.verou.me/2020/04/lch-colors-in-css-what-why-and-how/#how-does-lch-work
 */
export declare const clampLcha: (laba: LchaColor) => LchaColor;
export declare const roundLcha: (laba: LchaColor) => LchaColor;
export declare const parseLcha: ({ l, c, h, a }: InputObject) => RgbaColor | null;
/**
 * Performs RGB → CIEXYZ → CIELAB → CIELCH color conversion
 * https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
export declare const rgbaToLcha: (rgba: RgbaColor) => LchaColor;
/**
 * Performs CIELCH → CIELAB → CIEXYZ → RGB color conversion
 * https://www.w3.org/TR/css-color-4/#color-conversion-code
 */
export declare const lchaToRgba: (lcha: LchaColor) => RgbaColor;
