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

/**
 * Calculate the contrast ratio between a foreground and a background color.
 * Returns the percentage of the predicted visual contrast.
 * See resources at https://w3c.github.io/silver/guidelines/methods/Method-font-characteristic-contrast.html
 *
 * @param {!Array<number>} fgRGBA
 * @param {!Array<number>} bgRGBA
 * @return {number}
 */
export function contrastRatioAPCA(fgRGBA, bgRGBA) {
  fgRGBA = [...fgRGBA];
  bgRGBA = [...bgRGBA];
  // Linearize the gamma encoded RGB channels by applying a simple exponent.
  for (let i = 0; i <= 2; i++) {
    fgRGBA[i] = Math.pow(fgRGBA[i], 2.218);
    bgRGBA[i] = Math.pow(bgRGBA[i], 2.218);
  }

  // Find relative luminance.
  // TODO(alexrudenko): it appears to be a different kind of luminance compared to one in luminance().
  let bgLuminance = 0.2126 * bgRGBA[0] + 0.7156 * bgRGBA[1] + 0.0722 * bgRGBA[2];
  let fgLuminance = 0.2126 * fgRGBA[0] + 0.7156 * fgRGBA[1] + 0.0722 * fgRGBA[2];

  // Constants for basic APCA version.
  const normBgExp = 0.38;
  const normFgExp = 0.43;
  const revBgExp = 0.5;
  const revFgExp = 0.43;
  const blkThrs = 0.02;
  const blkClmp = 1.75;

  if (bgLuminance > fgLuminance) {
    fgLuminance =
        (fgLuminance > blkThrs) ? fgLuminance : fgLuminance + Math.pow(Math.abs(fgLuminance - blkThrs), blkClmp);
    const result = (Math.pow(bgLuminance, normBgExp) - Math.pow(fgLuminance, normFgExp)) * 161.8;
    return result >= 15 ? result : 0;
  }

  bgLuminance =
      (bgLuminance > blkThrs) ? bgLuminance : bgLuminance + Math.pow(Math.abs(bgLuminance - blkThrs), blkClmp);
  const result = (Math.pow(bgLuminance, revBgExp) - Math.pow(fgLuminance, revFgExp)) * 161.8;
  return result <= -15 ? result : 0;
}
