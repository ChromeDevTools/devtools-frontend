<p align="center">
  <img src="assets/logo.svg" width="128" height="128" alt="colordx" />
</p>

# @colordx/core

[![npm version](https://img.shields.io/npm/v/@colordx/core?labelColor=764be5&color=ffc200)](https://www.npmjs.com/package/@colordx/core)
[![used by cssnano](https://img.shields.io/badge/used_by-cssnano-ffc200?labelColor=764be5)](https://github.com/cssnano/cssnano)
[![used by oklch-picker](https://img.shields.io/badge/used_by-oklch--picker-ffc200?labelColor=764be5)](https://github.com/evilmartians/oklch-picker)
[![bundle size](https://img.shields.io/bundlejs/size/@colordx/core?labelColor=764be5&color=ffc200)](https://bundlejs.com/?q=@colordx/core)
[![npm downloads](https://img.shields.io/npm/dw/@colordx/core?labelColor=764be5&color=ffc200)](https://www.npmjs.com/package/@colordx/core)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-ffc200?labelColor=764be5)](https://github.com/dkryaklin/colordx/blob/main/package.json)
[![CI](https://img.shields.io/github/actions/workflow/status/dkryaklin/colordx/ci.yml?branch=main&label=ci&labelColor=764be5&color=ffc200)](https://github.com/dkryaklin/colordx/actions/workflows/ci.yml)

**[Try it on colordx.dev](https://colordx.dev)**

A modern color manipulation library built for the CSS Color 4 era, with first-class support for **OKLCH** and **OKLab**. **7.6 KB gzipped. 0 Dependencies.**

## Performance

Benchmarks run on Apple M4, Node.js 22, using [mitata](https://github.com/evanwashere/mitata). Operations per second — higher is better.

| Benchmark | **colordx** | @texel/color | colord | culori | chroma-js | color | tinycolor2 |
|---|---|---|---|---|---|---|---|
| HEX → toHsl | **24M** | — | 10M | 5.5M | 3.5M | 2.8M | 2.5M |
| HEX → lighten → toHex | **12M** | — | 5.8M | 4.8M | 1.3M | 1.0M | 1.0M |
| Mix two colors | **6.7M** | 5.2M | 1.2M | 1.0M | 1.1M | 550K | 1.1M |
| HEX → toOklch | **5.5M** | 4.5M | — | 3.3M | 1.0M | 2.0M | — |
| inGamutP3 | **4.6M** | 3.0M | — | 1.0M | — | — | — |
| inGamutRec2020 | **4.5M** | 3.2M | — | 1.1M | — | — | — |

## Install

```bash
npm install @colordx/core
```

## Quick start

```ts
import { colordx } from '@colordx/core';

// Parse any CSS color string or color object, then chain conversions:
colordx('#ff0000').toRgbString();     // 'rgb(255 0 0)'
colordx('#ff0000').toHex();           // '#ff0000'
colordx('#ff0000').toOklch();         // { l: 0.62796, c: 0.25768, h: 29.23389, alpha: 1 }
colordx('#ff0000').toOklchString();   // 'oklch(0.62796 0.25768 29.23389)'

// Works from any input format — hex, rgb(), hsl(), oklch(), oklab(), plain objects:
colordx('oklch(0.5 0.2 240)').toHex();                     // '#0069c7'
colordx({ r: 255, g: 0, b: 0 }).toHslString();             // 'hsl(0 100% 50%)'

// Chain manipulations — each call returns a new immutable Colordx:
colordx('#ff0000').lighten(0.1).saturate(0.2).toHex();
colordx('#3d7a9f').rotate(30).darken(0.1).toRgbString();
```

The `colordx()` factory is all you need for day-to-day work. For out-of-gamut `oklch()` / `oklab()` inputs, `.toHex()` / `.toRgbString()` clip in linear sRGB — the same strategy browsers use when rendering `background: oklch(...)` — so your output matches what users see on screen. If you need stricter hue/lightness preservation for authoring workflows, see [Gamut](#gamut).

## API

All methods are immutable — they return a new `Colordx` instance.

### Parsing

Accepts any CSS color string or color object:

```ts
colordx('#ff0000');
colordx('#f00');
colordx('rgb(255 0 0)');
colordx('rgba(255, 0, 0, 0.5)');
colordx('hsl(0 100% 50%)');
colordx('oklab(0.6279 0.2249 0.1257)');
colordx('oklch(0.6279 0.2577 29.23)');
colordx({ r: 255, g: 0, b: 0 });           // alpha defaults to 1
colordx({ r: 255, g: 0, b: 0, alpha: 0.5 });
colordx({ h: 0, s: 100, l: 50 });
colordx({ l: 0.6279, a: 0.2249, b: 0.1257 }); // OKLab
colordx({ l: 0.6279, c: 0.2577, h: 29.23 }); // OKLch
// With p3 plugin loaded:
colordx('color(display-p3 0.9176 0.2003 0.1386)'); // Display-P3 string
// With rec2020 plugin loaded:
colordx('color(rec2020 0.7919 0.2307 0.0739)'); // Rec.2020 string
// With a98rgb plugin loaded:
colordx('color(a98-rgb 0.8586 0 0)'); // A98 (Adobe RGB 1998) string
// With prophoto plugin loaded:
colordx('color(prophoto-rgb 0.7022 0.2757 0.1035)'); // ProPhoto string
// With hwb plugin loaded:
colordx('hwb(0 0% 0%)');
colordx({ h: 0, w: 0, b: 0 });
// With hsv plugin loaded:
colordx({ h: 0, s: 100, v: 100 }); // HSV
```

TypeScript: input color objects use `*ColorInput` types (`alpha` optional, defaults to 1).
Output methods like `.toRgb()` / `.toOklch()` return `*Color` types (`alpha` always present).

```ts
import type { RgbColor, RgbColorInput } from '@colordx/core';

const input: RgbColorInput = { r: 255, g: 0, b: 0 };       // alpha optional
const output: RgbColor = colordx(input).toRgb();           // alpha guaranteed
```

### Conversion

```ts
.toRgb()           // { r: 255, g: 0, b: 0, alpha: 1 }
.toRgbString()                    // 'rgb(255 0 0)'                — CSS Color 4 (default)
.toRgbString({ legacy: true })    // 'rgb(255, 0, 0)'              — CSS Color 3 comma syntax
// Legacy form also switches to `rgba()` when alpha < 1:
colordx({ r: 255, g: 0, b: 0, alpha: 0.5 }).toRgbString({ legacy: true }); // 'rgba(255, 0, 0, 0.5)'
.toHex()           // '#ff0000'
.toNumber()        // 16711680  (0xff0000 — PixiJS / Discord integer format)
.toHsl()           // { h: 0, s: 100, l: 50, alpha: 1 }
.toHslString()     // 'hsl(0 100% 50%)'
// toHsl accepts an optional precision argument (decimal places):
colordx('#3d7a9f').toHsl()         // { h: 202.65, s: 44.55, l: 43.14, alpha: 1 }      — default (2)
colordx('#3d7a9f').toHsl(4)        // { h: 202.6531, s: 44.5455, l: 43.1373, alpha: 1 }
colordx('#3d7a9f').toHsl(0)        // { h: 203, s: 45, l: 43, alpha: 1 }               — integers
colordx('#3d7a9f').toHslString()   // 'hsl(202.65 44.55% 43.14%)'
colordx('#3d7a9f').toHslString(4)  // 'hsl(202.6531 44.5455% 43.1373%)'
// With hwb plugin loaded:
.toHwb()           // { h: 0, w: 0, b: 0, alpha: 1 }
.toHwbString()     // 'hwb(0 0% 0%)'
.toOklab()         // { l: 0.62796, a: 0.22486, b: 0.12585, alpha: 1 }
.toOklabString()   // 'oklab(0.62796 0.22486 0.12585)'
.toOklch()         // { l: 0.62796, c: 0.25768, h: 29.23389, alpha: 1 }
.toOklchString()   // 'oklch(0.62796 0.25768 29.23389)'
// With p3 plugin loaded:
.toP3()            // { r: 0.9175, g: 0.2003, b: 0.1386, alpha: 1, colorSpace: 'display-p3' }
.toP3String()      // 'color(display-p3 0.9175 0.2003 0.1386)'
```

### Manipulation

```ts
.lighten(0.1)                        // increase lightness by 10 percentage points
.lighten(0.1, { relative: true })    // increase lightness by 10% of current value
.darken(0.1)                         // decrease lightness by 10 percentage points
.darken(0.1, { relative: true })     // decrease lightness by 10% of current value
.saturate(0.1)                       // increase saturation by 10 percentage points
.saturate(0.1, { relative: true })   // increase saturation by 10% of current value
.desaturate(0.1)                     // decrease saturation by 10 percentage points
.desaturate(0.1, { relative: true }) // decrease saturation by 10% of current value
.grayscale()       // fully desaturate
.invert()          // invert RGB channels
.rotate(30)        // rotate hue by 30°
.alpha(0.5)        // set alpha
.hue(120)          // set hue (HSL)
.lightness(0.5)    // set lightness (OKLCH, 0–1)
.chroma(0.1)       // set chroma (OKLCH, 0–0.4)
```

### Getters

```ts
.isValid()         // true if input was parseable
.alpha()           // get alpha (0–1)
.hue()             // get hue (0–360)
.lightness()       // get OKLCH lightness (0–1)
.chroma()          // get OKLCH chroma (0–0.4)
.brightness()      // perceived brightness (0–1)
.isDark()          // brightness < 0.5
.isLight()         // brightness >= 0.5
.isEqual('#f00')   // exact RGB equality
// With a11y plugin loaded:
.luminance()       // relative luminance (0–1, WCAG)
.contrast('#fff')  // WCAG 2.x contrast ratio (1–21)
// With mix plugin loaded:
.mix('#0000ff', 0.5)       // mix in sRGB space (CSS spec)
.mixOklab('#0000ff', 0.5)  // mix in Oklab space (perceptually uniform)
```

### Utilities

```ts
import { getFormat, nearest, oklchToLinear, oklchToRgbChannels, random } from '@colordx/core';

getFormat('#ff0000'); // 'hex'
getFormat('rgb(255 0 0)'); // 'rgb'
getFormat('hsl(0 100% 50%)'); // 'hsl'
getFormat('oklch(0.5 0.2 240)'); // 'oklch'
getFormat('oklab(0.6279 0.2249 0.1257)'); // 'oklab'
getFormat({ r: 255, g: 0, b: 0 }); // 'rgb'
getFormat({ h: 0, s: 100, l: 50 }); // 'hsl'
getFormat('notacolor'); // undefined
// Plugin-added parsers register their own format:
// p3 → 'p3', hsv → 'hsv', cmyk → 'cmyk', lch → 'lch', lab → 'lab', xyz → 'xyz', names → 'name', rec2020 → 'rec2020', a98-rgb → 'a98-rgb', prophoto-rgb → 'prophoto-rgb'

nearest('#800', ['#f00', '#ff0', '#00f']); // '#f00' — perceptual distance via OKLab
nearest('#ffe', ['#f00', '#ff0', '#00f']); // '#ff0'

random(); // random Colordx instance

// Low-level functional converters — no object allocation, for hot paths (canvas gradients, etc.)
oklchToRgbChannels(0.5, 0.2, 240); // [r, g, b] gamma-encoded sRGB in [0, 1]
// Out-of-gamut channels may exceed [0, 1] — callers clamp before byte encoding

const linear = oklchToLinear(0.5, 0.2, 240); // unclamped linear sRGB — also a free sRGB gamut check

// Non-OKLCH inputs → linear sRGB (same output scale and gamut-check behavior as oklchToLinear).
// Use these when you already have RGB/Lab/LCH values and want linear pixels without round-tripping through OKLCH.
import {
  labToLinearAndSrgb,
  labToLinearSrgb,
  labToRgbChannels,
  lchToLinearAndSrgb,
  lchToLinearSrgb,
  lchToRgbChannels,
  rgbToLinear,
} from '@colordx/core';

rgbToLinear(1, 0, 0);          // [1, 0, 0]           — vector sibling of srgbToLinear (0–1 input)
labToLinearSrgb(54.29, 80.8, 69.89); // Lab D50 → linear sRGB (via XYZ D50)
lchToLinearSrgb(54.29, 106.84, 40.86); // LCH D50 → Lab → linear sRGB

// Gamma-encoded sRGB in one call (skips the manual srgbFromLinear step):
labToRgbChannels(54.29, 80.8, 69.89); // → [r, g, b] gamma sRGB in [0, 1]
lchToRgbChannels(54.29, 106.84, 40.86);

// Both linear (for gamut check) and gamma (for display) in a single pass:
const [lin, srgb] = labToLinearAndSrgb(54.29, 80.8, 69.89); // or lchToLinearAndSrgb

// Hex/RGB input? Parse once, then divide by 255:
const { r, g, b } = colordx('#ff0000').toRgb();
rgbToLinear(r / 255, g / 255, b / 255); // [1, 0, 0]

// P3/Rec.2020 channel functions live in their plugins:
import { labToP3Channels, lchToP3Channels, linearToP3Channels, oklchToP3Channels } from '@colordx/core/plugins/p3';
import {
  labToRec2020Channels,
  lchToRec2020Channels,
  linearToRec2020Channels,
  oklchToRec2020Channels,
} from '@colordx/core/plugins/rec2020';

oklchToP3Channels(0.5, 0.2, 240);      // [r, g, b] gamma-encoded Display-P3 in [0, 1]
oklchToRec2020Channels(0.5, 0.2, 240); // [r, g, b] gamma-encoded Rec.2020 in [0, 1] (BT.2020 gamma)

// CIE Lab/LCH → P3 / Rec.2020 (hot path for LCH renderers without OKLCH detour):
labToP3Channels(54.29, 80.8, 69.89);      // [r, g, b] gamma P3
lchToP3Channels(54.29, 106.84, 40.86);
labToRec2020Channels(54.29, 80.8, 69.89); // [r, g, b] gamma Rec.2020
lchToRec2020Channels(54.29, 106.84, 40.86);

// Split-step API: compute the shared expensive OKLCH→linear sRGB step once,
// then apply cheap per-space steps to avoid repeating 3× Math.cbrt + OKLab matrix.
linearToP3Channels(...linear);      // linear sRGB → gamma-encoded P3
linearToRec2020Channels(...linear); // linear sRGB → gamma-encoded Rec.2020 (BT.2020 gamma)
```

**Zero-allocation tight-loop variants (`*Into`).** Every channel function has an `*Into` sibling that writes into a caller-provided `Float64Array | number[]` instead of allocating a new tuple. For per-pixel work (canvas renderers, gradient grids, wide-gamut data viz), this eliminates ~10× the GC pressure and makes interactive redraws smoother. Output is bit-for-bit identical to the allocating version.

```ts
import {
  oklchToLinearInto,
  oklchToRgbChannelsInto,
  oklchToLinearAndSrgbInto,
} from '@colordx/core';
import { linearToP3ChannelsInto, oklchToP3ChannelsInto } from '@colordx/core/plugins/p3';
import { linearToRec2020ChannelsInto, oklchToRec2020ChannelsInto } from '@colordx/core/plugins/rec2020';

// Pixel-renderer pattern: allocate one buffer, reuse for every pixel.
const buf = new Float64Array(3);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const [l, c, h] = getOklch(x, y);
    oklchToP3ChannelsInto(buf, l, c, h);
    imageData[i++] = Math.floor(buf[0] * 255);
    imageData[i++] = Math.floor(buf[1] * 255);
    imageData[i++] = Math.floor(buf[2] * 255);
    imageData[i++] = 255;
  }
}
```

Full `*Into` surface (all tree-shakable — unused ones have zero bundle cost):

```ts
// from '@colordx/core' — OKLCH → linear / sRGB
oklchToLinearInto(out, l, c, h);           // → [lr, lg, lb] linear sRGB
oklchToRgbChannelsInto(out, l, c, h);      // → [r, g, b] gamma-encoded sRGB
oklchToLinearAndSrgbInto(linOut, srgbOut, l, c, h); // both at once (distinct buffers)

// from '@colordx/core' — non-OKLCH inputs → linear / gamma sRGB (complements oklchToLinear)
rgbToLinearInto(out, r, g, b);             // 0–1 gamma sRGB → linear sRGB
labToLinearSrgbInto(out, l, a, b);         // CIE Lab (D50) → linear sRGB (via XYZ D50)
labToRgbChannelsInto(out, l, a, b);        // CIE Lab (D50) → gamma sRGB
labToLinearAndSrgbInto(linOut, srgbOut, l, a, b); // both (distinct buffers)
lchToLinearSrgbInto(out, l, c, h);         // CIE LCH (D50) → linear sRGB
lchToRgbChannelsInto(out, l, c, h);        // CIE LCH (D50) → gamma sRGB
lchToLinearAndSrgbInto(linOut, srgbOut, l, c, h);

// from '@colordx/core/plugins/p3'
linearToP3ChannelsInto(out, lr, lg, lb);
oklchToP3ChannelsInto(out, l, c, h);
labToP3ChannelsInto(out, l, a, b);
lchToP3ChannelsInto(out, l, c, h);

// from '@colordx/core/plugins/rec2020'
linearToRec2020ChannelsInto(out, lr, lg, lb);
oklchToRec2020ChannelsInto(out, l, c, h);
labToRec2020ChannelsInto(out, l, a, b);
lchToRec2020ChannelsInto(out, l, c, h);

// Lower-level matrix / color-space primitives also have *Into siblings:
// linearSrgbToOklabInto, oklabToLinearInto (from '@colordx/core')
// xyzD50ToLinearSrgbInto, xyzD65ToLinearSrgbInto, srgbLinearToP3LinearInto, linearP3ToSrgbInto,
// oklabToLinearP3Into, srgbLinearToRec2020LinearInto, linearRec2020ToSrgbInto,
// oklabToLinearRec2020Into
```

Guidance:
- Use `Float64Array(3)` for the buffer when you can — it's the convention and keeps the V8 call site monomorphic. `number[]` also works.
- One buffer per loop is plenty; don't allocate per iteration.
- `linOut` and `srgbOut` in `oklchToLinearAndSrgbInto` **must be distinct buffers** (the function writes to both).
- If you're outside a hot loop, the regular allocating versions are more ergonomic — reach for `*Into` only when you've profiled and GC is the bottleneck.

### Gamut

`oklch()` and `oklab()` can describe colors outside the sRGB gamut. **For everyday conversion, `.toRgbString()` / `.toHex()` already do the right thing** — they naive-clip in linear sRGB to match browser rendering, so your output matches what `background: oklch(...)` displays on screen. You only need the methods below when that default isn't what you want.

Internally, out-of-gamut `oklch()` / `oklab()` inputs are stored **unclamped**, so the authored color is preserved losslessly. That means `.toOklchString()` round-trips the original, and you can choose when (and how) to fold the color into sRGB:

```ts
const input = 'oklch(0.5 0.4 180)';  // out of sRGB gamut

// 1. Preserve — keep the authored oklch as-is, clip only at sRGB output time
colordx(input).toOklchString();          // 'oklch(0.5 0.4 180)'
colordx(input).toRgbString();            // 'rgb(0 152 108)' — naive clip, matches browser

// 2. Map — CSS Color 4 gamut mapping (preserves lightness + hue, reduces chroma)
colordx(input).mapSrgb().toOklchString();   // 'oklch(0.50907 0.09379 177.84892)'
colordx(input).mapSrgb().toRgbString();     // 'rgb(0 119 102)'

// 3. Clamp — naive-clip into sRGB as a Colordx (matches browser, but hue drifts)
colordx(input).clampSrgb().toOklchString(); // 'oklch(0.60125 0.1276 164.29892)'
colordx(input).clampSrgb().toRgbString();   // 'rgb(0 152 108)' — same bytes as (1)
```

- **`.mapSrgb()`** — CSS Color 4 chroma-reduction binary search. Preserves lightness and hue; sacrifices chroma. Use when hue stability matters — design tokens, palettes, programmatic harmonies, OKLCH pickers.
- **`.clampSrgb()`** — naive clip in linear sRGB. Hue and lightness may drift. Use when you want a `Colordx` whose `.toOklchString()` describes what browsers actually render.

A static form is also available for one-shot conversion without wrapping first — `Colordx.toGamutSrgb(input)` is equivalent to `colordx(input).mapSrgb()`.

colordx also includes standalone utilities for checking and mapping into wider gamuts (Display-P3 / Rec.2020, via plugins):

```ts
import { Colordx, inGamutSrgb } from '@colordx/core';
import { inGamutP3 } from '@colordx/core/plugins/p3';
import { inGamutRec2020 } from '@colordx/core/plugins/rec2020';
import p3 from '@colordx/core/plugins/p3';
import rec2020 from '@colordx/core/plugins/rec2020';
extend([p3, rec2020]);

// Check: is this color displayable in sRGB?
inGamutSrgb('#ff0000'); // true  — hex is always sRGB
inGamutSrgb('oklch(0.5 0.1 30)'); // true  — clearly in sRGB
inGamutSrgb('oklch(0.5 0.4 180)'); // false — too much cyan chroma

// Map: reduce chroma until in-gamut (preserves lightness and hue)
Colordx.toGamutSrgb('oklch(0.5 0.4 180)'); // → Colordx at the sRGB boundary
Colordx.toGamutSrgb('#ff0000'); // → unchanged, already in sRGB

// Display-P3 gamut (wider than sRGB) — available after extend([p3])
inGamutP3('oklch(0.64 0.27 29)'); // true  — inside P3 but outside sRGB
inGamutP3('oklch(0.5 0.4 180)'); // false — outside P3
Colordx.toGamutP3('oklch(0.5 0.4 180)'); // → Colordx at the P3 boundary

// Rec.2020 gamut (wider than P3) — available after extend([rec2020])
inGamutRec2020('oklch(0.5 0.4 180)'); // false — outside Rec.2020
Colordx.toGamutRec2020('oklch(0.5 0.4 180)'); // → Colordx at the Rec.2020 boundary
```

Gamut containment is largely hierarchical: sRGB ⊂ Display-P3 ⊂ Rec.2020 ⊂ ProPhoto. A98 (Adobe RGB 1998) sits between sRGB and Rec.2020 — wider than sRGB, mostly in the greens — but is not a strict superset of Display-P3. All `inGamut*` functions always return `true` for sRGB-bounded inputs (hex, rgb, hsl, hsv, hwb). The `toGamut*` functions use a binary chroma-reduction search following the [CSS Color 4 gamut mapping algorithm](https://www.w3.org/TR/css-color-4/#css-gamut-mapping).

Gamut checks and mapping accept wide-gamut inputs in every supported form — `oklab()` / `oklch()`, CIE `lab()` / `lch()` strings, and the corresponding object shapes (including branded `{ colorSpace: 'lab' | 'lch' }` objects):

```ts
// CIE LCH object — recognized as wide-gamut, not clamped at parse time
const lch = { l: 50, c: 100, h: 180, alpha: 1, colorSpace: 'lch' as const };
inGamutSrgb(lch);  // false — outside sRGB
inGamutP3(lch);    // false — outside P3
colordx(lch).toHex();           // '#009774' — naive clip
colordx(lch).mapSrgb().toHex(); // '#008471' — chroma-reduced (CSS Color 4)

// CIE Lab string works too
inGamutSrgb('lab(50 100 0)'); // false
Colordx.toGamutSrgb('lab(50 100 0)'); // → Colordx at the sRGB boundary
```

## Plugins

Opt-in plugins for less common color spaces and utilities:

```ts
import { extend } from '@colordx/core';
import a11y from '@colordx/core/plugins/a11y';
// isReadable(), readableScore(), minReadable(), apcaContrast(), isReadableApca()
import cmyk from '@colordx/core/plugins/cmyk';
// toCmyk(), toCmykString(), parses device-cmyk() strings and CMYK objects
import harmonies from '@colordx/core/plugins/harmonies';
// harmonies()
import hwb from '@colordx/core/plugins/hwb';
// toHwb(), toHwbString(), parses hwb() strings and HWB objects
import hsv from '@colordx/core/plugins/hsv';
// toHsv(), toHsvString(), parses hsv() strings and HSV objects
import lab from '@colordx/core/plugins/lab';
// toLab(), toLabString(), toXyz(), toXyzString(), toXyzD65(), toXyzD65String(), mixLab(), delta(), parses Lab/XYZ(D50+D65) objects and strings
import lch from '@colordx/core/plugins/lch';
// toLch(), toLchString(), parses lch() strings and LCH objects
import minify from '@colordx/core/plugins/minify';
// minify() — shortest CSS string
import mix from '@colordx/core/plugins/mix';
// tints(), shades(), tones(), palette()
import names from '@colordx/core/plugins/names';
// toName(), parses CSS color names
import p3 from '@colordx/core/plugins/p3';
// toP3(), toP3String(), inGamutP3(), Colordx.toGamutP3(), linearToP3Channels(), oklchToP3Channels(), parses color(display-p3 ...) strings
import rec2020 from '@colordx/core/plugins/rec2020';
// toRec2020(), toRec2020String(), inGamutRec2020(), Colordx.toGamutRec2020(), linearToRec2020Channels(), oklchToRec2020Channels(), parses color(rec2020 ...) strings
import a98rgb from '@colordx/core/plugins/a98rgb';
// toA98(), toA98String(), inGamutA98(), Colordx.toGamutA98(), linearToA98Channels(), oklchToA98Channels(), parses color(a98-rgb ...) strings
import prophoto from '@colordx/core/plugins/prophoto';
// toProphoto(), toProphotoString(), inGamutProphoto(), Colordx.toGamutProphoto(), linearToProphotoChannels(), oklchToProphotoChannels(), parses color(prophoto-rgb ...) strings

extend([lab, lch, cmyk, names, a11y, harmonies, hwb, hsv, mix, minify, p3, rec2020, a98rgb, prophoto]);
```

### lab plugin

CIE Lab (D50), CIE XYZ (D50), and CIE XYZ (D65) color models. Lab and XYZ objects are also accepted as color input (Lab requires a `colorSpace: 'lab'` discriminant; XYZ D65 requires `colorSpace: 'xyz-d65'`; plain `{ x, y, z }` parses as D50). Also adds `.mixLab()` for perceptual mixing in CIE Lab, `.delta()` for CIEDE2000 color difference, and string conversion methods.

```ts
import lab from '@colordx/core/plugins/lab';

extend([lab]);

colordx('#ff0000').toLab(); // { l: 54.29, a: 80.8, b: 69.89, alpha: 1, colorSpace: 'lab' }
colordx('#ff0000').toLabString(); // 'lab(54.29 80.8 69.89)'
colordx('lab(54.29 80.8 69.89)').toHex(); // '#ff0000'  — lab strings are parseable

// XYZ D50 (chromatic-adapted; matches Lab's white point)
colordx('#ff0000').toXyz(); // { x: 43.61, y: 22.25, z: 1.39, alpha: 1 }
colordx('#ff0000').toXyzString(); // 'color(xyz-d50 43.61 22.25 1.39)'

// XYZ D65 (screen-native; no Bradford adaptation — same illuminant as sRGB/OKLab)
colordx('#ff0000').toXyzD65(); // { x: 41.24, y: 21.26, z: 1.93, alpha: 1, colorSpace: 'xyz-d65' }
colordx('#ff0000').toXyzD65String(); // 'color(xyz-d65 41.24 21.26 1.93)'

// Lab and XYZ objects parse as color input (with lab plugin loaded)
// Lab objects require colorSpace: 'lab' to distinguish from OKLab (which has the same l/a/b shape)
colordx({ l: 54.29, a: 80.8, b: 69.89, colorSpace: 'lab' as const }).toHex(); // '#ff0000'
colordx({ x: 43.61, y: 22.25, z: 1.39 }).toHex(); // '#ff0000' (D50)
colordx({ x: 41.24, y: 21.26, z: 1.93, colorSpace: 'xyz-d65' as const }).toHex(); // '#ff0000'

// color() strings parse for both white points
colordx('color(xyz-d50 43.61 22.25 1.39)').toHex(); // '#ff0000'
colordx('color(xyz-d65 41.24 21.26 1.93)').toHex(); // '#ff0000'

// Mix in CIE Lab space
colordx('#000000').mixLab('#ffffff').toHex(); // '#777777'

// CIEDE2000 perceptual color difference (0 = identical, ~1 = maximum)
colordx('#ff0000').delta('#ff0000'); // 0
colordx('#000000').delta('#ffffff'); // ~1
colordx('#ff0000').delta(); // compared against white (default)
```

### lch plugin

CIE LCH (D50) — the polar form of CIE Lab. Parses `lch()` CSS strings and LCH objects.

```ts
import lch from '@colordx/core/plugins/lch';

extend([lch]);

colordx('#ff0000').toLch(); // { l: 54.29, c: 106.84, h: 40.86, alpha: 1, colorSpace: 'lch' }
colordx('#ff0000').toLchString(); // 'lch(54.29 106.84 40.86)'
colordx('lch(54.29 106.84 40.86)').toHex(); // '#ff0000'
// LCH objects require colorSpace: 'lch' to distinguish from OKLCH (which has the same l/c/h shape)
colordx({ l: 50, c: 50, h: 180, colorSpace: 'lch' as const }).toHex(); // parses as LCH object
```

### cmyk plugin

CMYK color model. Parses `device-cmyk()` CSS strings and CMYK objects.

```ts
import cmyk from '@colordx/core/plugins/cmyk';

extend([cmyk]);

colordx('#ff0000').toCmyk(); // { c: 0, m: 100, y: 100, k: 0, alpha: 1 }
colordx('#ff0000').toCmykString(); // 'device-cmyk(0% 100% 100% 0%)'
colordx('device-cmyk(0% 100% 100% 0%)').toHex(); // '#ff0000'
colordx({ c: 0, m: 100, y: 100, k: 0 }).toHex(); // '#ff0000'
```

### names plugin

CSS named color support (140 names from the CSS spec). `toName()` returns `undefined` for colors with no CSS name.

```ts
import names from '@colordx/core/plugins/names';

extend([names]);

colordx('red').toHex(); // '#ff0000'
colordx('rebeccapurple').toHex(); // '#663399'
colordx('#ff0000').toName(); // 'red'
colordx('#c06060').toName(); // undefined — no CSS name for this color
colordx('#c06060').toName({ closest: true }); // nearest named color by RGB distance
```

### hsv plugin

HSV/HSVa color model. Parses `hsv()` / `hsva()` strings and HSV objects.

```ts
import hsv from '@colordx/core/plugins/hsv';

extend([hsv]);

colordx('#ff0000').toHsv(); // { h: 0, s: 100, v: 100, alpha: 1 }
colordx('#ff0000').toHsvString(); // 'hsv(0 100% 100%)'
colordx('hsv(0 100% 100%)').toHex(); // '#ff0000'
colordx({ h: 0, s: 100, v: 100, alpha: 1 }).toHex(); // '#ff0000'
```

### harmonies plugin

Color harmony generation using hue rotation.

```ts
import harmonies from '@colordx/core/plugins/harmonies';

extend([harmonies]);

colordx('#ff0000').harmonies();                              // complementary (default) — 2 colors
colordx('#ff0000').harmonies('complementary');               // [0°, 180°] — 2 colors
colordx('#ff0000').harmonies('analogous');                   // [−30°, 0°, 30°] — 3 colors
colordx('#ff0000').harmonies('split-complementary');         // [0°, 150°, 210°] — 3 colors
colordx('#ff0000').harmonies('triadic');                     // [0°, 120°, 240°] — 3 colors
colordx('#ff0000').harmonies('tetradic');                    // [0°, 90°, 180°, 270°] — 4 colors (square)
colordx('#ff0000').harmonies('rectangle');                   // [0°, 60°, 180°, 240°] — 4 colors
colordx('#ff0000').harmonies('double-split-complementary');  // [−30°, 0°, 30°, 150°, 210°] — 5 colors
```

### hwb plugin

CSS Color Level 4 HWB (Hue, Whiteness, Blackness) color model.

```ts
import hwb from '@colordx/core/plugins/hwb';

extend([hwb]);

colordx('#ff0000').toHwb();         // { h: 0, w: 0, b: 0, alpha: 1 }
colordx('#ff0000').toHwbString();   // 'hwb(0 0% 0%)'
colordx('hwb(0 0% 0%)').toHex();   // '#ff0000'
colordx({ h: 0, w: 0, b: 0, alpha: 1 }).toHex(); // '#ff0000'

// toHwb accepts an optional precision argument (decimal places):
colordx('#3d7a9f').toHwb();    // { h: 203, w: 24, b: 38, alpha: 1 }   — default (0)
colordx('#3d7a9f').toHwb(2);   // { h: 202.65, w: 23.92, b: 37.65, alpha: 1 }
colordx('#3d7a9f').toHwbString();  // 'hwb(203 24% 38%)'
colordx('#3d7a9f').toHwbString(2); // 'hwb(202.65 23.92% 37.65%)'
```

### mix plugin

Color mixing helpers built on top of `.mix()`.

```ts
import mix from '@colordx/core/plugins/mix';

extend([mix]);

colordx('#ff0000').tints(5); // [#ff0000, #ff4040, #ff8080, #ffbfbf, #ffffff]
colordx('#ff0000').shades(3); // [#ff0000, #800000, #000000]
colordx('#ff0000').tones(3);  // [#ff0000, #c04040, #808080]

// palette: N evenly-spaced stops toward any target (default: white)
colordx('#ff0000').palette(3, '#0000ff'); // [#ff0000, #800080, #0000ff]
```

### minify plugin

Returns the shortest valid CSS representation of a color. By default tries hex, RGB, and HSL and picks the shortest.

```ts
import minify from '@colordx/core/plugins/minify';

extend([minify]);

colordx('#ff0000').minify(); // '#f00'
colordx('#ffffff').minify(); // '#fff'
colordx('#ff0000').minify({ name: true }); // 'red'  — requires names plugin
colordx({ r: 0, g: 0, b: 0, a: 0 }).minify({ transparent: true }); // 'transparent'
colordx({ r: 255, g: 0, b: 0, a: 0.5 }).minify({ alphaHex: true }); // '#ff000080'

// Disable specific formats to exclude them from candidates:
colordx('#ff0000').minify({ hsl: false }); // skips HSL, picks from hex/RGB
```

### a11y plugin

WCAG 2.x contrast:

```ts
colordx('#000').isReadable('#fff'); // true  — AA normal (ratio >= 4.5)
colordx('#000').isReadable('#fff', { level: 'AAA' }); // true  — AAA normal (ratio >= 7)
colordx('#000').isReadable('#fff', { size: 'large' }); // true  — AA large (ratio >= 3)
colordx('#000').readableScore('#fff'); // 'AAA'
colordx('#e60000').readableScore('#ffff47'); // 'AA'
colordx('#949494').readableScore('#fff'); // 'AA large'
colordx('#aaa').readableScore('#fff'); // 'fail'
colordx('#777').minReadable('#fff'); // darkened/lightened to reach 4.5
```

APCA (Accessible Perceptual Contrast Algorithm) — the projected replacement for WCAG 2.x in WCAG 3.0:

```ts
// Returns a signed Lc value: positive = dark text on light bg, negative = light text on dark bg
colordx('#000').apcaContrast('#fff'); //  106.0
colordx('#fff').apcaContrast('#000'); // -107.9
colordx('#202122').apcaContrast('#cf674a'); //  37.2  ← dark text on orange
colordx('#ffffff').apcaContrast('#cf674a'); // -69.5  ← white text on orange

// Checks readability using |Lc| thresholds: >= 75 for normal text, >= 60 for large text/headings
colordx('#000').isReadableApca('#fff'); // true
colordx('#777').isReadableApca('#fff'); // false
colordx('#777').isReadableApca('#fff', { size: 'large' }); // true
```

APCA is better suited than WCAG 2.x for dark color pairs and more accurately reflects human perception. See [Introduction to APCA](https://git.apcacontrast.com/documentation/APCAeasyIntro) for background.

### p3 plugin

Adds Display-P3 color space support. P3 has a wider gamut than sRGB and is natively supported by all modern browsers and most Mac/iOS displays.

```ts
import p3 from '@colordx/core/plugins/p3';

extend([p3]);

colordx('#ff0000').toP3(); // { r: 0.9175, g: 0.2003, b: 0.1386, alpha: 1, colorSpace: 'display-p3' }
colordx('#ff0000').toP3String(); // 'color(display-p3 0.9175 0.2003 0.1386)'

// Parse Display-P3 strings (alpha optional)
colordx('color(display-p3 0.9175 0.2003 0.1386)').toHex(); // '#ff0000'
colordx('color(display-p3 0.9175 0.2003 0.1386 / 0.5)').toHex(); // '#ff000080'
```

The plugin also exports standalone gamut utilities and low-level channel functions. `inGamutP3` and the channel helpers need no `extend()`. Gamut mapping is available as `Colordx.toGamutP3` after `extend([p3])`:

```ts
import { Colordx, extend } from '@colordx/core';
import p3, { inGamutP3, linearToP3Channels, oklchToP3Channels } from '@colordx/core/plugins/p3';

extend([p3]);

inGamutP3('oklch(0.64 0.27 29)');        // true — inside P3 but outside sRGB
Colordx.toGamutP3('oklch(0.5 0.4 180)'); // → Colordx at the P3 boundary

oklchToP3Channels(0.5, 0.2, 240); // [r, g, b] gamma-encoded P3 in [0, 1]
```

Object parsing is also supported using the `colorSpace` discriminant:

```ts
colordx({ r: 0.9505, g: 0.2856, b: 0.0459, alpha: 1, colorSpace: 'display-p3' }).toHex();
```

### rec2020 plugin

Adds Rec.2020 (BT.2020) color space support. Rec.2020 has the widest gamut of the three — it covers most of the visible spectrum.

```ts
import rec2020 from '@colordx/core/plugins/rec2020';

extend([rec2020]);

colordx('#ff0000').toRec2020(); // { r: 0.792, g: 0.231, b: 0.0738, alpha: 1, colorSpace: 'rec2020' }
colordx('#ff0000').toRec2020String(); // 'color(rec2020 0.792 0.231 0.0738)'

// Parse Rec.2020 strings (alpha optional)
colordx('color(rec2020 0.792 0.231 0.0738)').toHex(); // '#ff0000'
colordx('color(rec2020 0.792 0.231 0.0738 / 0.5)').toHex(); // '#ff000080'
```

The plugin also exports standalone gamut utilities and low-level channel functions. `inGamutRec2020` and the channel helpers need no `extend()`. Gamut mapping is available as `Colordx.toGamutRec2020` after `extend([rec2020])`:

```ts
import { Colordx, extend } from '@colordx/core';
import rec2020, { inGamutRec2020, linearToRec2020Channels, oklchToRec2020Channels } from '@colordx/core/plugins/rec2020';

extend([rec2020]);

inGamutRec2020('oklch(0.5 0.4 180)');        // false — outside Rec.2020
Colordx.toGamutRec2020('oklch(0.5 0.4 180)'); // → Colordx at the Rec.2020 boundary

oklchToRec2020Channels(0.5, 0.2, 240); // [r, g, b] gamma-encoded Rec.2020 in [0, 1]
```

Object parsing is also supported using the `colorSpace` discriminant:

```ts
colordx({ r: 0.7919, g: 0.2307, b: 0.0739, alpha: 1, colorSpace: 'rec2020' }).toHex();
```

### a98rgb plugin

Adds A98 (Adobe RGB 1998) color space support. A98 shares sRGB's red and blue primaries but a wider green primary, so it extends mainly into the greens/cyans. It is a CSS Color 4 predefined space and a long-standing photography/print working space.

```ts
import a98rgb from '@colordx/core/plugins/a98rgb';

extend([a98rgb]);

colordx('#ff0000').toA98(); // { r: 0.8586, g: 0, b: 0, alpha: 1, colorSpace: 'a98-rgb' }
colordx('#ff0000').toA98String(); // 'color(a98-rgb 0.8586 0 0)'

// Parse A98 strings (alpha optional)
colordx('color(a98-rgb 0.8586 0 0)').toHex(); // '#ff0000'
colordx('color(a98-rgb 0.8586 0 0 / 0.5)').toHex(); // '#ff000080'
```

The plugin also exports standalone gamut utilities and low-level channel functions. `inGamutA98` and the channel helpers need no `extend()`. Gamut mapping is available as `Colordx.toGamutA98` after `extend([a98rgb])`:

```ts
import { Colordx, extend } from '@colordx/core';
import a98rgb, { inGamutA98, linearToA98Channels, oklchToA98Channels } from '@colordx/core/plugins/a98rgb';

extend([a98rgb]);

inGamutA98('oklch(0.7 0.25 150)');        // true — inside A98 but outside sRGB
Colordx.toGamutA98('oklch(0.5 0.4 180)'); // → Colordx at the A98 boundary

oklchToA98Channels(0.5, 0.2, 240); // [r, g, b] gamma-encoded A98 in [0, 1]
```

Object parsing is also supported using the `colorSpace` discriminant:

```ts
colordx({ r: 0.8586, g: 0, b: 0, alpha: 1, colorSpace: 'a98-rgb' }).toHex();
```

### prophoto plugin

Adds ProPhoto (ROMM RGB) color space support. ProPhoto has an extremely wide gamut — wider than Rec.2020, covering most of the visible spectrum — and uses a D50 white point with a gamma-1.8 transfer curve. It is the standard working space for high-end RAW photo and print pipelines.

```ts
import prophoto from '@colordx/core/plugins/prophoto';

extend([prophoto]);

colordx('#ff0000').toProphoto(); // { r: 0.7022, g: 0.2757, b: 0.1035, alpha: 1, colorSpace: 'prophoto-rgb' }
colordx('#ff0000').toProphotoString(); // 'color(prophoto-rgb 0.7022 0.2757 0.1035)'

// Parse ProPhoto strings (alpha optional)
colordx('color(prophoto-rgb 0.7022 0.2757 0.1035)').toHex(); // '#ff0000'
colordx('color(prophoto-rgb 0.7022 0.2757 0.1035 / 0.5)').toHex(); // '#ff000080'
```

The plugin also exports standalone gamut utilities and low-level channel functions. `inGamutProphoto` and the channel helpers need no `extend()`. Gamut mapping is available as `Colordx.toGamutProphoto` after `extend([prophoto])`:

```ts
import { Colordx, extend } from '@colordx/core';
import prophoto, { inGamutProphoto, linearToProphotoChannels, oklchToProphotoChannels } from '@colordx/core/plugins/prophoto';

extend([prophoto]);

inGamutProphoto('oklch(0.5 0.4 180)');       // false — outside even ProPhoto
Colordx.toGamutProphoto('oklch(0.5 0.4 180)'); // → Colordx at the ProPhoto boundary

oklchToProphotoChannels(0.5, 0.2, 240); // [r, g, b] gamma-encoded ProPhoto in [0, 1]
```

Object parsing is also supported using the `colorSpace` discriminant:

```ts
colordx({ r: 0.7022, g: 0.2757, b: 0.1035, alpha: 1, colorSpace: 'prophoto-rgb' }).toHex();
```

## Notes

### `mix()` uses sRGB; use `mixLab()` or `mixOklab()` for perceptual blending

`mix()` interpolates in **sRGB**, matching CSS `color-mix(in srgb, ...)` and how browsers composite layers. Use `mixOklab()` for perceptually uniform blending, or `mixLab()` (lab plugin) for CIE Lab.

```ts
colordx('#000000').mix('#ffffff').toHex();       // '#808080' — sRGB (CSS spec)
colordx('#000000').mixOklab('#ffffff').toHex();  // '#636363' — Oklab (perceptually uniform)

import lab from '@colordx/core/plugins/lab';
extend([lab]);
colordx('#000000').mixLab('#ffffff').toHex();    // '#777777' — CIE Lab
```

The same applies to `tints()`, `shades()`, and `tones()` from the mix plugin, which all call `.mix()` internally.

### Precision

Every `toX()` / `toXString()` method accepts an optional `precision` (decimal places), applied uniformly to every channel of that format. Alpha is fixed at 3 dp globally. Format-specific defaults (scale-appropriate):

| format | default |
|---|---|
| `toHsl`, `toHsv`, `toCmyk`, `toLab`, `toLch`, `toXyz`, `toXyzD65` | `2` |
| `toHwb` | `0` |
| `toOklab`, `toOklch`, `toP3`, `toRec2020` | `4` |

```ts
colordx('#3d7a9f').toHsl();      // { h: 202.65, s: 44.55, l: 43.14, alpha: 1 }
colordx('#3d7a9f').toHsl(4);     // { h: 202.6531, s: 44.5455, l: 43.1373, alpha: 1 }
colordx('#3d7a9f').toHsl(0);     // { h: 203, s: 45, l: 43, alpha: 1 }

colordx('#ff0000').toOklchString();   // 'oklch(0.62796 0.25768 29.23389)'
colordx('#ff0000').toOklchString(2);  // 'oklch(0.63 0.26 29.23)'
```

The `minify()` plugin preserves full HSL precision when building candidates, so minification is lossless — it only picks HSL when the string is genuinely shorter than hex/rgb.

## Relative lighten/darken

By default, `.lighten(0.1)` shifts lightness by an **absolute** 10 percentage points. Pass `{ relative: true }` to shift by a fraction of the **current** value instead — useful when migrating from Qix's `color` library or when you want proportional adjustments:

```ts
// Color with l=10%
colordx('#1a0000').lighten(0.1); // l = 10 + 10 = 20%  (absolute)
colordx('#1a0000').lighten(0.1, { relative: true }); // l = 10 * 1.1 = 11% (relative)

// Color with s=40%
colordx('#a35050').saturate(0.1); // s = 40 + 10 = 50%  (absolute)
colordx('#a35050').saturate(0.1, { relative: true }); // s = 40 * 1.1 = 44% (relative)
```

The same flag works on `.darken()` and `.desaturate()`.

## Roadmap

### CSS Color 4/5 completeness

- **`color-mix()`** — parse and evaluate `color-mix(in oklch, red 30%, blue)` strings, with support for all interpolation spaces and polar hue methods (`shorter`, `longer`, `increasing`, `decreasing`)
- **`color()` for remaining spaces** — `color(srgb ...)`, `color(srgb-linear ...)`, `color(a98-rgb ...)`, `color(prophoto-rgb ...)` string parsing (`display-p3`, `rec2020`, `xyz-d50`, and `xyz-d65` already supported)
- **Relative color syntax** — `oklch(from red l c h)` and channel arithmetic like `oklch(from red l calc(c + 0.1) h)`

### Internals

- Deduplicate the sRGB→XYZ D65 matrix shared between `xyz.ts` and `lab.ts`

## Ecosystem

- [**@colordx/gpu**](https://github.com/dkryaklin/colordx-gpu) — colordx's color math on the GPU: conversions and gamut tests as generated GLSL, parity-tested against this library. For per-pixel workloads — picker charts, gamut visualizations, gradients — where you convert millions of colors per frame instead of one at a time.

## Sponsors

Supported by [Ruslo.app](https://ruslo.app).

## License

MIT
