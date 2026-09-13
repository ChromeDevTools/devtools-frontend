import { RgbaColor } from "../types";
/**
 * Parses a valid LCH CSS color function/string
 * https://www.w3.org/TR/css-color-4/#specifying-lab-lch
 */
export declare const parseLchaString: (input: string) => RgbaColor | null;
export declare const rgbaToLchaString: (rgba: RgbaColor) => string;
