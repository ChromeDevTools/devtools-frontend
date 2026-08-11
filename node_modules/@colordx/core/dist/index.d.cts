import { A as AnyColor, C as ColorFormat } from './colordx-DmR1sN5A.cjs';
export { a as A98Color, b as A98ColorInput, c as CmykColor, d as CmykColorInput, e as ColorParser, f as Colordx, H as HslColor, g as HslColorInput, h as HsvColor, i as HsvColorInput, j as HwbColor, k as HwbColorInput, L as LabColor, l as LabColorInput, m as LchColor, n as LchColorInput, O as OklabColor, o as OklabColorInput, p as OklchColor, q as OklchColorInput, P as P3Color, r as P3ColorInput, s as Plugin, t as ProPhotoColor, u as ProPhotoColorInput, R as Rec2020Color, v as Rec2020ColorInput, w as RgbColor, x as RgbColorInput, X as XyzColor, y as XyzColorInput, z as colordx, B as extend, D as nearest, E as random, F as toHex8 } from './colordx-DmR1sN5A.cjs';

/** Convert a number in [0, 255] to a 2-char lowercase hex byte. Clamps and rounds out-of-range inputs. */
declare const toHexByte: (n: number) => string;

/**
 * Detects the input format (`'hex'`, `'rgb'`, `'hsl'`, `'oklch'`, etc.).
 * Returns `undefined` for unrecognised input. Plugin-registered formats are detected too.
 */
declare const getFormat: (input: AnyColor) => ColorFormat | undefined;

/**
 * True when the color falls inside the sRGB gamut.
 * sRGB-bounded inputs (hex, rgb, hsl, hsv, hwb) are always in gamut.
 * Wide-gamut inputs (oklch, oklab, lab, lch, p3, rec2020, xyz) are checked against [0, 1] in linear sRGB.
 */
declare const inGamutSrgb: (input: AnyColor) => boolean;

/**
 * OKLCh → unclamped linear sRGB. Returns `[r, g, b]`.
 * Channels in [0, 1] mean the color is in-gamut sRGB; outside means out-of-gamut.
 */
declare const oklchToLinear: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of `oklchToLinear` — writes `[lr, lg, lb]` into `out`. */
declare const oklchToLinearInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * OKLCh → gamma-encoded sRGB (0–1). Returns `[r, g, b]`.
 * Out-of-gamut channels may exceed [0, 1]; clamp before byte encoding.
 */
declare const oklchToRgbChannels: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of `oklchToRgbChannels` — writes `[r, g, b]` into `out`. */
declare const oklchToRgbChannelsInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * OKLCh → both linear and gamma-encoded sRGB in one pass. Returns `[[lr, lg, lb], [sr, sg, sb]]`.
 * Use when you need both — saves a duplicate OKLCh → OKLab → linear step.
 */
declare const oklchToLinearAndSrgb: (l: number, c: number, h: number) => [[number, number, number], [number, number, number]];
/**
 * Zero-allocation sibling of `oklchToLinearAndSrgb`.
 * Writes linear channels into `linOut`, gamma-encoded into `srgbOut`. Buffers must be distinct.
 */
declare const oklchToLinearAndSrgbInto: (linOut: Float64Array | number[], srgbOut: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * Gamma-encoded sRGB (0–1) → linear sRGB. Returns `[lr, lg, lb]`.
 * For byte-scale RGB, pass `r/255, g/255, b/255`.
 */
declare const rgbToLinear: (r: number, g: number, b: number) => [number, number, number];
/** Zero-allocation sibling of `rgbToLinear` — writes `[lr, lg, lb]` into `out`. */
declare const rgbToLinearInto: (out: Float64Array | number[], r: number, g: number, b: number) => void;
/**
 * CIE Lab (D50) → unclamped linear sRGB. Returns `[lr, lg, lb]`.
 * L in [0, 100]; a/b roughly in [-128, 128]. Out-of-gamut channels fall outside [0, 1].
 */
declare const labToLinearSrgb: (l: number, a: number, b: number) => [number, number, number];
/** Zero-allocation sibling of `labToLinearSrgb` — writes `[lr, lg, lb]` into `out`. */
declare const labToLinearSrgbInto: (out: Float64Array | number[], l: number, a: number, b: number) => void;
/**
 * CIE LCh (D50) → unclamped linear sRGB. Returns `[lr, lg, lb]`.
 * L in [0, 100]; C in [0, ~150]; H in degrees. Out-of-gamut channels fall outside [0, 1].
 */
declare const lchToLinearSrgb: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of `lchToLinearSrgb` — writes `[lr, lg, lb]` into `out`. */
declare const lchToLinearSrgbInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * CIE Lab (D50) → gamma-encoded sRGB (0–1). Returns `[r, g, b]`.
 * Out-of-gamut channels may exceed [0, 1]; clamp before byte encoding.
 */
declare const labToRgbChannels: (l: number, a: number, b: number) => [number, number, number];
/** Zero-allocation sibling of `labToRgbChannels` — writes `[r, g, b]` into `out`. */
declare const labToRgbChannelsInto: (out: Float64Array | number[], l: number, a: number, b: number) => void;
/**
 * CIE LCh (D50) → gamma-encoded sRGB (0–1). Returns `[r, g, b]`.
 * Out-of-gamut channels may exceed [0, 1]; clamp before byte encoding.
 */
declare const lchToRgbChannels: (l: number, c: number, h: number) => [number, number, number];
/** Zero-allocation sibling of `lchToRgbChannels` — writes `[r, g, b]` into `out`. */
declare const lchToRgbChannelsInto: (out: Float64Array | number[], l: number, c: number, h: number) => void;
/**
 * CIE Lab (D50) → both linear and gamma-encoded sRGB in one pass.
 * Returns `[[lr, lg, lb], [sr, sg, sb]]`.
 */
declare const labToLinearAndSrgb: (l: number, a: number, b: number) => [[number, number, number], [number, number, number]];
/**
 * Zero-allocation sibling of `labToLinearAndSrgb`.
 * Writes linear channels into `linOut`, gamma-encoded into `srgbOut`. Buffers must be distinct.
 */
declare const labToLinearAndSrgbInto: (linOut: Float64Array | number[], srgbOut: Float64Array | number[], l: number, a: number, b: number) => void;
/**
 * CIE LCh (D50) → both linear and gamma-encoded sRGB in one pass.
 * Returns `[[lr, lg, lb], [sr, sg, sb]]`.
 */
declare const lchToLinearAndSrgb: (l: number, c: number, h: number) => [[number, number, number], [number, number, number]];
/**
 * Zero-allocation sibling of `lchToLinearAndSrgb`.
 * Writes linear channels into `linOut`, gamma-encoded into `srgbOut`. Buffers must be distinct.
 */
declare const lchToLinearAndSrgbInto: (linOut: Float64Array | number[], srgbOut: Float64Array | number[], l: number, c: number, h: number) => void;

export { AnyColor, ColorFormat, getFormat, inGamutSrgb, labToLinearAndSrgb, labToLinearAndSrgbInto, labToLinearSrgb, labToLinearSrgbInto, labToRgbChannels, labToRgbChannelsInto, lchToLinearAndSrgb, lchToLinearAndSrgbInto, lchToLinearSrgb, lchToLinearSrgbInto, lchToRgbChannels, lchToRgbChannelsInto, oklchToLinear, oklchToLinearAndSrgb, oklchToLinearAndSrgbInto, oklchToLinearInto, oklchToRgbChannels, oklchToRgbChannelsInto, rgbToLinear, rgbToLinearInto, toHexByte };
