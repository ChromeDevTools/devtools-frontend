// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';

// Represents how each of the color formats should be
// shown in the color picker inputs and
// how a color should be materialized from the input values.

// All the color formats except HEX and ShortHEX is
// represented with 4 input fields in the ColorPicker.
// This utility exports `colorFormatSpec` which encodes
// * Label to be shown for the given color space
// * `toValues` method that converts the given color to 4 input values
// * `fromValues` method that creates the color from the given 4 input values.

// Represents each of the inputs. For example, we have
// 4 inputs for rgba colors: r, g, b, a and each character from "RGBA"
// represents one of the inputs.
type Label = 'RGBA'|'HSLA'|'HWBA'|'lchA'|'labA'|'xyzA';

type ColorFormatSpec = {
  // Label to be shown under the inputs
  label: Label,
  // Values of the inputs
  toValues(color: Common.Color.Color): [string, string, string, string],
  // How to generate the number from the input values
  fromValues(values: [string, string, string, string]): Common.Color.Color|null,
};

// p0, p1, p2, alpha
// r, g, b, alpha
// l, c, h, alpha
// l, a, b, alpha
type CanonicalParameters = [number, number, number, number];

export type SpectrumColorFormat = Exclude<
    Common.Color.Format,
    Common.Color.Format.RGBA|Common.Color.Format.HSLA|Common.Color.Format.HWBA|Common.Color.Format.HEXA|
    Common.Color.Format.ShortHEXA>;

const roundAndStringify = (arr: [number, number, number, number]): [string, string, string, string] =>
    arr.map(el => Platform.StringUtilities.stringifyWithPrecision(el, 2)) as [string, string, string, string];

const functionParamsText = (values: [string, string, string, string]): string => {
  return `${values[0]} ${values[1]} ${values[2]} / ${values[3]}`;
};

export const colorFormatSpec: Record<
    Exclude<SpectrumColorFormat, Common.Color.Format.HEX|Common.Color.Format.ShortHEX|Common.Color.Format.Nickname>,
    ColorFormatSpec> = {
  [Common.Color.Format.RGB]: {
    label: 'RGBA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      return roundAndStringify(color.as(Common.Color.Format.RGBA).canonicalRGBA() as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`rgb(${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.HSL]: {
    label: 'HSLA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const canonicalHslParams =
          roundAndStringify(color.as(Common.Color.Format.HSLA).canonicalHSLA() as CanonicalParameters);
      canonicalHslParams[1] = canonicalHslParams[1] + '%';
      canonicalHslParams[2] = canonicalHslParams[2] + '%';
      return canonicalHslParams;
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`hsl(${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.HWB]: {
    label: 'HWBA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const canonicalHwbParams =
          roundAndStringify(color.as(Common.Color.Format.HWBA).canonicalHWBA() as CanonicalParameters);
      canonicalHwbParams[1] = canonicalHwbParams[1] + '%';
      canonicalHwbParams[2] = canonicalHwbParams[2] + '%';
      return canonicalHwbParams;
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`hwb(${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.LCH]: {
    label: 'lchA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const lchColor = color.as(Common.Color.Format.LCH);
      return roundAndStringify([lchColor.l, lchColor.c, lchColor.h, lchColor.alpha ?? 1] as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`lch(${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.OKLCH]: {
    label: 'lchA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const lchColor = color.as(Common.Color.Format.OKLCH);
      return roundAndStringify([lchColor.l, lchColor.c, lchColor.h, lchColor.alpha ?? 1] as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`oklch(${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.LAB]: {
    label: 'labA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const labColor = color.as(Common.Color.Format.LAB);
      return roundAndStringify([labColor.l, labColor.a, labColor.b, labColor.alpha ?? 1] as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`lab(${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.OKLAB]: {
    label: 'labA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const labColor = color.as(Common.Color.Format.OKLAB);
      return roundAndStringify([labColor.l, labColor.a, labColor.b, labColor.alpha ?? 1] as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`oklab(${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.SRGB]: {
    label: 'RGBA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const srgbColor = color.as(Common.Color.Format.SRGB);
      return roundAndStringify([srgbColor.p0, srgbColor.p1, srgbColor.p2, srgbColor.alpha ?? 1] as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`color(${Common.Color.Format.SRGB} ${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.SRGB_LINEAR]: {
    label: 'RGBA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const srgbLinearColor = color.as(Common.Color.Format.SRGB_LINEAR);
      return roundAndStringify(
          [srgbLinearColor.p0, srgbLinearColor.p1, srgbLinearColor.p2, srgbLinearColor.alpha ?? 1] as
          CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`color(${Common.Color.Format.SRGB_LINEAR} ${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.DISPLAY_P3]: {
    label: 'RGBA',
    toValues(color: Common.Color.Color): [string, string, string, string] {
      const displayP3Color = color.as(Common.Color.Format.DISPLAY_P3);
      return roundAndStringify([displayP3Color.p0, displayP3Color.p1, displayP3Color.p2, 1]);
    },
    fromValues(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`color(${Common.Color.Format.DISPLAY_P3} ${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.A98_RGB]: {
    label: 'RGBA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const a98Color = color.as(Common.Color.Format.A98_RGB);
      return roundAndStringify([a98Color.p0, a98Color.p1, a98Color.p2, a98Color.alpha ?? 1] as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`color(${Common.Color.Format.A98_RGB} ${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.PROPHOTO_RGB]: {
    label: 'RGBA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const proPhotoRGBColor = color.as(Common.Color.Format.PROPHOTO_RGB);
      return roundAndStringify(
          [proPhotoRGBColor.p0, proPhotoRGBColor.p1, proPhotoRGBColor.p2, proPhotoRGBColor.alpha ?? 1] as
          CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`color(${Common.Color.Format.PROPHOTO_RGB} ${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.REC_2020]: {
    label: 'RGBA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const rec2020Color = color.as(Common.Color.Format.REC_2020);
      return roundAndStringify(
          [rec2020Color.p0, rec2020Color.p1, rec2020Color.p2, rec2020Color.alpha ?? 1] as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`color(${Common.Color.Format.REC_2020} ${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.XYZ]: {
    label: 'xyzA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const xyzColor = color.as(Common.Color.Format.XYZ);
      return roundAndStringify([xyzColor.p0, xyzColor.p1, xyzColor.p2, xyzColor.alpha ?? 1] as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`color(${Common.Color.Format.XYZ} ${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.XYZ_D50]: {
    label: 'xyzA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const xyzColor = color.as(Common.Color.Format.XYZ_D50);
      return roundAndStringify([xyzColor.p0, xyzColor.p1, xyzColor.p2, xyzColor.alpha ?? 1] as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`color(${Common.Color.Format.XYZ_D50} ${functionParamsText(values)})`);
        },
  },
  [Common.Color.Format.XYZ_D65]: {
    label: 'xyzA',
    toValues: function(color: Common.Color.Color): [string, string, string, string] {
      const xyzColor = color.as(Common.Color.Format.XYZ_D65);
      return roundAndStringify([xyzColor.p0, xyzColor.p1, xyzColor.p2, xyzColor.alpha ?? 1] as CanonicalParameters);
    },
    fromValues: function(values: [string, string, string, string]): Common.Color.Color |
        null {
          return Common.Color.parse(`color(${Common.Color.Format.XYZ_D65} ${functionParamsText(values)})`);
        },
  },
};
