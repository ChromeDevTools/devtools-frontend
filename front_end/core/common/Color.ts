// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2009 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Platform from '../platform/platform.js';

import {ColorConverter} from './ColorConverter.js';
import {
  blendColors,
  type Color3D,
  type Color4D,
  type Color4DOr3D,
  contrastRatioAPCA,
  desiredLuminanceAPCA,
  luminance,
  luminanceAPCA,
  rgbToHsl,
  rgbToHwb,
} from './ColorUtils.js';

// <hue> is defined as a <number> or <angle>
// and we hold this in degrees. However, after
// the conversions, these degrees can result in
// negative values. That's why we normalize the hue to be
// between [0 - 360].
function normalizeHue(hue: number): number {
  // Even though it is highly unlikely, hue can be
  // very negative like -400. The initial modulo
  // operation makes sure that the if the number is
  // negative, it is between [-360, 0].
  return ((hue % 360) + 360) % 360;
}

// Parses angle in the form of
// `<angle>deg`, `<angle>turn`, `<angle>grad and `<angle>rad`
// and returns the canonicalized `degree`.
function parseAngle(angleText: string): number|null {
  const angle = angleText.replace(/(deg|g?rad|turn)$/, '');
  // @ts-ignore: isNaN can accept strings
  if (isNaN(angle) || angleText.match(/\s+(deg|g?rad|turn)/)) {
    return null;
  }

  const number = parseFloat(angle);
  if (angleText.includes('turn')) {
    // 1turn === 360deg
    return number * 360;
  }

  if (angleText.includes('grad')) {
    // 1grad === 0.9deg
    return number * 9 / 10;
  }

  if (angleText.includes('rad')) {
    // πrad === 180deg
    return number * 180 / Math.PI;
  }

  // 1deg === 1deg ^_^
  return number;
}

// Returns the `Format` equivalent from the format text
export function getFormat(formatText: string): Format|null {
  switch (formatText) {
    case Format.HEX:
      return Format.HEX;
    case Format.HEXA:
      return Format.HEXA;
    case Format.RGB:
      return Format.RGB;
    case Format.RGBA:
      return Format.RGBA;
    case Format.HSL:
      return Format.HSL;
    case Format.HSLA:
      return Format.HSLA;
    case Format.HWB:
      return Format.HWB;
    case Format.HWBA:
      return Format.HWBA;
    case Format.LCH:
      return Format.LCH;
    case Format.OKLCH:
      return Format.OKLCH;
    case Format.LAB:
      return Format.LAB;
    case Format.OKLAB:
      return Format.OKLAB;
  }

  return getColorSpace(formatText);
}

// Returns the `ColorSpace` equivalent from the color space text
type ColorSpace = Format.SRGB|Format.SRGB_LINEAR|Format.DISPLAY_P3|Format.A98_RGB|Format.PROPHOTO_RGB|
                  Format.REC_2020|Format.XYZ|Format.XYZ_D50|Format.XYZ_D65;
function getColorSpace(colorSpaceText: string): ColorSpace|null {
  switch (colorSpaceText) {
    case Format.SRGB:
      return Format.SRGB;
    case Format.SRGB_LINEAR:
      return Format.SRGB_LINEAR;
    case Format.DISPLAY_P3:
      return Format.DISPLAY_P3;
    case Format.A98_RGB:
      return Format.A98_RGB;
    case Format.PROPHOTO_RGB:
      return Format.PROPHOTO_RGB;
    case Format.REC_2020:
      return Format.REC_2020;
    case Format.XYZ:
      return Format.XYZ;
    case Format.XYZ_D50:
      return Format.XYZ_D50;
    case Format.XYZ_D65:
      return Format.XYZ_D65;
  }

  return null;
}

/**
 * Percents in color spaces are mapped to ranges.
 * These ranges change based on the syntax.
 * For example, for 'C' in lch() c: 0% = 0, 100% = 150.
 * See: https://www.w3.org/TR/css-color-4/#funcdef-lch
 * Some percentage values can be negative
 * though their ranges don't change depending on the sign
 * (for now, according to spec).
 * @param percent % value of the number. 42 for 42%.
 * @param range Range of [min, max]. Including `min` and `max`.
 */
function mapPercentToRange(percent: number, range: [number, number]): number {
  const sign = Math.sign(percent);
  const absPercent = Math.abs(percent);
  const [outMin, outMax] = range;

  return sign * (absPercent * (outMax - outMin) / 100 + outMin);
}

interface SplitColorFunctionParametersOptions {
  allowCommas: boolean;
  convertNoneToZero: boolean;
}

