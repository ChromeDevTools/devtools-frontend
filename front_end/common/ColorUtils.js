// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Combine the two given colors according to alpha blending.
 * @param {!Array<number>} fgRGBA
 * @param {!Array<number>} bgRGBA
 * @return {!Array<number>}
 */
export function blendColors(fgRGBA, bgRGBA) {
  const alpha = fgRGBA[3];
  return [
    ((1 - alpha) * bgRGBA[0]) + (alpha * fgRGBA[0]),
    ((1 - alpha) * bgRGBA[1]) + (alpha * fgRGBA[1]),
    ((1 - alpha) * bgRGBA[2]) + (alpha * fgRGBA[2]),
    alpha + (bgRGBA[3] * (1 - alpha)),
  ];
}

/**
 * @param {!Array<number>} rgba
 * @return {!Array<number>}
 */
export function rgbaToHsla([r, g, b, a]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const sum = max + min;

  let h;
  if (min === max) {
    h = 0;
  } else if (r === max) {
    h = ((1 / 6 * (g - b) / diff) + 1) % 1;
  } else if (g === max) {
    h = (1 / 6 * (b - r) / diff) + 1 / 3;
  } else {
    h = (1 / 6 * (r - g) / diff) + 2 / 3;
  }

  const l = 0.5 * sum;

  let s;
  if (l === 0) {
    s = 0;
  } else if (l === 1) {
    s = 0;
  } else if (l <= 0.5) {
    s = diff / sum;
  } else {
    s = diff / (2 - sum);
  }

  return [h, s, l, a];
}

