import { RgbaColor, InputObject, CmykaColor } from "../types";
/**
 * Clamps the CMYK color object values.
 */
export declare const clampCmyka: (cmyka: CmykaColor) => CmykaColor;
/**
 * Rounds the CMYK color object values.
 */
export declare const roundCmyka: (cmyka: CmykaColor) => CmykaColor;
/**
 * Transforms the CMYK color object to RGB.
 * https://www.rapidtables.com/convert/color/cmyk-to-rgb.html
 */
export declare function cmykaToRgba(cmyka: CmykaColor): RgbaColor;
/**
 * Convert RGB Color Model object to CMYK.
 * https://www.rapidtables.com/convert/color/rgb-to-cmyk.html
 */
export declare function rgbaToCmyka(rgba: RgbaColor): CmykaColor;
/**
 * Parses the CMYK color object into RGB.
 */
export declare function parseCmyka({ c, m, y, k, a }: InputObject): RgbaColor | null;
