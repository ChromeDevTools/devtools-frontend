/** sRGB color. r, g, b in [0, 255]; alpha in [0, 1]. */
interface RgbColor {
    r: number;
    g: number;
    b: number;
    alpha: number;
}
/** Input shape of `RgbColor` — `alpha` is optional and defaults to 1. */
type RgbColorInput = Omit<RgbColor, 'alpha'> & {
    alpha?: number;
};
/** HSL color. h in [0, 360); s, l in [0, 100]; alpha in [0, 1]. */
interface HslColor {
    h: number;
    s: number;
    l: number;
    alpha: number;
}
/** Input shape of `HslColor` — `alpha` is optional and defaults to 1. */
type HslColorInput = Omit<HslColor, 'alpha'> & {
    alpha?: number;
};
/** HSV color. h in [0, 360); s, v in [0, 100]; alpha in [0, 1]. */
interface HsvColor {
    h: number;
    s: number;
    v: number;
    alpha: number;
}
/** Input shape of `HsvColor` — `alpha` is optional and defaults to 1. */
type HsvColorInput = Omit<HsvColor, 'alpha'> & {
    alpha?: number;
};
/** HWB color. h in [0, 360); w, b in [0, 100]; alpha in [0, 1]. */
interface HwbColor {
    h: number;
    /** Whiteness [0, 100]. */
    w: number;
    /** Blackness [0, 100]. */
    b: number;
    alpha: number;
}
/** Input shape of `HwbColor` — `alpha` is optional and defaults to 1. */
type HwbColorInput = Omit<HwbColor, 'alpha'> & {
    alpha?: number;
};
/** CIE Lab (D50). L in [0, 100]; a, b roughly in [-128, 128]. */
interface LabColor {
    l: number;
    /** Green–red axis. */
    a: number;
    /** Blue–yellow axis. */
    b: number;
    alpha: number;
    readonly colorSpace: 'lab';
}
/** Input shape of `LabColor` — `alpha` is optional and defaults to 1. */
type LabColorInput = Omit<LabColor, 'alpha'> & {
    alpha?: number;
};
/** CIE LCh (D50). L in [0, 100]; C in [0, ~150]; h in degrees. */
interface LchColor {
    l: number;
    c: number;
    h: number;
    alpha: number;
    readonly colorSpace: 'lch';
}
/** Input shape of `LchColor` — `alpha` is optional and defaults to 1. */
type LchColorInput = Omit<LchColor, 'alpha'> & {
    alpha?: number;
};
/** CIE XYZ (D50). x, y, z on the library's 0–100 scale. */
interface XyzColor {
    x: number;
    y: number;
    z: number;
    alpha: number;
}
/** Input shape of `XyzColor` — `alpha` is optional and defaults to 1. */
type XyzColorInput = Omit<XyzColor, 'alpha'> & {
    alpha?: number;
};
/** CIE XYZ (D65). x, y, z on the library's 0–100 scale. */
interface XyzD65Color {
    x: number;
    y: number;
    z: number;
    alpha: number;
    readonly colorSpace: 'xyz-d65';
}
type XyzD65ColorInput = Omit<XyzD65Color, 'alpha'> & {
    alpha?: number;
};
/** CMYK color. c, m, y, k in [0, 100]; alpha in [0, 1]. */
interface CmykColor {
    c: number;
    m: number;
    y: number;
    k: number;
    alpha: number;
}
/** Input shape of `CmykColor` — `alpha` is optional and defaults to 1. */
type CmykColorInput = Omit<CmykColor, 'alpha'> & {
    alpha?: number;
};
/** OKLab. Perceptually uniform (D65). L in [0, 1]; a, b roughly in [-0.4, 0.4]. */
interface OklabColor {
    l: number;
    /** Green–red axis. */
    a: number;
    /** Blue–yellow axis. */
    b: number;
    alpha: number;
}
/** Input shape of `OklabColor` — `alpha` is optional and defaults to 1. */
type OklabColorInput = Omit<OklabColor, 'alpha'> & {
    alpha?: number;
};
/** OKLCh. Polar form of OKLab. L in [0, 1]; C in [0, ~0.4]; h in degrees. */
interface OklchColor {
    l: number;
    c: number;
    h: number;
    alpha: number;
}
/** Input shape of `OklchColor` — `alpha` is optional and defaults to 1. */
type OklchColorInput = Omit<OklchColor, 'alpha'> & {
    alpha?: number;
};
/** CSS Color 4 Display-P3. r, g, b in [0, 1]. */
interface P3Color {
    r: number;
    g: number;
    b: number;
    alpha: number;
    readonly colorSpace: 'display-p3';
}
/** Input shape of `P3Color` — `alpha` is optional and defaults to 1. */
type P3ColorInput = Omit<P3Color, 'alpha'> & {
    alpha?: number;
};
/** CSS Color 4 Rec.2020. r, g, b in [0, 1]. */
interface Rec2020Color {
    r: number;
    g: number;
    b: number;
    alpha: number;
    readonly colorSpace: 'rec2020';
}
/** Input shape of `Rec2020Color` — `alpha` is optional and defaults to 1. */
type Rec2020ColorInput = Omit<Rec2020Color, 'alpha'> & {
    alpha?: number;
};
/** CSS Color 4 A98 (Adobe RGB 1998). r, g, b in [0, 1]. */
interface A98Color {
    r: number;
    g: number;
    b: number;
    alpha: number;
    readonly colorSpace: 'a98-rgb';
}
/** Input shape of `A98Color` — `alpha` is optional and defaults to 1. */
type A98ColorInput = Omit<A98Color, 'alpha'> & {
    alpha?: number;
};
/** CSS Color 4 ProPhoto (ROMM RGB). r, g, b in [0, 1]. */
interface ProPhotoColor {
    r: number;
    g: number;
    b: number;
    alpha: number;
    readonly colorSpace: 'prophoto-rgb';
}
/** Input shape of `ProPhotoColor` — `alpha` is optional and defaults to 1. */
type ProPhotoColorInput = Omit<ProPhotoColor, 'alpha'> & {
    alpha?: number;
};
/** Any color input accepted by `colordx()` and friends — a CSS string or one of the input objects. */
type AnyColor = string | RgbColorInput | HslColorInput | HsvColorInput | HwbColorInput | LabColorInput | LchColorInput | XyzColorInput | XyzD65ColorInput | CmykColorInput | OklabColorInput | OklchColorInput | P3ColorInput | Rec2020ColorInput | A98ColorInput | ProPhotoColorInput;
/** A parser registered by a plugin. Returns the sRGB equivalent or `null` if the input doesn't match. */
type ColorParser<T = AnyColor> = (input: T) => RgbColor | null;
/** Format tags returned by `getFormat()`. */
type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'hwb' | 'oklab' | 'oklch' | 'lab' | 'lch' | 'xyz' | 'xyz-d65' | 'cmyk' | 'p3' | 'rec2020' | 'a98-rgb' | 'prophoto-rgb' | 'name';

