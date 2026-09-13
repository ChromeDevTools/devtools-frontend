import { RgbaColor } from "../types";
/**
 * Parses a valid HSL[A] CSS color function/string
 * https://www.w3.org/TR/css-color-4/#the-hsl-notation
 */
export declare const parseHslaString: (input: string) => RgbaColor | null;
export declare const rgbaToHslaString: (rgba: RgbaColor) => string;
