"use strict";
import * as Platform from "../platform/platform.js";
import { ColorConverter } from "./ColorConverter.js";
import {
  blendColors,
  contrastRatioAPCA,
  desiredLuminanceAPCA,
  luminance,
  luminanceAPCA,
  rgbToHsl,
  rgbToHwb
} from "./ColorUtils.js";
function normalizeHue(hue) {
  return (hue % 360 + 360) % 360;
}
function parseAngle(angleText) {
  const angle = angleText.replace(/(deg|g?rad|turn)$/, "");
  if (isNaN(angle) || angleText.match(/\s+(deg|g?rad|turn)/)) {
    return null;
  }
  const number = parseFloat(angle);
  if (angleText.includes("turn")) {
    return number * 360;
  }
  if (angleText.includes("grad")) {
    return number * 9 / 10;
  }
  if (angleText.includes("rad")) {
    return number * 180 / Math.PI;
  }
  return number;
}
export function getFormat(formatText) {
  switch (formatText) {
    case "hex" /* HEX */:
      return "hex" /* HEX */;
    case "hexa" /* HEXA */:
      return "hexa" /* HEXA */;
    case "rgb" /* RGB */:
      return "rgb" /* RGB */;
    case "rgba" /* RGBA */:
      return "rgba" /* RGBA */;
    case "hsl" /* HSL */:
      return "hsl" /* HSL */;
    case "hsla" /* HSLA */:
      return "hsla" /* HSLA */;
    case "hwb" /* HWB */:
      return "hwb" /* HWB */;
    case "hwba" /* HWBA */:
      return "hwba" /* HWBA */;
    case "lch" /* LCH */:
      return "lch" /* LCH */;
    case "oklch" /* OKLCH */:
      return "oklch" /* OKLCH */;
    case "lab" /* LAB */:
      return "lab" /* LAB */;
    case "oklab" /* OKLAB */:
      return "oklab" /* OKLAB */;
  }
  return getColorSpace(formatText);
}
function getColorSpace(colorSpaceText) {
  switch (colorSpaceText) {
    case "srgb" /* SRGB */:
      return "srgb" /* SRGB */;
    case "srgb-linear" /* SRGB_LINEAR */:
      return "srgb-linear" /* SRGB_LINEAR */;
    case "display-p3" /* DISPLAY_P3 */:
      return "display-p3" /* DISPLAY_P3 */;
    case "a98-rgb" /* A98_RGB */:
      return "a98-rgb" /* A98_RGB */;
    case "prophoto-rgb" /* PROPHOTO_RGB */:
      return "prophoto-rgb" /* PROPHOTO_RGB */;
    case "rec2020" /* REC_2020 */:
      return "rec2020" /* REC_2020 */;
    case "xyz" /* XYZ */:
      return "xyz" /* XYZ */;
    case "xyz-d50" /* XYZ_D50 */:
      return "xyz-d50" /* XYZ_D50 */;
    case "xyz-d65" /* XYZ_D65 */:
      return "xyz-d65" /* XYZ_D65 */;
  }
  return null;
}
export var ColorChannel = /* @__PURE__ */ ((ColorChannel2) => {
  ColorChannel2["A"] = "a";
  ColorChannel2["ALPHA"] = "alpha";
  ColorChannel2["B"] = "b";
  ColorChannel2["C"] = "c";
  ColorChannel2["G"] = "g";
  ColorChannel2["H"] = "h";
  ColorChannel2["L"] = "l";
  ColorChannel2["R"] = "r";
  ColorChannel2["S"] = "s";
  ColorChannel2["W"] = "w";
  ColorChannel2["X"] = "x";
  ColorChannel2["Y"] = "y";
  ColorChannel2["Z"] = "z";
  return ColorChannel2;
})(ColorChannel || {});
function mapPercentToRange(percent, range) {
  const sign = Math.sign(percent);
  const absPercent = Math.abs(percent);
  const [outMin, outMax] = range;
  return sign * (absPercent * (outMax - outMin) / 100 + outMin);
}
export function parse(text) {
  if (!text.match(/\s/)) {
    const match2 = text.toLowerCase().match(/^(?:#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(\w+))$/i);
    if (match2) {
      if (match2[1]) {
        return Legacy.fromHex(match2[1], text);
      }
      if (match2[2]) {
        return Nickname.fromName(match2[2], text);
      }
      return null;
    }
  }
  const match = text.toLowerCase().match(/^\s*(?:(rgba?)|(hsla?)|(hwba?)|(lch)|(oklch)|(lab)|(oklab)|(color))\((.*)\)\s*$/);
  if (match) {
    const isRgbaMatch = Boolean(match[1]);
    const isHslaMatch = Boolean(match[2]);
    const isHwbaMatch = Boolean(match[3]);
    const isLchMatch = Boolean(match[4]);
    const isOklchMatch = Boolean(match[5]);
    const isLabMatch = Boolean(match[6]);
    const isOklabMatch = Boolean(match[7]);
    const isColorMatch = Boolean(match[8]);
    const valuesText = match[9];
    if (isColorMatch) {
      return ColorFunction.fromSpec(text, valuesText);
    }
    const isOldSyntax = isRgbaMatch || isHslaMatch || isHwbaMatch;
    const allowCommas = isRgbaMatch || isHslaMatch;
    const convertNoneToZero = !isOldSyntax;
    const values = splitColorFunctionParameters(valuesText, { allowCommas, convertNoneToZero });
    if (!values) {
      return null;
    }
    const spec = [values[0], values[1], values[2], values[3]];
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
function splitColorFunctionParameters(content, { allowCommas, convertNoneToZero }) {
  const components = content.trim();
  let values = [];
  if (allowCommas) {
    values = components.split(/\s*,\s*/);
  }
  if (!allowCommas || values.length === 1) {
    values = components.split(/\s+/);
    if (values[3] === "/") {
      values.splice(3, 1);
      if (values.length !== 4) {
        return null;
      }
    } else if (values.length > 2 && values[2].indexOf("/") !== -1 || values.length > 3 && values[3].indexOf("/") !== -1) {
      const alpha = values.slice(2, 4).join("");
      values = values.slice(0, 2).concat(alpha.split(/\//)).concat(values.slice(4));
    } else if (values.length >= 4) {
      return null;
    }
  }
  if (values.length !== 3 && values.length !== 4 || values.indexOf("") > -1) {
    return null;
  }
  if (convertNoneToZero) {
    return values.map((value) => value === "none" ? "0" : value);
  }
  return values;
}
function clamp(value, { min, max }) {
  if (value === null) {
    return value;
  }
  if (min !== void 0) {
    value = Math.max(value, min);
  }
  if (max !== void 0) {
    value = Math.min(value, max);
  }
  return value;
}
function parsePercentage(value, range) {
  if (!value.endsWith("%")) {
    return null;
  }
  const percentage = parseFloat(value.substr(0, value.length - 1));
  return isNaN(percentage) ? null : mapPercentToRange(percentage, range);
}
function parseNumber(value) {
  const number = parseFloat(value);
  return isNaN(number) ? null : number;
}
function parseAlpha(value) {
  if (value === void 0) {
    return null;
  }
  return clamp(parsePercentage(value, [0, 1]) ?? parseNumber(value), { min: 0, max: 1 });
}
function parsePercentOrNumber(value, range = [0, 1]) {
  if (isNaN(value.replace("%", ""))) {
    return null;
  }
  const parsed = parseFloat(value);
  if (value.indexOf("%") !== -1) {
    if (value.indexOf("%") !== value.length - 1) {
      return null;
    }
    return mapPercentToRange(parsed, range);
  }
  return parsed;
}
function parseRgbNumeric(value) {
  const parsed = parsePercentOrNumber(value);
  if (parsed === null) {
    return null;
  }
  if (value.indexOf("%") !== -1) {
    return parsed;
  }
  return parsed / 255;
}
export function parseHueNumeric(value) {
  const angle = value.replace(/(deg|g?rad|turn)$/, "");
  if (isNaN(angle) || value.match(/\s+(deg|g?rad|turn)/)) {
    return null;
  }
  const number = parseFloat(angle);
  if (value.indexOf("turn") !== -1) {
    return number % 1;
  }
  if (value.indexOf("grad") !== -1) {
    return number / 400 % 1;
  }
  if (value.indexOf("rad") !== -1) {
    return number / (2 * Math.PI) % 1;
  }
  return number / 360 % 1;
}
function parseSatLightNumeric(value) {
  if (value.indexOf("%") !== value.length - 1 || isNaN(value.replace("%", ""))) {
    return null;
  }
  const parsed = parseFloat(value);
  return parsed / 100;
}
function parseAlphaNumeric(value) {
  return parsePercentOrNumber(value);
}
function hsva2hsla(hsva) {
  const h = hsva[0];
  let s = hsva[1];
  const v = hsva[2];
  const t = (2 - s) * v;
  if (v === 0 || s === 0) {
    s = 0;
  } else {
    s *= v / (t < 1 ? t : 2 - t);
  }
  return [h, s, t / 2, hsva[3]];
}
export function hsl2rgb(hsl) {
  const h = hsl[0];
  let s = hsl[1];
  const l = hsl[2];
  function hue2rgb(p2, q2, h2) {
    if (h2 < 0) {
      h2 += 1;
    } else if (h2 > 1) {
      h2 -= 1;
    }
    if (h2 * 6 < 1) {
      return p2 + (q2 - p2) * h2 * 6;
    }
    if (h2 * 2 < 1) {
      return q2;
    }
    if (h2 * 3 < 2) {
      return p2 + (q2 - p2) * (2 / 3 - h2) * 6;
    }
    return p2;
  }
  if (s < 0) {
    s = 0;
  }
  let q;
  if (l <= 0.5) {
    q = l * (1 + s);
  } else {
    q = l + s - l * s;
  }
  const p = 2 * l - q;
  const tr = h + 1 / 3;
  const tg = h;
  const tb = h - 1 / 3;
  return [hue2rgb(p, q, tr), hue2rgb(p, q, tg), hue2rgb(p, q, tb), hsl[3]];
}
function hwb2rgb(hwb) {
  const h = hwb[0];
  const w = hwb[1];
  const b = hwb[2];
  const whiteRatio = w / (w + b);
  let result = [whiteRatio, whiteRatio, whiteRatio, hwb[3]];
  if (w + b < 1) {
    result = hsl2rgb([h, 1, 0.5, hwb[3]]);
    for (let i = 0; i < 3; ++i) {
      result[i] += w - (w + b) * result[i];
    }
  }
  return result;
}
export function hsva2rgba(hsva) {
  return hsl2rgb(hsva2hsla(hsva));
}
export function rgb2hsv(rgba) {
  const hsla = rgbToHsl(rgba);
  const h = hsla[0];
  let s = hsla[1];
  const l = hsla[2];
  s *= l < 0.5 ? l : 1 - l;
  return [h, s !== 0 ? 2 * s / (l + s) : 0, l + s];
}
export function desiredLuminance(luminance2, contrast, lighter) {
  function computeLuminance() {
    if (lighter) {
      return (luminance2 + 0.05) * contrast - 0.05;
    }
    return (luminance2 + 0.05) / contrast - 0.05;
  }
  let desiredLuminance2 = computeLuminance();
  if (desiredLuminance2 < 0 || desiredLuminance2 > 1) {
    lighter = !lighter;
    desiredLuminance2 = computeLuminance();
  }
  return desiredLuminance2;
}
export function approachColorValue(candidateHSVA, index, desiredLuminance2, candidateLuminance) {
  const epsilon = 2e-4;
  let x = candidateHSVA[index];
  let multiplier = 1;
  let dLuminance = candidateLuminance(candidateHSVA) - desiredLuminance2;
  let previousSign = Math.sign(dLuminance);
  for (let guard = 100; guard; guard--) {
    if (Math.abs(dLuminance) < epsilon) {
      candidateHSVA[index] = x;
      return x;
    }
    const sign = Math.sign(dLuminance);
    if (sign !== previousSign) {
      multiplier /= 2;
      previousSign = sign;
    } else if (x < 0 || x > 1) {
      return null;
    }
    x += multiplier * (index === 2 ? -dLuminance : dLuminance);
    candidateHSVA[index] = x;
    dLuminance = candidateLuminance(candidateHSVA) - desiredLuminance2;
  }
  return null;
}
export function findFgColorForContrast(fgColor, bgColor, requiredContrast) {
  const candidateHSVA = fgColor.as("hsl" /* HSL */).hsva();
  const bgRGBA = bgColor.rgba();
  const candidateLuminance = (candidateHSVA2) => {
    return luminance(blendColors(Legacy.fromHSVA(candidateHSVA2).rgba(), bgRGBA));
  };
  const bgLuminance = luminance(bgColor.rgba());
  const fgLuminance = candidateLuminance(candidateHSVA);
  const fgIsLighter = fgLuminance > bgLuminance;
  const desired = desiredLuminance(bgLuminance, requiredContrast, fgIsLighter);
  const saturationComponentIndex = 1;
  const valueComponentIndex = 2;
  if (approachColorValue(candidateHSVA, valueComponentIndex, desired, candidateLuminance)) {
    return Legacy.fromHSVA(candidateHSVA);
  }
  candidateHSVA[valueComponentIndex] = 1;
  if (approachColorValue(candidateHSVA, saturationComponentIndex, desired, candidateLuminance)) {
    return Legacy.fromHSVA(candidateHSVA);
  }
  return null;
}
export function findFgColorForContrastAPCA(fgColor, bgColor, requiredContrast) {
  const candidateHSVA = fgColor.as("hsl" /* HSL */).hsva();
  const candidateLuminance = (candidateHSVA2) => {
    return luminanceAPCA(Legacy.fromHSVA(candidateHSVA2).rgba());
  };
  const bgLuminance = luminanceAPCA(bgColor.rgba());
  const fgLuminance = candidateLuminance(candidateHSVA);
  const fgIsLighter = fgLuminance >= bgLuminance;
  const desiredLuminance2 = desiredLuminanceAPCA(bgLuminance, requiredContrast, fgIsLighter);
  const saturationComponentIndex = 1;
  const valueComponentIndex = 2;
  if (approachColorValue(candidateHSVA, valueComponentIndex, desiredLuminance2, candidateLuminance)) {
    const candidate = Legacy.fromHSVA(candidateHSVA);
    if (Math.abs(contrastRatioAPCA(bgColor.rgba(), candidate.rgba())) >= requiredContrast) {
      return candidate;
    }
  }
  candidateHSVA[valueComponentIndex] = 1;
  if (approachColorValue(candidateHSVA, saturationComponentIndex, desiredLuminance2, candidateLuminance)) {
    const candidate = Legacy.fromHSVA(candidateHSVA);
    if (Math.abs(contrastRatioAPCA(bgColor.rgba(), candidate.rgba())) >= requiredContrast) {
      return candidate;
    }
  }
  return null;
}
const EPSILON = 0.01;
const WIDE_RANGE_EPSILON = 1;
function equals(a, b, accuracy = EPSILON) {
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
function lessOrEquals(a, b, accuracy = EPSILON) {
  return a - b <= accuracy;
}
export var Format = /* @__PURE__ */ ((Format2) => {
  Format2["HEX"] = "hex";
  Format2["HEXA"] = "hexa";
  Format2["RGB"] = "rgb";
  Format2["RGBA"] = "rgba";
  Format2["HSL"] = "hsl";
  Format2["HSLA"] = "hsla";
  Format2["HWB"] = "hwb";
  Format2["HWBA"] = "hwba";
  Format2["LCH"] = "lch";
  Format2["OKLCH"] = "oklch";
  Format2["LAB"] = "lab";
  Format2["OKLAB"] = "oklab";
  Format2["SRGB"] = "srgb";
  Format2["SRGB_LINEAR"] = "srgb-linear";
  Format2["DISPLAY_P3"] = "display-p3";
  Format2["A98_RGB"] = "a98-rgb";
  Format2["PROPHOTO_RGB"] = "prophoto-rgb";
  Format2["REC_2020"] = "rec2020";
  Format2["XYZ"] = "xyz";
  Format2["XYZ_D50"] = "xyz-d50";
  Format2["XYZ_D65"] = "xyz-d65";
  return Format2;
})(Format || {});
export class Lab {
  l;
  a;
  b;
  alpha;
  #authoredText;
  #rawParams;
  channels = ["l" /* L */, "a" /* A */, "b" /* B */, "alpha" /* ALPHA */];
  static #conversions = {
    ["hex" /* HEX */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "hex" /* HEX */),
    ["hexa" /* HEXA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "hexa" /* HEXA */),
    ["rgb" /* RGB */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "rgb" /* RGB */),
    ["rgba" /* RGBA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "rgba" /* RGBA */),
    ["hsl" /* HSL */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hsla" /* HSLA */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwb" /* HWB */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwba" /* HWBA */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["lch" /* LCH */]: (self) => new LCH(...ColorConverter.labToLch(self.l, self.a, self.b), self.alpha),
    ["oklch" /* OKLCH */]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    ["lab" /* LAB */]: (self) => self,
    ["oklab" /* OKLAB */]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    ["srgb" /* SRGB */]: (self) => new ColorFunction("srgb" /* SRGB */, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    ["srgb-linear" /* SRGB_LINEAR */]: (self) => new ColorFunction("srgb-linear" /* SRGB_LINEAR */, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    ["display-p3" /* DISPLAY_P3 */]: (self) => new ColorFunction("display-p3" /* DISPLAY_P3 */, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    ["a98-rgb" /* A98_RGB */]: (self) => new ColorFunction("a98-rgb" /* A98_RGB */, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    ["prophoto-rgb" /* PROPHOTO_RGB */]: (self) => new ColorFunction("prophoto-rgb" /* PROPHOTO_RGB */, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    ["rec2020" /* REC_2020 */]: (self) => new ColorFunction("rec2020" /* REC_2020 */, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    ["xyz" /* XYZ */]: (self) => new ColorFunction("xyz" /* XYZ */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    ["xyz-d50" /* XYZ_D50 */]: (self) => new ColorFunction("xyz-d50" /* XYZ_D50 */, ...self.#toXyzd50(), self.alpha),
    ["xyz-d65" /* XYZ_D65 */]: (self) => new ColorFunction("xyz-d65" /* XYZ_D65 */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    return ColorConverter.labToXyzd50(this.l, this.a, this.b);
  }
  #getRGBArray(withAlpha = true) {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? void 0];
    }
    return params;
  }
  constructor(l, a, b, alpha, authoredText) {
    this.#rawParams = [l, a, b];
    this.l = clamp(l, { min: 0, max: 100 });
    if (equals(this.l, 0, WIDE_RANGE_EPSILON) || equals(this.l, 100, WIDE_RANGE_EPSILON)) {
      a = b = 0;
    }
    this.a = a;
    this.b = b;
    this.alpha = clamp(alpha, { min: 0, max: 1 });
    this.#authoredText = authoredText;
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    return Lab.#conversions[format](this);
  }
  asLegacyColor() {
    return this.as("rgba" /* RGBA */);
  }
  equal(color) {
    const lab = color.as("lab" /* LAB */);
    return equals(lab.l, this.l, WIDE_RANGE_EPSILON) && equals(lab.a, this.a) && equals(lab.b, this.b) && equals(lab.alpha, this.alpha);
  }
  format() {
    return "lab" /* LAB */;
  }
  setAlpha(alpha) {
    return new Lab(this.l, this.a, this.b, alpha, void 0);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.a, this.b);
  }
  #stringify(l, a, b) {
    const alpha = this.alpha === null || equals(this.alpha, 1) ? "" : ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `lab(${Platform.StringUtilities.stringifyWithPrecision(l, 0)} ${Platform.StringUtilities.stringifyWithPrecision(
      a
    )} ${Platform.StringUtilities.stringifyWithPrecision(b)}${alpha})`;
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return false;
  }
  static fromSpec(spec, text) {
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
export class LCH {
  #rawParams;
  l;
  c;
  h;
  alpha;
  #authoredText;
  channels = ["l" /* L */, "c" /* C */, "h" /* H */, "alpha" /* ALPHA */];
  static #conversions = {
    ["hex" /* HEX */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "hex" /* HEX */),
    ["hexa" /* HEXA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "hexa" /* HEXA */),
    ["rgb" /* RGB */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "rgb" /* RGB */),
    ["rgba" /* RGBA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "rgba" /* RGBA */),
    ["hsl" /* HSL */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hsla" /* HSLA */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwb" /* HWB */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwba" /* HWBA */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["lch" /* LCH */]: (self) => self,
    ["oklch" /* OKLCH */]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    ["lab" /* LAB */]: (self) => new Lab(...ColorConverter.lchToLab(self.l, self.c, self.h), self.alpha),
    ["oklab" /* OKLAB */]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    ["srgb" /* SRGB */]: (self) => new ColorFunction("srgb" /* SRGB */, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    ["srgb-linear" /* SRGB_LINEAR */]: (self) => new ColorFunction("srgb-linear" /* SRGB_LINEAR */, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    ["display-p3" /* DISPLAY_P3 */]: (self) => new ColorFunction("display-p3" /* DISPLAY_P3 */, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    ["a98-rgb" /* A98_RGB */]: (self) => new ColorFunction("a98-rgb" /* A98_RGB */, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    ["prophoto-rgb" /* PROPHOTO_RGB */]: (self) => new ColorFunction("prophoto-rgb" /* PROPHOTO_RGB */, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    ["rec2020" /* REC_2020 */]: (self) => new ColorFunction("rec2020" /* REC_2020 */, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    ["xyz" /* XYZ */]: (self) => new ColorFunction("xyz" /* XYZ */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    ["xyz-d50" /* XYZ_D50 */]: (self) => new ColorFunction("xyz-d50" /* XYZ_D50 */, ...self.#toXyzd50(), self.alpha),
    ["xyz-d65" /* XYZ_D65 */]: (self) => new ColorFunction("xyz-d65" /* XYZ_D65 */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    return ColorConverter.labToXyzd50(...ColorConverter.lchToLab(this.l, this.c, this.h));
  }
  #getRGBArray(withAlpha = true) {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? void 0];
    }
    return params;
  }
  constructor(l, c, h, alpha, authoredText) {
    this.#rawParams = [l, c, h];
    this.l = clamp(l, { min: 0, max: 100 });
    c = equals(this.l, 0, WIDE_RANGE_EPSILON) || equals(this.l, 100, WIDE_RANGE_EPSILON) ? 0 : c;
    this.c = clamp(c, { min: 0 });
    h = equals(c, 0) ? 0 : h;
    this.h = normalizeHue(h);
    this.alpha = clamp(alpha, { min: 0, max: 1 });
    this.#authoredText = authoredText;
  }
  asLegacyColor() {
    return this.as("rgba" /* RGBA */);
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    return LCH.#conversions[format](this);
  }
  equal(color) {
    const lch = color.as("lch" /* LCH */);
    return equals(lch.l, this.l, WIDE_RANGE_EPSILON) && equals(lch.c, this.c) && equals(lch.h, this.h) && equals(lch.alpha, this.alpha);
  }
  format() {
    return "lch" /* LCH */;
  }
  setAlpha(alpha) {
    return new LCH(this.l, this.c, this.h, alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.c, this.h);
  }
  #stringify(l, c, h) {
    const alpha = this.alpha === null || equals(this.alpha, 1) ? "" : ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `lch(${Platform.StringUtilities.stringifyWithPrecision(l, 0)} ${Platform.StringUtilities.stringifyWithPrecision(
      c
    )} ${Platform.StringUtilities.stringifyWithPrecision(h)}${alpha})`;
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return false;
  }
  // See "powerless" component definitions in
  // https://www.w3.org/TR/css-color-4/#specifying-lab-lch
  isHuePowerless() {
    return equals(this.c, 0);
  }
  static fromSpec(spec, text) {
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
export class Oklab {
  #rawParams;
  l;
  a;
  b;
  alpha;
  #authoredText;
  channels = ["l" /* L */, "a" /* A */, "b" /* B */, "alpha" /* ALPHA */];
  static #conversions = {
    ["hex" /* HEX */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "hex" /* HEX */),
    ["hexa" /* HEXA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "hexa" /* HEXA */),
    ["rgb" /* RGB */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "rgb" /* RGB */),
    ["rgba" /* RGBA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "rgba" /* RGBA */),
    ["hsl" /* HSL */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hsla" /* HSLA */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwb" /* HWB */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwba" /* HWBA */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["lch" /* LCH */]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    ["oklch" /* OKLCH */]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    ["lab" /* LAB */]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    ["oklab" /* OKLAB */]: (self) => self,
    ["srgb" /* SRGB */]: (self) => new ColorFunction("srgb" /* SRGB */, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    ["srgb-linear" /* SRGB_LINEAR */]: (self) => new ColorFunction("srgb-linear" /* SRGB_LINEAR */, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    ["display-p3" /* DISPLAY_P3 */]: (self) => new ColorFunction("display-p3" /* DISPLAY_P3 */, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    ["a98-rgb" /* A98_RGB */]: (self) => new ColorFunction("a98-rgb" /* A98_RGB */, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    ["prophoto-rgb" /* PROPHOTO_RGB */]: (self) => new ColorFunction("prophoto-rgb" /* PROPHOTO_RGB */, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    ["rec2020" /* REC_2020 */]: (self) => new ColorFunction("rec2020" /* REC_2020 */, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    ["xyz" /* XYZ */]: (self) => new ColorFunction("xyz" /* XYZ */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    ["xyz-d50" /* XYZ_D50 */]: (self) => new ColorFunction("xyz-d50" /* XYZ_D50 */, ...self.#toXyzd50(), self.alpha),
    ["xyz-d65" /* XYZ_D65 */]: (self) => new ColorFunction("xyz-d65" /* XYZ_D65 */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    return ColorConverter.xyzd65ToD50(...ColorConverter.oklabToXyzd65(this.l, this.a, this.b));
  }
  #getRGBArray(withAlpha = true) {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? void 0];
    }
    return params;
  }
  constructor(l, a, b, alpha, authoredText) {
    this.#rawParams = [l, a, b];
    this.l = clamp(l, { min: 0, max: 1 });
    if (equals(this.l, 0) || equals(this.l, 1)) {
      a = b = 0;
    }
    this.a = a;
    this.b = b;
    this.alpha = clamp(alpha, { min: 0, max: 1 });
    this.#authoredText = authoredText;
  }
  asLegacyColor() {
    return this.as("rgba" /* RGBA */);
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    return Oklab.#conversions[format](this);
  }
  equal(color) {
    const oklab = color.as("oklab" /* OKLAB */);
    return equals(oklab.l, this.l) && equals(oklab.a, this.a) && equals(oklab.b, this.b) && equals(oklab.alpha, this.alpha);
  }
  format() {
    return "oklab" /* OKLAB */;
  }
  setAlpha(alpha) {
    return new Oklab(this.l, this.a, this.b, alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.a, this.b);
  }
  #stringify(l, a, b) {
    const alpha = this.alpha === null || equals(this.alpha, 1) ? "" : ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `oklab(${Platform.StringUtilities.stringifyWithPrecision(l)} ${Platform.StringUtilities.stringifyWithPrecision(
      a
    )} ${Platform.StringUtilities.stringifyWithPrecision(b)}${alpha})`;
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return false;
  }
  static fromSpec(spec, text) {
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
export class Oklch {
  #rawParams;
  l;
  c;
  h;
  alpha;
  #authoredText;
  channels = ["l" /* L */, "c" /* C */, "h" /* H */, "alpha" /* ALPHA */];
  static #conversions = {
    ["hex" /* HEX */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "hex" /* HEX */),
    ["hexa" /* HEXA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "hexa" /* HEXA */),
    ["rgb" /* RGB */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "rgb" /* RGB */),
    ["rgba" /* RGBA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "rgba" /* RGBA */),
    ["hsl" /* HSL */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hsla" /* HSLA */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwb" /* HWB */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwba" /* HWBA */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["lch" /* LCH */]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    ["oklch" /* OKLCH */]: (self) => self,
    ["lab" /* LAB */]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    ["oklab" /* OKLAB */]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    ["srgb" /* SRGB */]: (self) => new ColorFunction("srgb" /* SRGB */, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    ["srgb-linear" /* SRGB_LINEAR */]: (self) => new ColorFunction("srgb-linear" /* SRGB_LINEAR */, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    ["display-p3" /* DISPLAY_P3 */]: (self) => new ColorFunction("display-p3" /* DISPLAY_P3 */, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    ["a98-rgb" /* A98_RGB */]: (self) => new ColorFunction("a98-rgb" /* A98_RGB */, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    ["prophoto-rgb" /* PROPHOTO_RGB */]: (self) => new ColorFunction("prophoto-rgb" /* PROPHOTO_RGB */, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    ["rec2020" /* REC_2020 */]: (self) => new ColorFunction("rec2020" /* REC_2020 */, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    ["xyz" /* XYZ */]: (self) => new ColorFunction("xyz" /* XYZ */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    ["xyz-d50" /* XYZ_D50 */]: (self) => new ColorFunction("xyz-d50" /* XYZ_D50 */, ...self.#toXyzd50(), self.alpha),
    ["xyz-d65" /* XYZ_D65 */]: (self) => new ColorFunction("xyz-d65" /* XYZ_D65 */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    return ColorConverter.oklchToXyzd50(this.l, this.c, this.h);
  }
  #getRGBArray(withAlpha = true) {
    const params = ColorConverter.xyzd50ToSrgb(...this.#toXyzd50());
    if (withAlpha) {
      return [...params, this.alpha ?? void 0];
    }
    return params;
  }
  constructor(l, c, h, alpha, authoredText) {
    this.#rawParams = [l, c, h];
    this.l = clamp(l, { min: 0, max: 1 });
    c = equals(this.l, 0) || equals(this.l, 1) ? 0 : c;
    this.c = clamp(c, { min: 0 });
    h = equals(c, 0) ? 0 : h;
    this.h = normalizeHue(h);
    this.alpha = clamp(alpha, { min: 0, max: 1 });
    this.#authoredText = authoredText;
  }
  asLegacyColor() {
    return this.as("rgba" /* RGBA */);
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    return Oklch.#conversions[format](this);
  }
  equal(color) {
    const oklch = color.as("oklch" /* OKLCH */);
    return equals(oklch.l, this.l) && equals(oklch.c, this.c) && equals(oklch.h, this.h) && equals(oklch.alpha, this.alpha);
  }
  format() {
    return "oklch" /* OKLCH */;
  }
  setAlpha(alpha) {
    return new Oklch(this.l, this.c, this.h, alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.l, this.c, this.h);
  }
  #stringify(l, c, h) {
    const alpha = this.alpha === null || equals(this.alpha, 1) ? "" : ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `oklch(${Platform.StringUtilities.stringifyWithPrecision(l)} ${Platform.StringUtilities.stringifyWithPrecision(
      c
    )} ${Platform.StringUtilities.stringifyWithPrecision(h)}${alpha})`;
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return false;
  }
  static fromSpec(spec, text) {
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
export class ColorFunction {
  #rawParams;
  p0;
  p1;
  p2;
  alpha;
  colorSpace;
  #authoredText;
  get channels() {
    return this.isXYZ() ? ["x" /* X */, "y" /* Y */, "z" /* Z */, "alpha" /* ALPHA */] : ["r" /* R */, "g" /* G */, "b" /* B */, "alpha" /* ALPHA */];
  }
  static #conversions = {
    ["hex" /* HEX */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "hex" /* HEX */),
    ["hexa" /* HEXA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "hexa" /* HEXA */),
    ["rgb" /* RGB */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "rgb" /* RGB */),
    ["rgba" /* RGBA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "rgba" /* RGBA */),
    ["hsl" /* HSL */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hsla" /* HSLA */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwb" /* HWB */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwba" /* HWBA */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["lch" /* LCH */]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    ["oklch" /* OKLCH */]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    ["lab" /* LAB */]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    ["oklab" /* OKLAB */]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    ["srgb" /* SRGB */]: (self) => new ColorFunction("srgb" /* SRGB */, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    ["srgb-linear" /* SRGB_LINEAR */]: (self) => new ColorFunction("srgb-linear" /* SRGB_LINEAR */, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    ["display-p3" /* DISPLAY_P3 */]: (self) => new ColorFunction("display-p3" /* DISPLAY_P3 */, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    ["a98-rgb" /* A98_RGB */]: (self) => new ColorFunction("a98-rgb" /* A98_RGB */, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    ["prophoto-rgb" /* PROPHOTO_RGB */]: (self) => new ColorFunction("prophoto-rgb" /* PROPHOTO_RGB */, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    ["rec2020" /* REC_2020 */]: (self) => new ColorFunction("rec2020" /* REC_2020 */, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    ["xyz" /* XYZ */]: (self) => new ColorFunction("xyz" /* XYZ */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    ["xyz-d50" /* XYZ_D50 */]: (self) => new ColorFunction("xyz-d50" /* XYZ_D50 */, ...self.#toXyzd50(), self.alpha),
    ["xyz-d65" /* XYZ_D65 */]: (self) => new ColorFunction("xyz-d65" /* XYZ_D65 */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    const [p0, p1, p2] = this.#rawParams;
    switch (this.colorSpace) {
      case "srgb" /* SRGB */:
        return ColorConverter.srgbToXyzd50(p0, p1, p2);
      case "srgb-linear" /* SRGB_LINEAR */:
        return ColorConverter.srgbLinearToXyzd50(p0, p1, p2);
      case "display-p3" /* DISPLAY_P3 */:
        return ColorConverter.displayP3ToXyzd50(p0, p1, p2);
      case "a98-rgb" /* A98_RGB */:
        return ColorConverter.adobeRGBToXyzd50(p0, p1, p2);
      case "prophoto-rgb" /* PROPHOTO_RGB */:
        return ColorConverter.proPhotoToXyzd50(p0, p1, p2);
      case "rec2020" /* REC_2020 */:
        return ColorConverter.rec2020ToXyzd50(p0, p1, p2);
      case "xyz-d50" /* XYZ_D50 */:
        return [p0, p1, p2];
      case "xyz" /* XYZ */:
      case "xyz-d65" /* XYZ_D65 */:
        return ColorConverter.xyzd65ToD50(p0, p1, p2);
    }
    throw new Error("Invalid color space");
  }
  #getRGBArray(withAlpha = true) {
    const [p0, p1, p2] = this.#rawParams;
    const params = this.colorSpace === "srgb" /* SRGB */ ? [p0, p1, p2] : [...ColorConverter.xyzd50ToSrgb(...this.#toXyzd50())];
    if (withAlpha) {
      return [...params, this.alpha ?? void 0];
    }
    return params;
  }
  constructor(colorSpace, p0, p1, p2, alpha, authoredText) {
    this.#rawParams = [p0, p1, p2];
    this.colorSpace = colorSpace;
    this.#authoredText = authoredText;
    if (this.colorSpace !== "xyz-d50" /* XYZ_D50 */ && this.colorSpace !== "xyz-d65" /* XYZ_D65 */ && this.colorSpace !== "xyz" /* XYZ */) {
      p0 = clamp(p0, { min: 0, max: 1 });
      p1 = clamp(p1, { min: 0, max: 1 });
      p2 = clamp(p2, { min: 0, max: 1 });
    }
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    this.alpha = clamp(alpha, { min: 0, max: 1 });
  }
  asLegacyColor() {
    return this.as("rgba" /* RGBA */);
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    if (this.colorSpace === format) {
      return this;
    }
    return ColorFunction.#conversions[format](this);
  }
  equal(color) {
    const space = color.as(this.colorSpace);
    return equals(this.p0, space.p0) && equals(this.p1, space.p1) && equals(this.p2, space.p2) && equals(this.alpha, space.alpha);
  }
  format() {
    return this.colorSpace;
  }
  setAlpha(alpha) {
    return new ColorFunction(this.colorSpace, this.p0, this.p1, this.p2, alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.p0, this.p1, this.p2);
  }
  #stringify(p0, p1, p2) {
    const alpha = this.alpha === null || equals(this.alpha, 1) ? "" : ` / ${Platform.StringUtilities.stringifyWithPrecision(this.alpha)}`;
    return `color(${this.colorSpace} ${Platform.StringUtilities.stringifyWithPrecision(p0)} ${Platform.StringUtilities.stringifyWithPrecision(
      p1
    )} ${Platform.StringUtilities.stringifyWithPrecision(p2)}${alpha})`;
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    if (this.colorSpace !== "xyz-d50" /* XYZ_D50 */ && this.colorSpace !== "xyz-d65" /* XYZ_D65 */ && this.colorSpace !== "xyz" /* XYZ */) {
      return !equals(this.#rawParams, [this.p0, this.p1, this.p2]);
    }
    return false;
  }
  isXYZ() {
    switch (this.colorSpace) {
      case "xyz" /* XYZ */:
      case "xyz-d50" /* XYZ_D50 */:
      case "xyz-d65" /* XYZ_D65 */:
        return true;
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
  static fromSpec(authoredText, parametersWithAlphaText) {
    const [parametersText, alphaText] = parametersWithAlphaText.split("/", 2);
    const parameters = parametersText.trim().split(/\s+/);
    const [colorSpaceText, ...remainingParams] = parameters;
    const colorSpace = getColorSpace(colorSpaceText);
    if (!colorSpace) {
      return null;
    }
    if (remainingParams.length === 0 && alphaText === void 0) {
      return new ColorFunction(colorSpace, 0, 0, 0, null, authoredText);
    }
    if (remainingParams.length === 0 && alphaText !== void 0 && alphaText.trim().split(/\s+/).length > 1) {
      return null;
    }
    if (remainingParams.length > 3) {
      return null;
    }
    const nonesReplacedParams = remainingParams.map((param) => param === "none" ? "0" : param);
    const values = nonesReplacedParams.map((param) => parsePercentOrNumber(param, [0, 1]));
    const containsNull = values.includes(null);
    if (containsNull) {
      return null;
    }
    const alphaValue = alphaText ? parsePercentOrNumber(alphaText, [0, 1]) ?? 1 : 1;
    const rgbOrXyza = [
      values[0] ?? 0,
      values[1] ?? 0,
      values[2] ?? 0,
      alphaValue
    ];
    return new ColorFunction(colorSpace, ...rgbOrXyza, authoredText);
  }
}
export class HSL {
  h;
  s;
  l;
  alpha;
  #rawParams;
  #authoredText;
  channels = ["h" /* H */, "s" /* S */, "l" /* L */, "alpha" /* ALPHA */];
  static #conversions = {
    ["hex" /* HEX */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "hex" /* HEX */),
    ["hexa" /* HEXA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "hexa" /* HEXA */),
    ["rgb" /* RGB */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "rgb" /* RGB */),
    ["rgba" /* RGBA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "rgba" /* RGBA */),
    ["hsl" /* HSL */]: (self) => self,
    ["hsla" /* HSLA */]: (self) => self,
    ["hwb" /* HWB */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwba" /* HWBA */]: (self) => new HWB(...rgbToHwb(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["lch" /* LCH */]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    ["oklch" /* OKLCH */]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    ["lab" /* LAB */]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    ["oklab" /* OKLAB */]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    ["srgb" /* SRGB */]: (self) => new ColorFunction("srgb" /* SRGB */, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    ["srgb-linear" /* SRGB_LINEAR */]: (self) => new ColorFunction("srgb-linear" /* SRGB_LINEAR */, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    ["display-p3" /* DISPLAY_P3 */]: (self) => new ColorFunction("display-p3" /* DISPLAY_P3 */, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    ["a98-rgb" /* A98_RGB */]: (self) => new ColorFunction("a98-rgb" /* A98_RGB */, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    ["prophoto-rgb" /* PROPHOTO_RGB */]: (self) => new ColorFunction("prophoto-rgb" /* PROPHOTO_RGB */, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    ["rec2020" /* REC_2020 */]: (self) => new ColorFunction("rec2020" /* REC_2020 */, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    ["xyz" /* XYZ */]: (self) => new ColorFunction("xyz" /* XYZ */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    ["xyz-d50" /* XYZ_D50 */]: (self) => new ColorFunction("xyz-d50" /* XYZ_D50 */, ...self.#toXyzd50(), self.alpha),
    ["xyz-d65" /* XYZ_D65 */]: (self) => new ColorFunction("xyz-d65" /* XYZ_D65 */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #getRGBArray(withAlpha = true) {
    const rgb = hsl2rgb([this.h, this.s, this.l, 0]);
    if (withAlpha) {
      return [rgb[0], rgb[1], rgb[2], this.alpha ?? void 0];
    }
    return [rgb[0], rgb[1], rgb[2]];
  }
  #toXyzd50() {
    const rgb = this.#getRGBArray(false);
    return ColorConverter.srgbToXyzd50(rgb[0], rgb[1], rgb[2]);
  }
  constructor(h, s, l, alpha, authoredText) {
    this.#rawParams = [h, s, l];
    this.l = clamp(l, { min: 0, max: 1 });
    s = equals(this.l, 0) || equals(this.l, 1) ? 0 : s;
    this.s = clamp(s, { min: 0, max: 1 });
    h = equals(this.s, 0) ? 0 : h;
    this.h = normalizeHue(h * 360) / 360;
    this.alpha = clamp(alpha ?? null, { min: 0, max: 1 });
    this.#authoredText = authoredText;
  }
  equal(color) {
    const hsl = color.as("hsl" /* HSL */);
    return equals(this.h, hsl.h) && equals(this.s, hsl.s) && equals(this.l, hsl.l) && equals(this.alpha, hsl.alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.h, this.s, this.l);
  }
  #stringify(h, s, l) {
    const start = Platform.StringUtilities.sprintf(
      "hsl(%sdeg %s% %s%",
      Platform.StringUtilities.stringifyWithPrecision(h * 360),
      Platform.StringUtilities.stringifyWithPrecision(s * 100),
      Platform.StringUtilities.stringifyWithPrecision(l * 100)
    );
    if (this.alpha !== null && this.alpha !== 1) {
      return start + Platform.StringUtilities.sprintf(
        " / %s%)",
        Platform.StringUtilities.stringifyWithPrecision(this.alpha * 100)
      );
    }
    return start + ")";
  }
  setAlpha(alpha) {
    return new HSL(this.h, this.s, this.l, alpha);
  }
  format() {
    return this.alpha === null || this.alpha === 1 ? "hsl" /* HSL */ : "hsla" /* HSLA */;
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    if (format === this.format()) {
      return this;
    }
    return HSL.#conversions[format](this);
  }
  asLegacyColor() {
    return this.as("rgba" /* RGBA */);
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return !lessOrEquals(this.#rawParams[1], 1) || !lessOrEquals(0, this.#rawParams[1]);
  }
  static fromSpec(spec, text) {
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
  hsva() {
    const s = this.s * (this.l < 0.5 ? this.l : 1 - this.l);
    return [this.h, s !== 0 ? 2 * s / (this.l + s) : 0, this.l + s, this.alpha ?? 1];
  }
  canonicalHSLA() {
    return [Math.round(this.h * 360), Math.round(this.s * 100), Math.round(this.l * 100), this.alpha ?? 1];
  }
}
export class HWB {
  h;
  w;
  b;
  alpha;
  #rawParams;
  #authoredText;
  channels = ["h" /* H */, "w" /* W */, "b" /* B */, "alpha" /* ALPHA */];
  static #conversions = {
    ["hex" /* HEX */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "hex" /* HEX */),
    ["hexa" /* HEXA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "hexa" /* HEXA */),
    ["rgb" /* RGB */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      false
    ), "rgb" /* RGB */),
    ["rgba" /* RGBA */]: (self) => new Legacy(self.#getRGBArray(
      /* withAlpha= */
      true
    ), "rgba" /* RGBA */),
    ["hsl" /* HSL */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hsla" /* HSLA */]: (self) => new HSL(...rgbToHsl(self.#getRGBArray(
      /* withAlpha= */
      false
    )), self.alpha),
    ["hwb" /* HWB */]: (self) => self,
    ["hwba" /* HWBA */]: (self) => self,
    ["lch" /* LCH */]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    ["oklch" /* OKLCH */]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    ["lab" /* LAB */]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    ["oklab" /* OKLAB */]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    ["srgb" /* SRGB */]: (self) => new ColorFunction("srgb" /* SRGB */, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    ["srgb-linear" /* SRGB_LINEAR */]: (self) => new ColorFunction("srgb-linear" /* SRGB_LINEAR */, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    ["display-p3" /* DISPLAY_P3 */]: (self) => new ColorFunction("display-p3" /* DISPLAY_P3 */, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    ["a98-rgb" /* A98_RGB */]: (self) => new ColorFunction("a98-rgb" /* A98_RGB */, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    ["prophoto-rgb" /* PROPHOTO_RGB */]: (self) => new ColorFunction("prophoto-rgb" /* PROPHOTO_RGB */, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    ["rec2020" /* REC_2020 */]: (self) => new ColorFunction("rec2020" /* REC_2020 */, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    ["xyz" /* XYZ */]: (self) => new ColorFunction("xyz" /* XYZ */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    ["xyz-d50" /* XYZ_D50 */]: (self) => new ColorFunction("xyz-d50" /* XYZ_D50 */, ...self.#toXyzd50(), self.alpha),
    ["xyz-d65" /* XYZ_D65 */]: (self) => new ColorFunction("xyz-d65" /* XYZ_D65 */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #getRGBArray(withAlpha = true) {
    const rgb = hwb2rgb([this.h, this.w, this.b, 0]);
    if (withAlpha) {
      return [rgb[0], rgb[1], rgb[2], this.alpha ?? void 0];
    }
    return [rgb[0], rgb[1], rgb[2]];
  }
  #toXyzd50() {
    const rgb = this.#getRGBArray(false);
    return ColorConverter.srgbToXyzd50(rgb[0], rgb[1], rgb[2]);
  }
  constructor(h, w, b, alpha, authoredText) {
    this.#rawParams = [h, w, b];
    this.w = clamp(w, { min: 0, max: 1 });
    this.b = clamp(b, { min: 0, max: 1 });
    h = lessOrEquals(1, this.w + this.b) ? 0 : h;
    this.h = normalizeHue(h * 360) / 360;
    this.alpha = clamp(alpha, { min: 0, max: 1 });
    if (lessOrEquals(1, this.w + this.b)) {
      const ratio = this.w / this.b;
      this.b = 1 / (1 + ratio);
      this.w = 1 - this.b;
    }
    this.#authoredText = authoredText;
  }
  equal(color) {
    const hwb = color.as("hwb" /* HWB */);
    return equals(this.h, hwb.h) && equals(this.w, hwb.w) && equals(this.b, hwb.b) && equals(this.alpha, hwb.alpha);
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(this.h, this.w, this.b);
  }
  #stringify(h, w, b) {
    const start = Platform.StringUtilities.sprintf(
      "hwb(%sdeg %s% %s%",
      Platform.StringUtilities.stringifyWithPrecision(h * 360),
      Platform.StringUtilities.stringifyWithPrecision(w * 100),
      Platform.StringUtilities.stringifyWithPrecision(b * 100)
    );
    if (this.alpha !== null && this.alpha !== 1) {
      return start + Platform.StringUtilities.sprintf(
        " / %s%)",
        Platform.StringUtilities.stringifyWithPrecision(this.alpha * 100)
      );
    }
    return start + ")";
  }
  setAlpha(alpha) {
    return new HWB(this.h, this.w, this.b, alpha, this.#authoredText);
  }
  format() {
    return this.alpha !== null && !equals(this.alpha, 1) ? "hwba" /* HWBA */ : "hwb" /* HWB */;
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    if (format === this.format()) {
      return this;
    }
    return HWB.#conversions[format](this);
  }
  asLegacyColor() {
    return this.as("rgba" /* RGBA */);
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  canonicalHWBA() {
    return [
      Math.round(this.h * 360),
      Math.round(this.w * 100),
      Math.round(this.b * 100),
      this.alpha ?? 1
    ];
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(...this.#rawParams);
  }
  isGamutClipped() {
    return !lessOrEquals(this.#rawParams[1], 1) || !lessOrEquals(0, this.#rawParams[1]) || !lessOrEquals(this.#rawParams[2], 1) || !lessOrEquals(0, this.#rawParams[2]);
  }
  static fromSpec(spec, text) {
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
function toRgbValue(value) {
  return Math.round(value * 255);
}
class ShortFormatColorBase {
  color;
  channels = ["r" /* R */, "g" /* G */, "b" /* B */, "alpha" /* ALPHA */];
  constructor(color) {
    this.color = color;
  }
  get alpha() {
    return this.color.alpha;
  }
  rgba() {
    return this.color.rgba();
  }
  equal(color) {
    return this.color.equal(color);
  }
  setAlpha(alpha) {
    return this.color.setAlpha(alpha);
  }
  format() {
    return (this.alpha ?? 1) !== 1 ? "hexa" /* HEXA */ : "hex" /* HEX */;
  }
  as(format) {
    return this.color.as(format);
  }
  is(format) {
    return this.color.is(format);
  }
  asLegacyColor() {
    return this.color.asLegacyColor();
  }
  getAuthoredText() {
    return this.color.getAuthoredText();
  }
  getRawParameters() {
    return this.color.getRawParameters();
  }
  isGamutClipped() {
    return this.color.isGamutClipped();
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    const [r, g, b] = this.color.rgba();
    return this.stringify(r, g, b);
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    const [r, g, b] = this.getRawParameters();
    return this.stringify(r, g, b);
  }
}
export class ShortHex extends ShortFormatColorBase {
  setAlpha(alpha) {
    return new ShortHex(this.color.setAlpha(alpha));
  }
  asString(format) {
    return format && format !== this.format() ? super.as(format).asString() : super.asString();
  }
  stringify(r, g, b) {
    function toShortHexValue(value) {
      return (Math.round(value * 255) / 17).toString(16);
    }
    if (this.color.hasAlpha()) {
      return Platform.StringUtilities.sprintf(
        "#%s%s%s%s",
        toShortHexValue(r),
        toShortHexValue(g),
        toShortHexValue(b),
        toShortHexValue(this.alpha ?? 1)
      ).toLowerCase();
    }
    return Platform.StringUtilities.sprintf("#%s%s%s", toShortHexValue(r), toShortHexValue(g), toShortHexValue(b)).toLowerCase();
  }
}
export class Nickname extends ShortFormatColorBase {
  nickname;
  constructor(nickname, color) {
    super(color);
    this.nickname = nickname;
  }
  static fromName(name, text) {
    const nickname = name.toLowerCase();
    const rgba = Nicknames.get(nickname);
    if (rgba !== void 0) {
      return new Nickname(nickname, Legacy.fromRGBA(rgba, text));
    }
    return null;
  }
  stringify() {
    return this.nickname;
  }
  getAsRawString(format) {
    return this.color.getAsRawString(format);
  }
}
export class Legacy {
  #rawParams;
  #rgba;
  #authoredText;
  #format;
  channels = ["r" /* R */, "g" /* G */, "b" /* B */, "alpha" /* ALPHA */];
  static #conversions = {
    ["hex" /* HEX */]: (self) => new Legacy(self.#rgba, "hex" /* HEX */),
    ["hexa" /* HEXA */]: (self) => new Legacy(self.#rgba, "hexa" /* HEXA */),
    ["rgb" /* RGB */]: (self) => new Legacy(self.#rgba, "rgb" /* RGB */),
    ["rgba" /* RGBA */]: (self) => new Legacy(self.#rgba, "rgba" /* RGBA */),
    ["hsl" /* HSL */]: (self) => new HSL(...rgbToHsl([self.#rgba[0], self.#rgba[1], self.#rgba[2]]), self.alpha),
    ["hsla" /* HSLA */]: (self) => new HSL(...rgbToHsl([self.#rgba[0], self.#rgba[1], self.#rgba[2]]), self.alpha),
    ["hwb" /* HWB */]: (self) => new HWB(...rgbToHwb([self.#rgba[0], self.#rgba[1], self.#rgba[2]]), self.alpha),
    ["hwba" /* HWBA */]: (self) => new HWB(...rgbToHwb([self.#rgba[0], self.#rgba[1], self.#rgba[2]]), self.alpha),
    ["lch" /* LCH */]: (self) => new LCH(...ColorConverter.labToLch(...ColorConverter.xyzd50ToLab(...self.#toXyzd50())), self.alpha),
    ["oklch" /* OKLCH */]: (self) => new Oklch(...ColorConverter.xyzd50ToOklch(...self.#toXyzd50()), self.alpha),
    ["lab" /* LAB */]: (self) => new Lab(...ColorConverter.xyzd50ToLab(...self.#toXyzd50()), self.alpha),
    ["oklab" /* OKLAB */]: (self) => new Oklab(...ColorConverter.xyzd65ToOklab(...ColorConverter.xyzd50ToD65(...self.#toXyzd50())), self.alpha),
    ["srgb" /* SRGB */]: (self) => new ColorFunction("srgb" /* SRGB */, ...ColorConverter.xyzd50ToSrgb(...self.#toXyzd50()), self.alpha),
    ["srgb-linear" /* SRGB_LINEAR */]: (self) => new ColorFunction("srgb-linear" /* SRGB_LINEAR */, ...ColorConverter.xyzd50TosRGBLinear(...self.#toXyzd50()), self.alpha),
    ["display-p3" /* DISPLAY_P3 */]: (self) => new ColorFunction("display-p3" /* DISPLAY_P3 */, ...ColorConverter.xyzd50ToDisplayP3(...self.#toXyzd50()), self.alpha),
    ["a98-rgb" /* A98_RGB */]: (self) => new ColorFunction("a98-rgb" /* A98_RGB */, ...ColorConverter.xyzd50ToAdobeRGB(...self.#toXyzd50()), self.alpha),
    ["prophoto-rgb" /* PROPHOTO_RGB */]: (self) => new ColorFunction("prophoto-rgb" /* PROPHOTO_RGB */, ...ColorConverter.xyzd50ToProPhoto(...self.#toXyzd50()), self.alpha),
    ["rec2020" /* REC_2020 */]: (self) => new ColorFunction("rec2020" /* REC_2020 */, ...ColorConverter.xyzd50ToRec2020(...self.#toXyzd50()), self.alpha),
    ["xyz" /* XYZ */]: (self) => new ColorFunction("xyz" /* XYZ */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha),
    ["xyz-d50" /* XYZ_D50 */]: (self) => new ColorFunction("xyz-d50" /* XYZ_D50 */, ...self.#toXyzd50(), self.alpha),
    ["xyz-d65" /* XYZ_D65 */]: (self) => new ColorFunction("xyz-d65" /* XYZ_D65 */, ...ColorConverter.xyzd50ToD65(...self.#toXyzd50()), self.alpha)
  };
  #toXyzd50() {
    const [r, g, b] = this.#rgba;
    return ColorConverter.srgbToXyzd50(r, g, b);
  }
  get alpha() {
    switch (this.format()) {
      case "hexa" /* HEXA */:
      case "rgba" /* RGBA */:
        return this.#rgba[3];
      default:
        return null;
    }
  }
  asLegacyColor() {
    return this;
  }
  nickname() {
    const nickname = RGBAToNickname.get(String(this.canonicalRGBA()));
    return nickname ? new Nickname(nickname, this) : null;
  }
  shortHex() {
    for (let i = 0; i < 4; ++i) {
      const c = Math.round(this.#rgba[i] * 255);
      if (c % 17) {
        return null;
      }
    }
    return new ShortHex(this);
  }
  constructor(rgba, format, authoredText) {
    this.#authoredText = authoredText || null;
    this.#format = format;
    this.#rawParams = [rgba[0], rgba[1], rgba[2]];
    this.#rgba = [
      clamp(rgba[0], { min: 0, max: 1 }),
      clamp(rgba[1], { min: 0, max: 1 }),
      clamp(rgba[2], { min: 0, max: 1 }),
      clamp(rgba[3] ?? 1, { min: 0, max: 1 })
    ];
  }
  static fromHex(hex, text) {
    hex = hex.toLowerCase();
    const hasAlpha = hex.length === 4 || hex.length === 8;
    const format = hasAlpha ? "hexa" /* HEXA */ : "hex" /* HEX */;
    const isShort = hex.length <= 4;
    if (isShort) {
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2) + hex.charAt(3) + hex.charAt(3);
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
  static fromRGBAFunction(r, g, b, alpha, text) {
    const rgba = [
      parseRgbNumeric(r),
      parseRgbNumeric(g),
      parseRgbNumeric(b),
      alpha ? parseAlphaNumeric(alpha) : 1
    ];
    if (!Platform.ArrayUtilities.arrayDoesNotContainNullOrUndefined(rgba)) {
      return null;
    }
    return new Legacy(rgba, alpha ? "rgba" /* RGBA */ : "rgb" /* RGB */, text);
  }
  static fromRGBA(rgba, authoredText) {
    return new Legacy([rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3]], "rgba" /* RGBA */, authoredText);
  }
  static fromHSVA(hsva) {
    const rgba = hsva2rgba(hsva);
    return new Legacy(rgba, "rgba" /* RGBA */);
  }
  is(format) {
    return format === this.format();
  }
  as(format) {
    if (format === this.format()) {
      return this;
    }
    return Legacy.#conversions[format](this);
  }
  format() {
    return this.#format;
  }
  hasAlpha() {
    return this.#rgba[3] !== 1;
  }
  detectHEXFormat() {
    const hasAlpha = this.hasAlpha();
    return hasAlpha ? "hexa" /* HEXA */ : "hex" /* HEX */;
  }
  asString(format) {
    if (format) {
      return this.as(format).asString();
    }
    return this.#stringify(format, this.#rgba[0], this.#rgba[1], this.#rgba[2]);
  }
  #stringify(format, r, g, b) {
    if (!format) {
      format = this.#format;
    }
    function toHexValue(value) {
      const hex = Math.round(value * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }
    switch (format) {
      case "rgb" /* RGB */:
      case "rgba" /* RGBA */: {
        const start = Platform.StringUtilities.sprintf("rgb(%d %d %d", toRgbValue(r), toRgbValue(g), toRgbValue(b));
        if (this.hasAlpha()) {
          return start + Platform.StringUtilities.sprintf(" / %d%)", Math.round(this.#rgba[3] * 100));
        }
        return start + ")";
      }
      case "hex" /* HEX */:
      case "hexa" /* HEXA */: {
        if (this.hasAlpha()) {
          return Platform.StringUtilities.sprintf("#%s%s%s%s", toHexValue(r), toHexValue(g), toHexValue(b), toHexValue(this.#rgba[3])).toLowerCase();
        }
        return Platform.StringUtilities.sprintf("#%s%s%s", toHexValue(r), toHexValue(g), toHexValue(b)).toLowerCase();
      }
    }
  }
  getAuthoredText() {
    return this.#authoredText ?? null;
  }
  getRawParameters() {
    return [...this.#rawParams];
  }
  getAsRawString(format) {
    if (format) {
      return this.as(format).getAsRawString();
    }
    return this.#stringify(format, ...this.#rawParams);
  }
  isGamutClipped() {
    return !equals(
      this.#rawParams.map(toRgbValue),
      [this.#rgba[0], this.#rgba[1], this.#rgba[2]].map(toRgbValue),
      WIDE_RANGE_EPSILON
    );
  }
  rgba() {
    return [...this.#rgba];
  }
  canonicalRGBA() {
    const rgba = new Array(4);
    for (let i = 0; i < 3; ++i) {
      rgba[i] = Math.round(this.#rgba[i] * 255);
    }
    rgba[3] = this.#rgba[3];
    return rgba;
  }
  toProtocolRGBA() {
    const rgba = this.canonicalRGBA();
    const result = { r: rgba[0], g: rgba[1], b: rgba[2], a: void 0 };
    if (rgba[3] !== 1) {
      result.a = rgba[3];
    }
    return result;
  }
  invert() {
    const rgba = [0, 0, 0, 0];
    rgba[0] = 1 - this.#rgba[0];
    rgba[1] = 1 - this.#rgba[1];
    rgba[2] = 1 - this.#rgba[2];
    rgba[3] = this.#rgba[3];
    return new Legacy(rgba, "rgba" /* RGBA */);
  }
  /**
   * Returns a new color using the NTSC formula for making a RGB color grayscale.
   * Note: We override with an alpha of 50% to enhance the dimming effect.
   */
  grayscale() {
    const [r, g, b] = this.#rgba;
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    return new Legacy([gray, gray, gray, 0.5], "rgba" /* RGBA */);
  }
  setAlpha(alpha) {
    const rgba = [...this.#rgba];
    rgba[3] = alpha;
    return new Legacy(rgba, "rgba" /* RGBA */);
  }
  blendWith(fgColor) {
    const rgba = blendColors(fgColor.#rgba, this.#rgba);
    return new Legacy(rgba, "rgba" /* RGBA */);
  }
  blendWithAlpha(alpha) {
    const rgba = [...this.#rgba];
    rgba[3] *= alpha;
    return new Legacy(rgba, "rgba" /* RGBA */);
  }
  setFormat(format) {
    this.#format = format;
  }
  equal(other) {
    const legacy = other.as(this.#format);
    return equals(toRgbValue(this.#rgba[0]), toRgbValue(legacy.#rgba[0]), WIDE_RANGE_EPSILON) && equals(toRgbValue(this.#rgba[1]), toRgbValue(legacy.#rgba[1]), WIDE_RANGE_EPSILON) && equals(toRgbValue(this.#rgba[2]), toRgbValue(legacy.#rgba[2]), WIDE_RANGE_EPSILON) && equals(this.#rgba[3], legacy.#rgba[3]);
  }
}
export const Regex = /((?:rgba?|hsla?|hwba?|lab|lch|oklab|oklch|color)\([^)]+\)|#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3,4}|\b[a-zA-Z]+\b(?!-))/g;
export const ColorMixRegex = /color-mix\(.*,\s*(?<firstColor>.+)\s*,\s*(?<secondColor>.+)\s*\)/g;
const COLOR_TO_RGBA_ENTRIES = [
  ["aliceblue", [240, 248, 255]],
  ["antiquewhite", [250, 235, 215]],
  ["aqua", [0, 255, 255]],
  ["aquamarine", [127, 255, 212]],
  ["azure", [240, 255, 255]],
  ["beige", [245, 245, 220]],
  ["bisque", [255, 228, 196]],
  ["black", [0, 0, 0]],
  ["blanchedalmond", [255, 235, 205]],
  ["blue", [0, 0, 255]],
  ["blueviolet", [138, 43, 226]],
  ["brown", [165, 42, 42]],
  ["burlywood", [222, 184, 135]],
  ["cadetblue", [95, 158, 160]],
  ["chartreuse", [127, 255, 0]],
  ["chocolate", [210, 105, 30]],
  ["coral", [255, 127, 80]],
  ["cornflowerblue", [100, 149, 237]],
  ["cornsilk", [255, 248, 220]],
  ["crimson", [237, 20, 61]],
  ["cyan", [0, 255, 255]],
  ["darkblue", [0, 0, 139]],
  ["darkcyan", [0, 139, 139]],
  ["darkgoldenrod", [184, 134, 11]],
  ["darkgray", [169, 169, 169]],
  ["darkgrey", [169, 169, 169]],
  ["darkgreen", [0, 100, 0]],
  ["darkkhaki", [189, 183, 107]],
  ["darkmagenta", [139, 0, 139]],
  ["darkolivegreen", [85, 107, 47]],
  ["darkorange", [255, 140, 0]],
  ["darkorchid", [153, 50, 204]],
  ["darkred", [139, 0, 0]],
  ["darksalmon", [233, 150, 122]],
  ["darkseagreen", [143, 188, 143]],
  ["darkslateblue", [72, 61, 139]],
  ["darkslategray", [47, 79, 79]],
  ["darkslategrey", [47, 79, 79]],
  ["darkturquoise", [0, 206, 209]],
  ["darkviolet", [148, 0, 211]],
  ["deeppink", [255, 20, 147]],
  ["deepskyblue", [0, 191, 255]],
  ["dimgray", [105, 105, 105]],
  ["dimgrey", [105, 105, 105]],
  ["dodgerblue", [30, 144, 255]],
  ["firebrick", [178, 34, 34]],
  ["floralwhite", [255, 250, 240]],
  ["forestgreen", [34, 139, 34]],
  ["fuchsia", [255, 0, 255]],
  ["gainsboro", [220, 220, 220]],
  ["ghostwhite", [248, 248, 255]],
  ["gold", [255, 215, 0]],
  ["goldenrod", [218, 165, 32]],
  ["gray", [128, 128, 128]],
  ["grey", [128, 128, 128]],
  ["green", [0, 128, 0]],
  ["greenyellow", [173, 255, 47]],
  ["honeydew", [240, 255, 240]],
  ["hotpink", [255, 105, 180]],
  ["indianred", [205, 92, 92]],
  ["indigo", [75, 0, 130]],
  ["ivory", [255, 255, 240]],
  ["khaki", [240, 230, 140]],
  ["lavender", [230, 230, 250]],
  ["lavenderblush", [255, 240, 245]],
  ["lawngreen", [124, 252, 0]],
  ["lemonchiffon", [255, 250, 205]],
  ["lightblue", [173, 216, 230]],
  ["lightcoral", [240, 128, 128]],
  ["lightcyan", [224, 255, 255]],
  ["lightgoldenrodyellow", [250, 250, 210]],
  ["lightgreen", [144, 238, 144]],
  ["lightgray", [211, 211, 211]],
  ["lightgrey", [211, 211, 211]],
  ["lightpink", [255, 182, 193]],
  ["lightsalmon", [255, 160, 122]],
  ["lightseagreen", [32, 178, 170]],
  ["lightskyblue", [135, 206, 250]],
  ["lightslategray", [119, 136, 153]],
  ["lightslategrey", [119, 136, 153]],
  ["lightsteelblue", [176, 196, 222]],
  ["lightyellow", [255, 255, 224]],
  ["lime", [0, 255, 0]],
  ["limegreen", [50, 205, 50]],
  ["linen", [250, 240, 230]],
  ["magenta", [255, 0, 255]],
  ["maroon", [128, 0, 0]],
  ["mediumaquamarine", [102, 205, 170]],
  ["mediumblue", [0, 0, 205]],
  ["mediumorchid", [186, 85, 211]],
  ["mediumpurple", [147, 112, 219]],
  ["mediumseagreen", [60, 179, 113]],
  ["mediumslateblue", [123, 104, 238]],
  ["mediumspringgreen", [0, 250, 154]],
  ["mediumturquoise", [72, 209, 204]],
  ["mediumvioletred", [199, 21, 133]],
  ["midnightblue", [25, 25, 112]],
  ["mintcream", [245, 255, 250]],
  ["mistyrose", [255, 228, 225]],
  ["moccasin", [255, 228, 181]],
  ["navajowhite", [255, 222, 173]],
  ["navy", [0, 0, 128]],
  ["oldlace", [253, 245, 230]],
  ["olive", [128, 128, 0]],
  ["olivedrab", [107, 142, 35]],
  ["orange", [255, 165, 0]],
  ["orangered", [255, 69, 0]],
  ["orchid", [218, 112, 214]],
  ["palegoldenrod", [238, 232, 170]],
  ["palegreen", [152, 251, 152]],
  ["paleturquoise", [175, 238, 238]],
  ["palevioletred", [219, 112, 147]],
  ["papayawhip", [255, 239, 213]],
  ["peachpuff", [255, 218, 185]],
  ["peru", [205, 133, 63]],
  ["pink", [255, 192, 203]],
  ["plum", [221, 160, 221]],
  ["powderblue", [176, 224, 230]],
  ["purple", [128, 0, 128]],
  ["rebeccapurple", [102, 51, 153]],
  ["red", [255, 0, 0]],
  ["rosybrown", [188, 143, 143]],
  ["royalblue", [65, 105, 225]],
  ["saddlebrown", [139, 69, 19]],
  ["salmon", [250, 128, 114]],
  ["sandybrown", [244, 164, 96]],
  ["seagreen", [46, 139, 87]],
  ["seashell", [255, 245, 238]],
  ["sienna", [160, 82, 45]],
  ["silver", [192, 192, 192]],
  ["skyblue", [135, 206, 235]],
  ["slateblue", [106, 90, 205]],
  ["slategray", [112, 128, 144]],
  ["slategrey", [112, 128, 144]],
  ["snow", [255, 250, 250]],
  ["springgreen", [0, 255, 127]],
  ["steelblue", [70, 130, 180]],
  ["tan", [210, 180, 140]],
  ["teal", [0, 128, 128]],
  ["thistle", [216, 191, 216]],
  ["tomato", [255, 99, 71]],
  ["turquoise", [64, 224, 208]],
  ["violet", [238, 130, 238]],
  ["wheat", [245, 222, 179]],
  ["white", [255, 255, 255]],
  ["whitesmoke", [245, 245, 245]],
  ["yellow", [255, 255, 0]],
  ["yellowgreen", [154, 205, 50]],
  ["transparent", [0, 0, 0, 0]]
];
console.assert(
  COLOR_TO_RGBA_ENTRIES.every(([nickname]) => nickname.toLowerCase() === nickname),
  "All color nicknames must be lowercase."
);
export const Nicknames = new Map(COLOR_TO_RGBA_ENTRIES);
const RGBAToNickname = new Map(
  // Default opacity to 1 if the color only specified 3 channels
  COLOR_TO_RGBA_ENTRIES.map(([nickname, [r, g, b, a = 1]]) => {
    return [String([r, g, b, a]), nickname];
  })
);
const LAYOUT_LINES_HIGHLIGHT_COLOR = [127, 32, 210];
export const PageHighlight = {
  Content: Legacy.fromRGBA([111, 168, 220, 0.66]),
  ContentLight: Legacy.fromRGBA([111, 168, 220, 0.5]),
  ContentOutline: Legacy.fromRGBA([9, 83, 148]),
  Padding: Legacy.fromRGBA([147, 196, 125, 0.55]),
  PaddingLight: Legacy.fromRGBA([147, 196, 125, 0.4]),
  Border: Legacy.fromRGBA([255, 229, 153, 0.66]),
  BorderLight: Legacy.fromRGBA([255, 229, 153, 0.5]),
  Margin: Legacy.fromRGBA([246, 178, 107, 0.66]),
  MarginLight: Legacy.fromRGBA([246, 178, 107, 0.5]),
  EventTarget: Legacy.fromRGBA([255, 196, 196, 0.66]),
  Shape: Legacy.fromRGBA([96, 82, 177, 0.8]),
  ShapeMargin: Legacy.fromRGBA([96, 82, 127, 0.6]),
  CssGrid: Legacy.fromRGBA([75, 0, 130, 1]),
  LayoutLine: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 1]),
  GridBorder: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 1]),
  GapBackground: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 0.3]),
  GapHatch: Legacy.fromRGBA([...LAYOUT_LINES_HIGHLIGHT_COLOR, 0.8]),
  GridAreaBorder: Legacy.fromRGBA([26, 115, 232, 1])
};
export const SourceOrderHighlight = {
  ParentOutline: Legacy.fromRGBA([224, 90, 183, 1]),
  ChildOutline: Legacy.fromRGBA([0, 120, 212, 1])
};
export const IsolationModeHighlight = {
  Resizer: Legacy.fromRGBA([222, 225, 230, 1]),
  // --color-background-elevation-2
  ResizerHandle: Legacy.fromRGBA([166, 166, 166, 1]),
  Mask: Legacy.fromRGBA([248, 249, 249, 1])
};
export class Generator {
  #hueSpace;
  #satSpace;
  #lightnessSpace;
  #alphaSpace;
  #colors = /* @__PURE__ */ new Map();
  constructor(hueSpace, satSpace, lightnessSpace, alphaSpace) {
    this.#hueSpace = hueSpace || { min: 0, max: 360, count: void 0 };
    this.#satSpace = satSpace || 67;
    this.#lightnessSpace = lightnessSpace || 80;
    this.#alphaSpace = alphaSpace || 1;
  }
  setColorForID(id, color) {
    this.#colors.set(id, color);
  }
  colorForID(id) {
    let color = this.#colors.get(id);
    if (!color) {
      color = this.generateColorForID(id);
      this.#colors.set(id, color);
    }
    return color;
  }
  generateColorForID(id) {
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
  indexToValueInSpace(index, space) {
    if (typeof space === "number") {
      return space;
    }
    const count = space.count || space.max - space.min;
    index %= count;
    return space.min + Math.floor(index / (count - 1) * (space.max - space.min));
  }
}
//# sourceMappingURL=Color.js.map
