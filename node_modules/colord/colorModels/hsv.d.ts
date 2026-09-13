import { InputObject, RgbaColor, HsvaColor } from "../types";
export declare const clampHsva: (hsva: HsvaColor) => HsvaColor;
export declare const roundHsva: (hsva: HsvaColor) => HsvaColor;
export declare const parseHsva: ({ h, s, v, a }: InputObject) => RgbaColor | null;
export declare const rgbaToHsva: ({ r, g, b, a }: RgbaColor) => HsvaColor;
export declare const hsvaToRgba: ({ h, s, v, a }: HsvaColor) => RgbaColor;
