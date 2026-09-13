import { RgbaColor } from "../types";
/** Parses any valid Hex3, Hex4, Hex6 or Hex8 string and converts it to an RGBA object */
export declare const parseHex: (hex: string) => RgbaColor | null;
/** Converts RGBA object to Hex6 or (if it has alpha channel) Hex8 string */
export declare const rgbaToHex: (rgba: RgbaColor) => string;
