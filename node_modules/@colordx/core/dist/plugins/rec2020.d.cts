import { R as Rec2020Color, A as AnyColor, s as Plugin } from '../colordx-DmR1sN5A.cjs';

declare module '@colordx/core' {
    interface Colordx {
        toRec2020(precision?: number): Rec2020Color;
        toRec2020String(precision?: number): string;
    }
    namespace Colordx {
        function toGamutRec2020(input: AnyColor): Colordx;
    }
}
/**
 * Convert linear sRGB channels (from oklchToLinear) to gamma-encoded Rec.2020 channels.
 * This is the cheap step — only a matrix multiply + BT.2020 gamma, no cbrt.
 */
declare const linearToRec2020Channels: (lr: number, lg: number, lb: number) => [number, number, number];
/** Zero-allocation sibling of linearToRec2020Channels — writes [rr, rg, rb] (gamma-encoded, 0–1) into `out`. */
declare const linearToRec2020ChannelsInto: (out: Float64Array | number[], lr: number, lg: number, lb: number) => void;
/**
 * Convert OKLCH to gamma-encoded Rec.2020 channels without object allocation.
 * Returns [r, g, b] in [0, 1] for in-gamut colors. Out-of-gamut channels may
 * exceed this range — callers are responsible for clamping before byte encoding.
 * Uses the BT.2020 transfer function (exponent 0.45, distinct from sRGB 1/2.4).
 */
declare const oklchToRec2020Channels: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of oklchToRec2020Channels — writes [rr, rg, rb] into `out`. */
declare const oklchToRec2020ChannelsInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * Convert CIE Lab (D50) to gamma-encoded Rec.2020 channels without object allocation.
 * Returns [r, g, b] in [0, 1] for in-gamut colors; out-of-gamut channels may exceed [0, 1].
 * Goes Lab → XYZ D50 → linear sRGB → linear Rec.2020 → BT.2020 gamma.
 */
declare const labToRec2020Channels: (l: number, a: number, b: number) => [number, number, number];
/** Zero-allocation sibling of labToRec2020Channels — writes [rr, rg, rb] into `out`. */
declare const labToRec2020ChannelsInto: (out: Float64Array | number[], l: number, a: number, b: number) => void;
/**
 * Convert CIE LCH (D50) to gamma-encoded Rec.2020 channels without object allocation.
 * Polar-to-rectangular to Lab, then Lab → gamma Rec.2020.
 */
declare const lchToRec2020Channels: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of lchToRec2020Channels — writes [rr, rg, rb] into `out`. */
declare const lchToRec2020ChannelsInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * Returns true if the color is within the Rec.2020 gamut.
 * sRGB inputs (hex, rgb, hsl, etc.) always return true (sRGB ⊂ Rec.2020).
 */
declare const inGamutRec2020: (input: AnyColor) => boolean;
declare const rec2020: Plugin;

export { rec2020 as default, inGamutRec2020, labToRec2020Channels, labToRec2020ChannelsInto, lchToRec2020Channels, lchToRec2020ChannelsInto, linearToRec2020Channels, linearToRec2020ChannelsInto, oklchToRec2020Channels, oklchToRec2020ChannelsInto };
