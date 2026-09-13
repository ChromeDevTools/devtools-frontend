import { RgbaColor } from "../types";
/**
 * Parses a valid RGB[A] CSS color function/string
 * https://www.w3.org/TR/css-color-4/#rgb-functions
 */
export declare const parseRgbaString: (input: string) => RgbaColor | null;
export declare const rgbaToRgbaString: (rgba: RgbaColor) => string;