export function parse(text: string): Color|null {
  // #hex, nickname
  if (!text.match(/\s/)) {
    const match = text.toLowerCase().match(/^(?:#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(\w+))$/i);
    if (match) {
      if (match[1]) {
        return Legacy.fromHex(match[1], text);
      }

      if (match[2]) {
        return Nickname.fromName(match[2], text);
      }

      return null;
    }
  }

  // rgb/rgba(), hsl/hsla(), hwb/hwba(), lch(), oklch(), lab(), oklab() and color()
  const match =
      text.toLowerCase().match(/^\s*(?:(rgba?)|(hsla?)|(hwba?)|(lch)|(oklch)|(lab)|(oklab)|(color))\((.*)\)\s*$/);
  if (match) {
    const isRgbaMatch = Boolean(match[1]);   // rgb/rgba()
    const isHslaMatch = Boolean(match[2]);   // hsl/hsla()
    const isHwbaMatch = Boolean(match[3]);   // hwb/hwba()
    const isLchMatch = Boolean(match[4]);    // lch()
    const isOklchMatch = Boolean(match[5]);  // oklch()
    const isLabMatch = Boolean(match[6]);    // lab()
    const isOklabMatch = Boolean(match[7]);  // oklab()
    const isColorMatch = Boolean(match[8]);  // color()
    const valuesText = match[9];

    // Parse color function first because extracting values for
    // this function is not the same as the other ones
    // so, we're not using any of the logic below.
    if (isColorMatch) {
      return ColorFunction.fromSpec(text, valuesText);
    }

    const isOldSyntax = isRgbaMatch || isHslaMatch || isHwbaMatch;
    const allowCommas = isRgbaMatch || isHslaMatch;
    const convertNoneToZero = !isOldSyntax;  // Convert 'none' keyword to zero in new syntaxes

    const values = splitColorFunctionParameters(valuesText, {allowCommas, convertNoneToZero});
    if (!values) {
      return null;
    }
    const spec: ColorParameterSpec = [values[0], values[1], values[2], values[3]];
    if (isRgbaMatch) {
      return Legacy.fromRGBAFunction(values[0], values[1], values[2], values[3], text);
    }

    if (isHslaMatch) {
      return HSL.fromSpec(spec, text);
    }

    if (isHwbaMatch) {
      return HWB.fromSpec(spec, text);
    }

    if (isLchMatch) {
      return LCH.fromSpec(spec, text);
    }

    if (isOklchMatch) {
      return Oklch.fromSpec(spec, text);
    }

    if (isLabMatch) {
      return Lab.fromSpec(spec, text);
    }

    if (isOklabMatch) {
      return Oklab.fromSpec(spec, text);
    }
  }

  return null;
}

/**
 * Split the color parameters of (e.g.) rgb(a), hsl(a), hwb(a) functions.
 */
function splitColorFunctionParameters(
    content: string, {allowCommas, convertNoneToZero}: SplitColorFunctionParametersOptions): string[]|null {
  const components = content.trim();
  let values: string[] = [];

  if (allowCommas) {
    values = components.split(/\s*,\s*/);
  }
  if (!allowCommas || values.length === 1) {
    values = components.split(/\s+/);
    if (values[3] === '/') {
      values.splice(3, 1);
      if (values.length !== 4) {
        return null;
      }
    } else if (
        (values.length > 2 && values[2].indexOf('/') !== -1) || (values.length > 3 && values[3].indexOf('/') !== -1)) {
      const alpha = values.slice(2, 4).join('');
      values = values.slice(0, 2).concat(alpha.split(/\//)).concat(values.slice(4));
    } else if (values.length >= 4) {
      return null;
    }
  }
  if (values.length !== 3 && values.length !== 4 || values.indexOf('') > -1) {
    return null;
  }

  // Question: what should we do with `alpha` being none?
  if (convertNoneToZero) {
    return values.map(value => value === 'none' ? '0' : value);
  }

  return values;
}

function clamp(value: number, {min, max}: {min?: number, max?: number}): number;
function clamp(value: null, {min, max}: {min?: number, max?: number}): null;
function clamp(value: number|null, {min, max}: {min?: number, max?: number}): number|null;
function clamp(value: number|null, {min, max}: {min?: number, max?: number}): number|null {
  if (value === null) {
    return value;
  }
  if (min !== undefined) {
    value = Math.max(value, min);
  }
  if (max !== undefined) {
    value = Math.min(value, max);
  }
  return value;
}

function parsePercentage(value: string, range: [number, number]): number|null {
  if (!value.endsWith('%')) {
    return null;
  }
  const percentage = parseFloat(value.substr(0, value.length - 1));
  return isNaN(percentage) ? null : mapPercentToRange(percentage, range);
}

function parseNumber(value: string): number|null {
  const number = parseFloat(value);
  return isNaN(number) ? null : number;
}

function parseAlpha(value: string|undefined): number|null {
  if (value === undefined) {
    return null;
  }
  return clamp(parsePercentage(value, [0, 1]) ?? parseNumber(value), {min: 0, max: 1});
}

/**
 *
 * @param value Text value to be parsed in the form of 'number|percentage'.
 * @param range Range to map the percentage.
 * @returns If it is not percentage, returns number directly; otherwise,
 * maps the percentage to the range. For example:
 * - 30% in range [0, 100] is 30
 * - 20% in range [0, 1] is 0.5
 */
function parsePercentOrNumber(value: string, range: [number, number] = [0, 1]): number|null {
  // @ts-ignore: isNaN can accept strings
  if (isNaN(value.replace('%', ''))) {
    return null;
  }
  const parsed = parseFloat(value);

  if (value.indexOf('%') !== -1) {
    if (value.indexOf('%') !== value.length - 1) {
      return null;
    }
    return mapPercentToRange(parsed, range);
  }
  return parsed;
}

function parseRgbNumeric(value: string): number|null {
  const parsed = parsePercentOrNumber(value);
  if (parsed === null) {
    return null;
  }

  if (value.indexOf('%') !== -1) {
    return parsed;
  }
  return parsed / 255;
}

export function parseHueNumeric(value: string): number|null {
  const angle = value.replace(/(deg|g?rad|turn)$/, '');
  // @ts-ignore: isNaN can accept strings
  if (isNaN(angle) || value.match(/\s+(deg|g?rad|turn)/)) {
    return null;
  }
  const number = parseFloat(angle);

  if (value.indexOf('turn') !== -1) {
    return number % 1;
  }
  if (value.indexOf('grad') !== -1) {
    return (number / 400) % 1;
  }
  if (value.indexOf('rad') !== -1) {
    return (number / (2 * Math.PI)) % 1;
  }
  return (number / 360) % 1;
}

function parseSatLightNumeric(value: string): number|null {
  // @ts-ignore: isNaN can accept strings
  if (value.indexOf('%') !== value.length - 1 || isNaN(value.replace('%', ''))) {
    return null;
  }
  const parsed = parseFloat(value);
  return parsed / 100;
}

function parseAlphaNumeric(value: string): number|null {
  return parsePercentOrNumber(value);
}

function hsva2hsla(hsva: Color4D): Color4D {
  const h = hsva[0];
  let s: 0|number = hsva[1];
  const v = hsva[2];

  const t = (2 - s) * v;
  if (v === 0 || s === 0) {
    s = 0;
  } else {
    s *= v / (t < 1 ? t : 2 - t);
  }

  return [h, s, t / 2, hsva[3]];
}

export function hsl2rgb(hsl: Color4D): Color4D {
  const h = hsl[0];
  let s: 0|number = hsl[1];
  const l = hsl[2];

  function hue2rgb(p: number, q: number, h: number): number {
    if (h < 0) {
      h += 1;
    } else if (h > 1) {
      h -= 1;
    }

    if ((h * 6) < 1) {
      return p + (q - p) * h * 6;
    }
    if ((h * 2) < 1) {
      return q;
    }
    if ((h * 3) < 2) {
      return p + (q - p) * ((2 / 3) - h) * 6;
    }
    return p;
  }

  if (s < 0) {
    s = 0;
  }

  let q;
  if (l <= 0.5) {
    q = l * (1 + s);
  } else {
    q = l + s - (l * s);
  }

  const p = 2 * l - q;

  const tr = h + (1 / 3);
  const tg = h;
  const tb = h - (1 / 3);

  return [hue2rgb(p, q, tr), hue2rgb(p, q, tg), hue2rgb(p, q, tb), hsl[3]];
}

function hwb2rgb(hwb: Color4D): Color4D {
  const h = hwb[0];
  const w = hwb[1];
  const b = hwb[2];

  const whiteRatio = w / (w + b);
  let result: Color4D = [whiteRatio, whiteRatio, whiteRatio, hwb[3]];

  if (w + b < 1) {
    result = hsl2rgb([h, 1, 0.5, hwb[3]]);
    for (let i = 0; i < 3; ++i) {
      result[i] += w - (w + b) * result[i];
    }
  }

  return result;
}

export function hsva2rgba(hsva: Color4D): Color4D {
  return hsl2rgb(hsva2hsla(hsva));
}

export function rgb2hsv(rgba: Color3D): Color3D {
  const hsla = rgbToHsl(rgba);
  const h = hsla[0];
  let s = hsla[1];
  const l = hsla[2];

  s *= l < 0.5 ? l : 1 - l;
  return [h, s !== 0 ? 2 * s / (l + s) : 0, (l + s)];
}

/**
 * Compute a desired luminance given a given luminance and a desired contrast
 * ratio.
 */
export function desiredLuminance(luminance: number, contrast: number, lighter: boolean): number {
  function computeLuminance(): number {
    if (lighter) {
      return (luminance + 0.05) * contrast - 0.05;
    }
    return (luminance + 0.05) / contrast - 0.05;
  }
  let desiredLuminance = computeLuminance();
  if (desiredLuminance < 0 || desiredLuminance > 1) {
    lighter = !lighter;
    desiredLuminance = computeLuminance();
  }
  return desiredLuminance;
}

/**
 * Approach a value of the given component of `candidateHSVA` such that the
 * calculated luminance of `candidateHSVA` approximates `desiredLuminance`.
 */
export function approachColorValue(
    candidateHSVA: Color4D, bgRGBA: Color4D, index: number, desiredLuminance: number,
    candidateLuminance: (arg0: Color4D) => number): number|null {
  const epsilon = 0.0002;

  let x = candidateHSVA[index];
  let multiplier = 1;
  let dLuminance: number = candidateLuminance(candidateHSVA) - desiredLuminance;
  let previousSign = Math.sign(dLuminance);

  for (let guard = 100; guard; guard--) {
    if (Math.abs(dLuminance) < epsilon) {
      candidateHSVA[index] = x;
      return x;
    }

    const sign = Math.sign(dLuminance);
    if (sign !== previousSign) {
      // If `x` overshoots the correct value, halve the step size.
      multiplier /= 2;
      previousSign = sign;
    } else if (x < 0 || x > 1) {
      // If there is no overshoot and `x` is out of bounds, there is no
      // acceptable value for `x`.
      return null;
    }

    // Adjust `x` by a multiple of `dLuminance` to decrease step size as
    // the computed luminance converges on `desiredLuminance`.
    x += multiplier * (index === 2 ? -dLuminance : dLuminance);

    candidateHSVA[index] = x;

    dLuminance = candidateLuminance(candidateHSVA) - desiredLuminance;
  }

  return null;
}

export function findFgColorForContrast(fgColor: Legacy, bgColor: Legacy, requiredContrast: number): Legacy|null {
  const candidateHSVA = fgColor.as(Format.HSL).hsva();
  const bgRGBA = bgColor.rgba();

  const candidateLuminance = (candidateHSVA: Color4D): number => {
    return luminance(blendColors(Legacy.fromHSVA(candidateHSVA).rgba(), bgRGBA));
  };

  const bgLuminance = luminance(bgColor.rgba());
  const fgLuminance = candidateLuminance(candidateHSVA);
  const fgIsLighter = fgLuminance > bgLuminance;

  const desired = desiredLuminance(bgLuminance, requiredContrast, fgIsLighter);

  const saturationComponentIndex = 1;
  const valueComponentIndex = 2;

  if (approachColorValue(candidateHSVA, bgRGBA, valueComponentIndex, desired, candidateLuminance)) {
    return Legacy.fromHSVA(candidateHSVA);
  }

  candidateHSVA[valueComponentIndex] = 1;
  if (approachColorValue(candidateHSVA, bgRGBA, saturationComponentIndex, desired, candidateLuminance)) {
    return Legacy.fromHSVA(candidateHSVA);
  }

  return null;
}

export function findFgColorForContrastAPCA(fgColor: Legacy, bgColor: Legacy, requiredContrast: number): Legacy|null {
  const candidateHSVA = fgColor.as(Format.HSL).hsva();
  const bgRGBA = bgColor.rgba();

  const candidateLuminance = (candidateHSVA: Color4D): number => {
    return luminanceAPCA(Legacy.fromHSVA(candidateHSVA).rgba());
  };

  const bgLuminance = luminanceAPCA(bgColor.rgba());
  const fgLuminance = candidateLuminance(candidateHSVA);
  const fgIsLighter = fgLuminance >= bgLuminance;
  const desiredLuminance = desiredLuminanceAPCA(bgLuminance, requiredContrast, fgIsLighter);

  const saturationComponentIndex = 1;
  const valueComponentIndex = 2;

  if (approachColorValue(candidateHSVA, bgRGBA, valueComponentIndex, desiredLuminance, candidateLuminance)) {
    const candidate = Legacy.fromHSVA(candidateHSVA);
    if (Math.abs(contrastRatioAPCA(bgColor.rgba(), candidate.rgba())) >= requiredContrast) {
      return candidate;
    }
  }

  candidateHSVA[valueComponentIndex] = 1;
  if (approachColorValue(candidateHSVA, bgRGBA, saturationComponentIndex, desiredLuminance, candidateLuminance)) {
    const candidate = Legacy.fromHSVA(candidateHSVA);
    if (Math.abs(contrastRatioAPCA(bgColor.rgba(), candidate.rgba())) >= requiredContrast) {
      return candidate;
    }
  }

  return null;
}

type ColorParameterSpec = [string, string, string, string | undefined];

interface ColorConversions<T = void> {
  [Format.HEX](self: T): Legacy;
  [Format.HEXA](self: T): Legacy;
  [Format.RGB](self: T): Legacy;
  [Format.RGBA](self: T): Legacy;
  [Format.HSL](self: T): HSL;
  [Format.HSLA](self: T): HSL;
  [Format.HWB](self: T): HWB;
  [Format.HWBA](self: T): HWB;
  [Format.LCH](self: T): LCH;
  [Format.OKLCH](self: T): Oklch;
  [Format.LAB](self: T): Lab;
  [Format.OKLAB](self: T): Oklab;

  [Format.SRGB](self: T): ColorFunction;
  [Format.SRGB_LINEAR](self: T): ColorFunction;
  [Format.DISPLAY_P3](self: T): ColorFunction;
  [Format.A98_RGB](self: T): ColorFunction;
  [Format.PROPHOTO_RGB](self: T): ColorFunction;
  [Format.REC_2020](self: T): ColorFunction;
  [Format.XYZ](self: T): ColorFunction;
  [Format.XYZ_D50](self: T): ColorFunction;
  [Format.XYZ_D65](self: T): ColorFunction;
}

export interface Color {
  readonly alpha: number|null;

  equal(color: Color): boolean;
  asString(format?: Format): string;
  setAlpha(alpha: number): Color;
  format(): Format;
  as<T extends Format>(format: T): ReturnType<ColorConversions[T]>;
  is<T extends Format>(format: T): this is ReturnType<ColorConversions[T]>;
  asLegacyColor(): Legacy;
  getAuthoredText(): string|null;

  getRawParameters(): Color3D;
  getAsRawString(format?: Format): string;
  isGamutClipped(): boolean;
}

const EPSILON = 0.01;
const WIDE_RANGE_EPSILON = 1;  // For comparisons on channels with a wider range than [0,1]
function equals(a: number[], b: number[], accuracy?: number): boolean;
function equals(a: number|null, b: number|null, accuracy?: number): boolean;
function equals(a: number|null|number[], b: number|null|number[], accuracy = EPSILON): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (const i in a) {
      if (!equals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }
  if (a === null || b === null) {
    return a === b;
  }
  return Math.abs(a - b) < accuracy;
}
function lessOrEquals(a: number, b: number, accuracy = EPSILON): boolean {
  return a - b <= accuracy;
}

export const enum Format {
  HEX = 'hex',
  HEXA = 'hexa',
  RGB = 'rgb',
  RGBA = 'rgba',
  HSL = 'hsl',
  HSLA = 'hsla',
  HWB = 'hwb',
  HWBA = 'hwba',
  LCH = 'lch',
  OKLCH = 'oklch',
  LAB = 'lab',
  OKLAB = 'oklab',
  SRGB = 'srgb',
  SRGB_LINEAR = 'srgb-linear',
  DISPLAY_P3 = 'display-p3',
  A98_RGB = 'a98-rgb',
  PROPHOTO_RGB = 'prophoto-rgb',
  REC_2020 = 'rec2020',
  XYZ = 'xyz',
  XYZ_D50 = 'xyz-d50',
  XYZ_D65 = 'xyz-d65',
}

export class Lab implements Color {
  readonly l: number;
  readonly a: number;
  readonly b: number;
  readonly alpha: number|null;
  readonly #authoredText?: string;
  readonly #rawParams: Color3D;

  static readonly #conversions: ColorConversions<Lab> = {
    [Format.HEX]: (self: Lab) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.HEX),
    [Format.HEXA]: (self: Lab) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.HEXA),
    [Format.RGB]: (self: Lab) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.RGB),
    [Format.RGBA]: (self: Lab) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.RGBA),
    [Format.HSL]: (self: Lab) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HSLA]: (self: Lab) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWB]: (self: Lab) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWBA]: (self: Lab) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.LCH]: (self: Lab) => new LCH(...ColorConverter.labToLch(self.l, self.a, self.b), self.alpha),
    [Format.OKLCH]: (self: Lab) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [Format.LAB]: (self: Lab) => self,
    [Format.OKLAB]: (self: Lab) =>
        new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),

    [Format.SRGB]: (self: Lab) =>
        new ColorFunction(Format.SRGB, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [Format.SRGB_LINEAR]: (self: Lab) =>
        new ColorFunction(Format.SRGB_LINEAR, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [Format.DISPLAY_P3]: (self: Lab) =>
        new ColorFunction(Format.DISPLAY_P3, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [Format.A98_RGB]: (self: Lab) =>
        new ColorFunction(Format.A98_RGB, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [Format.PROPHOTO_RGB]: (self: Lab) =>
        new ColorFunction(Format.PROPHOTO_RGB, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [Format.REC_2020]: (self: Lab) =>
        new ColorFunction(Format.REC_2020, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [Format.XYZ]: (self: Lab) =>
        new ColorFunction(Format.XYZ, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [Format.XYZ_D50]: (self: Lab) => new ColorFunction(Format.XYZ_D50, ...self.#toXyzd50(), self.alpha),
    [Format.XYZ_D65]: (self: Lab) =>
        new ColorFunction(Format.XYZ_D65, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
  };

  #toXyzd50(): Color3D {
    return ColorConverter.labToXyzd50(this.l, this.a, this.b);
  }

  #getRGBArray(withAlpha: true): Color4DOr3D;
  #getRGBArray(withAlpha: false): Color3D;
  #getRGBArray(withAlpha: boolean = true): Color3D|Color4DOr3D {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? undefined];
    }
    return params;
  }

  constructor(l: number, a: number, b: number, alpha: number|null, authoredText?: string|undefined) {
    this.#rawParams = [l, a, b];
    this.l = clamp(l, {min: 0, max: 100});
    if (equals(this.l, 0, WIDE_RANGE_EPSILON) || equals(this.l, 100, WIDE_RANGE_EPSILON)) {
      a = b = 0;
    }
    this.a = a;
    this.b = b;
    this.alpha = clamp(alpha, {min: 0, max: 1});
    this.#authoredText = authoredText;
  }
  is<T extends Format>(format: T): this is ReturnType<ColorConversions[T]> {
    return format === this.format();
  }
  as<T extends Format>(format: T): ReturnType<ColorConversions[T]> {
    return Lab.#conversions[format](this) as ReturnType<ColorConversions[T]>;
  }
  asLegacyColor(): Legacy {
    return this.as(Format.RGBA);
  }
  equal(color: Color): boolean {
    const lab = color.as(Format.LAB);
    return equals(lab.l, this.l, WIDE_RANGE_EPSILON) && equals(lab.a, this.a) && equals(lab.b, this.b) &&
        equals(lab.alpha, this.alpha);
  }
  format(): Format {
    return Format.LAB;
  }
  setAlpha(alpha: number): Lab {
    return new Lab(this.l, this.a, this.b, alpha, undefined);
  }
  asString(format?: Format): string {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.a, this.b);
  }
  #stringify(l: number, a: number, b: number): string {
    const alpha = this.alpha === null || equals(this.alpha, 1) ?
        '' :
        ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `lab(${Platform.StringUtilities.stringifyWithPrecision(l, 0)} ${
        Platform.StringUtilities.stringifyWithPrecision(
            a)} ${Platform.StringUtilities.stringifyWithPrecision(b)}${alpha})`;
  }
  getAuthoredText(): string|null {
    return this.#authoredText ?? null;
  }

  getRawParameters(): Color3D {
    return [...this.#rawParams];
  }
  getAsRawString(format?: Format): string {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped(): boolean {
    return false;
  }

  static fromSpec(spec: ColorParameterSpec, text: string): Lab|null {
    const L = parsePercentage(spec[0], [0, 100]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const a = parsePercentage(spec[1], [0, 125]) ?? parseNumber(spec[1]);
    if (a === null) {
      return null;
    }
    const b = parsePercentage(spec[2], [0, 125]) ?? parseNumber(spec[2]);
    if (b === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);

    return new Lab(L, a, b, alpha, text);
  }
}

export class LCH implements Color {
  readonly #rawParams: Color3D;
  readonly l: number;
  readonly c: number;
  readonly h: number;
  readonly alpha: number|null;
  readonly #authoredText?: string;

  static readonly #conversions: ColorConversions<LCH> = {
    [Format.HEX]: (self: LCH) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.HEX),
    [Format.HEXA]: (self: LCH) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.HEXA),
    [Format.RGB]: (self: LCH) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.RGB),
    [Format.RGBA]: (self: LCH) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.RGBA),
    [Format.HSL]: (self: LCH) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HSLA]: (self: LCH) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWB]: (self: LCH) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWBA]: (self: LCH) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.LCH]: (self: LCH) => self,
    [Format.OKLCH]: (self: LCH) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [Format.LAB]: (self: LCH) => new Lab(...ColorConverter.lchToLab(self.l, self.c, self.h), self.alpha),
    [Format.OKLAB]: (self: LCH) =>
        new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),

    [Format.SRGB]: (self: LCH) =>
        new ColorFunction(Format.SRGB, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [Format.SRGB_LINEAR]: (self: LCH) =>
        new ColorFunction(Format.SRGB_LINEAR, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [Format.DISPLAY_P3]: (self: LCH) =>
        new ColorFunction(Format.DISPLAY_P3, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [Format.A98_RGB]: (self: LCH) =>
        new ColorFunction(Format.A98_RGB, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [Format.PROPHOTO_RGB]: (self: LCH) =>
        new ColorFunction(Format.PROPHOTO_RGB, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [Format.REC_2020]: (self: LCH) =>
        new ColorFunction(Format.REC_2020, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [Format.XYZ]: (self: LCH) =>
        new ColorFunction(Format.XYZ, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [Format.XYZ_D50]: (self: LCH) => new ColorFunction(Format.XYZ_D50, ...self.#toXyzd50(), self.alpha),
    [Format.XYZ_D65]: (self: LCH) =>
        new ColorFunction(Format.XYZ_D65, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
  };

  #toXyzd50(): Color3D {
    return ColorConverter.labToXyzd50(...ColorConverter.lchToLab(this.l, this.c, this.h));
  }

  #getRGBArray(withAlpha: true): Color4DOr3D;
  #getRGBArray(withAlpha: false): Color3D;
  #getRGBArray(withAlpha: boolean = true): Color4DOr3D|Color3D {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? undefined];
    }
    return params;
  }

  constructor(l: number, c: number, h: number, alpha: number|null, authoredText?: string|undefined) {
    this.#rawParams = [l, c, h];
    this.l = clamp(l, {min: 0, max: 100});
    c = equals(this.l, 0, WIDE_RANGE_EPSILON) || equals(this.l, 100, WIDE_RANGE_EPSILON) ? 0 : c;
    this.c = clamp(c, {min: 0});
    h = equals(c, 0) ? 0 : h;
    this.h = normalizeHue(h);
    this.alpha = clamp(alpha, {min: 0, max: 1});
    this.#authoredText = authoredText;
  }
  asLegacyColor(): Legacy {
    return this.as(Format.RGBA);
  }
  is<T extends Format>(format: T): this is ReturnType<ColorConversions[T]> {
    return format === this.format();
  }
  as<T extends Format>(format: T): ReturnType<ColorConversions[T]> {
    return LCH.#conversions[format](this) as ReturnType<ColorConversions[T]>;
  }
  equal(color: Color): boolean {
    const lch = color.as(Format.LCH);
    return equals(lch.l, this.l, WIDE_RANGE_EPSILON) && equals(lch.c, this.c) && equals(lch.h, this.h) &&
        equals(lch.alpha, this.alpha);
  }
  format(): Format {
    return Format.LCH;
  }
  setAlpha(alpha: number): Color {
    return new LCH(this.l, this.c, this.h, alpha);
  }
  asString(format?: Format): string {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.c, this.h);
  }
  #stringify(l: number, c: number, h: number): string {
    const alpha = this.alpha === null || equals(this.alpha, 1) ?
        '' :
        ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `lch(${Platform.StringUtilities.stringifyWithPrecision(l, 0)} ${
        Platform.StringUtilities.stringifyWithPrecision(
            c)} ${Platform.StringUtilities.stringifyWithPrecision(h)}${alpha})`;
  }
  getAuthoredText(): string|null {
    return this.#authoredText ?? null;
  }

  getRawParameters(): Color3D {
    return [...this.#rawParams];
  }
  getAsRawString(format?: Format): string {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped(): boolean {
    return false;
  }
  // See "powerless" component definitions in
  // https://www.w3.org/TR/css-color-4/#specifying-lab-lch
  isHuePowerless(): boolean {
    return equals(this.c, 0);
  }
  static fromSpec(spec: ColorParameterSpec, text: string): LCH|null {
    const L = parsePercentage(spec[0], [0, 100]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const c = parsePercentage(spec[1], [0, 150]) ?? parseNumber(spec[1]);
    if (c === null) {
      return null;
    }
    const h = parseAngle(spec[2]);
    if (h === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);

    return new LCH(L, c, h, alpha, text);
  }
}

export class Oklab implements Color {
  readonly #rawParams: Color3D;
  readonly l: number;
  readonly a: number;
  readonly b: number;
  readonly alpha: number|null;
  readonly #authoredText?: string;

  static readonly #conversions: ColorConversions<Oklab> = {
    [Format.HEX]: (self: Oklab) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.HEX),
    [Format.HEXA]: (self: Oklab) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.HEXA),
    [Format.RGB]: (self: Oklab) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.RGB),
    [Format.RGBA]: (self: Oklab) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.RGBA),
    [Format.HSL]: (self: Oklab) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HSLA]: (self: Oklab) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWB]: (self: Oklab) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWBA]: (self: Oklab) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.LCH]: (self: Oklab) =>
        new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [Format.OKLCH]: (self: Oklab) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [Format.LAB]: (self: Oklab) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [Format.OKLAB]: (self: Oklab) => self,

    [Format.SRGB]: (self: Oklab) =>
        new ColorFunction(Format.SRGB, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [Format.SRGB_LINEAR]: (self: Oklab) =>
        new ColorFunction(Format.SRGB_LINEAR, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [Format.DISPLAY_P3]: (self: Oklab) =>
        new ColorFunction(Format.DISPLAY_P3, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [Format.A98_RGB]: (self: Oklab) =>
        new ColorFunction(Format.A98_RGB, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [Format.PROPHOTO_RGB]: (self: Oklab) =>
        new ColorFunction(Format.PROPHOTO_RGB, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [Format.REC_2020]: (self: Oklab) =>
        new ColorFunction(Format.REC_2020, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [Format.XYZ]: (self: Oklab) =>
        new ColorFunction(Format.XYZ, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [Format.XYZ_D50]: (self: Oklab) => new ColorFunction(Format.XYZ_D50, ...self.#toXyzd50(), self.alpha),
    [Format.XYZ_D65]: (self: Oklab) =>
        new ColorFunction(Format.XYZ_D65, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
  };

  #toXyzd50(): Color3D {
    return ColorConverter.xyzd65ToD50(...ColorConverter.oklabToXyzd65(this.l, this.a, this.b));
  }

  #getRGBArray(withAlpha: true): Color4DOr3D;
  #getRGBArray(withAlpha: false): Color3D;
  #getRGBArray(withAlpha: boolean = true): Color4DOr3D|Color3D {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? undefined];
    }
    return params;
  }

  constructor(l: number, a: number, b: number, alpha: number|null, authoredText?: string|undefined) {
    this.#rawParams = [l, a, b];
    this.l = clamp(l, {min: 0, max: 1});
    if (equals(this.l, 0) || equals(this.l, 1)) {
      a = b = 0;
    }
    this.a = a;
    this.b = b;
    this.alpha = clamp(alpha, {min: 0, max: 1});
    this.#authoredText = authoredText;
  }
  asLegacyColor(): Legacy {
    return this.as(Format.RGBA);
  }
  is<T extends Format>(format: T): this is ReturnType<ColorConversions[T]> {
    return format === this.format();
  }
  as<T extends Format>(format: T): ReturnType<ColorConversions[T]> {
    return Oklab.#conversions[format](this) as ReturnType<ColorConversions[T]>;
  }
  equal(color: Color): boolean {
    const oklab = color.as(Format.OKLAB);
    return equals(oklab.l, this.l) && equals(oklab.a, this.a) && equals(oklab.b, this.b) &&
        equals(oklab.alpha, this.alpha);
  }
  format(): Format {
    return Format.OKLAB;
  }
  setAlpha(alpha: number): Color {
    return new Oklab(this.l, this.a, this.b, alpha);
  }
  asString(format?: Format): string {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.a, this.b);
  }
  #stringify(l: number, a: number, b: number): string {
    const alpha = this.alpha === null || equals(this.alpha, 1) ?
        '' :
        ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `oklab(${Platform.StringUtilities.stringifyWithPrecision(l)} ${
        Platform.StringUtilities.stringifyWithPrecision(
            a)} ${Platform.StringUtilities.stringifyWithPrecision(b)}${alpha})`;
  }
  getAuthoredText(): string|null {
    return this.#authoredText ?? null;
  }

  getRawParameters(): Color3D {
    return [...this.#rawParams];
  }
  getAsRawString(format?: Format): string {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped(): boolean {
    return false;
  }

  static fromSpec(spec: ColorParameterSpec, text: string): Oklab|null {
    const L = parsePercentage(spec[0], [0, 1]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const a = parsePercentage(spec[1], [0, 0.4]) ?? parseNumber(spec[1]);
    if (a === null) {
      return null;
    }
    const b = parsePercentage(spec[2], [0, 0.4]) ?? parseNumber(spec[2]);
    if (b === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);

    return new Oklab(L, a, b, alpha, text);
  }
}

export class Oklch implements Color {
  readonly #rawParams: Color3D;
  readonly l: number;
  readonly c: number;
  readonly h: number;
  readonly alpha: number|null;
  readonly #authoredText?: string;

  static readonly #conversions: ColorConversions<Oklch> = {
    [Format.HEX]: (self: Oklch) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.HEX),
    [Format.HEXA]: (self: Oklch) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.HEXA),
    [Format.RGB]: (self: Oklch) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.RGB),
    [Format.RGBA]: (self: Oklch) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.RGBA),
    [Format.HSL]: (self: Oklch) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HSLA]: (self: Oklch) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWB]: (self: Oklch) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWBA]: (self: Oklch) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.LCH]: (self: Oklch) =>
        new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [Format.OKLCH]: (self: Oklch) => self,
    [Format.LAB]: (self: Oklch) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [Format.OKLAB]: (self: Oklch) =>
        new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    [Format.SRGB]: (self: Oklch) =>
        new ColorFunction(Format.SRGB, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [Format.SRGB_LINEAR]: (self: Oklch) =>
        new ColorFunction(Format.SRGB_LINEAR, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [Format.DISPLAY_P3]: (self: Oklch) =>
        new ColorFunction(Format.DISPLAY_P3, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [Format.A98_RGB]: (self: Oklch) =>
        new ColorFunction(Format.A98_RGB, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [Format.PROPHOTO_RGB]: (self: Oklch) =>
        new ColorFunction(Format.PROPHOTO_RGB, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [Format.REC_2020]: (self: Oklch) =>
        new ColorFunction(Format.REC_2020, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [Format.XYZ]: (self: Oklch) =>
        new ColorFunction(Format.XYZ, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [Format.XYZ_D50]: (self: Oklch) => new ColorFunction(Format.XYZ_D50, ...self.#toXyzd50(), self.alpha),
    [Format.XYZ_D65]: (self: Oklch) =>
        new ColorFunction(Format.XYZ_D65, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
  };

  #toXyzd50(): Color3D {
    return ColorConverter.oklchToXyzd50(this.l, this.c, this.h);
  }

  #getRGBArray(withAlpha: true): Color4DOr3D;
  #getRGBArray(withAlpha: false): Color3D;
  #getRGBArray(withAlpha: boolean = true): Color4DOr3D|Color3D {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? undefined];
    }
    return params;
  }

  constructor(l: number, c: number, h: number, alpha: number|null, authoredText?: string|undefined) {
    this.#rawParams = [l, c, h];
    this.l = clamp(l, {min: 0, max: 1});
    c = equals(this.l, 0) || equals(this.l, 1) ? 0 : c;
    this.c = clamp(c, {min: 0});
    h = equals(c, 0) ? 0 : h;
    this.h = normalizeHue(h);
    this.alpha = clamp(alpha, {min: 0, max: 1});
    this.#authoredText = authoredText;
  }
  asLegacyColor(): Legacy {
    return this.as(Format.RGBA);
  }
  is<T extends Format>(format: T): this is ReturnType<ColorConversions[T]> {
    return format === this.format();
  }
  as<T extends Format>(format: T): ReturnType<ColorConversions[T]> {
    return Oklch.#conversions[format](this) as ReturnType<ColorConversions[T]>;
  }
  equal(color: Color): boolean {
    const oklch = color.as(Format.OKLCH);
    return equals(oklch.l, this.l) && equals(oklch.c, this.c) && equals(oklch.h, this.h) &&
        equals(oklch.alpha, this.alpha);
  }
  format(): Format {
    return Format.OKLCH;
  }
  setAlpha(alpha: number): Color {
    return new Oklch(this.l, this.c, this.h, alpha);
  }
  asString(format?: Format): string {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.c, this.h);
  }
  #stringify(l: number, c: number, h: number): string {
    const alpha = this.alpha === null || equals(this.alpha, 1) ?
        '' :
        ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `oklch(${Platform.StringUtilities.stringifyWithPrecision(l)} ${
        Platform.StringUtilities.stringifyWithPrecision(
            c)} ${Platform.StringUtilities.stringifyWithPrecision(h)}${alpha})`;
  }
  getAuthoredText(): string|null {
    return this.#authoredText ?? null;
  }

  getRawParameters(): Color3D {
    return [...this.#rawParams];
  }
  getAsRawString(format?: Format): string {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped(): boolean {
    return false;
  }

  static fromSpec(spec: ColorParameterSpec, text: string): Oklch|null {
    const L = parsePercentage(spec[0], [0, 1]) ?? parseNumber(spec[0]);
    if (L === null) {
      return null;
    }
    const c = parsePercentage(spec[1], [0, 0.4]) ?? parseNumber(spec[1]);
    if (c === null) {
      return null;
    }
    const h = parseAngle(spec[2]);
    if (h === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);

    return new Oklch(L, c, h, alpha, text);
  }
}

export class ColorFunction implements Color {
  readonly #rawParams: Color3D;
  readonly p0: number;
  readonly p1: number;
  readonly p2: number;
  readonly alpha: number|null;
  readonly colorSpace: ColorSpace;
  readonly #authoredText?: string;

  static readonly #conversions: ColorConversions<ColorFunction> = {
    [Format.HEX]: (self: ColorFunction) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.HEX),
    [Format.HEXA]: (self: ColorFunction) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.HEXA),
    [Format.RGB]: (self: ColorFunction) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.RGB),
    [Format.RGBA]: (self: ColorFunction) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.RGBA),
    [Format.HSL]: (self: ColorFunction) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HSLA]: (self: ColorFunction) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWB]: (self: ColorFunction) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWBA]: (self: ColorFunction) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.LCH]: (self: ColorFunction) =>
        new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [Format.OKLCH]: (self: ColorFunction) =>
        new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [Format.LAB]: (self: ColorFunction) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [Format.OKLAB]: (self: ColorFunction) =>
        new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),

    [Format.SRGB]: (self: ColorFunction) =>
        new ColorFunction(Format.SRGB, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [Format.SRGB_LINEAR]: (self: ColorFunction) =>
        new ColorFunction(Format.SRGB_LINEAR, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [Format.DISPLAY_P3]: (self: ColorFunction) =>
        new ColorFunction(Format.DISPLAY_P3, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [Format.A98_RGB]: (self: ColorFunction) =>
        new ColorFunction(Format.A98_RGB, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [Format.PROPHOTO_RGB]: (self: ColorFunction) =>
        new ColorFunction(Format.PROPHOTO_RGB, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [Format.REC_2020]: (self: ColorFunction) =>
        new ColorFunction(Format.REC_2020, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [Format.XYZ]: (self: ColorFunction) =>
        new ColorFunction(Format.XYZ, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [Format.XYZ_D50]: (self: ColorFunction) => new ColorFunction(Format.XYZ_D50, ...self.#toXyzd50(), self.alpha),
    [Format.XYZ_D65]: (self: ColorFunction) =>
        new ColorFunction(Format.XYZ_D65, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
  };

  #toXyzd50(): Color3D {
    // With color(), out-of-gamut inputs are to be used for intermediate computations
    const [p0, p1, p2] = this.#rawParams;
    switch (this.colorSpace) {
      case Format.SRGB:
        return ColorConverter.srgbToXyzd50(p0, p1, p2);
      case Format.SRGB_LINEAR:
        return ColorConverter.srgbLinearToXyzd50(p0, p1, p2);
      case Format.DISPLAY_P3:
        return ColorConverter.displayP3ToXyzd50(p0, p1, p2);
      case Format.A98_RGB:
        return ColorConverter.adobeRGBToXyzd50(p0, p1, p2);
      case Format.PROPHOTO_RGB:
        return ColorConverter.proPhotoToXyzd50(p0, p1, p2);
      case Format.REC_2020:
        return ColorConverter.rec2020ToXyzd50(p0, p1, p2);
      case Format.XYZ_D50:
        return [p0, p1, p2];
      case Format.XYZ:
      case Format.XYZ_D65:
        return ColorConverter.xyzd65ToD50(p0, p1, p2);
    }
    throw new Error('Invalid color space');
  }

  #getRGBArray(withAlpha: true): Color4DOr3D;
  #getRGBArray(withAlpha: false): Color3D;
  #getRGBArray(withAlpha: boolean = true): Color4DOr3D|Color3D {
    // With color(), out-of-gamut inputs are to be used for intermediate computations
    const [p0, p1, p2] = this.#rawParams;
    const params: Color3D =
        this.colorSpace === Format.SRGB ? [p0, p1, p2] : [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50())];
    if (withAlpha) {
      return [...params, this.alpha ?? undefined];
    }
    return params;
  }

  constructor(
      colorSpace: ColorSpace, p0: number, p1: number, p2: number, alpha: number|null, authoredText?: string|undefined) {
    this.#rawParams = [p0, p1, p2];
    this.colorSpace = colorSpace;
    this.#authoredText = authoredText;
    if (this.colorSpace !== Format.XYZ_D50 && this.colorSpace !== Format.XYZ_D65 && this.colorSpace !== Format.XYZ) {
      p0 = clamp(p0, {min: 0, max: 1});
      p1 = clamp(p1, {min: 0, max: 1});
      p2 = clamp(p2, {min: 0, max: 1});
    }

    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    this.alpha = clamp(alpha, {min: 0, max: 1});
  }
  asLegacyColor(): Legacy {
    return this.as(Format.RGBA);
  }
  is<T extends Format>(format: T): this is ReturnType<ColorConversions[T]> {
    return format === this.format();
  }
  as<T extends Format>(format: T): ReturnType<ColorConversions[T]> {
    if (this.colorSpace === format) {
      return this as ReturnType<ColorConversions[T]>;
    }
    return ColorFunction.#conversions[format](this) as ReturnType<ColorConversions[T]>;
  }
  equal(color: Color): boolean {
    const space = color.as(this.colorSpace);
    return equals(this.p0, space.p0) && equals(this.p1, space.p1) && equals(this.p2, space.p2) &&
        equals(this.alpha, space.alpha);
  }
  format(): Format {
    return this.colorSpace;
  }
  setAlpha(alpha: number): Color {
    return new ColorFunction(this.colorSpace, this.p0, this.p1, this.p2, alpha);
  }
  asString(format?: Format): string {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.p0, this.p1, this.p2);
  }
  #stringify(p0: number, p1: number, p2: number): string {
    const alpha = this.alpha === null || equals(this.alpha, 1) ?
        '' :
        ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `color(${this.colorSpace} ${Platform.StringUtilities.stringifyWithPrecision(p0)} ${
        Platform.StringUtilities.stringifyWithPrecision(
            p1)} ${Platform.StringUtilities.stringifyWithPrecision(p2)}${alpha})`;
  }
  getAuthoredText(): string|null {
    return this.#authoredText ?? null;
  }

  getRawParameters(): Color3D {
    return [...this.#rawParams];
  }
  getAsRawString(format?: Format): string {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped(): boolean {
    if (this.colorSpace !== Format.XYZ_D50 && this.colorSpace !== Format.XYZ_D65 && this.colorSpace !== Format.XYZ) {
      return !equals(this.#rawParams, [this.p0, this.p1, this.p2]);
    }
    return false;
  }

  /**
   * Parses given `color()` function definition and returns the `Color` object.
   * We want to special case its parsing here because it's a bit different
   * than other color functions: rgb, lch etc. accepts 3 arguments with
   * optional alpha. This accepts 4 arguments with optional alpha.
   *
   * Instead of making `splitColorFunctionParameters` work for this case too
   * I've decided to implement it specifically.
   * @param authoredText Original definition of the color with `color`
   * @param parametersText Inside of the `color()` function. ex, `display-p3 0.1 0.2 0.3 / 0%`
   * @returns `Color` object
   */
  static fromSpec(authoredText: string, parametersWithAlphaText: string): ColorFunction|null {
    const [parametersText, alphaText] = parametersWithAlphaText.split('/', 2);
    const parameters = parametersText.trim().split(/\s+/);
    const [colorSpaceText, ...remainingParams] = parameters;
    const colorSpace = getColorSpace(colorSpaceText);
    // Color space is not known to us, do not parse the Color.
    if (!colorSpace) {
      return null;
    }

    // `color(<color-space>)` is a valid syntax
    if (remainingParams.length === 0 && alphaText === undefined) {
      return new ColorFunction(colorSpace, 0, 0, 0, null, authoredText);
    }

    // Check if it contains `/ <alpha>` part, if so, it should be at the end
    if (remainingParams.length === 0 && alphaText !== undefined && alphaText.trim().split(/\s+/).length > 1) {
      // Invalid syntax: like `color(<space> / <alpha> <number>)`
      return null;
    }

    // `color` cannot contain more than 3 parameters without alpha
    if (remainingParams.length > 3) {
      return null;
    }

    // Replace `none`s with 0s
    const nonesReplacedParams = remainingParams.map(param => param === 'none' ? '0' : param);

    // At this point, we know that all the values are there so we can
    // safely try to parse all the values as number or percentage
    const values = nonesReplacedParams.map(param => parsePercentOrNumber(param, [0, 1]));
    const containsNull = values.includes(null);
    // At least one value is malformatted (not a number or percentage)
    if (containsNull) {
      return null;
    }

    const alphaValue = alphaText ? parsePercentOrNumber(alphaText, [0, 1]) ?? 1 : 1;

    // Depending on the color space
    // this either reflects `rgb` parameters in that color space
    // or `xyz` parameters in the given `xyz` space.
    const rgbOrXyza: Color4D = [
      values[0] ?? 0,
      values[1] ?? 0,
      values[2] ?? 0,
      alphaValue,
    ];

    return new ColorFunction(colorSpace, ...rgbOrXyza, authoredText);
  }
}

export class HSL implements Color {
  readonly h: number;
  readonly s: number;
  readonly l: number;
  readonly alpha: number|null;
  readonly #rawParams: Color3D;
  #authoredText: string|undefined;

  static readonly #conversions: ColorConversions<HSL> = {
    [Format.HEX]: (self: HSL) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.HEX),
    [Format.HEXA]: (self: HSL) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.HEXA),
    [Format.RGB]: (self: HSL) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.RGB),
    [Format.RGBA]: (self: HSL) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.RGBA),
    [Format.HSL]: (self: HSL) => self,
    [Format.HSLA]: (self: HSL) => self,
    [Format.HWB]: (self: HSL) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWBA]: (self: HSL) => new HWB(...rgbToHwb(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.LCH]: (self: HSL) =>
        new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [Format.OKLCH]: (self: HSL) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [Format.LAB]: (self: HSL) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [Format.OKLAB]: (self: HSL) =>
        new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),

    [Format.SRGB]: (self: HSL) =>
        new ColorFunction(Format.SRGB, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [Format.SRGB_LINEAR]: (self: HSL) =>
        new ColorFunction(Format.SRGB_LINEAR, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [Format.DISPLAY_P3]: (self: HSL) =>
        new ColorFunction(Format.DISPLAY_P3, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [Format.A98_RGB]: (self: HSL) =>
        new ColorFunction(Format.A98_RGB, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [Format.PROPHOTO_RGB]: (self: HSL) =>
        new ColorFunction(Format.PROPHOTO_RGB, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [Format.REC_2020]: (self: HSL) =>
        new ColorFunction(Format.REC_2020, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [Format.XYZ]: (self: HSL) =>
        new ColorFunction(Format.XYZ, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [Format.XYZ_D50]: (self: HSL) => new ColorFunction(Format.XYZ_D50, ...self.#toXyzd50(), self.alpha),
    [Format.XYZ_D65]: (self: HSL) =>
        new ColorFunction(Format.XYZ_D65, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
  };

  #getRGBArray(withAlpha: true): Color4DOr3D;
  #getRGBArray(withAlpha: false): Color3D;
  #getRGBArray(withAlpha: boolean = true): Color4DOr3D|Color3D {
    const rgb = hsl2rgb([this.h, this.s, this.l, 0]);
    if (withAlpha) {
      return [rgb[0], rgb[1], rgb[2], this.alpha ?? undefined];
    }
    return [rgb[0], rgb[1], rgb[2]];
  }

  #toXyzd50(): Color3D {
    const rgb = this.#getRGBArray(false);
    return ColorConverter.srgbToXyzd50(rgb[0], rgb[1], rgb[2]);
  }

  constructor(h: number, s: number, l: number, alpha: number|null|undefined, authoredText?: string) {
    this.#rawParams = [h, s, l];
    this.l = clamp(l, {min: 0, max: 1});
    s = equals(this.l, 0) || equals(this.l, 1) ? 0 : s;
    this.s = clamp(s, {min: 0, max: 1});
    h = equals(this.s, 0) ? 0 : h;
    this.h = normalizeHue(h * 360) / 360;
    this.alpha = clamp(alpha ?? null, {min: 0, max: 1});
    this.#authoredText = authoredText;
  }

  equal(color: Color): boolean {
    const hsl = color.as(Format.HSL);
    return equals(this.h, hsl.h) && equals(this.s, hsl.s) && equals(this.l, hsl.l) && equals(this.alpha, hsl.alpha);
  }
  asString(format?: Format|undefined): string {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.h, this.s, this.l);
  }
  #stringify(h: number, s: number, l: number): string {
    const start = Platform.StringUtilities.sprintf(
        'hsl(%sdeg %s% %s%', Platform.StringUtilities.stringifyWithPrecision(h * 360),
        Platform.StringUtilities.stringifyWithPrecision(s * 100),
        Platform.StringUtilities.stringifyWithPrecision(l * 100));
    if (this.alpha !== null && this.alpha !== 1) {
      return start +
          Platform.StringUtilities.sprintf(
              ' / %s%)', Platform.StringUtilities.stringifyWithPrecision(this.alpha * 100));
    }
    return start + ')';
  }
  setAlpha(alpha: number): HSL {
    return new HSL(this.h, this.s, this.l, alpha);
  }
  format(): Format {
    return this.alpha === null || this.alpha === 1 ? Format.HSL : Format.HSLA;
  }
  is<T extends Format>(format: T): this is ReturnType<ColorConversions[T]> {
    return format === this.format();
  }
  as<T extends Format>(format: T): ReturnType<ColorConversions[T]> {
    if (format === this.format()) {
      return this as ReturnType<ColorConversions[T]>;
    }
    return HSL.#conversions[format](this) as ReturnType<ColorConversions[T]>;
  }
  asLegacyColor(): Legacy {
    return this.as(Format.RGBA);
  }
  getAuthoredText(): string|null {
    return this.#authoredText ?? null;
  }
  getRawParameters(): Color3D {
    return [...this.#rawParams];
  }
  getAsRawString(format?: Format): string {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped(): boolean {
    return !lessOrEquals(this.#rawParams[1], 1) || !lessOrEquals(0, this.#rawParams[1]);
  }

  static fromSpec(spec: ColorParameterSpec, text: string): HSL|null {
    const h = parseHueNumeric(spec[0]);
    if (h === null) {
      return null;
    }
    const s = parseSatLightNumeric(spec[1]);
    if (s === null) {
      return null;
    }
    const l = parseSatLightNumeric(spec[2]);
    if (l === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);

    return new HSL(h, s, l, alpha, text);
  }

  hsva(): Color4D {
    const s = this.s * (this.l < 0.5 ? this.l : 1 - this.l);
    return [this.h, s !== 0 ? 2 * s / (this.l + s) : 0, (this.l + s), this.alpha ?? 1];
  }
  canonicalHSLA(): number[] {
    return [Math.round(this.h * 360), Math.round(this.s * 100), Math.round(this.l * 100), this.alpha ?? 1];
  }
}
export class HWB implements Color {
  readonly h: number;
  readonly w: number;
  readonly b: number;
  readonly alpha: number|null;
  readonly #rawParams: Color3D;
  #authoredText: string|undefined;

  static readonly #conversions: ColorConversions<HWB> = {
    [Format.HEX]: (self: HWB) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.HEX),
    [Format.HEXA]: (self: HWB) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.HEXA),
    [Format.RGB]: (self: HWB) => new Legacy(self.#getRGBArray(/* withAlpha= */ false), Format.RGB),
    [Format.RGBA]: (self: HWB) => new Legacy(self.#getRGBArray(/* withAlpha= */ true), Format.RGBA),
    [Format.HSL]: (self: HWB) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HSLA]: (self: HWB) => new HSL(...rgbToHsl(self.#getRGBArray(/* withAlpha= */ false)), self.alpha),
    [Format.HWB]: (self: HWB) => self,
    [Format.HWBA]: (self: HWB) => self,
    [Format.LCH]: (self: HWB) =>
        new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [Format.OKLCH]: (self: HWB) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [Format.LAB]: (self: HWB) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [Format.OKLAB]: (self: HWB) =>
        new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),

    [Format.SRGB]: (self: HWB) =>
        new ColorFunction(Format.SRGB, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [Format.SRGB_LINEAR]: (self: HWB) =>
        new ColorFunction(Format.SRGB_LINEAR, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [Format.DISPLAY_P3]: (self: HWB) =>
        new ColorFunction(Format.DISPLAY_P3, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [Format.A98_RGB]: (self: HWB) =>
        new ColorFunction(Format.A98_RGB, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [Format.PROPHOTO_RGB]: (self: HWB) =>
        new ColorFunction(Format.PROPHOTO_RGB, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [Format.REC_2020]: (self: HWB) =>
        new ColorFunction(Format.REC_2020, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [Format.XYZ]: (self: HWB) =>
        new ColorFunction(Format.XYZ, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [Format.XYZ_D50]: (self: HWB) => new ColorFunction(Format.XYZ_D50, ...self.#toXyzd50(), self.alpha),
    [Format.XYZ_D65]: (self: HWB) =>
        new ColorFunction(Format.XYZ_D65, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
  };

  #getRGBArray(withAlpha: true): Color4DOr3D;
  #getRGBArray(withAlpha: false): Color3D;
  #getRGBArray(withAlpha: boolean = true): Color4DOr3D|Color3D {
    const rgb = hwb2rgb([this.h, this.w, this.b, 0]);
    if (withAlpha) {
      return [rgb[0], rgb[1], rgb[2], this.alpha ?? undefined];
    }
    return [rgb[0], rgb[1], rgb[2]];
  }

  #toXyzd50(): Color3D {
    const rgb = this.#getRGBArray(false);
    return ColorConverter.srgbToXyzd50(rgb[0], rgb[1], rgb[2]);
  }
  constructor(h: number, w: number, b: number, alpha: number|null, authoredText?: string) {
    this.#rawParams = [h, w, b];
    this.w = clamp(w, {min: 0, max: 1});
    this.b = clamp(b, {min: 0, max: 1});
    h = lessOrEquals(1, this.w + this.b) ? 0 : h;
    this.h = normalizeHue(h * 360) / 360;
    this.alpha = clamp(alpha, {min: 0, max: 1});
    if (lessOrEquals(1, this.w + this.b)) {
      // normalize to a sum of 100% respecting the ratio, see https://www.w3.org/TR/css-color-4/#the-hwb-notation
      const ratio = this.w / this.b;
      this.b = 1 / (1 + ratio);
      this.w = 1 - this.b;
    }
    this.#authoredText = authoredText;
  }
  equal(color: Color): boolean {
    const hwb = color.as(Format.HWB);
    return equals(this.h, hwb.h) && equals(this.w, hwb.w) && equals(this.b, hwb.b) && equals(this.alpha, hwb.alpha);
  }
  asString(format?: Format|undefined): string {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.h, this.w, this.b);
  }
  #stringify(h: number, w: number, b: number): string {
    const start = Platform.StringUtilities.sprintf(
        'hwb(%sdeg %s% %s%', Platform.StringUtilities.stringifyWithPrecision(h * 360),
        Platform.StringUtilities.stringifyWithPrecision(w * 100),
        Platform.StringUtilities.stringifyWithPrecision(b * 100));
    if (this.alpha !== null && this.alpha !== 1) {
      return start +
          Platform.StringUtilities.sprintf(
              ' / %s%)', Platform.StringUtilities.stringifyWithPrecision(this.alpha * 100));
    }
    return start + ')';
  }
  setAlpha(alpha: number): HWB {
    return new HWB(this.h, this.w, this.b, alpha, this.#authoredText);
  }
  format(): Format {
    return this.alpha !== null && !equals(this.alpha, 1) ? Format.HWBA : Format.HWB;
  }
  is<T extends Format>(format: T): this is ReturnType<ColorConversions[T]> {
    return format === this.format();
  }
  as<T extends Format>(format: T): ReturnType<ColorConversions[T]> {
    if (format === this.format()) {
      return this as ReturnType<ColorConversions[T]>;
    }
    return HWB.#conversions[format](this) as ReturnType<ColorConversions[T]>;
  }
  asLegacyColor(): Legacy {
    return this.as(Format.RGBA);
  }
  getAuthoredText(): string|null {
    return this.#authoredText ?? null;
  }

  canonicalHWBA(): number[] {
    return [
      Math.round(this.h * 360),
      Math.round(this.w * 100),
      Math.round(this.b * 100),
      this.alpha ?? 1,
    ];
  }
  getRawParameters(): Color3D {
    return [...this.#rawParams];
  }
  getAsRawString(format?: Format): string {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped(): boolean {
    return !lessOrEquals(this.#rawParams[1], 1) || !lessOrEquals(0, this.#rawParams[1]) ||
        !lessOrEquals(this.#rawParams[2], 1) || !lessOrEquals(0, this.#rawParams[2]);
  }

  static fromSpec(spec: ColorParameterSpec, text: string): HWB|null {
    const h = parseHueNumeric(spec[0]);
    if (h === null) {
      return null;
    }
    const w = parseSatLightNumeric(spec[1]);
    if (w === null) {
      return null;
    }
    const b = parseSatLightNumeric(spec[2]);
    if (b === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]);
    return new HWB(h, w, b, alpha, text);
  }
}

type LegacyColor = Format.HEX|Format.HEXA|Format.RGB|Format.RGBA;

function toRgbValue(value: number): number {
  return Math.round(value * 255);
}

abstract class ShortFormatColorBase implements Color {
  protected readonly color: Legacy;
  constructor(color: Legacy) {
    this.color = color;
  }
  get alpha(): number|null {
    return this.color.alpha;
  }
  equal(color: Color): boolean {
    return this.color.equal(color);
  }
  setAlpha(alpha: number): Color {
    return this.color.setAlpha(alpha);
  }
  format(): Format {
    return (this.alpha ?? 1) !== 1 ? Format.HEXA : Format.HEX;
  }
  as<T extends Format>(format: T): ReturnType<ColorConversions<void>[T]> {
    return this.color.as(format);
  }
  is<T extends Format>(format: T): this is ReturnType<ColorConversions<void>[T]> {
    return this.color.is(format);
  }
  asLegacyColor(): Legacy {
    return this.color.asLegacyColor();
  }
  getAuthoredText(): string|null {
    return this.color.getAuthoredText();
  }
  getRawParameters(): Color3D {
    return this.color.getRawParameters();
  }
  isGamutClipped(): boolean {
    return this.color.isGamutClipped();
  }
  asString(format?: Format|undefined): string {
    if (format) {
      return this.as(format).asString();
    }
    const [r, g, b] = this.color.rgba();
    return this.stringify(r, g, b);
  }
  getAsRawString(format?: Format): string {
    if (format) {
      return this.as(format).getAsRawString();
    }
    const [r, g, b] = this.getRawParameters();
    return this.stringify(r, g, b);
  }

  protected abstract stringify(r: number, g: number, b: number): string;
}

export class ShortHex extends ShortFormatColorBase {
  override setAlpha(alpha: number): Color {
    return new ShortHex(this.color.setAlpha(alpha));
  }

  override asString(format?: Format|undefined): string {
    return format && format !== this.format() ? super.as(format).asString() : super.asString();
  }

  protected override stringify(r: number, g: number, b: number): string {
    function toShortHexValue(value: number): string {
      return (Math.round(value * 255) / 17).toString(16);
    }

    if (this.color.hasAlpha()) {
      return Platform.StringUtilities
          .sprintf(
              '#%s%s%s%s', toShortHexValue(r), toShortHexValue(g), toShortHexValue(b), toShortHexValue(this.alpha ?? 1))
          .toLowerCase();
    }
    return Platform.StringUtilities.sprintf('#%s%s%s', toShortHexValue(r), toShortHexValue(g), toShortHexValue(b))
        .toLowerCase();
  }
}

export class Nickname extends ShortFormatColorBase {
  readonly nickname: string;
  constructor(nickname: string, color: Legacy) {
    super(color);
    this.nickname = nickname;
  }

  static fromName(name: string, text: string): Nickname|null {
    const nickname = name.toLowerCase();
    const rgba = Nicknames.get(nickname);
    if (rgba !== undefined) {
      return new Nickname(nickname, Legacy.fromRGBA(rgba, text));
    }
    return null;
  }

  protected override stringify(): string {
    return this.nickname;
  }

  override getAsRawString(format?: Format|undefined): string {
    return this.color.getAsRawString(format);
  }
}

export class Legacy implements Color {
  readonly #rawParams: Color3D;
  #rgbaInternal: Color4D;
  readonly #authoredText: string|null;
  #formatInternal: LegacyColor;

  static readonly #conversions: ColorConversions<Legacy> = {
    [Format.HEX]: (self: Legacy) => new Legacy(self.#rgbaInternal, Format.HEX),
    [Format.HEXA]: (self: Legacy) => new Legacy(self.#rgbaInternal, Format.HEXA),
    [Format.RGB]: (self: Legacy) => new Legacy(self.#rgbaInternal, Format.RGB),
    [Format.RGBA]: (self: Legacy) => new Legacy(self.#rgbaInternal, Format.RGBA),
    [Format.HSL]: (self: Legacy) =>
        new HSL(...rgbToHsl([self.#rgbaInternal[0], self.#rgbaInternal[1], self.#rgbaInternal[2]]), self.alpha),
    [Format.HSLA]: (self: Legacy) =>
        new HSL(...rgbToHsl([self.#rgbaInternal[0], self.#rgbaInternal[1], self.#rgbaInternal[2]]), self.alpha),
    [Format.HWB]: (self: Legacy) =>
        new HWB(...rgbToHwb([self.#rgbaInternal[0], self.#rgbaInternal[1], self.#rgbaInternal[2]]), self.alpha),
    [Format.HWBA]: (self: Legacy) =>
        new HWB(...rgbToHwb([self.#rgbaInternal[0], self.#rgbaInternal[1], self.#rgbaInternal[2]]), self.alpha),
    [Format.LCH]: (self: Legacy) =>
        new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    [Format.OKLCH]: (self: Legacy) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    [Format.LAB]: (self: Legacy) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    [Format.OKLAB]: (self: Legacy) =>
        new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    [Format.SRGB]: (self: Legacy) =>
        new ColorFunction(Format.SRGB, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    [Format.SRGB_LINEAR]: (self: Legacy) =>
        new ColorFunction(Format.SRGB_LINEAR, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    [Format.DISPLAY_P3]: (self: Legacy) =>
        new ColorFunction(Format.DISPLAY_P3, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    [Format.A98_RGB]: (self: Legacy) =>
        new ColorFunction(Format.A98_RGB, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    [Format.PROPHOTO_RGB]: (self: Legacy) =>
        new ColorFunction(Format.PROPHOTO_RGB, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    [Format.REC_2020]: (self: Legacy) =>
        new ColorFunction(Format.REC_2020, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    [Format.XYZ]: (self: Legacy) =>
        new ColorFunction(Format.XYZ, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    [Format.XYZ_D50]: (self: Legacy) => new ColorFunction(Format.XYZ_D50, ...self.#toXyzd50(), self.alpha),
    [Format.XYZ_D65]: (self: Legacy) =>
        new ColorFunction(Format.XYZ_D65, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
  };

  #toXyzd50(): Color3D {
    const [r, g, b] = this.#rgbaInternal;
    return ColorConverter.srgbToXyzd50(r, g, b);
  }

  get alpha(): number|null {
    switch (this.format()) {
      case Format.HEXA:
      case Format.RGBA:
        return this.#rgbaInternal[3];
      default:
        return null;
    }
  }

  asLegacyColor(): Legacy {
    return this;
  }

  nickname(): Nickname|null {
    const nickname = RGBAToNickname.get(String(this.canonicalRGBA()));
    return nickname ? new Nickname(nickname, this) : null;
  }

  shortHex(): ShortHex|null {
    for (let i = 0; i < 4; ++i) {
      const c = Math.round(this.#rgbaInternal[i] * 255);
      // Check if the two digits of each are identical: #aabbcc => #abc
      if (c % 0x11) {
        return null;
      }
    }
    return new ShortHex(this);
  }

  constructor(rgba: Color3D|Color4DOr3D, format: LegacyColor, authoredText?: string) {
    this.#authoredText = authoredText || null;
    this.#formatInternal = format;
    this.#rawParams = [rgba[0], rgba[1], rgba[2]];

    this.#rgbaInternal = [
      clamp(rgba[0], {min: 0, max: 1}),
      clamp(rgba[1], {min: 0, max: 1}),
      clamp(rgba[2], {min: 0, max: 1}),
      clamp(rgba[3] ?? 1, {min: 0, max: 1}),
    ];
  }

  static fromHex(hex: string, text: string): Legacy|ShortHex {
    hex = hex.toLowerCase();
    // Possible hex representations with alpha are fffA and ffffffAA
    const hasAlpha = hex.length === 4 || hex.length === 8;
    const format = hasAlpha ? Format.HEXA : Format.HEX;
    const isShort = hex.length <= 4;
    if (isShort) {
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2) +
          hex.charAt(3) + hex.charAt(3);
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    let a = 1;
    if (hex.length === 8) {
      a = parseInt(hex.substring(6, 8), 16) / 255;
    }
    const color = new Legacy([r / 255, g / 255, b / 255, a], format, text);
    return isShort ? new ShortHex(color) : color;
  }

  static fromRGBAFunction(r: string, g: string, b: string, alpha: string|undefined, text: string): Legacy|null {
    const rgba = [
      parseRgbNumeric(r),
      parseRgbNumeric(g),
      parseRgbNumeric(b),
      alpha ? parseAlphaNumeric(alpha) : 1,
    ];

    if (!Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined(rgba)) {
      return null;
    }
    return new Legacy(rgba as Color4D, alpha ? Format.RGBA : Format.RGB, text);
  }

  static fromRGBA(rgba: number[], authoredText?: string): Legacy {
    return new Legacy([rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3]], Format.RGBA, authoredText);
  }

  static fromHSVA(hsva: Color4D): Legacy {
    const rgba = hsva2rgba(hsva);
    return new Legacy(rgba, Format.RGBA);
  }

  is<T extends Format>(format: T): this is ReturnType<ColorConversions[T]> {
    return format === this.format();
  }
  as<T extends Format>(format: T): ReturnType<ColorConversions[T]> {
    if (format === this.format()) {
      return this as ReturnType<ColorConversions[T]>;
    }
    return Legacy.#conversions[format](this) as ReturnType<ColorConversions[T]>;
  }

  format(): LegacyColor {
    return this.#formatInternal;
  }

  hasAlpha(): boolean {
    return this.#rgbaInternal[3] !== 1;
  }

  detectHEXFormat(): Format {
    const hasAlpha = this.hasAlpha();
    return hasAlpha ? Format.HEXA : Format.HEX;
  }

  asString(format?: Format): string {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(format, this.#rgbaInternal[0], this.#rgbaInternal[1], this.#rgbaInternal[2]);
  }
  #stringify(format: LegacyColor|undefined, r: number, g: number, b: number): string {
    if (!format) {
      format = this.#formatInternal;
    }

    function toHexValue(value: number): string {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }

    switch (format) {
      case Format.RGB:
      case Format.RGBA: {
        const start = Platform.StringUtilities.sprintf('rgb(%d %d %d', toRgbValue(r), toRgbValue(g), toRgbValue(b));
        if (this.hasAlpha()) {
          return start + Platform.StringUtilities.sprintf(' / %d%)', Math.round(this.#rgbaInternal[3] * 100));
        }
        return start + ')';
      }
      case Format.HEX:
      case Format.HEXA: {
        if (this.hasAlpha()) {
          return Platform.StringUtilities
              .sprintf('#%s%s%s%s', toHexValue(r), toHexValue(g), toHexValue(b), toHexValue(this.#rgbaInternal[3]))
              .toLowerCase();
        }
        return Platform.StringUtilities.sprintf('#%s%s%s', toHexValue(r), toHexValue(g), toHexValue(b)).toLowerCase();
      }
    }
  }
  getAuthoredText(): string|null {
    return this.#authoredText ?? null;
  }

  getRawParameters(): Color3D {
    return [...this.#rawParams];
  }
  getAsRawString(format?: Format): string {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(format, ...this.#rawParams);
  }
  isGamutClipped(): boolean {
    return !equals(
        this.#rawParams.map(toRgbValue),
        [this.#rgbaInternal[0], this.#rgbaInternal[1], this.#rgbaInternal[2]].map(toRgbValue), WIDE_RANGE_EPSILON);
  }

  rgba(): Color4D {
    return [...this.#rgbaInternal];
  }

  canonicalRGBA(): Color4D {
    const rgba = new Array(4);
    for (let i = 0; i < 3; ++i) {
      rgba[i] = Math.round(this.#rgbaInternal[i] * 255);
    }
    rgba[3] = this.#rgbaInternal[3];
    return rgba as Color4D;
  }

  toProtocolRGBA(): {
    r: number,
    g: number,
    b: number,
    a: (number|undefined),
  } {
    const rgba = this.canonicalRGBA();
    const result: {
      r: number,
      g: number,
      b: number,
      a: number|undefined,
    } = {r: rgba[0], g: rgba[1], b: rgba[2], a: undefined};
    if (rgba[3] !== 1) {
      result.a = rgba[3];
    }
    return result;
  }

  invert(): Legacy {
    const rgba: Color4D = [0, 0, 0, 0];
    rgba[0] = 1 - this.#rgbaInternal[0];
    rgba[1] = 1 - this.#rgbaInternal[1];
    rgba[2] = 1 - this.#rgbaInternal[2];
    rgba[3] = this.#rgbaInternal[3];
    return new Legacy(rgba, Format.RGBA);
  }

  /**
   * Returns a new color using the NTSC formula for making a RGB color grayscale.
   * Note: this is ill-defined for colors with alpha, and alpha is not modified.
   */
  grayscale(): Legacy {
    const [r, g, b, a] = this.#rgbaInternal;
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    return new Legacy([gray, gray, gray, a], Format.RGBA);
  }

  setAlpha(alpha: number): Legacy {
    const rgba: Color4D = [...this.#rgbaInternal];
    rgba[3] = alpha;
    return new Legacy(rgba, Format.RGBA);
  }

  blendWith(fgColor: Legacy): Legacy {
    const rgba: Color4D = blendColors(fgColor.#rgbaInternal, this.#rgbaInternal);
    return new Legacy(rgba, Format.RGBA);
  }

  blendWithAlpha(alpha: number): Legacy {
    const rgba: Color4D = [...this.#rgbaInternal];
    rgba[3] *= alpha;
    return new Legacy(rgba, Format.RGBA);
  }

  setFormat(format: LegacyColor): void {
    this.#formatInternal = format;
  }

  equal(other: Color): boolean {
    const legacy = other.as(this.#formatInternal);
    return equals(toRgbValue(this.#rgbaInternal[0]), toRgbValue(legacy.#rgbaInternal[0]), WIDE_RANGE_EPSILON) &&
        equals(toRgbValue(this.#rgbaInternal[1]), toRgbValue(legacy.#rgbaInternal[1]), WIDE_RANGE_EPSILON) &&
        equals(toRgbValue(this.#rgbaInternal[2]), toRgbValue(legacy.#rgbaInternal[2]), WIDE_RANGE_EPSILON) &&
        equals(this.#rgbaInternal[3], legacy.#rgbaInternal[3]);
  }
}

export const Regex: RegExp =
    /((?:rgba?|hsla?|hwba?|lab|lch|oklab|oklch|color)\([^)]+\)|#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3,4}|\b[a-zA-Z]+\b(?!-))/g;
export const ColorMixRegex: RegExp = /color-mix\(.*,\s*(?<firstColor>.+)\s*,\s*(?<secondColor>.+)\s*\)/g;

const COLOR_TO_RGBA_ENTRIES: Array<readonly[string, number[]]> = [
  ['aliceblue', [240, 248, 255]],
  ['antiquewhite', [250, 235, 215]],
  ['aqua', [0, 255, 255]],
  ['aquamarine', [127, 255, 212]],
  ['azure', [240, 255, 255]],
  ['beige', [245, 245, 220]],
  ['bisque', [255, 228, 196]],
  ['black', [0, 0, 0]],
  ['blanchedalmond', [255, 235, 205]],
  ['blue', [0, 0, 255]],
  ['blueviolet', [138, 43, 226]],
  ['brown', [165, 42, 42]],
  ['burlywood', [222, 184, 135]],
  ['cadetblue', [95, 158, 160]],
  ['chartreuse', [127, 255, 0]],
  ['chocolate', [210, 105, 30]],
  ['coral', [255, 127, 80]],
  ['cornflowerblue', [100, 149, 237]],
  ['cornsilk', [255, 248, 220]],
  ['crimson', [237, 20, 61]],
  ['cyan', [0, 255, 255]],
  ['darkblue', [0, 0, 139]],
  ['darkcyan', [0, 139, 139]],
  ['darkgoldenrod', [184, 134, 11]],
  ['darkgray', [169, 169, 169]],
  ['darkgrey', [169, 169, 169]],
  ['darkgreen', [0, 100, 0]],
  ['darkkhaki', [189, 183, 107]],
  ['darkmagenta', [139, 0, 139]],
  ['darkolivegreen', [85, 107, 47]],
  ['darkorange', [255, 140, 0]],
  ['darkorchid', [153, 50, 204]],
  ['darkred', [139, 0, 0]],
  ['darksalmon', [233, 150, 122]],
  ['darkseagreen', [143, 188, 143]],
  ['darkslateblue', [72, 61, 139]],
  ['darkslategray', [47, 79, 79]],
  ['darkslategrey', [47, 79, 79]],
  ['darkturquoise', [0, 206, 209]],
  ['darkviolet', [148, 0, 211]],
  ['deeppink', [255, 20, 147]],
  ['deepskyblue', [0, 191, 255]],
  ['dimgray', [105, 105, 105]],
  ['dimgrey', [105, 105, 105]],
  ['dodgerblue', [30, 144, 255]],
  ['firebrick', [178, 34, 34]],
  ['floralwhite', [255, 250, 240]],
  ['forestgreen', [34, 139, 34]],
  ['fuchsia', [255, 0, 255]],
  ['gainsboro', [220, 220, 220]],
  ['ghostwhite', [248, 248, 255]],
  ['gold', [255, 215, 0]],
  ['goldenrod', [218, 165, 32]],
  ['gray', [128, 128, 128]],
  ['grey', [128, 128, 128]],
  ['green', [0, 128, 0]],
  ['greenyellow', [173, 255, 47]],
  ['honeydew', [240, 255, 240]],
  ['hotpink', [255, 105, 180]],
  ['indianred', [205, 92, 92]],
  ['indigo', [75, 0, 130]],
  ['ivory', [255, 255, 240]],
  ['khaki', [240, 230, 140]],
  ['lavender', [230, 230, 250]],
  ['lavenderblush', [255, 240, 245]],
  ['lawngreen', [124, 252, 0]],
  ['lemonchiffon', [255, 250, 205]],
  ['lightblue', [173, 216, 230]],
  ['lightcoral', [240, 128, 128]],
  ['lightcyan', [224, 255, 255]],
  ['lightgoldenrodyellow', [250, 250, 210]],
  ['lightgreen', [144, 238, 144]],
  ['lightgray', [211, 211, 211]],
  ['lightgrey', [211, 211, 211]],
  ['lightpink', [255, 182, 193]],
  ['lightsalmon', [255, 160, 122]],
  ['lightseagreen', [32, 178, 170]],
  ['lightskyblue', [135, 206, 250]],
  ['lightslategray', [119, 136, 153]],
  ['lightslategrey', [119, 136, 153]],
  ['lightsteelblue', [176, 196, 222]],
  ['lightyellow', [255, 255, 224]],
  ['lime', [0, 255, 0]],
  ['limegreen', [50, 205, 50]],
  ['linen', [250, 240, 230]],
  ['magenta', [255, 0, 255]],
  ['maroon', [128, 0, 0]],
  ['mediumaquamarine', [102, 205, 170]],
  ['mediumblue', [0, 0, 205]],
  ['mediumorchid', [186, 85, 211]],
  ['mediumpurple', [147, 112, 219]],
  ['mediumseagreen', [60, 179, 113]],
  ['mediumslateblue', [123, 104, 238]],
  ['mediumspringgreen', [0, 250, 154]],
  ['mediumturquoise', [72, 209, 204]],
  ['mediumvioletred', [199, 21, 133]],
  ['midnightblue', [25, 25, 112]],
  ['mintcream', [245, 255, 250]],
  ['mistyrose', [255, 228, 225]],
  ['moccasin', [255, 228, 181]],
  ['navajowhite', [255, 222, 173]],
  ['navy', [0, 0, 128]],
  ['oldlace', [253, 245, 230]],
  ['olive', [128, 128, 0]],
  ['olivedrab', [107, 142, 35]],
  ['orange', [255, 165, 0]],
  ['orangered', [255, 69, 0]],
  ['orchid', [218, 112, 214]],
  ['palegoldenrod', [238, 232, 170]],
  ['palegreen', [152, 251, 152]],
  ['paleturquoise', [175, 238, 238]],
  ['palevioletred', [219, 112, 147]],
  ['papayawhip', [255, 239, 213]],
  ['peachpuff', [255, 218, 185]],
  ['peru', [205, 133, 63]],
  ['pink', [255, 192, 203]],
  ['plum', [221, 160, 221]],
  ['powderblue', [176, 224, 230]],
  ['purple', [128, 0, 128]],
  ['rebeccapurple', [102, 51, 153]],
  ['red', [255, 0, 0]],
  ['rosybrown', [188, 143, 143]],
  ['royalblue', [65, 105, 225]],
  ['saddlebrown', [139, 69, 19]],
  ['salmon', [250, 128, 114]],
  ['sandybrown', [244, 164, 96]],
  ['seagreen', [46, 139, 87]],
  ['seashell', [255, 245, 238]],
  ['sienna', [160, 82, 45]],
  ['silver', [192, 192, 192]],
  ['skyblue', [135, 206, 235]],
  ['slateblue', [106, 90, 205]],
  ['slategray', [112, 128, 144]],
  ['slategrey', [112, 128, 144]],
  ['snow', [255, 250, 250]],
  ['springgreen', [0, 255, 127]],
  ['steelblue', [70, 130, 180]],
  ['tan', [210, 180, 140]],
  ['teal', [0, 128, 128]],
  ['thistle', [216, 191, 216]],
  ['tomato', [255, 99, 71]],
  ['turquoise', [64, 224, 208]],
  ['violet', [238, 130, 238]],
  ['wheat', [245, 222, 179]],
  ['white', [255, 255, 255]],
  ['whitesmoke', [245, 245, 245]],
  ['yellow', [255, 255, 0]],
  ['yellowgreen', [154, 205, 50]],
  ['transparent', [0, 0, 0, 0]],
];

console.assert(
    COLOR_TO_RGBA_ENTRIES.every(([nickname]) => nickname.toLowerCase() === nickname),
    'All color nicknames must be lowercase.');

export const Nicknames = new Map(COLOR_TO_RGBA_ENTRIES);

const RGBAToNickname = new Map(
    // Default opacity to 1 if the color only specified 3 channels
    COLOR_TO_RGBA_ENTRIES.map(([nickname, [r, g, b, a = 1]]) => {
      return [String([r, g, b, a]), nickname];
    }),
);

const LAYOUT_LINES_HIGHLIGHT_COLOR = [127, 32, 210];

export const PageHighlight = {
  Content: Legacy.fromRGBA([111, 168, 220, .66]),
  ContentLight: Legacy.fromRGBA([111, 168, 220, .5]),
  ContentOutline: Legacy.fromRGBA([9, 83, 148]),
  Padding: Legacy.fromRGBA([147, 196, 125, .55]),
  PaddingLight: Legacy.fromRGBA([147, 196, 125, .4]),
  Border: Legacy.fromRGBA([255, 229, 153, .66]),
  BorderLight: Legacy.fromRGBA([255, 229, 153, .5]),
  Margin: Legacy.fromRGBA([246, 178, 107, .66]),
  MarginLight: Legacy.fromRGBA([246, 178, 107, .5]),
  EventTarget: Legacy.fromRGBA([255, 196, 196, .66]),
  Shape: Legacy.fromRGBA([96, 82, 177, 0.8]),
  ShapeMargin: Legacy.fromRGBA([96, 82, 127, .6]),
  CssGrid: Legacy.fromRGBA([0x4b, 0, 0x82, 1]),
  LayoutLine: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 1]),
  GridBorder: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 1]),
  GapBackground: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, .3]),
  GapHatch: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, .8]),
  GridAreaBorder: Legacy.fromRGBA([26, 115, 232, 1]),
};

export const SourceOrderHighlight = {
  ParentOutline: Legacy.fromRGBA([224, 90, 183, 1]),
  ChildOutline: Legacy.fromRGBA([0, 120, 212, 1]),
};

export const IsolationModeHighlight = {
  Resizer: Legacy.fromRGBA([222, 225, 230, 1]),  // --color-background-elevation-2
  ResizerHandle: Legacy.fromRGBA([166, 166, 166, 1]),
  Mask: Legacy.fromRGBA([248, 249, 249, 1]),
};

type Space = number|{
  min: number,
  max: number,
  count: (number|undefined),
};

export class Generator {
  readonly #hueSpace: Space;
  readonly #satSpace: Space;
  readonly #lightnessSpace: Space;
  readonly #alphaSpace: Space;
  readonly #colors: Map<string, string>;
  constructor(hueSpace?: Space, satSpace?: Space, lightnessSpace?: Space, alphaSpace?: Space) {
    this.#hueSpace = hueSpace || {min: 0, max: 360, count: undefined};
    this.#satSpace = satSpace || 67;
    this.#lightnessSpace = lightnessSpace || 80;
    this.#alphaSpace = alphaSpace || 1;
    this.#colors = new Map();
  }

  setColorForID(id: string, color: string): void {
    this.#colors.set(id, color);
  }

  colorForID(id: string): string {
    let color = this.#colors.get(id);
    if (!color) {
      color = this.generateColorForID(id);
      this.#colors.set(id, color);
    }
    return color;
  }

  private generateColorForID(id: string): string {
    const hash = Platform.StringUtilities.hashCode(id);
    const h = this.indexToValueInSpace(hash, this.#hueSpace);
    const s = this.indexToValueInSpace(hash >> 8, this.#satSpace);
    const l = this.indexToValueInSpace(hash >> 16, this.#lightnessSpace);
    const a = this.indexToValueInSpace(hash >> 24, this.#alphaSpace);
    const start = `hsl(${h}deg ${s}% ${l}%`;
    if (a !== 1) {
      return `${start} / ${Math.floor(a * 100)}%)`;
    }
    return `${start})`;
  }

  private indexToValueInSpace(index: number, space: Space): number {
    if (typeof space === 'number') {
      return space;
    }
    const count = space.count || space.max - space.min;
    index %= count;
    return space.min + Math.floor(index / (count - 1) * (space.max - space.min));
  }
}
