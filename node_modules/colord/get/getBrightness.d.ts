import { RgbaColor } from "../types";
/**
 * Returns the brightness of a color [0-1].
 * https://www.w3.org/TR/AERT/#color-contrast
 * https://en.wikipedia.org/wiki/YIQ
 */
export declare const getBrightness: (rgba: RgbaColor) => number;
