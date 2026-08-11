import { a as A98Color, A as AnyColor, s as Plugin } from '../colordx-DmR1sN5A.cjs';

declare module '@colordx/core' {
    interface Colordx {
        toA98(precision?: number): A98Color;
        toA98String(precision?: number): string;
    }
    namespace Colordx {
        function toGamutA98(input: AnyColor): Colordx;
    }
}
/**
 * Convert linear sRGB channels (from oklchToLinear) to gamma-encoded A98 channels.
 * This is the cheap step — only a matrix multiply + the A98 power curve, no cbrt.
 */
declare const linearToA98Channels: (lr: number, lg: number, lb: number) => [number, number, number];
/** Zero-allocation sibling of linearToA98Channels — writes [rr, rg, rb] (gamma-encoded, 0–1) into `out`. */
declare const linearToA98ChannelsInto: (out: Float64Array | number[], lr: number, lg: number, lb: number) => void;
/**
 * Convert OKLCH to gamma-encoded A98 channels without object allocation.
 * Returns [r, g, b] in [0, 1] for in-gamut colors. Out-of-gamut channels may
 * exceed this range — callers are responsible for clamping before byte encoding.
 */
declare const oklchToA98Channels: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of oklchToA98Channels — writes [rr, rg, rb] into `out`. */
declare const oklchToA98ChannelsInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * Convert CIE Lab (D50) to gamma-encoded A98 channels without object allocation.
 * Returns [r, g, b] in [0, 1] for in-gamut colors; out-of-gamut channels may exceed [0, 1].
 * Goes Lab → XYZ D50 → linear sRGB → linear A98 → A98 gamma.
 */
declare const labToA98Channels: (l: number, a: number, b: number) => [number, number, number];
/** Zero-allocation sibling of labToA98Channels — writes [rr, rg, rb] into `out`. */
declare const labToA98ChannelsInto: (out: Float64Array | number[], l: number, a: number, b: number) => void;
/**
 * Convert CIE LCH (D50) to gamma-encoded A98 channels without object allocation.
 * Polar-to-rectangular to Lab, then Lab → gamma A98.
 */
declare const lchToA98Channels: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of lchToA98Channels — writes [rr, rg, rb] into `out`. */
declare const lchToA98ChannelsInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * Returns true if the color is within the A98 (Adobe RGB 1998) gamut.
 * sRGB inputs (hex, rgb, hsl, etc.) always return true (sRGB ⊂ A98).
 */
declare const inGamutA98: (input: AnyColor) => boolean;
declare const a98: Plugin;

export { a98 as default, inGamutA98, labToA98Channels, labToA98ChannelsInto, lchToA98Channels, lchToA98ChannelsInto, linearToA98Channels, linearToA98ChannelsInto, oklchToA98Channels, oklchToA98ChannelsInto };
