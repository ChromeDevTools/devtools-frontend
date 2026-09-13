import { RgbaColor } from "../types";
/**
 * Parses a valid CMYK CSS color function/string
 * https://www.w3.org/TR/css-color-4/#device-cmyk
 */
export declare const parseCmykaString: (input: string) => RgbaColor | null;
export declare function rgbaToCmykaString(rgb: RgbaColor): string;
