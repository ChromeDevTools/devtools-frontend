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

import {
  adobeRGBToXyzd50,
  displayP3ToXyzd50,
  labToXyzd50,
  lchToLab,
  oklabToXyzd65,
  proPhotoToXyzd50,
  rec2020ToXyzd50,
  srgbLinearToXyzd50,
  xyzd50ToSrgb,
  xyzd65ToD50,
} from './ColorConverter.js';
import {
  blendColors,
  contrastRatioAPCA,
  desiredLuminanceAPCA,
  luminance,
  luminanceAPCA,
  rgbaToHsla,
  rgbaToHwba,
} from './ColorUtils.js';

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

// Returns the `ColorSpace` equivalent from the color space text
function getColorSpace(colorSpaceText: string): ColorSpace|null {
  // We need to assert that this is a string array for `includes` call to not complain
  if ((COLOR_SPACES_FOR_COLOR_FUNCTION as string[]).includes(colorSpaceText)) {
    return colorSpaceText as ColorSpace;
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

/**
 * Parses given `color()` function definition and returns the `Color` object.
 * We want to special case its parsing here because it's a bit different
 * than other color functions: rgb, lch etc. accepts 3 arguments with
 * optional alpha. This accepts 4 arguments with optional alpha.
 *
 * Instead of making `splitColorFunctionParameters` work for this case too
 * I've decided to implement it specifically.
 * @param originalText Original definition of the color with `color`
 * @param parametersText Inside of the `color()` function. ex, `display-p3 0.1 0.2 0.3 / 0%`
 * @returns `Color` object
 */
function parseColorFunction(originalText: string, parametersText: string): Color|null {
  const parameters = parametersText.trim().split(/\s+/);
  const [colorSpaceText, ...remainingParams] = parameters;
  const colorSpace = getColorSpace(colorSpaceText);
  // Color space is not known to us, do not parse the Color.
  if (!colorSpace) {
    return null;
  }

  // `color(<color-space>)` is a valid syntax
  if (remainingParams.length === 0) {
    return new ColorFunction(colorSpace, [0, 0, 0, undefined], originalText);
  }

  // Check if it contains `/ <alpha>` part, if so, it should be at the end
  const alphaSeparatorIndex = remainingParams.indexOf('/');
  const containsAlpha = alphaSeparatorIndex !== -1;
  if (containsAlpha && alphaSeparatorIndex !== remainingParams.length - 2) {
    // Invalid syntax: like `color(<space> / <alpha> <number>)`
    return null;
  }

  if (containsAlpha) {
    // Since we know that the last value is <alpha>
    // we can safely remove the alpha separator
    // and only leave the numbers (if given correctly)
    remainingParams.splice(alphaSeparatorIndex, 1);
  }

  // `color` cannot contain more than 4 parameters when there is alpha
  // and cannot contain more than 3 parameters when there isn't alpha
  const maxLength = containsAlpha ? 4 : 3;
  if (remainingParams.length > maxLength) {
    return null;
  }

  // Replace `none`s with 0s
  const nonesReplacesParams = remainingParams.map(param => param === 'none' ? '0' : param);

  // At this point, we know that all the values are there so we can
  // safely try to parse all the values as number or percentage
  const values = nonesReplacesParams.map(param => parsePercentOrNumber(param, [0, 1]));
  const containsNull = values.includes(null);
  // At least one value is malformatted (not a number or percentage)
  if (containsNull) {
    return null;
  }

  let alphaValue = 1;
  if (containsAlpha) {
    // We know that `alphaValue` exists at this point.
    // See the above lines for deciding on `containsAlpha`.
    alphaValue = values[values.length - 1] as number;
    // We get rid of the `alpha` from the list
    // so that all the values map to `r, g, b` from the start
    values.pop();
  }

  // Depending on the color space
  // this either reflects `rgb` parameters in that color space
  // or `xyz` parameters in the given `xyz` space.
  const rgbOrXyza: [number, number, number, number] = [
    values[0] ?? 0,
    values[1] ?? 0,
    values[2] ?? 0,
    alphaValue,
  ];

  return new ColorFunction(colorSpace, rgbOrXyza, originalText);
}

function canFormatBeWideGamut(format: Format): boolean {
  return POSSIBLE_WIDE_GAMUT_FORMATS.includes(format);
}

interface SplitColorFunctionParametersOptions {
  allowCommas: boolean;
  convertNoneToZero: boolean;
}

export function parse(text: string): Color|null {
  // Simple - #hex, nickname
  const value = text.toLowerCase().replace(/\s+/g, '');
  const simple = /^(?:#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(\w+))$/i;
  let match = value.match(simple);
  if (match) {
    if (match[1]) {
      return Legacy.fromHex(match[1], text);
    }

    if (match[2]) {
      return Legacy.fromName(match[2], text);
    }

    return null;
  }

  // rgb/rgba(), hsl/hsla(), hwb/hwba(), lch(), oklch(), lab(), oklab() and color()
  match = text.toLowerCase().match(/^\s*(?:(rgba?)|(hsla?)|(hwba?)|(lch)|(oklch)|(lab)|(oklab)|(color))\((.*)\)\s*$/);
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
      return parseColorFunction(text, valuesText);
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
      return Legacy.fromHSLA(values[0], values[1], values[2], values[3], text);
    }

    if (isHwbaMatch) {
      return Legacy.fromHWB(values[0], values[1], values[2], values[3], text);
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

function clamp(value: number|null, {min, max}: {min?: number, max?: number}): number|null {
  if (value === null) {
    return null;
  }
  if (min) {
    value = Math.max(value, min);
  }
  if (max) {
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

function parseHueNumeric(value: string): number|null {
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
  return Math.min(1, parsed / 100);
}

function parseAlphaNumeric(value: string): number|null {
  return parsePercentOrNumber(value);
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
function hsva2hsla(hsva: number[], out_hsla: number[]): void {
  const h = hsva[0];
  let s: 0|number = hsva[1];
  const v = hsva[2];

  const t = (2 - s) * v;
  if (v === 0 || s === 0) {
    s = 0;
  } else {
    s *= v / (t < 1 ? t : 2 - t);
  }

  out_hsla[0] = h;
  out_hsla[1] = s;
  out_hsla[2] = t / 2;
  out_hsla[3] = hsva[3];
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function hsl2rgb(hsl: number[], out_rgb: number[]): void {
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

  out_rgb[0] = hue2rgb(p, q, tr);
  out_rgb[1] = hue2rgb(p, q, tg);
  out_rgb[2] = hue2rgb(p, q, tb);
  out_rgb[3] = hsl[3];
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function hwb2rgb(hwb: number[], out_rgb: number[]): void {
  const h = hwb[0];
  const w = hwb[1];
  const b = hwb[2];

  if (w + b >= 1) {
    out_rgb[0] = out_rgb[1] = out_rgb[2] = w / (w + b);
    out_rgb[3] = hwb[3];
  } else {
    hsl2rgb([h, 1, 0.5, hwb[3]], out_rgb);
    for (let i = 0; i < 3; ++i) {
      out_rgb[i] += w - (w + b) * out_rgb[i];
    }
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function hsva2rgba(hsva: number[], out_rgba: number[]): void {
  const tmpHSLA = [0, 0, 0, 0];
  hsva2hsla(hsva, tmpHSLA);
  hsl2rgb(tmpHSLA, out_rgba);
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
    candidateHSVA: number[], bgRGBA: number[], index: number, desiredLuminance: number,
    candidateLuminance: (arg0: Array<number>) => number): number|null {
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
  const candidateHSVA = fgColor.hsva();
  const bgRGBA = bgColor.rgba();

  const candidateLuminance = (candidateHSVA: number[]): number => {
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
  const candidateHSVA = fgColor.hsva();
  const bgRGBA = bgColor.rgba();

  const candidateLuminance = (candidateHSVA: number[]): number => {
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

export interface Color {
  equal(color: Color): boolean;
  asString(format?: string): string|null;
  setAlpha(alpha: number): Color;
  format(): Format;
  asLegacyColor(): Legacy;
}

export class Lab implements Color {
  #l: number;
  #a: number;
  #b: number;
  #alpha: number;
  #text: string;
  constructor(l: number, a: number, b: number, alpha: number, text: string) {
    this.#l = l;
    this.#a = a;
    this.#b = b;
    this.#alpha = alpha;
    this.#text = text;
  }
  asLegacyColor(): Legacy {
    const srgb = FORMAT_TO_SRGB_CONVERTER[Format.LAB](this.#l, this.#a, this.#b);
    return new Legacy([...srgb, this.#alpha], Format.LAB, this.#text);
  }
  equal(color: Color): boolean {
    return this.asLegacyColor().equal(color.asLegacyColor());
  }
  format(): Format {
    return Format.LAB;
  }
  setAlpha(alpha: number): Color {
    return this.asLegacyColor().setAlpha(alpha);
  }
  asString(format: string): string|null {
    return this.asLegacyColor().asString(format);
  }

  static fromSpec(spec: ColorParameterSpec, text: string): Lab|null {
    const L = clamp(parsePercentage(spec[0], [0, 100]) ?? parseNumber(spec[0]), {min: 0, max: 100});
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
    const alpha = parseAlpha(spec[3]) ?? 1;

    return new Lab(L, a, b, alpha, text);
  }
}

export class LCH implements Color {
  #l: number;
  #c: number;
  #h: number;
  #alpha: number;
  #text: string;
  constructor(l: number, c: number, h: number, alpha: number, text: string) {
    this.#l = l;
    this.#c = c;
    this.#h = h;
    this.#alpha = alpha;
    this.#text = text;
  }
  asLegacyColor(): Legacy {
    const srgb = FORMAT_TO_SRGB_CONVERTER[Format.LCH](this.#l, this.#c, this.#h);
    return new Legacy([...srgb, this.#alpha], Format.LCH, this.#text);
  }
  equal(color: Color): boolean {
    return this.asLegacyColor().equal(color.asLegacyColor());
  }
  format(): Format {
    return Format.LCH;
  }
  setAlpha(alpha: number): Color {
    return this.asLegacyColor().setAlpha(alpha);
  }
  asString(format: string): string|null {
    return this.asLegacyColor().asString(format);
  }

  static fromSpec(spec: ColorParameterSpec, text: string): LCH|null {
    const L = clamp(parsePercentage(spec[0], [0, 100]) ?? parseNumber(spec[0]), {min: 0, max: 100});
    if (L === null) {
      return null;
    }
    const c = clamp(parsePercentage(spec[1], [0, 150]) ?? parseNumber(spec[1]), {min: 0});
    if (c === null) {
      return null;
    }
    const h = parseAngle(spec[2]);
    if (h === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]) ?? 1;

    return new LCH(L, c, h, alpha, text);
  }
}

export class Oklab implements Color {
  #l: number;
  #a: number;
  #b: number;
  #alpha: number;
  #text: string;
  constructor(l: number, a: number, b: number, alpha: number, text: string) {
    this.#l = l;
    this.#a = a;
    this.#b = b;
    this.#alpha = alpha;
    this.#text = text;
  }
  asLegacyColor(): Legacy {
    const srgb = FORMAT_TO_SRGB_CONVERTER[Format.OKLAB](this.#l, this.#a, this.#b);
    return new Legacy([...srgb, this.#alpha], Format.OKLAB, this.#text);
  }
  equal(color: Color): boolean {
    return this.asLegacyColor().equal(color.asLegacyColor());
  }
  format(): Format {
    return Format.OKLAB;
  }
  setAlpha(alpha: number): Color {
    return this.asLegacyColor().setAlpha(alpha);
  }
  asString(format: string): string|null {
    return this.asLegacyColor().asString(format);
  }

  static fromSpec(spec: ColorParameterSpec, text: string): Oklab|null {
    const L = clamp(parsePercentage(spec[0], [0, 1]) ?? parseNumber(spec[0]), {min: 0, max: 1});
    if (L === null) {
      return null;
    }
    const a = parsePercentage(spec[1], [0, 0.4]) ?? parseNumber(spec[1]);
    if (a === null) {
      return null;
    }
    const b = parsePercentage(spec[1], [0, 0.4]) ?? parseNumber(spec[1]);
    if (b === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]) ?? 1;

    return new Oklab(L, a, b, alpha, text);
  }
}

export class Oklch implements Color {
  #l: number;
  #c: number;
  #h: number;
  #alpha: number;
  #text: string;
  constructor(l: number, c: number, h: number, alpha: number, text: string) {
    this.#l = l;
    this.#c = c;
    this.#h = h;
    this.#alpha = alpha;
    this.#text = text;
  }
  asLegacyColor(): Legacy {
    const srgb = FORMAT_TO_SRGB_CONVERTER[Format.OKLCH](this.#l, this.#c, this.#h);
    return new Legacy([...srgb, this.#alpha], Format.OKLCH, this.#text);
  }
  equal(color: Color): boolean {
    return this.asLegacyColor().equal(color.asLegacyColor());
  }
  format(): Format {
    return Format.OKLCH;
  }
  setAlpha(alpha: number): Color {
    return this.asLegacyColor().setAlpha(alpha);
  }
  asString(format: string): string|null {
    return this.asLegacyColor().asString(format);
  }

  static fromSpec(spec: ColorParameterSpec, text: string): Oklch|null {
    const L = clamp(parsePercentage(spec[0], [0, 1]) ?? parseNumber(spec[0]), {min: 0, max: 1});
    if (L === null) {
      return null;
    }
    const c = clamp(parsePercentage(spec[1], [0, 0.4]) ?? parseNumber(spec[1]), {min: 0});
    if (c === null) {
      return null;
    }
    const h = parseAngle(spec[2]);
    if (h === null) {
      return null;
    }
    const alpha = parseAlpha(spec[3]) ?? 1;

    return new Oklch(L, c, h, alpha, text);
  }
}

export class ColorFunction implements Color {
  #spec: [number, number, number, number|undefined];
  #colorSpace: ColorSpace;
  #text: string;
  constructor(colorSpace: ColorSpace, rgbOrXyz: [number, number, number, number|undefined], text: string) {
    this.#colorSpace = colorSpace;
    this.#spec = rgbOrXyz;
    this.#text = text;
  }
  asLegacyColor(): Legacy {
    const [xr, yg, zb, alpha] = this.#spec;
    const srgb = COLOR_SPACE_TO_SRGB_CONVERTER[this.#colorSpace](xr, yg, zb);
    return new Legacy([...srgb, alpha ?? 1], Format.COLOR, this.#text);
  }
  equal(color: Color): boolean {
    return this.asLegacyColor().equal(color.asLegacyColor());
  }
  format(): Format {
    return Format.COLOR;
  }
  setAlpha(alpha: number): Color {
    return this.asLegacyColor().setAlpha(alpha);
  }
  asString(format: string): string|null {
    return this.asLegacyColor().asString(format);
  }
}

export class Legacy implements Color {
  #hslaInternal: number[]|undefined;
  #hwbaInternal: number[]|undefined;
  #rgbaInternal: number[];
  #originalText: string|null;
  readonly #originalTextIsValid: boolean;
  #formatInternal: Format;

  constructor(rgba: number[], format: Format, originalText?: string) {
    this.#hslaInternal = undefined;
    this.#hwbaInternal = undefined;
    this.#rgbaInternal = rgba;
    this.#originalText = originalText || null;
    this.#originalTextIsValid = Boolean(this.#originalText);
    this.#formatInternal = format;

    if (typeof this.#rgbaInternal[3] === 'undefined') {
      this.#rgbaInternal[3] = 1;
    }

    for (let i = 0; i < 4; ++i) {
      // Do not clamp formats that can result in wide-gamut colors
      if (this.#rgbaInternal[i] < 0 && !canFormatBeWideGamut(format)) {
        this.#rgbaInternal[i] = 0;
        this.#originalTextIsValid = false;
      }
      if (this.#rgbaInternal[i] > 1 && !canFormatBeWideGamut(format)) {
        this.#rgbaInternal[i] = 1;
        this.#originalTextIsValid = false;
      }
    }
  }

  static fromHex(hex: string, text: string): Legacy {
    hex = hex.toLowerCase();
    let format;
    if (hex.length === 3) {
      format = Format.ShortHEX;
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
    } else if (hex.length === 4) {
      format = Format.ShortHEXA;
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2) +
          hex.charAt(3) + hex.charAt(3);
    } else if (hex.length === 6) {
      format = Format.HEX;
    } else {
      format = Format.HEXA;
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    let a = 1;
    if (hex.length === 8) {
      a = parseInt(hex.substring(6, 8), 16) / 255;
    }
    return new Legacy([r / 255, g / 255, b / 255, a], format, text);
  }

  static fromName(name: string, text: string): Legacy|null {
    const nickname = name.toLowerCase();
    const rgba = Nicknames.get(nickname);
    if (rgba !== undefined) {
      const color = Legacy.fromRGBA(rgba);
      color.#formatInternal = Format.Nickname;
      color.#originalText = text;
      return color;
    }
    return null;
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
    return new Legacy(rgba, alpha ? Format.RGBA : Format.RGB, text);
  }

  static fromHSLA(h: string, s: string, l: string, alpha: string|undefined, text: string): Legacy|null {
    const parameters = [
      parseHueNumeric(h),
      parseSatLightNumeric(s),
      parseSatLightNumeric(l),
      alpha ? parseAlphaNumeric(alpha) : 1,
    ];
    if (!Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined(parameters)) {
      return null;
    }
    const rgba: number[] = [];
    hsl2rgb(parameters, rgba);
    return new Legacy(rgba, alpha ? Format.HSLA : Format.HSL, text);
  }

  static fromHWB(h: string, w: string, b: string, alpha: string|undefined, text: string): Legacy|null {
    const parameters = [
      parseHueNumeric(h),
      parseSatLightNumeric(w),
      parseSatLightNumeric(b),
      alpha ? parseAlphaNumeric(alpha) : 1,
    ];
    if (!Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined(parameters)) {
      return null;
    }
    const rgba: number[] = [];
    hwb2rgb(parameters, rgba);
    return new Legacy(rgba, alpha ? Format.HWBA : Format.HWB, text);
  }

  static fromRGBA(rgba: number[]): Legacy {
    return new Legacy([rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3]], Format.RGBA);
  }

  static fromHSVA(hsva: number[]): Legacy {
    const rgba: number[] = [];
    hsva2rgba(hsva, rgba);
    return new Legacy(rgba, Format.HSLA);
  }

  asLegacyColor(): Legacy {
    return this;
  }

  format(): Format {
    return this.#formatInternal;
  }

  canBeWideGamut(): boolean {
    return canFormatBeWideGamut(this.format());
  }

  /** HSLA with components within [0..1]
    */
  hsla(): number[] {
    if (this.#hslaInternal) {
      return this.#hslaInternal;
    }
    this.#hslaInternal = rgbaToHsla(this.#rgbaInternal);
    return this.#hslaInternal;
  }

  canonicalHSLA(): number[] {
    const hsla = this.hsla();
    return [Math.round(hsla[0] * 360), Math.round(hsla[1] * 100), Math.round(hsla[2] * 100), hsla[3]];
  }

  /** HSVA with components within [0..1]
    */
  hsva(): number[] {
    const hsla = this.hsla();
    const h = hsla[0];
    let s = hsla[1];
    const l = hsla[2];

    s *= l < 0.5 ? l : 1 - l;
    return [h, s !== 0 ? 2 * s / (l + s) : 0, (l + s), hsla[3]];
  }

  /** HWBA with components within [0..1]
    */
  hwba(): number[] {
    if (this.#hwbaInternal) {
      return this.#hwbaInternal;
    }
    this.#hwbaInternal = rgbaToHwba(this.#rgbaInternal);
    return this.#hwbaInternal;
  }

  canonicalHWBA(): number[] {
    const hwba = this.hwba();
    return [Math.round(hwba[0] * 360), Math.round(hwba[1] * 100), Math.round(hwba[2] * 100), hwba[3]];
  }

  hasAlpha(): boolean {
    return this.#rgbaInternal[3] !== 1;
  }

  detectHEXFormat(): Format {
    let canBeShort = true;
    for (let i = 0; i < 4; ++i) {
      const c = Math.round(this.#rgbaInternal[i] * 255);
      if (c % 17) {
        canBeShort = false;
        break;
      }
    }

    const hasAlpha = this.hasAlpha();
    const cf = Format;
    if (canBeShort) {
      return hasAlpha ? cf.ShortHEXA : cf.ShortHEX;
    }
    return hasAlpha ? cf.HEXA : cf.HEX;
  }

  asString(format?: string): string|null {
    // For now, we'll return always in `originalText` for wide gamut colors.
    // TODO(ergunsh): Handle conversions to different representations later.
    if (this.canBeWideGamut()) {
      return this.#originalText;
    }

    if (format === this.#formatInternal && this.#originalTextIsValid) {
      return this.#originalText;
    }

    if (!format) {
      format = this.#formatInternal;
    }

    function toRgbValue(value: number): number {
      return Math.round(value * 255);
    }

    function toHexValue(value: number): string {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }

    function toShortHexValue(value: number): string {
      return (Math.round(value * 255) / 17).toString(16);
    }

    switch (format) {
      case Format.Original: {
        return this.#originalText;
      }
      case Format.RGB:
      case Format.RGBA: {
        const start = Platform.StringUtilities.sprintf(
            'rgb(%d %d %d', toRgbValue(this.#rgbaInternal[0]), toRgbValue(this.#rgbaInternal[1]),
            toRgbValue(this.#rgbaInternal[2]));
        if (this.hasAlpha()) {
          return start + Platform.StringUtilities.sprintf(' / %d%)', Math.round(this.#rgbaInternal[3] * 100));
        }
        return start + ')';
      }
      case Format.HSL:
      case Format.HSLA: {
        const hsla = this.hsla();
        const start = Platform.StringUtilities.sprintf(
            'hsl(%ddeg %d% %d%', Math.round(hsla[0] * 360), Math.round(hsla[1] * 100), Math.round(hsla[2] * 100));
        if (this.hasAlpha()) {
          return start + Platform.StringUtilities.sprintf(' / %d%)', Math.round(hsla[3] * 100));
        }
        return start + ')';
      }
      case Format.HWB:
      case Format.HWBA: {
        const hwba = this.hwba();
        const start = Platform.StringUtilities.sprintf(
            'hwb(%ddeg %d% %d%', Math.round(hwba[0] * 360), Math.round(hwba[1] * 100), Math.round(hwba[2] * 100));
        if (this.hasAlpha()) {
          return start + Platform.StringUtilities.sprintf(' / %d%)', Math.round(hwba[3] * 100));
        }
        return start + ')';
      }
      case Format.HEXA: {
        return Platform.StringUtilities
            .sprintf(
                '#%s%s%s%s', toHexValue(this.#rgbaInternal[0]), toHexValue(this.#rgbaInternal[1]),
                toHexValue(this.#rgbaInternal[2]), toHexValue(this.#rgbaInternal[3]))
            .toLowerCase();
      }
      case Format.HEX: {
        if (this.hasAlpha()) {
          return null;
        }
        return Platform.StringUtilities
            .sprintf(
                '#%s%s%s', toHexValue(this.#rgbaInternal[0]), toHexValue(this.#rgbaInternal[1]),
                toHexValue(this.#rgbaInternal[2]))
            .toLowerCase();
      }
      case Format.ShortHEXA: {
        const hexFormat = this.detectHEXFormat();
        if (hexFormat !== Format.ShortHEXA && hexFormat !== Format.ShortHEX) {
          return null;
        }
        return Platform.StringUtilities
            .sprintf(
                '#%s%s%s%s', toShortHexValue(this.#rgbaInternal[0]), toShortHexValue(this.#rgbaInternal[1]),
                toShortHexValue(this.#rgbaInternal[2]), toShortHexValue(this.#rgbaInternal[3]))
            .toLowerCase();
      }
      case Format.ShortHEX: {
        if (this.hasAlpha()) {
          return null;
        }
        if (this.detectHEXFormat() !== Format.ShortHEX) {
          return null;
        }
        return Platform.StringUtilities
            .sprintf(
                '#%s%s%s', toShortHexValue(this.#rgbaInternal[0]), toShortHexValue(this.#rgbaInternal[1]),
                toShortHexValue(this.#rgbaInternal[2]))
            .toLowerCase();
      }
      case Format.Nickname: {
        return this.nickname();
      }
    }

    return this.#originalText;
  }

  rgba(): number[] {
    return this.#rgbaInternal.slice();
  }

  canonicalRGBA(): number[] {
    const rgba = new Array(4);
    for (let i = 0; i < 3; ++i) {
      rgba[i] = Math.round(this.#rgbaInternal[i] * 255);
    }
    rgba[3] = this.#rgbaInternal[3];
    return rgba;
  }

  /** nickname
     */
  nickname(): string|null {
    return RGBAToNickname.get(String(this.canonicalRGBA())) || null;
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
    const rgba = [];
    rgba[0] = 1 - this.#rgbaInternal[0];
    rgba[1] = 1 - this.#rgbaInternal[1];
    rgba[2] = 1 - this.#rgbaInternal[2];
    rgba[3] = this.#rgbaInternal[3];
    return new Legacy(rgba, Format.RGBA);
  }

  setAlpha(alpha: number): Legacy {
    const rgba = this.#rgbaInternal.slice();
    rgba[3] = alpha;
    return new Legacy(rgba, Format.RGBA);
  }

  blendWith(fgColor: Legacy): Legacy {
    const rgba: number[] = blendColors(fgColor.#rgbaInternal, this.#rgbaInternal);
    return new Legacy(rgba, Format.RGBA);
  }

  blendWithAlpha(alpha: number): Legacy {
    const rgba = this.#rgbaInternal.slice();
    rgba[3] *= alpha;
    return new Legacy(rgba, Format.RGBA);
  }

  setFormat(format: Format): void {
    this.#formatInternal = format;
  }

  equal(other: Legacy): boolean {
    return this.#rgbaInternal.every((v, i) => v === other.#rgbaInternal[i]) &&
        this.#formatInternal === other.#formatInternal;
  }
}

export const Regex: RegExp =
    /((?:rgba?|hsla?|hwba?|lab|lch|oklab|oklch|color)\([^)]+\)|#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3,4}|\b[a-zA-Z]+\b(?!-))/g;

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Format {
  Original = 'original',
  Nickname = 'nickname',
  HEX = 'hex',
  ShortHEX = 'shorthex',
  HEXA = 'hexa',
  ShortHEXA = 'shorthexa',
  RGB = 'rgb',
  RGBA = 'rgba',
  HSL = 'hsl',
  HSLA = 'hsla',
  HWB = 'hwb',
  HWBA = 'hwba',
  // Colors defined with 'lch()' function
  LCH = 'lch',
  // Colors defined with 'oklch()' function
  OKLCH = 'oklch',
  // Colors defined with 'lab()' function
  LAB = 'lab',
  // Colors defined with 'oklab()' function
  OKLAB = 'oklab',
  // Colors defined with 'color()' function
  COLOR = 'color',
}

// TODO(crbug.com/1167717): Make this a const enum
// eslint-disable-next-line rulesdir/const_enum
enum ColorSpace {
  SRGB = 'srgb',
  SRGB_LINEAR = 'srgb-linear',
  DISPLAY_P3 = 'display-p3',
  A98_RGB = 'a98-rgb',
  PROPHOTO_RGB = 'prophoto-rgb',
  REC_2020 = 'rec2020',
  // It's the same space with `xyz-d50`
  XYZ = 'xyz',
  XYZ_D50 = 'xyz-d50',
  XYZ_D65 = 'xyz-d65',
}

// Formats that the color defined in can be out-of-gamut of sRGB
const POSSIBLE_WIDE_GAMUT_FORMATS = [Format.LCH, Format.OKLCH, Format.LAB, Format.OKLAB, Format.COLOR];
// All the color spaces that can be specified in `color()` function.
const COLOR_SPACES_FOR_COLOR_FUNCTION = Object.values(ColorSpace);

// Converts from selected color space to sRGB
const COLOR_SPACE_TO_SRGB_CONVERTER:
    Record<ColorSpace, (param1: number, param2: number, param3: number) => [number, number, number]> = {
      [ColorSpace.SRGB]: (...params) => params,
      [ColorSpace.SRGB_LINEAR]: (r: number, g: number, b: number) => xyzd50ToSrgb(...srgbLinearToXyzd50(r, g, b)),
      [ColorSpace.DISPLAY_P3]: (r: number, g: number, b: number) => xyzd50ToSrgb(...displayP3ToXyzd50(r, g, b)),
      [ColorSpace.A98_RGB]: (r: number, g: number, b: number) => xyzd50ToSrgb(...adobeRGBToXyzd50(r, g, b)),
      [ColorSpace.PROPHOTO_RGB]: (r: number, g: number, b: number) => xyzd50ToSrgb(...proPhotoToXyzd50(r, g, b)),
      [ColorSpace.REC_2020]: (r: number, g: number, b: number) => xyzd50ToSrgb(...rec2020ToXyzd50(r, g, b)),
      [ColorSpace.XYZ]: (r: number, g: number, b: number) => xyzd50ToSrgb(...xyzd65ToD50(r, g, b)),
      [ColorSpace.XYZ_D50]: (r: number, g: number, b: number) => xyzd50ToSrgb(r, g, b),
      [ColorSpace.XYZ_D65]: (r: number, g: number, b: number) => xyzd50ToSrgb(...xyzd65ToD50(r, g, b)),
    };

// Converts from lch, lab etc. to sRGB
const FORMAT_TO_SRGB_CONVERTER: Record<
    Format.LCH|Format.LAB|Format.OKLCH|Format.OKLAB,
    (param1: number, param2: number, param3: number) => [number, number, number]> = {
  [Format.LCH]: (r: number, g: number, b: number) => xyzd50ToSrgb(...labToXyzd50(...lchToLab(r, g, b))),
  [Format.LAB]: (r: number, g: number, b: number) => xyzd50ToSrgb(...labToXyzd50(r, g, b)),
  [Format.OKLCH]: (r: number, g: number, b: number) =>
      xyzd50ToSrgb(...xyzd65ToD50(...oklabToXyzd65(...lchToLab(r, g, b)))),
  [Format.OKLAB]: (r: number, g: number, b: number) => xyzd50ToSrgb(...xyzd65ToD50(...oklabToXyzd65(r, g, b))),
};

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

Platform.DCHECK(() => {
  return COLOR_TO_RGBA_ENTRIES.every(([nickname]) => nickname.toLowerCase() === nickname);
}, 'All color nicknames must be lowercase.');

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

export class Generator {
  readonly #hueSpace: number|{
    min: number,
    max: number,
    count: (number|undefined),
  };
  readonly #satSpace: number|{
    min: number,
    max: number,
    count: (number|undefined),
  };
  readonly #lightnessSpace: number|{
    min: number,
    max: number,
    count: (number|undefined),
  };
  readonly #alphaSpace: number|{
    min: number,
    max: number,
    count: (number|undefined),
  };
  readonly #colors: Map<string, string>;
  constructor(
      hueSpace?: number|{
        min: number,
        max: number,
        count: (number|undefined),
      },
      satSpace?: number|{
        min: number,
        max: number,
        count: (number|undefined),
      },
      lightnessSpace?: number|{
        min: number,
        max: number,
        count: (number|undefined),
      },
      alphaSpace?: number|{
        min: number,
        max: number,
        count: (number|undefined),
      }) {
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

  private indexToValueInSpace(index: number, space: number|{
    min: number,
    max: number,
    count: (number|undefined),
  }): number {
    if (typeof space === 'number') {
      return space;
    }
    const count = space.count || space.max - space.min;
    index %= count;
    return space.min + Math.floor(index / (count - 1) * (space.max - space.min));
  }
}