declare const _SENTINEL: unique symbol;
/**
 * Color value with parse, format, and manipulation methods.
 * Construct via the `colordx()` helper or `new Colordx(input)`. Instances are immutable —
 * mutators return a new `Colordx`.
 */
declare class Colordx {
    private readonly _rgb;
    private readonly _valid;
    constructor(input: AnyColor | Colordx | typeof _SENTINEL, _direct?: RgbColor);
    private static _make;
    /**
     * Construct a Colordx from linear-sRGB channels, gamma-encoding to the internal ×255 storage.
     * Channels may exceed [0, 1] — wide-gamut inputs (toGamutP3 / toGamutRec2020 applied to a
     * color outside sRGB) land here after the target-space → linear-sRGB matrix, and the stored
     * _rgb holds unclamped gamma-encoded ×255 so toP3() / toRec2020() can recover the wide-gamut
     * channels. sRGB output methods (toRgb, toHex, etc.) clamp to [0, 255] before returning.
     *
     * Replaces the prior _makeFromOklab: cssGamutMap hands back clipped linear-target channels
     * directly, so callers skip the OKLab → linear round-trip that used to reintroduce 1-ULP
     * asymmetries on gamut-boundary colors.
     *
     * A residual source of asymmetry remains — the clip itself. cssGamutMap's clip puts one
     * channel exactly on 0 or 1 while the others sit where the input's hue landed, so an
     * extreme-dark or extreme-light color ends up with genuinely asymmetric sub-byte channels
     * (e.g. clipped linear (3e-6, 0, 8e-10) from oklch(0.001 0.001 0)). Math.round collapses all
     * three to the same byte, but rgbToHslRaw / rgbToOklab read the raw floats and report
     * phantom hue/saturation. Snap values within half a byte of 0 or 255 to the exact boundary;
     * the band matches Math.round's own behavior so byte output is unchanged, while HSL / OKLab
     * see a consistent pure white / black / primary. Values outside [0, 255] are wide-gamut
     * (P3 / Rec.2020 targets) and pass through untouched.
     */
    static _makeFromLinearSrgb(lr: number, lg: number, lb: number, alpha: number): Colordx;
    /** True when the input parsed as a recognised color. */
    isValid(): boolean;
    /** Returns sRGB channels rounded to integers in [0, 255], plus alpha in [0, 1]. */
    toRgb(): RgbColor;
    /** Returns the internal unrounded RGB. Intended for plugin use where deferred rounding matters. */
    _rawRgb(): RgbColor;
    /**
     * Formats as a CSS `rgb()` / `rgba()` string.
     * Default is CSS Color 4 modern syntax — `rgb(255 0 0 / 0.5)`.
     * Pass `{ legacy: true }` for CSS Color 3 comma syntax (switches to `rgba()` when alpha < 1).
     */
    toRgbString(options?: {
        legacy?: boolean;
    }): string;
    /** Returns `#rrggbb` (or `#rrggbbaa` when alpha < 1). */
    toHex(): string;
    /** Always returns an 8-digit `#rrggbbaa`, even when alpha is 1. */
    toHex8(): string;
    /** Returns a 24-bit RGB integer (0x000000–0xFFFFFF). Alpha is not included. */
    toNumber(): number;
    /** Returns HSL channels: h in [0, 360), s/l in [0, 100], rounded to `precision` decimals. */
    toHsl(precision?: number): HslColor;
    /** Formats as a CSS `hsl()` string. */
    toHslString(precision?: number): string;
    /** Returns OKLab channels: L in [0, 1], a/b roughly in [-0.4, 0.4]. */
    toOklab(precision?: number): OklabColor;
    /** Formats as a CSS `oklab()` string. */
    toOklabString(precision?: number): string;
    /** Returns OKLCh channels: L in [0, 1], C in [0, ~0.4], H in degrees. */
    toOklch(precision?: number): OklchColor;
    /** Formats as a CSS `oklch()` string. Hue is `none` when chroma is 0. */
    toOklchString(precision?: number): string;
    /** Perceived brightness in [0, 1] using the ITU-R BT.601 weights. */
    brightness(): number;
    /** True when `brightness()` is below 0.5. */
    isDark(): boolean;
    /** True when `brightness()` is at or above 0.5. */
    isLight(): boolean;
    /** Get or set the alpha channel (clamped to [0, 1]). Setter returns a new `Colordx`. */
    alpha(): number;
    alpha(value: number): Colordx;
    /** Get or set the HSL hue in degrees. Setter returns a new `Colordx`. */
    hue(): number;
    hue(value: number): Colordx;
    /** Get or set the OKLCh lightness in [0, 1]. Setter returns a new `Colordx`. */
    lightness(): number;
    lightness(value: number): Colordx;
    /** Get or set the OKLCh chroma in [0, 0.4]. Setter returns a new `Colordx`. */
    chroma(): number;
    chroma(value: number): Colordx;
    /**
     * Lightens by `amount` (default 0.1) in HSL. Absolute by default — adds `amount * 100` to L.
     * Pass `{ relative: true }` to multiply L by `1 + amount` instead.
     */
    lighten(amount?: number, options?: {
        relative?: boolean;
    }): Colordx;
    /** Inverse of `lighten`. */
    darken(amount?: number, options?: {
        relative?: boolean;
    }): Colordx;
    /**
     * Saturates by `amount` (default 0.1) in HSL. Absolute by default — adds `amount * 100` to S.
     * Pass `{ relative: true }` to multiply S by `1 + amount` instead.
     */
    saturate(amount?: number, options?: {
        relative?: boolean;
    }): Colordx;
    /** Inverse of `saturate`. */
    desaturate(amount?: number, options?: {
        relative?: boolean;
    }): Colordx;
    /** Drops saturation to zero. */
    grayscale(): Colordx;
    /** Inverts each RGB channel (255 − channel). */
    invert(): Colordx;
    /** Shifts the HSL hue by `amount` degrees (default 15). */
    rotate(amount?: number): Colordx;
    /** True when both colors round to the same RGBA tuple. */
    isEqual(color: AnyColor): boolean;
    /** Returns the hex form (alias for `toHex()`). */
    toString(): string;
    /**
     * Clips this color into the sRGB gamut by clamping out-of-range channels to [0, 255].
     * Matches the naive-clip strategy browsers use when rendering out-of-gamut `oklch()` / `oklab()`.
     * Hue and lightness may shift noticeably for colors far outside sRGB.
     * Returns `this` when already in gamut.
     */
    clampSrgb(): Colordx;
    /**
     * Maps this color into the sRGB gamut using the CSS Color 4 gamut mapping algorithm
     * (chroma-reduction binary search). Preserves lightness and hue; sacrifices chroma.
     * Useful when hue stability matters — design tokens, palettes, color pickers.
     * Returns `this` when already in gamut.
     */
    mapSrgb(): Colordx;
    /**
     * Maps an out-of-sRGB-gamut color into sRGB using the CSS Color 4 gamut mapping algorithm.
     * Colors already in gamut are returned as-is. sRGB inputs (hex, rgb, hsl, etc.) are passed through.
     */
    static toGamutSrgb: (input: AnyColor) => Colordx;
}
/**
 * Plugin signature. Receives the `Colordx` class plus the parser arrays so a plugin
 * can register conversions (by adding instance methods) and parsers (by pushing onto the arrays).
 */
