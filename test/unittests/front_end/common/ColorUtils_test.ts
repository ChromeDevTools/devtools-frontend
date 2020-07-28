// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../front_end/common/common.js';

it('is able to blend two colors according to alpha blending', () => {
  const firstColor = [1, 0, 0, 1];
  const secondColor = [0, 0, 1, 1];
  const result = Common.ColorUtils.blendColors(firstColor, secondColor);
  assert.deepEqual(result, [1, 0, 0, 1], 'colors were not blended successfully');
});

it('is able to convert RGBA to HSLA', () => {
  const result = Common.ColorUtils.rgbaToHsla([0.5, 0.5, 0.5, 0.5]);
  assert.deepEqual(result, [0, 0, 0.5, 0.5], 'RGBA color was not converted to HSLA successfully');
});

it('is able to return the luminance of an RGBA value with the RGB values more than 0.03928', () => {
  const lum = Common.ColorUtils.luminance([0.5, 0.5, 0.5, 0.5]);
  assert.strictEqual(lum, 0.21404114048223255, 'luminance was not calculated correctly');
});

it('is able to return the luminance of an RGBA value with the RGB values less than 0.03928', () => {
  const lum = Common.ColorUtils.luminance([0.03927, 0.03927, 0.03927, 0.5]);
  assert.strictEqual(lum, 0.003039473684210526, 'luminance was not calculated correctly');
});

it('is able to calculate the contrast ratio between two colors', () => {
  const firstColor = [1, 0, 0, 1];
  const secondColor = [0, 0, 1, 1];
  assert.strictEqual(
      Common.ColorUtils.contrastRatio(firstColor, secondColor), 2.148936170212766,
      'contrast ratio was not calculated correctly');
});
