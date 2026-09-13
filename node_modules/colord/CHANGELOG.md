### 2.10.0

- Improve `mix` plugin by adding an optional `"rgb"` interpolation mode to `mix`, `tints`, `tones` and `shades`

### 2.9.7

- Make HEX parsing and serialization more than 2x faster

### 2.9.6

- Fix: Rotate the unrounded hue so `rotate` and `harmonies` preserve the original color
- Fix: Normalize HWB whiteness + blackness over 100% to gray ❤️ [@spokodev](https://github.com/spokodev)

### 2.9.5

- Fix: Use adjusted chroma for the CIEDE2000 rotation term ❤️ [@maximilliangrand](https://github.com/maximilliangrand)
- Fix: Keep the hue within `[0, 360)` in every color model ❤️ [@sarathfrancis90](https://github.com/sarathfrancis90)

Both fixes change returned numbers for a small set of colors; `toHex()` output is unchanged. Snapshots holding `h: 360`, `"hsl(360, …)"` or a `delta()` value may need updating.

### 2.9.4

- Fix: Reject malformed color strings in linear time ❤️ [@GAP-dev](https://github.com/GAP-dev)

### 2.9.3

- Fix types export for TypeScript 4.7 ❤️ [@pkishorez](https://github.com/pkishorez)

### 2.9.2

- Fix: Add "package.json" to exports map

### 2.9.1

- Fix: Make minification lossless
- Fix: Minify to name only if color is opaque

### 2.9.0

- New plugin: Color string minification 🗜

### 2.8.0

- New `delta` method to calculate the perceived color difference between two colors ❤️ [@EricRovell](https://github.com/EricRovell)

### 2.7.0

- Improve `mix` plugin by adding new `tints`, `tones` and `shades` methods ❤️ [@EricRovell](https://github.com/EricRovell)

### 2.6.0

- Support "double split complementary" color harmony generation ❤️ [@EricRovell](https://github.com/EricRovell) & [@lbragile](https://github.com/lbragile)

### 2.5.0

- New `closest` option of `toName` method allows you to find the closest color if there is no exact match

### 2.4.0

- New plugin: Color harmonies generator ❤️ [@EricRovell](https://github.com/EricRovell)

### 2.3.0

- Add new `isEqual` method ❤️ [@EricRovell](https://github.com/EricRovell)

### 2.2.0

- New plugin: CMYK color space ❤️ [@EricRovell](https://github.com/EricRovell)

### 2.1.0

- Add new `hue` and `rotate` methods

### 2.0.1

- Improve the precision of alpha values

### 2.0.0

- Strict string color parsing conforming to the CSS Color Level specifications

### 1.7.2

- Simplify package "exports" field to improve different environments support

### 1.7.1

- Parse a color name disregarding the case

### 1.7.0

- New `getFormat` utility
- Support HWB color strings (CSS functional notation)
- Clamp LAB values as defined in CSS Color Level 4 specs

### 1.6.0

- Improvement: You can now use every angle unit supported by CSS (`deg`, `rad`, `grad`, `turn`)

### 1.5.0

- New utility: Random color generation

### 1.4.1

- Mix colors through CIE LAB color space

### 1.4.0

- New plugin: Color mixing
- Adjust XYZ, LAB and LCH conversions to the D50 white point ([according to the latest CSS specs](https://drafts.csswg.org/css-color-5/#color-spaces)).

### 1.3.1

- Support modern CSS notations of RGB, HSL and LCH color functions

### 1.3.0

- New plugin: CIE LCH color space

### 1.2.1

- Fix: Do not treat 7-digit hex as a valid color ❤️ [@subzey](https://github.com/subzey)
- Parser update: Turn NaN input values into valid numbers ❤️ [@subzey](https://github.com/subzey)

### 1.2.0

- New plugin: CIE LAB color space

### 1.1.1

- Make bundle 1% lighter

### 1.1.0

- Add `isValid` method

### 1.0

- An official production-ready release

### 0.10.2

- Sort named colors dictionary for better compression ❤️ [@subzey](https://github.com/subzey)

### 0.10.1

- Ignore `null` input in the parsers

### 0.10

- Shorten conversion method names (`toRgba` to `toRgb`, etc)

### 0.9.3

- New plugin: HWB color model
- More accurate HSL and HSV conversions

### 0.9.2

- Names plugin: Support "transparent" keyword

### 0.9.1

- Improve package exports

### 0.9

- Add CommonJS exports

### 0.8

- New plugin: a11y (Accessibility)

### 0.7

- New plugin: CIE XYZ color space

### 0.6.2

- 20% speed improvement ❤️ [@jeetiss](https://github.com/jeetiss)

### 0.6.1

- 100% code coverage

### 0.6

- Make plugin available in Parcel which doesn't support exports map yet
- Fix names plugin TS declarations export
- Documentation

### 0.5

- New plugin: CSS color names

### 0.4

- Make the library ESM-first
- Add code coverage reports

### 0.3

- Implement Plugin API

### 0.2

- Support 4 and 8 digit Hex

### 0.1

- Basic API
