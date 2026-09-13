import { RgbaColor } from "../types";
export declare type MixingColorSpace = "lab" | "rgb";
export declare const mix: (rgba1: RgbaColor, rgba2: RgbaColor, ratio: number, space?: MixingColorSpace | undefined) => RgbaColor;
