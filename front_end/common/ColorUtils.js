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
