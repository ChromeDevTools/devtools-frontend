// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
const roundAndStringify = (arr) => arr.map(el => Platform.StringUtilities.stringifyWithPrecision(el, 2));
const functionParamsText = (values) => {
    return `${values[0]} ${values[1]} ${values[2]} / ${values[3]}`;
};
export const colorFormatSpec = {
    ["rgb" /* Common.Color.Format.RGB */]: {
        label: 'RGBA',
        toValues: function (color) {
            return roundAndStringify(color.as("rgba" /* Common.Color.Format.RGBA */).canonicalRGBA());
        },
        fromValues: function (values) {
            return Common.Color.parse(`rgb(${functionParamsText(values)})`);
        },
    },
    ["hsl" /* Common.Color.Format.HSL */]: {
        label: 'HSLA',
        toValues: function (color) {
            const canonicalHslParams = roundAndStringify(color.as("hsla" /* Common.Color.Format.HSLA */).canonicalHSLA());
            canonicalHslParams[1] = canonicalHslParams[1] + '%';
            canonicalHslParams[2] = canonicalHslParams[2] + '%';
            return canonicalHslParams;
        },
        fromValues: function (values) {
            return Common.Color.parse(`hsl(${functionParamsText(values)})`);
        },
    },
    ["hwb" /* Common.Color.Format.HWB */]: {
        label: 'HWBA',
        toValues: function (color) {
            const canonicalHwbParams = roundAndStringify(color.as("hwba" /* Common.Color.Format.HWBA */).canonicalHWBA());
            canonicalHwbParams[1] = canonicalHwbParams[1] + '%';
            canonicalHwbParams[2] = canonicalHwbParams[2] + '%';
            return canonicalHwbParams;
        },
        fromValues: function (values) {
            return Common.Color.parse(`hwb(${functionParamsText(values)})`);
        },
    },
    ["lch" /* Common.Color.Format.LCH */]: {
        label: 'lchA',
        toValues: function (color) {
            const lchColor = color.as("lch" /* Common.Color.Format.LCH */);
            return roundAndStringify([lchColor.l, lchColor.c, lchColor.h, lchColor.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`lch(${functionParamsText(values)})`);
        },
    },
    ["oklch" /* Common.Color.Format.OKLCH */]: {
        label: 'lchA',
        toValues: function (color) {
            const lchColor = color.as("oklch" /* Common.Color.Format.OKLCH */);
            return roundAndStringify([lchColor.l, lchColor.c, lchColor.h, lchColor.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`oklch(${functionParamsText(values)})`);
        },
    },
    ["lab" /* Common.Color.Format.LAB */]: {
        label: 'labA',
        toValues: function (color) {
            const labColor = color.as("lab" /* Common.Color.Format.LAB */);
            return roundAndStringify([labColor.l, labColor.a, labColor.b, labColor.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`lab(${functionParamsText(values)})`);
        },
    },
    ["oklab" /* Common.Color.Format.OKLAB */]: {
        label: 'labA',
        toValues: function (color) {
            const labColor = color.as("oklab" /* Common.Color.Format.OKLAB */);
            return roundAndStringify([labColor.l, labColor.a, labColor.b, labColor.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`oklab(${functionParamsText(values)})`);
        },
    },
    ["srgb" /* Common.Color.Format.SRGB */]: {
        label: 'RGBA',
        toValues: function (color) {
            const srgbColor = color.as("srgb" /* Common.Color.Format.SRGB */);
            return roundAndStringify([srgbColor.p0, srgbColor.p1, srgbColor.p2, srgbColor.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`color(${"srgb" /* Common.Color.Format.SRGB */} ${functionParamsText(values)})`);
        },
    },
    ["srgb-linear" /* Common.Color.Format.SRGB_LINEAR */]: {
        label: 'RGBA',
        toValues: function (color) {
            const srgbLinearColor = color.as("srgb-linear" /* Common.Color.Format.SRGB_LINEAR */);
            return roundAndStringify([srgbLinearColor.p0, srgbLinearColor.p1, srgbLinearColor.p2, srgbLinearColor.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`color(${"srgb-linear" /* Common.Color.Format.SRGB_LINEAR */} ${functionParamsText(values)})`);
        },
    },
    ["display-p3" /* Common.Color.Format.DISPLAY_P3 */]: {
        label: 'RGBA',
        toValues(color) {
            const displayP3Color = color.as("display-p3" /* Common.Color.Format.DISPLAY_P3 */);
            return roundAndStringify([displayP3Color.p0, displayP3Color.p1, displayP3Color.p2, 1]);
        },
        fromValues(values) {
            return Common.Color.parse(`color(${"display-p3" /* Common.Color.Format.DISPLAY_P3 */} ${functionParamsText(values)})`);
        },
    },
    ["a98-rgb" /* Common.Color.Format.A98_RGB */]: {
        label: 'RGBA',
        toValues: function (color) {
            const a98Color = color.as("a98-rgb" /* Common.Color.Format.A98_RGB */);
            return roundAndStringify([a98Color.p0, a98Color.p1, a98Color.p2, a98Color.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`color(${"a98-rgb" /* Common.Color.Format.A98_RGB */} ${functionParamsText(values)})`);
        },
    },
    ["prophoto-rgb" /* Common.Color.Format.PROPHOTO_RGB */]: {
        label: 'RGBA',
        toValues: function (color) {
            const proPhotoRGBColor = color.as("prophoto-rgb" /* Common.Color.Format.PROPHOTO_RGB */);
            return roundAndStringify([proPhotoRGBColor.p0, proPhotoRGBColor.p1, proPhotoRGBColor.p2, proPhotoRGBColor.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`color(${"prophoto-rgb" /* Common.Color.Format.PROPHOTO_RGB */} ${functionParamsText(values)})`);
        },
    },
    ["rec2020" /* Common.Color.Format.REC_2020 */]: {
        label: 'RGBA',
        toValues: function (color) {
            const rec2020Color = color.as("rec2020" /* Common.Color.Format.REC_2020 */);
            return roundAndStringify([rec2020Color.p0, rec2020Color.p1, rec2020Color.p2, rec2020Color.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`color(${"rec2020" /* Common.Color.Format.REC_2020 */} ${functionParamsText(values)})`);
        },
    },
    ["xyz" /* Common.Color.Format.XYZ */]: {
        label: 'xyzA',
        toValues: function (color) {
            const xyzColor = color.as("xyz" /* Common.Color.Format.XYZ */);
            return roundAndStringify([xyzColor.p0, xyzColor.p1, xyzColor.p2, xyzColor.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`color(${"xyz" /* Common.Color.Format.XYZ */} ${functionParamsText(values)})`);
        },
    },
    ["xyz-d50" /* Common.Color.Format.XYZ_D50 */]: {
        label: 'xyzA',
        toValues: function (color) {
            const xyzColor = color.as("xyz-d50" /* Common.Color.Format.XYZ_D50 */);
            return roundAndStringify([xyzColor.p0, xyzColor.p1, xyzColor.p2, xyzColor.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`color(${"xyz-d50" /* Common.Color.Format.XYZ_D50 */} ${functionParamsText(values)})`);
        },
    },
    ["xyz-d65" /* Common.Color.Format.XYZ_D65 */]: {
        label: 'xyzA',
        toValues: function (color) {
            const xyzColor = color.as("xyz-d65" /* Common.Color.Format.XYZ_D65 */);
            return roundAndStringify([xyzColor.p0, xyzColor.p1, xyzColor.p2, xyzColor.alpha ?? 1]);
        },
        fromValues: function (values) {
            return Common.Color.parse(`color(${"xyz-d65" /* Common.Color.Format.XYZ_D65 */} ${functionParamsText(values)})`);
        },
    },
};
//# sourceMappingURL=ColorFormatSpec.js.map