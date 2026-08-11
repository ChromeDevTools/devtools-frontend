import { P as P3Color, A as AnyColor, s as Plugin } from '../colordx-DmR1sN5A.cjs';

declare module '@colordx/core' {
    interface Colordx {
        toP3(precision?: number): P3Color;
        toP3String(precision?: number): string;
    }
    namespace Colordx {
        function toGamutP3(input: AnyColor): Colordx;
    }
}
/**
 * Convert linear sRGB channels (from oklchToLinear) to gamma-encoded Display-P3 channels.
 * This is the cheap step — only a matrix multiply + gamma encoding, no cbrt.
 * Pair with oklchToLinear to convert one OKLCH color to multiple spaces without
 * repeating the expensive OKLab pipeline.
 */
declare const linearToP3Channels: (lr: number, lg: number, lb: number) => [number, number, number];
/** Zero-allocation sibling of linearToP3Channels — writes [pr, pg, pb] (gamma-encoded, 0–1) into `out`. */
declare const linearToP3ChannelsInto: (out: Float64Array | number[], lr: number, lg: number, lb: number) => void;
/**
 * Convert OKLCH to gamma-encoded Display-P3 channels without object allocation.
 * Returns [r, g, b] in [0, 1] for in-gamut colors. Out-of-gamut channels may
 * exceed this range — callers are responsible for clamping before byte encoding.
 * Uses the sRGB transfer function (P3 does not use DCI-P3 gamma 2.6).
 */
declare const oklchToP3Channels: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of oklchToP3Channels — writes [pr, pg, pb] into `out`. */
declare const oklchToP3ChannelsInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * Convert CIE Lab (D50) to gamma-encoded Display-P3 channels without object allocation.
 * Returns [r, g, b] in [0, 1] for in-gamut colors. Out-of-gamut channels may exceed [0, 1].
 * Goes Lab → XYZ D50 → linear sRGB → linear P3 → gamma P3.
 */
declare const labToP3Channels: (l: number, a: number, b: number) => [number, number, number];
/** Zero-allocation sibling of labToP3Channels — writes [pr, pg, pb] into `out`. */
declare const labToP3ChannelsInto: (out: Float64Array | number[], l: number, a: number, b: number) => void;
/**
 * Convert CIE LCH (D50) to gamma-encoded Display-P3 channels without object allocation.
 * Polar-to-rectangular to Lab, then Lab → gamma P3. Out-of-gamut channels may exceed [0, 1].
 */
declare const lchToP3Channels: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of lchToP3Channels — writes [pr, pg, pb] into `out`. */
declare const lchToP3ChannelsInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * Returns true if the color is within the Display-P3 gamut.
 * sRGB inputs (hex, rgb, hsl, etc.) always return true (sRGB ⊂ P3).
 */
declare const inGamutP3: (input: AnyColor) => boolean;
declare const p3: Plugin;

export { p3 as default, inGamutP3, labToP3Channels, labToP3ChannelsInto, lchToP3Channels, lchToP3ChannelsInto, linearToP3Channels, linearToP3ChannelsInto, oklchToP3Channels, oklchToP3ChannelsInto };
