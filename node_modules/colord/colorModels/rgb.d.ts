import { InputObject, RgbaColor } from "../types";
export declare const clampRgba: (rgba: RgbaColor) => RgbaColor;
export declare const roundRgba: (rgba: RgbaColor) => RgbaColor;
export declare const parseRgba: ({ r, g, b, a }: InputObject) => RgbaColor | null;
/**
 * Converts an RGB channel [0-255] to its linear light (un-companded) form [0-1].
 * Linearized RGB values are widely used for color space conversions and contrast calculations
 */
export declare const linearizeRgbChannel: (value: number) => number;
/**
 * Converts an linear-light sRGB channel [0-1] back to its gamma corrected form [0-255]
 */
export declare const unlinearizeRgbChannel: (ratio: number) => number;
