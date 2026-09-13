import { RgbaColor } from "../types";
/**
 * Parses a valid HWB[A] CSS color function/string
 * https://www.w3.org/TR/css-color-4/#the-hwb-notation
 */
export declare const parseHwbaString: (input: string) => RgbaColor | null;
export declare const rgbaToHwbaString: (rgba: RgbaColor) => string;
