// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

const Color = Common.Color;

const parseAndAssertNotNull = (value: string) => {
  const result = Color.parse(value);
  assertNotNullOrUndefined(result);
  return result.asLegacyColor();
};

const deepCloseTo = (actual: number[], expected: number[], delta: number, message?: string) => {
  for (let i = 0; i <= 3; ++i) {
    assert.closeTo(actual[i], expected[i], delta, `in component ${i}${message ? `: ${message}` : ''}`);
  }
};

const tolerance = 0.0001;
const colorSpaceConversionTolerance = 0.001;

describe('Color', () => {
  it('can be instantiated without issues', () => {
    const color = new Color.Legacy([0.5, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColor');
    assert.deepEqual(color.rgba(), [0.5, 0.5, 0.5, 0.5], 'RGBA array was not set correctly');
    assert.strictEqual(color.getAuthoredText(), 'testColor', 'original text was not set correctly');
    assert.strictEqual(color.asString(), 'rgb(128 128 128 / 50%)');
    assert.strictEqual(color.format(), Color.Format.RGBA, 'format was not set correctly');
  });

  it('defaults RGBA value to 0 if the RGBA initializing value given was negative', () => {
    const color = new Color.Legacy([-0.5, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColor');
    assert.deepEqual(color.rgba(), [0, 0.5, 0.5, 0.5], 'RGBA array was not set correctly');
    assert.strictEqual(color.asString(), 'rgb(0 128 128 / 50%)', 'original text was not ignored as expected');
    assert.strictEqual(color.format(), Color.Format.RGBA, 'format was not set correctly');
  });

  it('defaults RGBA value to 1 if the RGBA initializing value given was above one', () => {
    const color = new Color.Legacy([1.1, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColor');
    assert.deepEqual(color.rgba(), [1, 0.5, 0.5, 0.5], 'RGBA array was not set correctly');
    assert.strictEqual(color.asString(), 'rgb(255 128 128 / 50%)', 'original text was not ignored as expected');
    assert.strictEqual(color.format(), Color.Format.RGBA, 'format was not set correctly');
  });

  it('is able to create a color class from an HSVA value', () => {
    const color = Color.Legacy.fromHSVA([0.5, 0.5, 0.5, 100]);
    assert.deepEqual(color.rgba(), [0.25, 0.49999999999999994, 0.5, 1], 'RGBA array was not set correctly');
  });

  it('is able to return the HSVA value of a color', () => {
    const color = new Color.Legacy([0.5, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColor');
    const hsva = color.as(Common.Color.Format.HSL).hsva();
    assert.deepEqual(hsva, [0, 0, 0.5, 0.5], 'HSVA was not calculated correctly');
  });

  it('is able to return a lighter luminance according to a given contrast value', () => {
    const result = Color.desiredLuminance(0.2, 2, true);
    assert.strictEqual(result, 0.45, 'luminance was not calculated correctly');
  });

  it('is able to return a darker luminance according to a given contrast value', () => {
    const result = Color.desiredLuminance(0.2, 2, false);
    assert.strictEqual(result, 0.075, 'luminance was not calculated correctly');
  });

  it('is able to return a darker luminance if the lighter one falls out of the inclusive range [0, 1]', () => {
    const result = Color.desiredLuminance(0.2, 5, true);
    assert.strictEqual(result, 0, 'luminance was not calculated correctly');
  });

  it('is able to return canonical HSLA for a color', () => {
    const color = new Color.Legacy([0.5, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColor');
    const result = color.as(Common.Color.Format.HSL).canonicalHSLA();
    assert.deepEqual(result, [0, 0, 50, 0.5], 'canonical HSLA was not calculated correctly');
  });

  it('is able to return canonical HWBA for a color', () => {
    const color = new Color.Legacy([0.5, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColorGray');
    const result = color.as(Color.Format.HWB).canonicalHWBA();
    deepCloseTo(result, [0, 50, 50, 0.5], tolerance, 'canonical HWBA was not calculated correctly');
  });

  it('parses hex values', () => {
    assert.deepEqual(parseAndAssertNotNull('#FF00FF').rgba(), [1, 0, 1, 1]);
    assert.deepEqual(parseAndAssertNotNull('#F0F').rgba(), [1, 0, 1, 1]);
    assert.deepEqual(parseAndAssertNotNull('#F0F0').rgba(), [1, 0, 1, 0]);
    assert.deepEqual(parseAndAssertNotNull('#FF00FF00').rgba(), [1, 0, 1, 0]);
  });

  it('parses nickname values', () => {
    assert.deepEqual(parseAndAssertNotNull('red').rgba(), [1, 0, 0, 1]);
  });

  it('parses rgb(a) values', () => {
    const colorOne = parseAndAssertNotNull('rgb(255, 255, 0)');
    assert.deepEqual(colorOne.rgba(), [1, 1, 0, 1]);

    const colorTwo = parseAndAssertNotNull('rgba(0, 255, 255, 0.5)');
    assert.deepEqual(colorTwo.rgba(), [0, 1, 1, 0.5]);

    const colorThree = parseAndAssertNotNull('rgb(255 255 255)');
    assert.deepEqual(colorThree.rgba(), [1, 1, 1, 1]);

    const colorFour = parseAndAssertNotNull('rgb(10% 10% 10%)');
    assert.deepEqual(colorFour.rgba(), [0.1, 0.1, 0.1, 1]);

    const colorFive = parseAndAssertNotNull('rgb(10% 10% 10% / 0.4)');
    assert.deepEqual(colorFive.rgba(), [0.1, 0.1, 0.1, 0.4]);

    const colorSix = parseAndAssertNotNull('rgb(10% 10% 10% / 40%)');
    assert.deepEqual(colorSix.rgba(), [0.1, 0.1, 0.1, 0.4]);
  });

  it('parses hsl(a) values', () => {
    const colorOne = parseAndAssertNotNull('hsl(0, 100%, 50%)');
    assert.deepEqual(colorOne.rgba(), [1, 0, 0, 1]);

    const colorTwo = parseAndAssertNotNull('hsla(0, 100%, 50%, 0.5)');
    assert.deepEqual(colorTwo.rgba(), [1, 0, 0, 0.5]);

    const colorThree = parseAndAssertNotNull('hsla(50deg 100% 100% / 50%)');
    assert.deepEqual(colorThree.rgba(), [1, 1, 1, 0.5]);

    const colorFour = parseAndAssertNotNull('hsl(0 100% 50% / 0.5)');
    assert.deepEqual(colorFour.rgba(), [1, 0, 0, 0.5]);

    const colorFive = parseAndAssertNotNull('hsl(0 100% 50% / 50%)');
    assert.deepEqual(colorFive.rgba(), [1, 0, 0, 0.5]);

    const colorSix = parseAndAssertNotNull('hsl(0deg 100% 50% / 50%)');
    assert.deepEqual(colorSix.rgba(), [1, 0, 0, 0.5]);
  });

  it('parses hwb values', () => {
    const colorOne = parseAndAssertNotNull('hwb(300 0% 0%)');
    deepCloseTo(colorOne.rgba(), [1, 0, 1, 1], tolerance);

    const colorTwo = parseAndAssertNotNull('hwb(0 0% 0% / 0.5)');
    deepCloseTo(colorTwo.rgba(), [1, 0, 0, 0.5], tolerance);

    const colorThree = parseAndAssertNotNull('hwb(60deg 0% 0% / 50%)');
    deepCloseTo(colorThree.rgba(), [1, 1, 0, 0.5], tolerance);

    const colorFour = parseAndAssertNotNull('hwb(0deg 100% 0% / 0.2)');
    deepCloseTo(colorFour.rgba(), [1, 1, 1, 0.2], tolerance);

    const colorFive = parseAndAssertNotNull('hwb(180deg 0% 0%)');
    deepCloseTo(colorFive.rgba(), [0, 1, 1, 1], tolerance);

    const colorSix = parseAndAssertNotNull('hwb(240deg 0% 0% / 90%)');
    deepCloseTo(colorSix.rgba(), [0, 0, 1, 0.9], tolerance);
  });

  it('parses lch values', () => {
    // White in sRGB
    const colorOne = parseAndAssertNotNull('lch(99 0.09 312)');
    assertNotNullOrUndefined(colorOne);
    deepCloseTo(colorOne.rgba(), [0.989, 0.989, 0.989, 1], colorSpaceConversionTolerance);

    // Parses out of sRGB gamut values too
    const colorTwo = parseAndAssertNotNull('lch(99 112 312)');
    assertNotNullOrUndefined(colorTwo);
    deepCloseTo(colorTwo.rgba(), [1, 0.762, 1, 1], colorSpaceConversionTolerance);

    // Parses none values too
    const colorThree = parseAndAssertNotNull('lch(99 112 none)');
    assertNotNullOrUndefined(colorThree);
    deepCloseTo(colorThree.rgba(), [1, 0.484, 1, 1], colorSpaceConversionTolerance);

    // Parses syntax from Color Syntax mega list https://cdpn.io/pen/debug/RwyOyeq
    const colorCases = [
      ['lch(58% 32 241deg)', [0.2830, 0.5834, 0.7366, 1]],
      ['lch(58 32 241deg)', [0.2830, 0.5834, 0.7366, 1]],
      ['lch(58 32 241)', [0.2830, 0.5834, 0.7366, 1]],
      ['lch(58% 32 241 / 50%)', [0.2830, 0.5834, 0.7366, 0.5]],
      ['lch(58% 32 241 / .5)', [0.2830, 0.5834, 0.7366, 0.5]],
      ['lch(100% 0 0)', [0.9999, 1.0001, 1.0000, 1]],
      ['lch(100 0 0)', [0.9999, 1.0001, 1.0000, 1]],
      ['lch(100 none none)', [0.9999, 1.0001, 1.0000, 1]],
      ['lch(0% 0 0)', [0, 0, 0, 1]],
      ['lch(0 0 0)', [0, 0, 0, 1]],
      ['lch(none none none)', [0, 0, 0, 1]],
    ];

    for (const [syntax, expectedRgba] of colorCases) {
      const color = parseAndAssertNotNull(syntax as string);
      assertNotNullOrUndefined(color);
      deepCloseTo(
          color.rgba(), expectedRgba as number[], colorSpaceConversionTolerance,
          'LCH parsing from syntax list is not correct');
    }
  });

  // TODO(ergunsh): Add tests for `oklch` after clearing situation
  it('parses lab values', () => {
    // White in sRGB
    const colorOne = parseAndAssertNotNull('lab(99 0 0)');
    assertNotNullOrUndefined(colorOne);
    deepCloseTo(colorOne.rgba(), [0.989, 0.989, 0.989, 1], colorSpaceConversionTolerance);

    // Parses out of sRGB gamut values too
    const colorTwo = parseAndAssertNotNull('lab(99 58 64)');
    assertNotNullOrUndefined(colorTwo);
    deepCloseTo(colorTwo.rgba(), [1, 0.794, 0.508, 1], colorSpaceConversionTolerance);

    // Parses none values too
    const colorThree = parseAndAssertNotNull('lch(99 none none)');
    assertNotNullOrUndefined(colorThree);
    deepCloseTo(colorThree.rgba(), [0.989, 0.989, 0.989, 1], colorSpaceConversionTolerance);

    // Parses syntax from Color Syntax mega list https://cdpn.io/pen/debug/RwyOyeq
    const colorCases = [
      ['lab(58% -16 -30)', [0.2585, 0.5848, 0.7505, 1]],
      ['lab(58 -16 -30)', [0.2585, 0.5848, 0.7505, 1]],
      ['lab(58% -16 -30 / 50%)', [0.2585, 0.5848, 0.7505, 0.5]],
      ['lab(58% -16 -30 / .5)', [0.2585, 0.5848, 0.7505, 0.5]],
      ['lab(100% 0 0)', [1, 1, 1, 1]],
      ['lab(100 0 0)', [1, 1, 1, 1]],
      ['lab(100 none none)', [1, 1, 1, 1]],
      ['lab(0% 0 0)', [0, 0, 0, 1]],
      ['lab(0 0 0)', [0, 0, 0, 1]],
      ['lab(none none none)', [0, 0, 0, 1]],
    ];

    for (const [syntax, expectedRgba] of colorCases) {
      const color = parseAndAssertNotNull(syntax as string);
      assertNotNullOrUndefined(color);
      deepCloseTo(
          color.rgba(), expectedRgba as number[], colorSpaceConversionTolerance,
          'lab() parsing from syntax list is not correct');
    }
  });

  // TODO(ergunsh): Add tests for `oklab` after clearing situation
  it('parses color() values', () => {
    // White in sRGB
    const colorOne = parseAndAssertNotNull('color(srgb 100% 100% 100% / 50%)');
    assertNotNullOrUndefined(colorOne);
    deepCloseTo(colorOne.rgba(), [1, 1, 1, 0.5], colorSpaceConversionTolerance);

    const colorTwo = parseAndAssertNotNull('color(srgb 100% 100% 100%/50%)');
    deepCloseTo(colorTwo?.rgba(), [1, 1, 1, 0.5], colorSpaceConversionTolerance);

    const colorThree = parseAndAssertNotNull('color(srgb 100% 100% 100%/ 50%)');
    deepCloseTo(colorThree?.rgba(), [1, 1, 1, 0.5], colorSpaceConversionTolerance);

    const colorFour = parseAndAssertNotNull('color(srgb 100% 100% 100% /50%)');
    deepCloseTo(colorFour?.rgba(), [1, 1, 1, 0.5], colorSpaceConversionTolerance);

    // Does not parse invalid syntax
    const invalidSyntaxes = [
      // Not known color space
      'color(not-known-color-space)',
      // Contains comma
      'color(srgb, 100%)',
      // Alpha is not at the end
      'color(srgb / 50% 100%)',
    ];

    for (const invalidSyntax of invalidSyntaxes) {
      assert.isNull(Color.parse(invalidSyntax));
    }

    // All defined color spaces are parsed
    // srgb | srgb-linear | display-p3 | a98-rgb | prophoto-rgb | rec2020 | xyz | xyz-d50 | xyz-d65
    const colorSpaceCases = [
      'color(srgb)',
      'color(srgb-linear)',
      'color(display-p3)',
      'color(a98-rgb)',
      'color(prophoto-rgb)',
      'color(rec2020)',
      'color(xyz-d50)',
      'color(xyz-d65)',
    ];
    for (const colorSpaceCase of colorSpaceCases) {
      const color = Color.parse(colorSpaceCase);
      assertNotNullOrUndefined(color);
    }

    // Parses correctly from syntax list
    const colorCases = [
      ['color(display-p3 34% 58% 73%)', [0.246, 0.587, 0.745, 1]],
      ['color(display-p3 1 0.71 0.73)', [1, 0.695, 0.725, 1]],
      ['color(display-p3 34% / 50%)', [0.3748, 0, 0, 0.5]],
      ['color(rec2020 34% 58% 73%)', [0, 0.641, 0.774, 1]],
      ['color(rec2020 .34 .58 .73 / .5)', [0, 0.641, 0.774, 0.5]],
      ['color(a98-rgb 34% 58% 73% / 50%)', [0.1, 0.585, 0.741, 0.5]],
      ['color(a98-rgb none none none)', [0, 0, 0, 1]],
      ['color(a98-rgb 0)', [0, 0, 0, 1]],
      ['color(xyz-d50 .22 .26 .53)', [0.0929, 0.584, 0.855, 1]],
      ['color(xyz 100% 100% 100%)', [1, 0.977, 0.959, 1]],
      ['color(xyz-d65 100% 100% 100%)', [1, 0.977, 0.959, 1]],
    ];

    for (const [syntax, expectedRgba] of colorCases) {
      const color = parseAndAssertNotNull(syntax as string);
      deepCloseTo(
          color.rgba(), expectedRgba as number[], colorSpaceConversionTolerance,
          `color() parsing from syntax list is not correct for ${syntax}`);
    }
  });

  it('handles invalid values', () => {
    assert.isNull(Color.parse('#FAFAFA       Trailing'));
    assert.isNull(Color.parse('#FAFAFG'));
    assert.isNull(Color.parse('gooseberry'));
    assert.isNull(Color.parse('rgb(10% 10% 10% /)'));
    assert.isNull(Color.parse('rgb(10% 10% 10% 0.4 40)'));
    assert.isNull(Color.parse('hsl(0, carrot, 30%)'));
    assert.isNull(Color.parse('hsl(0)'));
    assert.isNull(Color.parse('hwb(0)'));
    // Unlike HSL, HWB does not allow comma-separated input
    assert.isNull(Color.parse('hwb(0%, 50%, 50%)'));
    assert.isNull(Color.parse('rgb(255)'));
    assert.isNull(Color.parse('rgba(1 golf 30)'));
  });

  it('is able to return whether or not the color has an alpha value', () => {
    const color = new Color.Legacy([0.5, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColor');
    assert.isTrue(color.hasAlpha(), 'the color should be considered to have an alpha value');
  });

  it('is able to detect the HEX format of a color with an alpha value', () => {
    const color = new Color.Legacy([0.5, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColor');
    const result = color.detectHEXFormat();
    assert.strictEqual(result, 'hexa', 'format was not detected correctly');
  });

  it('is able to detect the HEX format of a color without an alpha value', () => {
    const color = new Color.Legacy([0.5, 0.5, 0.5, 1], Color.Format.RGBA, 'testColor');
    const result = color.detectHEXFormat();
    assert.strictEqual(result, 'hex', 'format was not detected correctly');
  });

  it('is able to return the canonical RGBA of a color', () => {
    const color = new Color.Legacy([0.5, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColor');
    const result = color.canonicalRGBA();
    assert.deepEqual(result, [128, 128, 128, 0.5], 'canonical RGBA was not returned correctly');
  });

  it('is able to return the nickname of a color', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.RGBA, 'testColor');
    const result = color.nickname();
    assert.strictEqual(result, 'red', 'nickname was not returned correctly');
  });

  it('returns null as a nickname if the color was not recognized', () => {
    const color = new Color.Legacy([0.5, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColor');
    const result = color.nickname();
    assert.isNull(result, 'nickname should be returned as Null');
  });

  it('is able to convert the color to a protocol RGBA', () => {
    const color = new Color.Legacy([0.5, 0.5, 0.5, 0.5], Color.Format.RGBA, 'testColor');
    const result = color.toProtocolRGBA();
    assert.deepEqual(result, {r: 128, g: 128, b: 128, a: 0.5}, 'conversion to protocol RGBA was not correct');
  });

  it('is able to invert a color', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.RGBA, 'testColor');
    const result = color.invert().rgba();
    assert.deepEqual(result, [0, 1, 1, 1], 'inversion was not successful');
  });

  it('is able to set the alpha value of a color', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.RGBA, 'testColor');
    const result = color.setAlpha(0.5).rgba();
    assert.deepEqual(result, [1, 0, 0, 0.5], 'alpha value was not set correctly');
  });

  it('can blend with another color', () => {
    const color = new Color.Legacy([1, 0, 0, 0.5], Color.Format.RGBA, 'testColor');
    const otherColor = new Color.Legacy([0, 0, 1, 0.5], Color.Format.RGBA, 'testColor');
    const result = color.blendWith(otherColor).rgba();
    assert.deepEqual(result, [0.5, 0, 0.5, 0.75], 'color was not blended correctly');
  });

  it('returns the nickname when turned into a string if its format was "nickname"', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.Nickname);
    const result = color.asString();
    assert.strictEqual(result, 'red', 'color was not converted to a string correctly');
  });

  it('returns the HEX value when turned into a string if its format was "hex"', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.HEX);
    const result = color.asString();
    assert.strictEqual(result, '#ff0000', 'color was not converted to a string correctly');
  });

  it('returns the short HEX value when turned into a string if its format was "shorthex"', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.ShortHEX);
    const result = color.asString();
    assert.strictEqual(result, '#f00', 'color was not converted to a string correctly');
  });

  it('returns the HEXA value when turned into a string if its format was "hexa"', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.HEXA);
    const result = color.asString();
    assert.strictEqual(result, '#ff0000ff', 'color was not converted to a string correctly');
  });

  it('returns the short HEXA value when turned into a string if its format was "shorthexa"', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.ShortHEXA);
    const result = color.asString();
    assert.strictEqual(result, '#f00f', 'color was not converted to a string correctly');
  });

  it('returns the RGB value when turned into a string if its format was "rgb"', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.RGB);
    const result = color.asString();
    assert.strictEqual(result, 'rgb(255 0 0)', 'color was not converted to a string correctly');
  });

  it('returns the RGBA value when turned into a string if its format was "rgba"', () => {
    const color = new Color.Legacy([1, 0, 0, 0.42], Color.Format.RGBA);
    const result = color.asString();
    assert.strictEqual(result, 'rgb(255 0 0 / 42%)', 'color was not converted to a string correctly');
  });

  it('omits the alpha value when it’s 100% if its format was "rgba"', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.RGBA);
    const result = color.asString();
    assert.strictEqual(result, 'rgb(255 0 0)', 'color was not converted to a string correctly');
  });

  it('returns the HSL value when turned into a string if its format was "hsl"', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.RGB);
    const result = color.asString(Common.Color.Format.HSL);
    assert.strictEqual(result, 'hsl(0deg 100% 50%)', 'color was not converted to a string correctly');
  });

  it('returns the HSLA value when turned into a string if its format was "hsla"', () => {
    const color = new Color.Legacy([1, 0, 0, 0.42], Color.Format.RGBA);
    const result = color.asString(Common.Color.Format.HSL);
    assert.strictEqual(result, 'hsl(0deg 100% 50% / 42%)', 'color was not converted to a string correctly');
  });

  it('omits the alpha value when it’s 100% if its format was "hsla"', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.RGBA);
    const result = color.asString(Common.Color.Format.HSLA);
    assert.strictEqual(result, 'hsl(0deg 100% 50%)', 'color was not converted to a string correctly');
  });

  it('returns the HWB value when turned into a string if its format was "hwb"', () => {
    const color = new Color.Legacy([0, 0, 1, 1], Color.Format.RGBA).as(Color.Format.HWB);
    const result = color.asString();
    assert.strictEqual(result, 'hwb(240deg 0% 0%)', 'color was not converted to a string correctly');
  });

  it('returns the HWB value when turned into a string if its format was "hwba"', () => {
    const color = new Color.Legacy([0, 0, 0, 0.42], Color.Format.RGBA).as(Color.Format.HWBA);
    const result = color.asString();
    assert.strictEqual(result, 'hwb(0deg 0% 100% / 42%)', 'color was not converted to a string correctly');
  });

  it('omits the alpha value when it’s 100% if its format was "hwba"', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.RGBA).as(Color.Format.HWBA);
    const result = color.asString();
    assert.strictEqual(result, 'hwb(0deg 0% 0%)', 'color was not converted to a string correctly');
  });

  it('is able to return a color in a different format than the one the color was originally set with', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.RGB);
    const result = color.asString(Color.Format.Nickname);
    assert.strictEqual(result, 'red', 'color was not converted to a string correctly');
  });

  it('is able to change color format', () => {
    const color = new Color.Legacy([1, 0, 0, 1], Color.Format.RGB);
    color.setFormat(Color.Format.HEXA);
    assert.strictEqual(color.asString(), '#ff0000ff', 'format was not set correctly');
  });

  it('suggests colors with good contrast', () => {
    const colors = [
      {
        bgColor: 'salmon',
        fgColor: 'white',
        contrast: 4.5,
        result: 'hsl(0deg 0% 22.96%)',
      },
      {
        bgColor: 'Lightblue',
        fgColor: 'white',
        contrast: 4.5,
        result: 'hsl(0deg 0% 35.34%)',
      },
      {
        bgColor: 'white',
        fgColor: 'hsl(0 53% 52% / 87%)',
        contrast: 7.0,
        result: 'hsl(0deg 48.92% 31.54% / 87%)',
      },
      {
        bgColor: 'white',
        fgColor: 'white',
        contrast: 7.0,
        result: 'hsl(0deg 0% 34.89%)',
      },
      {
        bgColor: 'black',
        fgColor: 'black',
        contrast: 7.05,
        result: 'hsl(0deg 0% 58.62%)',
      },
      {
        bgColor: 'white',
        fgColor: '#00FF00',
        contrast: 7.05,
        result: 'hsl(120deg 100% 20.37%)',
      },
      {
        bgColor: 'black',
        fgColor: '#b114ff',
        contrast: 7.05,
        result: 'hsl(280.09deg 100% 70.52%)',
      },
    ];
    for (const {fgColor, bgColor, contrast, result} of colors) {
      const fgParsed = parseAndAssertNotNull(fgColor);
      const bgParsed = parseAndAssertNotNull(bgColor);
      assertNotNullOrUndefined(fgParsed);
      assertNotNullOrUndefined(bgParsed);
      const suggestedColor = Color.findFgColorForContrast(fgParsed, bgParsed, contrast)?.as(Color.Format.HSL);
      assertNotNullOrUndefined(suggestedColor);
      assert.strictEqual(
          suggestedColor.asString(), result,
          `incorrect color suggestion for ${fgColor}/${bgColor} with contrast ${contrast}`);
    }
  });

  it('find the fg color with good contrast according to APCA', () => {
    const tests = [
      {
        fgColor: 'white',
        bgColor: 'white',
        requiredContrast: 68,
      },
      {
        fgColor: 'black',
        bgColor: 'black',
        requiredContrast: 68,
      },
      {
        bgColor: 'lightblue',
        fgColor: 'white',
        requiredContrast: 66,
      },
      {
        bgColor: 'white',
        fgColor: '#00FF00',
        requiredContrast: 66,
      },
      {
        bgColor: 'black',
        fgColor: '#b114ff',
        requiredContrast: 66,
      },
    ];
    for (const test of tests) {
      const fg = parseAndAssertNotNull(test.fgColor);
      const bg = parseAndAssertNotNull(test.bgColor);
      const result = Common.Color.findFgColorForContrastAPCA(fg, bg, test.requiredContrast);
      assertNotNullOrUndefined(result);
      const absContrast = Math.abs(Common.ColorUtils.contrastRatioAPCA(result.rgba() || [], bg.rgba()));
      assert.isTrue(Math.round(absContrast) >= test.requiredContrast);
    }
  });

  it('does not find fg color for certain combinations acoording to APCA', () => {
    const tests = [
      {
        bgColor: 'salmon',
        fgColor: 'white',
        requiredContrast: 66,
      },
      {
        fgColor: 'grey',
        bgColor: 'grey',
        requiredContrast: 68,
      },
    ];
    for (const test of tests) {
      const fg = parseAndAssertNotNull(test.fgColor);
      const bg = parseAndAssertNotNull(test.bgColor);
      const result = Common.Color.findFgColorForContrastAPCA(fg, bg, test.requiredContrast);
      assert.isNull(result);
    }
  });

  it('retains and returns the authored text', () => {
    const lime: {[key in Common.Color.Format]: string} = {
      [Common.Color.Format.Nickname]: 'lime',
      [Common.Color.Format.HEX]: '#00ff00',
      [Common.Color.Format.ShortHEX]: '#0f0',
      [Common.Color.Format.HEXA]: '#00ff00ff',
      [Common.Color.Format.ShortHEXA]: '#0f0f',
      [Common.Color.Format.RGB]: 'rgb(0 255 0)',
      [Common.Color.Format.RGBA]: 'rgba(0 255 0 / 100%)',
      [Common.Color.Format.HSL]: 'hsl(120deg 100% 50%)',
      [Common.Color.Format.HSLA]: 'hsl(120deg 100% 50% / 80%)',
      [Common.Color.Format.HWB]: 'hwb(120deg 0% 0%)',
      [Common.Color.Format.HWBA]: 'hwb(120deg 0% 0% / 80%)',
      [Common.Color.Format.LCH]: 'lch(87.82 113.32 134.38)',
      [Common.Color.Format.OKLCH]: 'oklch(0.87 0.29 142.49)',
      [Common.Color.Format.LAB]: 'lab(87.82 -79.26 80.99)',
      [Common.Color.Format.OKLAB]: 'oklab(0.87 -0.23 0.18)',
      [Common.Color.Format.SRGB]: 'color(srgb 0 1 0)',
      [Common.Color.Format.SRGB_LINEAR]: 'color(srgb-linear 0 1 0)',
      [Common.Color.Format.DISPLAY_P3]: 'color(display-p3 0.46 0.99 0.3)',
      [Common.Color.Format.A98_RGB]: 'color(a98-rgb 0.57 1 0.23)',
      [Common.Color.Format.PROPHOTO_RGB]: 'color(prophoto-rgb 0.54 0.93 0.3)',
      [Common.Color.Format.REC_2020]: 'color(rec2020 0.57 0.96 0.27)',
      [Common.Color.Format.XYZ_D50]: 'color(xyz-d50 0.39 0.72 0.1)',
      [Common.Color.Format.XYZ_D65]: 'color(xyz-d65 0.36 0.72 0.12)',
      [Common.Color.Format.XYZ]: 'color(xyz 0.36 0.72 0.12)',
    };

    for (const format in lime) {
      const spec = lime[format as Common.Color.Format];
      const color = Common.Color.parse(spec);
      assertNotNullOrUndefined(color);
      assert.deepEqual(color?.getAuthoredText(), spec);
      assert.deepEqual(color?.format(), format, spec);
    }
  });

  it('prints the correct color when stringified with format', () => {
    const lime: {[key in Common.Color.Format]: string} = {
      [Common.Color.Format.Nickname]: 'lime',
      [Common.Color.Format.HEX]: '#00ff00',
      [Common.Color.Format.ShortHEX]: '#0f0',
      [Common.Color.Format.HEXA]: '#00ff00ff',
      [Common.Color.Format.ShortHEXA]: '#0f0f',
      [Common.Color.Format.RGB]: 'rgb(0 255 0)',
      [Common.Color.Format.RGBA]: 'rgb(0 255 0)',  // no alpha here because it is ignored at 100%
      [Common.Color.Format.HSL]: 'hsl(120deg 100% 50%)',
      [Common.Color.Format.HSLA]: 'hsl(120deg 100% 50%)',
      [Common.Color.Format.HWB]: 'hwb(120deg 0% 0%)',
      [Common.Color.Format.HWBA]: 'hwb(120deg 0% 0%)',
      [Common.Color.Format.LCH]: 'lch(88 113.32 134.38)',
      [Common.Color.Format.OKLCH]: 'oklch(0.87 0.29 142.49)',
      [Common.Color.Format.LAB]: 'lab(88 -79.26 80.99)',
      [Common.Color.Format.OKLAB]: 'oklab(0.87 -0.23 0.18)',
      [Common.Color.Format.SRGB]: 'color(srgb 0 1 0)',
      [Common.Color.Format.SRGB_LINEAR]: 'color(srgb-linear 0 1 0)',
      [Common.Color.Format.DISPLAY_P3]: 'color(display-p3 0.46 0.99 0.3)',
      [Common.Color.Format.A98_RGB]: 'color(a98-rgb 0.57 1 0.23)',
      [Common.Color.Format.PROPHOTO_RGB]: 'color(prophoto-rgb 0.54 0.93 0.3)',
      [Common.Color.Format.REC_2020]: 'color(rec2020 0.57 0.96 0.27)',
      [Common.Color.Format.XYZ_D50]: 'color(xyz-d50 0.39 0.72 0.1)',
      [Common.Color.Format.XYZ_D65]: 'color(xyz-d65 0.36 0.72 0.12)',
      [Common.Color.Format.XYZ]: 'color(xyz 0.36 0.72 0.12)',
    };

    const color = Common.Color.parse('lime');
    assertNotNullOrUndefined(color);

    for (const format in lime) {
      const spec = lime[format as Common.Color.Format];
      assert.deepEqual(color?.asString(format as Common.Color.Format), spec);
    }
  });

  it('supports all to all and chain conversions', () => {
    // This test checks that both all-to-all as well as chaining together conversions producesthe expected outcome. It's
    // not easily possible to do this with real color conversions because the converters aren't accurate enough to allow
    // for good comparison of the color values. This test therefore stubs out the color converters. Since we don't care
    // about real color values, the fake converter functions generate uniquly identifiable results by always returning
    // the color codes below in the first coordinate of the color (and zeros for the rest). This lets us also verify
    // that the sequence of converter functions is correct because the converters can check the input color is as
    // expected.

    // Constant color codes to identify color formats and spaces through conversions. These will be used in fake
    // conversion functions below. Values need to be < 1 to avoid accidentally getting clamped.
    const enum Code {
      NICKNAME = 0,
      // Legacy colors all get the same code because they all do the same conversions. Use a value of `1` here to make
      // the color nickname match `red`.
      HEX = 1,
      ShortHEX = 1,
      HEXA = 1,
      ShortHEXA = 1,
      RGB = 1,
      RGBA = 1,
      HSL = 1,
      HSLA = 1,
      HWB = 1,
      HWBA = 1,
      // Legacy colors are treated as srgb for conversions, so use the same value here too.
      SRGB = 1,
      XYZ_D65 = 0.1,
      XYZ = 0.1,
      LCH = 0.2,
      OKLCH = 0.3,
      LAB = 0.4,
      OKLAB = 0.5,
      SRGB_LINEAR = 0.6,
      DISPLAY_P3 = 0.7,
      A98_RGB = 0.8,
      PROPHOTO_RGB = 0.9,
      REC_2020 = 0.91,
      XYZ_D50 = 0.92,
    }

    stub('adobeRGBToXyzd50', Code.A98_RGB, Code.XYZ_D50);
    stub('displayP3ToXyzd50', Code.DISPLAY_P3, Code.XYZ_D50);
    stub('labToLch', Code.LAB, Code.LCH);
    stub('labToXyzd50', Code.LAB, Code.XYZ_D50);
    stub('lchToLab', Code.LCH, Code.LAB);
    stub('oklabToXyzd65', Code.OKLAB, Code.XYZ_D65);
    stub('oklchToXyzd50', Code.OKLCH, Code.XYZ_D50);
    stub('proPhotoToXyzd50', Code.PROPHOTO_RGB, Code.XYZ_D50);
    stub('rec2020ToXyzd50', Code.REC_2020, Code.XYZ_D50);
    stub('srgbLinearToXyzd50', Code.SRGB_LINEAR, Code.XYZ_D50);
    stub('srgbToXyzd50', Code.SRGB, Code.XYZ_D50);
    stub('xyzd50ToAdobeRGB', Code.XYZ_D50, Code.A98_RGB);
    stub('xyzd50ToD65', Code.XYZ_D50, Code.XYZ_D65);
    stub('xyzd50ToDisplayP3', Code.XYZ_D50, Code.DISPLAY_P3);
    stub('xyzd50ToLab', Code.XYZ_D50, Code.LAB);
    stub('xyzd50ToOklch', Code.XYZ_D50, Code.OKLCH);
    stub('xyzd50ToProPhoto', Code.XYZ_D50, Code.PROPHOTO_RGB);
    stub('xyzd50ToRec2020', Code.XYZ_D50, Code.REC_2020);
    stub('xyzd50ToSrgb', Code.XYZ_D50, Code.SRGB);
    stub('xyzd50TosRGBLinear', Code.XYZ_D50, Code.SRGB_LINEAR);
    stub('xyzd65ToD50', Code.XYZ_D65, Code.XYZ_D50);
    stub('xyzd65ToOklab', Code.XYZ_D65, Code.OKLAB);

    function stub<Fn extends keyof typeof Common.ColorConverter.ColorConverter>(
        fn: Fn, input: Code, output: Code): void {
      const result = sinon.stub(Common.ColorConverter.ColorConverter, fn);
      // TODO(crbug.com/1412307): Figure out why tsc 5.0 stopped infering the function signature correctly.
      // @ts-expect-error
      result.callsFake((a: number, b: number, c: number): [number, number, number] => {
        assert.deepEqual([a, b, c], [input, 0, 0], `Conversion function ${fn} called with the wrong arguments`);
        return [output, 0, 0];
      });
    }

    const colors = new Map<Common.Color.Format, Common.Color.Color|null>();
    colors.set(Common.Color.Format.Nickname, Common.Color.parse('red'));
    colors.set(Common.Color.Format.HEX, Common.Color.parse('#ff0000'));
    colors.set(Common.Color.Format.ShortHEX, Common.Color.parse('#f00'));
    colors.set(Common.Color.Format.HEXA, Common.Color.parse('#ff0000ff'));
    colors.set(Common.Color.Format.ShortHEXA, Common.Color.parse('#f00f'));
    colors.set(Common.Color.Format.RGB, Common.Color.parse('rgb(255 0 0)'));
    colors.set(Common.Color.Format.RGBA, Common.Color.parse('rgb(255 0 0)'));
    colors.set(Common.Color.Format.HSL, Common.Color.parse('hsl(0deg 100% 50%)'));
    colors.set(Common.Color.Format.HSLA, Common.Color.parse('hsl(0deg 100% 50%)'));
    colors.set(Common.Color.Format.HWB, Common.Color.parse('hwb(0deg 0% 0%)'));
    colors.set(Common.Color.Format.HWBA, Common.Color.parse('hwb(0deg 0% 0%)'));
    colors.set(Common.Color.Format.LCH, Common.Color.parse(`lch(${Code.LCH} 0 0)`));
    colors.set(Common.Color.Format.OKLCH, Common.Color.parse(`oklch(${Code.OKLCH} 0 0)`));
    colors.set(Common.Color.Format.LAB, Common.Color.parse(`lab(${Code.LAB} 0 0)`));
    colors.set(Common.Color.Format.OKLAB, Common.Color.parse(`oklab(${Code.OKLAB} 0 0)`));
    colors.set(Common.Color.Format.SRGB, Common.Color.parse(`color(srgb ${Code.SRGB} 0 0)`));
    colors.set(Common.Color.Format.SRGB_LINEAR, Common.Color.parse(`color(srgb-linear ${Code.SRGB_LINEAR} 0 0)`));
    colors.set(Common.Color.Format.DISPLAY_P3, Common.Color.parse(`color(display-p3 ${Code.DISPLAY_P3} 0 0)`));
    colors.set(Common.Color.Format.A98_RGB, Common.Color.parse(`color(a98-rgb ${Code.A98_RGB} 0 0)`));
    colors.set(Common.Color.Format.PROPHOTO_RGB, Common.Color.parse(`color(prophoto-rgb ${Code.PROPHOTO_RGB} 0 0)`));
    colors.set(Common.Color.Format.REC_2020, Common.Color.parse(`color(rec2020 ${Code.REC_2020} 0 0)`));
    colors.set(Common.Color.Format.XYZ_D50, Common.Color.parse(`color(xyz-d50 ${Code.XYZ_D50} 0 0)`));
    colors.set(Common.Color.Format.XYZ_D65, Common.Color.parse(`color(xyz-d65 ${Code.XYZ_D65} 0 0)`));
    colors.set(Common.Color.Format.XYZ, Common.Color.parse(`color(xyz ${Code.XYZ} 0 0)`));

    // Test all-to-all conversions.
    for (const from of colors.keys()) {
      for (const to of colors.keys()) {
        const color = colors.get(from);
        assertNotNullOrUndefined(color);
        const expected = colors.get(to);
        assertNotNullOrUndefined(expected);
        assert.deepEqual(color.as(to).asString(), expected.asString());
      }
    }

    // Test chaining conversions. For every color perform a chain of conversions through all colors in sequence and
    // verify the result.
    for (const start of colors.keys()) {
      let color = colors.get(start);
      assertNotNullOrUndefined(color);
      for (const next of colors.keys()) {
        color = color.as(next);
        const expected = colors.get(next);
        assertNotNullOrUndefined(expected);
        assert.deepEqual(color.asString(), expected.asString(), `Original color ${colors.get(start)?.asString()}`);
      }
    }
  });

  it('correctly clips results on conversion', () => {
    const nonSRGBColor = Color.parse('lab(99 50 50)');
    assertNotNullOrUndefined(nonSRGBColor);

    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.HEX), '#ffd39e');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.HEXA), '#ffd39eff');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.RGB), 'rgb(255 211 158)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.RGBA), 'rgb(255 211 158)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.HSL), 'hsl(0deg 0% 100%)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.HSLA), 'hsl(0deg 0% 100%)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.HWB), 'hwb(15.95deg 61.78% 0%)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.HWBA), 'hwb(15.95deg 61.78% 0%)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.SRGB), 'color(srgb 1 0.83 0.62)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.SRGB_LINEAR), 'color(srgb-linear 1 0.65 0.34)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.DISPLAY_P3), 'color(display-p3 1 0.86 0.66)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.A98_RGB), 'color(a98-rgb 1 0.82 0.62)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.PROPHOTO_RGB), 'color(prophoto-rgb 1 0.88 0.61)');
    assert.deepEqual(nonSRGBColor.asString(Common.Color.Format.REC_2020), 'color(rec2020 1 0.87 0.63)');
  });

  it('correctly detects and clips out-of-gamut colors', () => {
    assert.isTrue(Color.parse('rgb(-1 1 256)')?.isGamutClipped());
    assert.deepEqual(Color.parse('rgb(-1 1 256)')?.asString(), 'rgb(0 1 255)');
    assert.isTrue(new Color.Legacy([-1, 0, 1.1, 1], Color.Format.RGBA).isGamutClipped());
    assert.deepEqual(new Color.Legacy([-1, 0, 1.1, 1], Color.Format.RGBA).asString(), 'rgb(0 0 255)');

    assert.isTrue(Color.parse('hsl(-120deg 130% 50%)')?.isGamutClipped());
    assert.deepEqual(Color.parse('hsl(-120deg 130% 50%)')?.asString(), 'hsl(240deg 100% 50%)');
    assert.isTrue(Color.parse('hwb(-120deg -130% 50%)')?.isGamutClipped());
    assert.deepEqual(Color.parse('hwb(-120deg -130% -50%)')?.asString(), 'hwb(240deg 0% 0%)');
    assert.isTrue(Color.parse('hwb(-120deg 0% 150%)')?.isGamutClipped());
    assert.deepEqual(Color.parse('hwb(-120deg 0% 150%)')?.asString(), 'hwb(0deg 0% 100%)');
    assert.isTrue(Color.parse('hwb(-120deg 130% 0%)')?.isGamutClipped());
    assert.deepEqual(Color.parse('hwb(-120deg 130% 0%)')?.asString(), 'hwb(0deg 100% 0%)');

    assert.isFalse(Color.parse('lch(110 -70 -70)')?.isGamutClipped());
    assert.deepEqual(Color.parse('lch(110 70 -70)')?.asString(), 'lch(100 0 0)');

    assert.isFalse(Color.parse('oklch(1.5 -70 -70)')?.isGamutClipped());
    assert.deepEqual(Color.parse('oklch(1.5 70 -70)')?.asString(), 'oklch(1 0 0)');

    assert.isFalse(Color.parse('lab(110 -70 -70)')?.isGamutClipped());
    assert.deepEqual(Color.parse('lab(110 -70 -70)')?.asString(), 'lab(100 0 0)');

    assert.isFalse(Color.parse('oklab(1.5 -70 -70)')?.isGamutClipped());
    assert.deepEqual(Color.parse('oklab(1.5 -70 -70)')?.asString(), 'oklab(1 0 0)');

    assert.isFalse(Color.parse('lch(10 70 -70)')?.isGamutClipped());
    assert.deepEqual(Color.parse('lch(10 70 -70)')?.asString(), 'lch(10 70 290)');

    assert.isFalse(Color.parse('oklch(0.5 70 -70)')?.isGamutClipped());
    assert.deepEqual(Color.parse('oklch(0.5 70 -70)')?.asString(), 'oklch(0.5 70 290)');

    assert.isFalse(Color.parse('lab(10 -70 -70)')?.isGamutClipped());
    assert.deepEqual(Color.parse('lab(10 -70 -70)')?.asString(), 'lab(10 -70 -70)');

    assert.isFalse(Color.parse('oklab(0.5 -70 -70)')?.isGamutClipped());
    assert.deepEqual(Color.parse('oklab(0.5 -70 -70)')?.asString(), 'oklab(0.5 -70 -70)');

    // RGB spaces are clipped:
    assert.isTrue(Color.parse('color(srgb-linear -1 1 1.5)')?.isGamutClipped());
    assert.deepEqual(Color.parse('color(srgb-linear -1 1 1.5)')?.asString(), 'color(srgb-linear 0 1 1)');

    assert.isTrue(Color.parse('color(srgb -1 1 1.5)')?.isGamutClipped());
    assert.deepEqual(Color.parse('color(srgb -1 1 1.5)')?.asString(), 'color(srgb 0 1 1)');

    assert.isTrue(Color.parse('color(display-p3 -1 1 1.5)')?.isGamutClipped());
    assert.deepEqual(Color.parse('color(display-p3 -1 1 1.5)')?.asString(), 'color(display-p3 0 1 1)');

    assert.isTrue(Color.parse('color(a98-rgb -1 1 1.5)')?.isGamutClipped());
    assert.deepEqual(Color.parse('color(a98-rgb -1 1 1.5)')?.asString(), 'color(a98-rgb 0 1 1)');

    assert.isTrue(Color.parse('color(prophoto-rgb -1 1 1.5)')?.isGamutClipped());
    assert.deepEqual(Color.parse('color(prophoto-rgb -1 1 1.5)')?.asString(), 'color(prophoto-rgb 0 1 1)');

    assert.isTrue(Color.parse('color(rec2020 -1 1 1.5)')?.isGamutClipped());
    assert.deepEqual(Color.parse('color(rec2020 -1 1 1.5)')?.asString(), 'color(rec2020 0 1 1)');

    // XYZ has infinite gamute and is never clipped:
    assert.isFalse(Color.parse('color(xyz-d50 -1 1 1.5)')?.isGamutClipped());
    assert.deepEqual(Color.parse('color(xyz-d50 -1 1 1.5)')?.asString(), 'color(xyz-d50 -1 1 1.5)');

    assert.isFalse(Color.parse('color(xyz-d65 -1 1 1.5)')?.isGamutClipped());
    assert.deepEqual(Color.parse('color(xyz-d65 -1 1 1.5)')?.asString(), 'color(xyz-d65 -1 1 1.5)');

    assert.isFalse(Color.parse('color(xyz -1 1 1.5)')?.isGamutClipped());
    assert.deepEqual(Color.parse('color(xyz -1 1 1.5)')?.asString(), 'color(xyz -1 1 1.5)');

    // Being just a tiny bit out of gamut doesn't matter:
    assert.isFalse(Color.parse('color(srgb-linear 1.0001 1.0001 1.0001)')?.isGamutClipped());
    assert.isFalse(Color.parse('color(srgb 1.0001 1.0001 1.0001)')?.isGamutClipped());
    assert.isFalse(Color.parse('color(display-p3 1.0001 1.0001 1.0001)')?.isGamutClipped());
    assert.isFalse(Color.parse('color(a98-rgb 1.0001 1.0001 1.0001)')?.isGamutClipped());
    assert.isFalse(Color.parse('color(prophoto-rgb 1.0001 1.0001 1.0001)')?.isGamutClipped());
    assert.isFalse(Color.parse('color(rec2020 1.0001 1.0001 1.0001)')?.isGamutClipped());
  });

  it('correctly represents powerless components', () => {
    // With lightness at 0% or 100% the color is black or white and all other components are powerless:
    assert.deepEqual(Color.parse('lab(0 15 15)')?.asString(), 'lab(0 0 0)');
    assert.deepEqual(Color.parse('lab(100 15 15)')?.asString(), 'lab(100 0 0)');
    assert.deepEqual(Color.parse('lch(0 15 15)')?.asString(), 'lch(0 0 0)');
    assert.deepEqual(Color.parse('lch(100 15 15)')?.asString(), 'lch(100 0 0)');
    assert.deepEqual(Color.parse('oklab(0 15 15)')?.asString(), 'oklab(0 0 0)');
    assert.deepEqual(Color.parse('oklab(1 15 15)')?.asString(), 'oklab(1 0 0)');
    assert.deepEqual(Color.parse('oklch(0 15 15)')?.asString(), 'oklch(0 0 0)');
    assert.deepEqual(Color.parse('oklch(1 15 15)')?.asString(), 'oklch(1 0 0)');
    assert.deepEqual(Color.parse('hsl(120deg 10% 0%)')?.asString(), 'hsl(0deg 0% 0%)');
    assert.deepEqual(Color.parse('hsl(120deg 10% 100%)')?.asString(), 'hsl(0deg 0% 100%)');

    // With saturation or chroma at 0, the hue becomes powerless:
    assert.deepEqual(Color.parse('lch(0.3 0 15)')?.asString(), 'lch(0 0 0)');
    assert.deepEqual(Color.parse('oklch(0.3 0 15)')?.asString(), 'oklch(0.3 0 0)');
    assert.deepEqual(Color.parse('hsl(120deg 0% 50%)')?.asString(), 'hsl(0deg 0% 50%)');

    // If whiteness + blackness is 100% the color is a shade of gray and the hue is powerless:
    assert.deepEqual(Color.parse('hwb(120deg 50% 50%)')?.asString(), 'hwb(0deg 50% 50%)');
    // whiteness + blackness exceeding 100% is normalized to 100% retaining the relative magnitude:
    assert.deepEqual(Color.parse('hwb(120deg 80% 40%)')?.asString(), 'hwb(0deg 66.67% 33.33%)');
  });
});

describe('Generator', () => {
  it('able to return the color for an ID if the ID was already set', () => {
    const generator = new Color.Generator();
    generator.setColorForID('r', 'Red');
    assert.strictEqual(generator.colorForID('r'), 'Red', 'color was not retrieved correctly');
  });

  it('able to return the color for an ID that was not set', () => {
    const generator = new Color.Generator();
    assert.strictEqual(generator.colorForID('r'), 'hsl(133deg 67% 80%)', 'color was not generated correctly');
  });
});