type Plugin = (ColordxClass: typeof Colordx, parsers: ColorParser[], formatParsers: [ColorParser, ColorFormat][]) => void;
/** Constructs a `Colordx` from any supported color input. Existing instances pass through. */
declare const colordx: (input: AnyColor | Colordx) => Colordx;
/** Emits an 8-digit `#rrggbbaa` hex for any color input. Shortcut for `colordx(c).toHex8()`. */
declare const toHex8: (input: AnyColor | Colordx) => string;
/** Registers plugins. Each plugin is called once with the `Colordx` class and parser arrays. */
declare const extend: (plugins: Plugin[]) => void;
/**
 * Picks the candidate closest to `color` by Euclidean distance in OKLab.
 * Throws when `candidates` is empty.
 */
declare const nearest: <T extends AnyColor>(color: AnyColor, candidates: T[]) => T;
/** Returns a random opaque sRGB color. */
declare const random: () => Colordx;

export { type AnyColor as A, extend as B, type ColorFormat as C, nearest as D, random as E, toHex8 as F, type XyzD65Color as G, type HslColor as H, type LabColor as L, type OklabColor as O, type P3Color as P, type Rec2020Color as R, type XyzColor as X, type A98Color as a, type A98ColorInput as b, type CmykColor as c, type CmykColorInput as d, type ColorParser as e, Colordx as f, type HslColorInput as g, type HsvColor as h, type HsvColorInput as i, type HwbColor as j, type HwbColorInput as k, type LabColorInput as l, type LchColor as m, type LchColorInput as n, type OklabColorInput as o, type OklchColor as p, type OklchColorInput as q, type P3ColorInput as r, type Plugin as s, type ProPhotoColor as t, type ProPhotoColorInput as u, type Rec2020ColorInput as v, type RgbColor as w, type RgbColorInput as x, type XyzColorInput as y, colordx as z };
