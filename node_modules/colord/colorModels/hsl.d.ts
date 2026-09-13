import { InputObject, RgbaColor, HslaColor, HsvaColor } from "../types";
export declare const clampHsla: (hsla: HslaColor) => HslaColor;
export declare const roundHsla: (hsla: HslaColor) => HslaColor;
export declare const parseHsla: ({ h, s, l, a }: InputObject) => RgbaColor | null;
export declare const hslaToHsva: ({ h, s, l, a }: HslaColor) => HsvaColor;
export declare const hsvaToHsla: ({ h, s, v, a }: HsvaColor) => HslaColor;
export declare const hslaToRgba: (hsla: HslaColor) => RgbaColor;
export declare const rgbaToHsla: (rgba: RgbaColor) => HslaColor;