/**
* Calculate the luminance of this color using the WCAG algorithm.
* See http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
* @param {!Array<number>} rgba
* @return {number}
*/
export function luminance([rSRGB, gSRGB, bSRGB]) {
  const r = rSRGB <= 0.03928 ? rSRGB / 12.92 : Math.pow(((rSRGB + 0.055) / 1.055), 2.4);
  const g = gSRGB <= 0.03928 ? gSRGB / 12.92 : Math.pow(((gSRGB + 0.055) / 1.055), 2.4);
  const b = bSRGB <= 0.03928 ? bSRGB / 12.92 : Math.pow(((bSRGB + 0.055) / 1.055), 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate the contrast ratio between a foreground and a background color.
 * Returns the ratio to 1, for example for two two colors with a contrast ratio of 21:1, this function will return 21.
 * See http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef
 * @param {!Array<number>} fgRGBA
 * @param {!Array<number>} bgRGBA
 * @return {number}
 */
export function contrastRatio(fgRGBA, bgRGBA) {
  const blendedFg = blendColors(fgRGBA, bgRGBA);
  const fgLuminance = luminance(blendedFg);
  const bgLuminance = luminance(bgRGBA);
  const contrastRatio = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);
  return contrastRatio;
}

// Constants for basic APCA version.
// See https://github.com/Myndex/SAPC-APCA
const sRGBtrc = 2.218;
const normBgExp = 0.38;
const normFgExp = 0.43;
const revBgExp = 0.5;
const revFgExp = 0.43;
const blkThrs = 0.02;
const blkClmp = 1.33;
const scaleBoW = 161.8;
const scaleWoB = 161.8;

/**
* Calculate relative luminance of a color.
* See https://github.com/Myndex/SAPC-APCA
* @param {!Array<number>} rgba
* @return {number}
*/
export function luminanceAPCA([rSRGB, gSRGB, bSRGB]) {
  const r = Math.pow(rSRGB, sRGBtrc);
  const g = Math.pow(gSRGB, sRGBtrc);
  const b = Math.pow(bSRGB, sRGBtrc);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate the contrast ratio between a foreground and a background color.
 * Returns the percentage of the predicted visual contrast.
 * See https://github.com/Myndex/SAPC-APCA
 *
 * @param {!Array<number>} fgRGBA
 * @param {!Array<number>} bgRGBA
 * @return {number}
 */
export function contrastRatioAPCA(fgRGBA, bgRGBA) {
  return contrastRatioByLuminanceAPCA(luminanceAPCA(fgRGBA), luminanceAPCA(bgRGBA));
}

/**
 * @param {number} fgLuminance
 * @param {number} bgLuminance
 */
export function contrastRatioByLuminanceAPCA(fgLuminance, bgLuminance) {
  if (bgLuminance >= fgLuminance) {  // Black text on white.
    fgLuminance =
        (fgLuminance > blkThrs) ? fgLuminance : fgLuminance + Math.pow(Math.abs(fgLuminance - blkThrs), blkClmp);
    return (Math.pow(bgLuminance, normBgExp) - Math.pow(fgLuminance, normFgExp)) * scaleBoW;
  }
  // White text on black.
  bgLuminance =
      (bgLuminance > blkThrs) ? bgLuminance : (bgLuminance + Math.pow(Math.abs(bgLuminance - blkThrs), blkClmp));
  return (Math.pow(bgLuminance, revBgExp) - Math.pow(fgLuminance, revFgExp)) * scaleWoB;
}

/**
 * Compute a desired luminance given a given luminance and a desired contrast
 * percentage according to APCA.
 * @param {number} luminance The given luminance.
 * @param {number} contrast The desired contrast percentage.
 * @param {boolean} lighter Whether the desired luminance is lighter or darker
 * than the given luminance. If no luminance can be found which meets this
 * requirement, a luminance which meets the inverse requirement will be
 * returned.
 * @return {number} The desired luminance.
 */
export function desiredLuminanceAPCA(luminance, contrast, lighter) {
  function computeLuminance() {
    if (!lighter) {  // Black text on white.
      return Math.pow(Math.pow(luminance, normBgExp) - contrast / scaleBoW, 1 / normFgExp);
    }
    // White text on black.
    luminance = (luminance > blkThrs) ? luminance : (luminance + Math.pow(Math.abs(luminance - blkThrs), blkClmp));
    return Math.pow(contrast / scaleWoB + Math.pow(luminance, revBgExp), 1 / revFgExp);
  }
  let desiredLuminance = computeLuminance();
  if (desiredLuminance < 0 || desiredLuminance > 1) {
    lighter = !lighter;
    desiredLuminance = computeLuminance();
  }
  return desiredLuminance;
}

// clang-format off
const contrastAPCALookupTable = [
  // See https://github.com/Myndex/SAPC-APCA
  // font size in px | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 weights
  [12, -1, -1, -1, 120, 100, 90, 80, 80, 80],
  [14, -1, -1, -1, 100, 90, 80, 75, 75, 75],
  [16, -1, -1, 120, 90, 80, 75, 70, 70, 70],
  [18, -1, -1, 110, 80, 75, 70, 67, 65, 65],
  [20, -1, -1, 100, 78, 72, 67, 65, 60, 60],
  [22, -1, -1, 90, 77, 71, 65, 62, 57, 57],
  [24, -1, 120, 80, 75, 70, 65, 60, 55, 55],
  [26, -1, 110, 79, 72, 67, 62, 59, 54, 54],
  [28, -1, 100, 77, 70, 65, 60, 57, 53, 53],
  [32, -1, 90, 76, 67, 62, 57, 53, 50, 48],
  [36, 120, 80, 75, 65, 60, 55, 50, 48, 48],
  [42, 110, 77, 73, 62, 57, 52, 48, 46, 42],
  [48, 100, 75, 70, 60, 55, 50, 45, 42, 40],
  [60, 90, 73, 65, 57, 52, 46, 42, 40, 40],
  [72, 70, 60, 55, 50, 45, 40, 40, 40, 40],
  [96, 80, 60, 55, 50, 45, 40, 40, 40, 40],
  [120, 60, 55, 50, 47, 43, 40, 40, 40, 40],
];
// clang-format on

contrastAPCALookupTable.reverse();

/**
 * @param {string} fontSize
 * @param {string} fontWeight
 * @return {?number}
 */
export function getAPCAThreshold(fontSize, fontWeight) {
  const size = parseFloat(fontSize.replace('px', ''));
  const weight = parseFloat(fontWeight);

  // Go over the table backwards to find the first matching font size and then the weight.
  // Fonts larger than 96px, use the thresholds for 96px.
  // Fonts smaller than 12px, don't get any threshold meaning the font size needs to be increased.
  for (const [rowSize, ...rowWeights] of contrastAPCALookupTable) {
    if (size >= rowSize) {
      for (const [idx, keywordWeight] of [900, 800, 700, 600, 500, 400, 300, 200, 100].entries()) {
        if (weight >= keywordWeight) {
          const threshold = rowWeights[rowWeights.length - 1 - idx];
          return threshold === -1 ? null : threshold;
        }
      }
    }
  }

  return null;
}

/**
 * @param {string} fontSize
 * @param {string} fontWeight
 * @return {boolean}
 */
export function isLargeFont(fontSize, fontWeight) {
  const boldWeights = ['bold', 'bolder', '600', '700', '800', '900'];

  const fontSizePx = parseFloat(fontSize.replace('px', ''));
  const isBold = (boldWeights.indexOf(fontWeight) !== -1);

  const fontSizePt = fontSizePx * 72 / 96;
  if (isBold) {
    return fontSizePt >= 14;
  }
  return fontSizePt >= 18;
}

const contrastThresholds = {
  largeFont: {aa: 3.0, aaa: 4.5},
  normalFont: {aa: 4.5, aaa: 7.0}
};

/**
 * @param {string} fontSize
 * @param {string} fontWeight
 * @return {!{aa: number, aaa: number}}
 */
export function getContrastThreshold(fontSize, fontWeight) {
  if (isLargeFont(fontSize, fontWeight)) {
    return contrastThresholds.largeFont;
  }
  return contrastThresholds.normalFont;
}
