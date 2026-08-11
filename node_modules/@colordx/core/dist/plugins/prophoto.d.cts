import { t as ProPhotoColor, A as AnyColor, s as Plugin } from '../colordx-DmR1sN5A.cjs';

declare module '@colordx/core' {
    interface Colordx {
        toProphoto(precision?: number): ProPhotoColor;
        toProphotoString(precision?: number): string;
    }
    namespace Colordx {
        function toGamutProphoto(input: AnyColor): Colordx;
    }
}
/**
 * Convert linear sRGB channels (from oklchToLinear) to gamma-encoded ProPhoto channels.
 * This is the cheap step — only a matrix multiply + the ProPhoto gamma 1.8 curve, no cbrt.
 */
declare const linearToProphotoChannels: (lr: number, lg: number, lb: number) => [number, number, number];
/** Zero-allocation sibling of linearToProphotoChannels — writes [rr, rg, rb] (gamma-encoded, 0–1) into `out`. */
declare const linearToProphotoChannelsInto: (out: Float64Array | number[], lr: number, lg: number, lb: number) => void;
/**
 * Convert OKLCH to gamma-encoded ProPhoto channels without object allocation.
 * Returns [r, g, b] in [0, 1] for in-gamut colors. Out-of-gamut channels may
 * exceed this range — callers are responsible for clamping before byte encoding.
 */
declare const oklchToProphotoChannels: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of oklchToProphotoChannels — writes [rr, rg, rb] into `out`. */
declare const oklchToProphotoChannelsInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * Convert CIE Lab (D50) to gamma-encoded ProPhoto channels without object allocation.
 * Returns [r, g, b] in [0, 1] for in-gamut colors; out-of-gamut channels may exceed [0, 1].
 * Goes Lab → XYZ D50 → linear sRGB → linear ProPhoto → ProPhoto gamma.
 */
declare const labToProphotoChannels: (l: number, a: number, b: number) => [number, number, number];
/** Zero-allocation sibling of labToProphotoChannels — writes [rr, rg, rb] into `out`. */
declare const labToProphotoChannelsInto: (out: Float64Array | number[], l: number, a: number, b: number) => void;
/**
 * Convert CIE LCH (D50) to gamma-encoded ProPhoto channels without object allocation.
 * Polar-to-rectangular to Lab, then Lab → gamma ProPhoto.
 */
declare const lchToProphotoChannels: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of lchToProphotoChannels — writes [rr, rg, rb] into `out`. */
declare const lchToProphotoChannelsInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * Returns true if the color is within the ProPhoto (ROMM RGB) gamut.
 * sRGB inputs (hex, rgb, hsl, etc.) always return true (sRGB ⊂ ProPhoto).
 */
declare const inGamutProphoto: (input: AnyColor) => boolean;
declare const prophoto: Plugin;

export { prophoto as default, inGamutProphoto, labToProphotoChannels, labToProphotoChannelsInto, lchToProphotoChannels, lchToProphotoChannelsInto, linearToProphotoChannels, linearToProphotoChannelsInto, oklchToProphotoChannels, oklchToProphotoChannelsInto };
