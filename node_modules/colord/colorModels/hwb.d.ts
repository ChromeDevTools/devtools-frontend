import { RgbaColor, HwbaColor, InputObject } from "../types";
export declare const clampHwba: (hwba: HwbaColor) => HwbaColor;
export declare const roundHwba: (hwba: HwbaColor) => HwbaColor;
export declare const rgbaToHwba: (rgba: RgbaColor) => HwbaColor;
export declare const hwbaToRgba: (hwba: HwbaColor) => RgbaColor;
export declare const parseHwba: ({ h, w, b, a }: InputObject) => RgbaColor | null;
