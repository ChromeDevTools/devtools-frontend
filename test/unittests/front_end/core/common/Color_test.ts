// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

const Color = Common.Color;

const parseAndAssertNotNull = (value: string) => {
  const result = Color.Color.parse(value);
  assertNotNullOrUndefined(result);
  return result;
};

const deepCloseTo = (actual: number[], expected: number[], delta: number, message?: string) => {
  for (let i = 0; i <= 3; ++i) {
    assert.closeTo(actual[i], expected[i], delta, message);
  }
};

const tolerance = 0.0001;
const colorSpaceConversionTolerance = 0.001;

describe('Color', () => {
  it('can be instantiated without issues', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], Color.Format.Original, 'testColor');
    assert.deepEqual(color.rgba(), [0.5, 0.5, 0.5, 0.5], 'RGBA array was not set correctly');
    assert.strictEqual(color.asString(), 'testColor', 'original text was not set correctly');
    assert.strictEqual(color.format(), Color.Format.Original, 'format was not set correctly');
  });

  it('defaults RGBA value to 0 if the RGBA initializing value given was negative', () => {
    const color = new Color.Color([-0.5, 0.5, 0.5, 0.5], Color.Format.Original, 'testColor');
    assert.deepEqual(color.rgba(), [0, 0.5, 0.5, 0.5], 'RGBA array was not set correctly');
    assert.strictEqual(color.asString(), 'testColor', 'original text was not set correctly');
    assert.strictEqual(color.format(), Color.Format.Original, 'format was not set correctly');
  });

  it('defaults RGBA value to 1 if the RGBA initializing value given was above one', () => {
    const color = new Color.Color([1.1, 0.5, 0.5, 0.5], Color.Format.Original, 'testColor');
    assert.deepEqual(color.rgba(), [1, 0.5, 0.5, 0.5], 'RGBA array was not set correctly');
    assert.strictEqual(color.asString(), 'testColor', 'original text was not set correctly');
    assert.strictEqual(color.format(), Color.Format.Original, 'format was not set correctly');
  });

  it('is able to create a color class from an HSVA value', () => {
    const color = Color.Color.fromHSVA([0.5, 0.5, 0.5, 100]);
    assert.deepEqual(color.rgba(), [0.25, 0.49999999999999994, 0.5, 1], 'RGBA array was not set correctly');
    assert.strictEqual(color.asString(), 'hsl(180deg 33% 38%)', 'original text was not set correctly');
    assert.strictEqual(color.format(), 'hsla', 'format was not set correctly');
  });

  it('is able to return the HSVA value of a color', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], Color.Format.Original, 'testColor');
    const hsva = color.hsva();
    assert.deepEqual(hsva, [0, 0, 0.5, 0.5], 'HSVA was not calculated correctly');
  });

  it('is able to return a lighter luminance according to a given contrast value', () => {
    const result = Color.Color.desiredLuminance(0.2, 2, true);
    assert.strictEqual(result, 0.45, 'luminance was not calculated correctly');
  });

  it('is able to return a darker luminance according to a given contrast value', () => {
    const result = Color.Color.desiredLuminance(0.2, 2, false);
    assert.strictEqual(result, 0.075, 'luminance was not calculated correctly');
  });

  it('is able to return a darker luminance if the lighter one falls out of the inclusive range [0, 1]', () => {
    const result = Color.Color.desiredLuminance(0.2, 5, true);
    assert.strictEqual(result, 0, 'luminance was not calculated correctly');
  });

  it('is able to return canonical HSLA for a color', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], Color.Format.Original, 'testColor');
    const result = color.canonicalHSLA();
    assert.deepEqual(result, [0, 0, 50, 0.5], 'canonical HSLA was not calculated correctly');
  });

  it('is able to return canonical HWBA for a color', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], Color.Format.Original, 'testColorGray');
    const result = color.canonicalHWBA();
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
    const colorOne = Color.Color.parse('rgb(255, 255, 0)');
    assertNotNullOrUndefined(colorOne);
    assert.deepEqual(colorOne.rgba(), [1, 1, 0, 1]);

    const colorTwo = Color.Color.parse('rgba(0, 255, 255, 0.5)');
    assertNotNullOrUndefined(colorTwo);
    assert.deepEqual(colorTwo.rgba(), [0, 1, 1, 0.5]);

    const colorThree = Color.Color.parse('rgb(255 255 255)');
    assertNotNullOrUndefined(colorThree);
    assert.deepEqual(colorThree.rgba(), [1, 1, 1, 1]);

    const colorFour = Color.Color.parse('rgb(10% 10% 10%)');
    assertNotNullOrUndefined(colorFour);
    assert.deepEqual(colorFour.rgba(), [0.1, 0.1, 0.1, 1]);

    const colorFive = Color.Color.parse('rgb(10% 10% 10% / 0.4)');
    assertNotNullOrUndefined(colorFive);
    assert.deepEqual(colorFive.rgba(), [0.1, 0.1, 0.1, 0.4]);

    const colorSix = Color.Color.parse('rgb(10% 10% 10% / 40%)');
    assertNotNullOrUndefined(colorSix);
    assert.deepEqual(colorSix.rgba(), [0.1, 0.1, 0.1, 0.4]);
  });

  it('parses hsl(a) values', () => {
    const colorOne = Color.Color.parse('hsl(0, 100%, 50%)');
    assertNotNullOrUndefined(colorOne);
    assert.deepEqual(colorOne.rgba(), [1, 0, 0, 1]);

    const colorTwo = Color.Color.parse('hsla(0, 100%, 50%, 0.5)');
    assertNotNullOrUndefined(colorTwo);
    assert.deepEqual(colorTwo.rgba(), [1, 0, 0, 0.5]);

    const colorThree = Color.Color.parse('hsla(50deg 100% 100% / 50%)');
    assertNotNullOrUndefined(colorThree);
    assert.deepEqual(colorThree.rgba(), [1, 1, 1, 0.5]);

    const colorFour = Color.Color.parse('hsl(0 100% 50% / 0.5)');
    assertNotNullOrUndefined(colorFour);
    assert.deepEqual(colorFour.rgba(), [1, 0, 0, 0.5]);

    const colorFive = Color.Color.parse('hsl(0 100% 50% / 50%)');
    assertNotNullOrUndefined(colorFive);
    assert.deepEqual(colorFive.rgba(), [1, 0, 0, 0.5]);

    const colorSix = Color.Color.parse('hsl(0deg 100% 50% / 50%)');
    assertNotNullOrUndefined(colorSix);
    assert.deepEqual(colorSix.rgba(), [1, 0, 0, 0.5]);
  });

  it('parses hwb values', () => {
    const colorOne = Color.Color.parse('hwb(300 0% 0%)');
    assertNotNullOrUndefined(colorOne);
    deepCloseTo(colorOne.rgba(), [1, 0, 1, 1], tolerance);

    const colorTwo = Color.Color.parse('hwb(0 0% 0% / 0.5)');
    assertNotNullOrUndefined(colorTwo);
    deepCloseTo(colorTwo.rgba(), [1, 0, 0, 0.5], tolerance);

    const colorThree = Color.Color.parse('hwb(60deg 0% 0% / 50%)');
    assertNotNullOrUndefined(colorThree);
    deepCloseTo(colorThree.rgba(), [1, 1, 0, 0.5], tolerance);

    const colorFour = Color.Color.parse('hwb(0deg 100% 0% / 0.2)');
    assertNotNullOrUndefined(colorFour);
    deepCloseTo(colorFour.rgba(), [1, 1, 1, 0.2], tolerance);

    const colorFive = Color.Color.parse('hwb(180deg 0% 0%)');
    assertNotNullOrUndefined(colorFive);
    deepCloseTo(colorFive.rgba(), [0, 1, 1, 1], tolerance);

    const colorSix = Color.Color.parse('hwb(240deg 0% 0% / 90%)');
    assertNotNullOrUndefined(colorSix);
    deepCloseTo(colorSix.rgba(), [0, 0, 1, 0.9], tolerance);
  });

  it('parses lch values', () => {
    // White in sRGB
    const colorOne = Color.Color.parse('lch(100 0.09 312)');
    assertNotNullOrUndefined(colorOne);
    deepCloseTo(colorOne.rgba(), [1, 1, 1, 1], colorSpaceConversionTolerance);

    // Parses out of sRGB gamut values too
    const colorTwo = Color.Color.parse('lch(100 112 312)');
    assertNotNullOrUndefined(colorTwo);
    deepCloseTo(colorTwo.rgba(), [1.3014, 0.7735, 1.6512, 1], colorSpaceConversionTolerance);

    // Parses none values too
    const colorThree = Color.Color.parse('lch(100 112 none)');
    assertNotNullOrUndefined(colorThree);
    deepCloseTo(colorThree.rgba(), [1.7272, 0.4992, 1.025, 1], colorSpaceConversionTolerance);

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
      const color = Color.Color.parse(syntax as string);
      assertNotNullOrUndefined(color);
      deepCloseTo(
          color.rgba(), expectedRgba as number[], colorSpaceConversionTolerance,
          'LCH parsing from syntax list is not correct');
    }
  });

  // TODO(ergunsh): Add tests for `oklch` after clearing situation
  it('parses lab values', () => {
    // White in sRGB
    const colorOne = Color.Color.parse('lab(100 0 0)');
    assertNotNullOrUndefined(colorOne);
    deepCloseTo(colorOne.rgba(), [1, 1, 1, 1], colorSpaceConversionTolerance);

    // Parses out of sRGB gamut values too
    const colorTwo = Color.Color.parse('lab(100 58 64)');
    assertNotNullOrUndefined(colorTwo);
    deepCloseTo(colorTwo.rgba(), [1.48, 0.805, 0.519, 1], colorSpaceConversionTolerance);

    // Parses none values too
    const colorThree = Color.Color.parse('lch(100 none none)');
    assertNotNullOrUndefined(colorThree);
    deepCloseTo(colorThree.rgba(), [1, 1, 1, 1], colorSpaceConversionTolerance);

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
      const color = Color.Color.parse(syntax as string);
      assertNotNullOrUndefined(color);
      deepCloseTo(
          color.rgba(), expectedRgba as number[], colorSpaceConversionTolerance,
          'lab() parsing from syntax list is not correct');
    }
  });

  // TODO(ergunsh): Add tests for `oklab` after clearing situation
  it('parses color() values', () => {
    // White in sRGB
    const colorOne = Color.Color.parse('color(srgb 100% 100% 100% / 50%)');
    assertNotNullOrUndefined(colorOne);
    deepCloseTo(colorOne.rgba(), [1, 1, 1, 0.5], colorSpaceConversionTolerance);

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
      assert.isNull(Color.Color.parse(invalidSyntax));
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
      const color = Color.Color.parse(colorSpaceCase);
      assertNotNullOrUndefined(color);
    }

    // Parses correctly from syntax list
    const colorCases = [
      ['color(display-p3 34% 58% 73%)', [0.246, 0.587, 0.745, 1]],
      ['color(display-p3 1 0.71 0.73)', [1.051, 0.694, 0.725, 1]],
      ['color(display-p3 34% / 50%)', [0.3748, -0.0505, -0.0239, 0.5]],
      ['color(rec2020 34% 58% 73%)', [-0.169, 0.641, 0.774, 1]],
      ['color(rec2020 .34 .58 .73 / .5)', [-0.169, 0.641, 0.774, 0.5]],
      ['color(a98-rgb 34% 58% 73% / 50%)', [0.1, 0.585, 0.741, 0.5]],
      ['color(a98-rgb none none none)', [0, 0, 0, 1]],
      ['color(a98-rgb 0)', [0, 0, 0, 1]],
      ['color(xyz-d50 .22 .26 .53)', [0.0929, 0.584, 0.855, 1]],
      ['color(xyz 100% 100% 100%)', [1.085, 0.977, 0.959, 1]],
      ['color(xyz-d65 100% 100% 100%)', [1.085, 0.977, 0.959, 1]],
    ];

    for (const [syntax, expectedRgba] of colorCases) {
      const color = Color.Color.parse(syntax as string);
      assertNotNullOrUndefined(color);
      deepCloseTo(
          color.rgba(), expectedRgba as number[], colorSpaceConversionTolerance,
          'color() parsing from syntax list is not correct');
    }
  });

  it('handles invalid values', () => {
    assert.isNull(Color.Color.parse('#FAFAFA       Trailing'));
    assert.isNull(Color.Color.parse('#FAFAFG'));
    assert.isNull(Color.Color.parse('gooseberry'));
    assert.isNull(Color.Color.parse('rgb(10% 10% 10% /)'));
    assert.isNull(Color.Color.parse('rgb(10% 10% 10% 0.4 40)'));
    assert.isNull(Color.Color.parse('hsl(0, carrot, 30%)'));
    assert.isNull(Color.Color.parse('hsl(0)'));
    assert.isNull(Color.Color.parse('hwb(0)'));
    // Unlike HSL, HWB does not allow comma-separated input
    assert.isNull(Color.Color.parse('hwb(0%, 50%, 50%)'));
    assert.isNull(Color.Color.parse('rgb(255)'));
    assert.isNull(Color.Color.parse('rgba(1 golf 30)'));
  });

  it('is able to return whether or not the color has an alpha value', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], Color.Format.Original, 'testColor');
    assert.isTrue(color.hasAlpha(), 'the color should be considered to have an alpha value');
  });

  it('is able to detect the HEX format of a color with an alpha value', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], Color.Format.Original, 'testColor');
    const result = color.detectHEXFormat();
    assert.strictEqual(result, 'hexa', 'format was not detected correctly');
  });

  it('is able to detect the HEX format of a color without an alpha value', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 1], Color.Format.Original, 'testColor');
    const result = color.detectHEXFormat();
    assert.strictEqual(result, 'hex', 'format was not detected correctly');
  });

  it('is able to return the canonical RGBA of a color', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], Color.Format.Original, 'testColor');
    const result = color.canonicalRGBA();
    assert.deepEqual(result, [128, 128, 128, 0.5], 'canonical RGBA was not returned correctly');
  });

  it('is able to return the nickname of a color', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.Original, 'testColor');
    const result = color.nickname();
    assert.strictEqual(result, 'red', 'nickname was not returned correctly');
  });

  it('returns null as a nickname if the color was not recognized', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], Color.Format.Original, 'testColor');
    const result = color.nickname();
    assert.isNull(result, 'nickname should be returned as Null');
  });

  it('is able to convert the color to a protocol RGBA', () => {
    const color = new Color.Color([0.5, 0.5, 0.5, 0.5], Color.Format.Original, 'testColor');
    const result = color.toProtocolRGBA();
    assert.deepEqual(result, {r: 128, g: 128, b: 128, a: 0.5}, 'conversion to protocol RGBA was not correct');
  });

  it('is able to invert a color', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.Original, 'testColor');
    const result = color.invert().rgba();
    assert.deepEqual(result, [0, 1, 1, 1], 'inversion was not successful');
  });

  it('is able to set the alpha value of a color', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.Original, 'testColor');
    const result = color.setAlpha(0.5).rgba();
    assert.deepEqual(result, [1, 0, 0, 0.5], 'alpha value was not set correctly');
  });

  it('can blend with another color', () => {
    const color = new Color.Color([1, 0, 0, 0.5], Color.Format.Original, 'testColor');
    const otherColor = new Color.Color([0, 0, 1, 0.5], Color.Format.Original, 'testColor');
    const result = color.blendWith(otherColor).rgba();
    assert.deepEqual(result, [0.5, 0, 0.5, 0.75], 'color was not blended correctly');
  });

  it('returns the original text when turned into a string if its format was "original"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.Original, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'testColor', 'color was not converted to a string correctly');
  });

  it('returns the nickname when turned into a string if its format was "nickname"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.Nickname, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'red', 'color was not converted to a string correctly');
  });

  it('returns the HEX value when turned into a string if its format was "hex"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.HEX, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, '#ff0000', 'color was not converted to a string correctly');
  });

  it('returns the short HEX value when turned into a string if its format was "shorthex"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.ShortHEX, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, '#f00', 'color was not converted to a string correctly');
  });

  it('returns the HEXA value when turned into a string if its format was "hexa"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.HEXA, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, '#ff0000ff', 'color was not converted to a string correctly');
  });

  it('returns the short HEXA value when turned into a string if its format was "shorthexa"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.ShortHEXA, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, '#f00f', 'color was not converted to a string correctly');
  });

  it('returns the RGB value when turned into a string if its format was "rgb"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.RGB, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'rgb(255 0 0)', 'color was not converted to a string correctly');
  });

  it('returns the RGBA value when turned into a string if its format was "rgba"', () => {
    const color = new Color.Color([1, 0, 0, 0.42], Color.Format.RGBA, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'rgb(255 0 0 / 42%)', 'color was not converted to a string correctly');
  });

  it('omits the alpha value when it’s 100% if its format was "rgba"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.RGBA, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'rgb(255 0 0)', 'color was not converted to a string correctly');
  });

  it('returns the HSL value when turned into a string if its format was "hsl"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.HSL, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'hsl(0deg 100% 50%)', 'color was not converted to a string correctly');
  });

  it('returns the HSLA value when turned into a string if its format was "hsla"', () => {
    const color = new Color.Color([1, 0, 0, 0.42], Color.Format.HSLA, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'hsl(0deg 100% 50% / 42%)', 'color was not converted to a string correctly');
  });

  it('omits the alpha value when it’s 100% if its format was "hsla"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.HSLA, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'hsl(0deg 100% 50%)', 'color was not converted to a string correctly');
  });

  it('returns the HWB value when turned into a string if its format was "hwb"', () => {
    const color = new Color.Color([0, 0, 1, 1], Color.Format.HWB, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'hwb(240deg 0% 0%)', 'color was not converted to a string correctly');
  });

  it('returns the HWB value when turned into a string if its format was "hwba"', () => {
    const color = new Color.Color([1, 0, 0, 0.42], Color.Format.HWBA, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'hwb(0deg 0% 0% / 42%)', 'color was not converted to a string correctly');
  });

  it('omits the alpha value when it’s 100% if its format was "hwba"', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.HWBA, 'testColor');
    const result = color.asString();
    assert.strictEqual(result, 'hwb(0deg 0% 0%)', 'color was not converted to a string correctly');
  });

  it('is able to return a color in a different format than the one the color was originally set with', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.RGB, 'testColor');
    const result = color.asString('nickname');
    assert.strictEqual(result, 'red', 'color was not converted to a string correctly');
  });

  it('is able to change color format', () => {
    const color = new Color.Color([1, 0, 0, 1], Color.Format.RGB);
    color.setFormat(Color.Format.HSL);
    assert.strictEqual(color.asString(), 'hsl(0deg 100% 50%)', 'format was not set correctly');
    color.setFormat(Color.Format.HWB);
    assert.strictEqual(color.asString(), 'hwb(0deg 0% 0%)', 'format was not set correctly');
  });

  it('suggests colors with good contrast', () => {
    const colors = [
      {
        bgColor: 'salmon',
        fgColor: 'white',
        contrast: 4.5,
        result: 'hsl(0deg 0% 23%)',
      },
      {
        bgColor: 'Lightblue',
        fgColor: 'white',
        contrast: 4.5,
        result: 'hsl(0deg 0% 35%)',
      },
      {
        bgColor: 'white',
        fgColor: 'hsl(0 53% 52% / 87%)',
        contrast: 7.0,
        result: 'hsl(0deg 49% 32% / 87%)',
      },
      {
        bgColor: 'white',
        fgColor: 'white',
        contrast: 7.0,
        result: 'hsl(0deg 0% 35%)',
      },
      {
        bgColor: 'black',
        fgColor: 'black',
        contrast: 7.05,
        result: 'hsl(0deg 0% 59%)',
      },
      {
        bgColor: 'white',
        fgColor: '#00FF00',
        contrast: 7.05,
        result: 'hsl(120deg 100% 20%)',
      },
      {
        bgColor: 'black',
        fgColor: '#b114ff',
        contrast: 7.05,
        result: 'hsl(280deg 100% 71%)',
      },
    ];
    for (const {fgColor, bgColor, contrast, result} of colors) {
      const fgParsed = Color.Color.parse(fgColor);
      const bgParsed = Color.Color.parse(bgColor);
      assertNotNullOrUndefined(fgParsed);
      assertNotNullOrUndefined(bgParsed);
      const suggestedColor = Color.Color.findFgColorForContrast(fgParsed, bgParsed, contrast);
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
      const fg = Common.Color.Color.parse(test.fgColor);
      const bg = Common.Color.Color.parse(test.bgColor);
      assertNotNullOrUndefined(fg);
      assertNotNullOrUndefined(bg);
      const result = Common.Color.Color.findFgColorForContrastAPCA(fg, bg, test.requiredContrast);
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
      const fg = Common.Color.Color.parse(test.fgColor);
      const bg = Common.Color.Color.parse(test.bgColor);
      assertNotNullOrUndefined(fg);
      assertNotNullOrUndefined(bg);
      const result = Common.Color.Color.findFgColorForContrastAPCA(fg, bg, test.requiredContrast);
      assert.isNull(result);
    }
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
