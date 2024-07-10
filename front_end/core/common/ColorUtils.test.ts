// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

describe('ColorUtils', () => {
  it('is able to blend two colors according to alpha blending', () => {
    const firstColor: Common.ColorUtils.Color4D = [1, 0, 0, 1];
    const secondColor: Common.ColorUtils.Color4D = [0, 0, 1, 1];
    const result = Common.ColorUtils.blendColors(firstColor, secondColor);
    assert.deepEqual(result, [1, 0, 0, 1], 'colors were not blended successfully');
  });

  it('is able to convert RGBA to HSLA', () => {
    const result = Common.ColorUtils.rgbaToHsla([0.5, 0.5, 0.5, 0.5]);
    assert.deepEqual(result, [0, 0, 0.5, 0.5], 'RGBA color was not converted to HSLA successfully');
  });

  it('is able to convert RGBA to HWB', () => {
    const result = Common.ColorUtils.rgbaToHwba([0.5, 0.5, 0.5, 0.5]);
    assert.deepEqual(result, [0, 0.5, 0.5, 0.5], 'RGBA color was not converted to HWB successfully');
  });

  it('is able to return the luminance of an RGBA value with the RGB values more than 0.04045', () => {
    const lum = Common.ColorUtils.luminance([0.5, 0.5, 0.5, 0.5]);
    assert.strictEqual(lum, 0.21404114048223255, 'luminance was not calculated correctly');
  });

  it('is able to return the luminance of an RGBA value with the RGB values less than 0.04045', () => {
    const lum = Common.ColorUtils.luminance([0.03927, 0.03927, 0.03927, 0.5]);
    assert.strictEqual(lum, 0.003039473684210526, 'luminance was not calculated correctly');
  });

  it('is able to calculate the contrast ratio between two colors', () => {
    const firstColor: Common.ColorUtils.Color4D = [1, 0, 0, 1];
    const secondColor: Common.ColorUtils.Color4D = [0, 0, 1, 1];
    assert.strictEqual(
        Common.ColorUtils.contrastRatio(firstColor, secondColor), 2.148936170212766,
        'contrast ratio was not calculated correctly');
  });

  it('is able to calculate the contrast ratio (APCA) between two colors', () => {
    const tests = [
      {
        fgColor: 'red',
        bgColor: 'blue',
        expectedContrast: -20.3,
      },
      {
        fgColor: '#333333',
        bgColor: '#444444',
        expectedContrast: 0.0,
      },
      {
        fgColor: '#888',
        bgColor: '#FFF',
        expectedContrast: 63.1,
      },
      {
        fgColor: '#aaa',
        bgColor: '#000',
        expectedContrast: -56.2,
      },
      {
        fgColor: '#def',
        bgColor: '#123',
        expectedContrast: -93.1,
      },
      {
        fgColor: '#123',
        bgColor: '#234',
        expectedContrast: 0.0,
      },
      {
        fgColor: 'rgb(158 158 158)',
        bgColor: 'white',
        expectedContrast: 52.1,
      },
      {
        fgColor: 'rgba(0 0 0 / 38%)',
        bgColor: 'white',
        expectedContrast: 52.1,
      },
    ];
    for (const test of tests) {
      const fg = Common.Color.parse(test.fgColor)?.asLegacyColor();
      const bg = Common.Color.parse(test.bgColor)?.asLegacyColor();
      if (!fg || !bg) {
        assert.fail(`Failed to parse foreground and/or background color: ${test.fgColor}, ${test.bgColor}`);
        return;
      }
      assert.closeTo(Common.ColorUtils.contrastRatioAPCA(fg.rgba(), bg.rgba()), test.expectedContrast, 0.1);
    }
  });

  it('is able to find APCA threshold by font size and weight', () => {
    assert.deepEqual(Common.ColorUtils.getAPCAThreshold('11px', '100'), null);
    assert.deepEqual(Common.ColorUtils.getAPCAThreshold('121px', '100'), 60);
    assert.deepEqual(Common.ColorUtils.getAPCAThreshold('16px', '100'), null);
    assert.deepEqual(Common.ColorUtils.getAPCAThreshold('16px', '400'), 90);
    assert.deepEqual(Common.ColorUtils.getAPCAThreshold('16px', '900'), 50);
  });

  it('is able to find AA/AAA thresholds', () => {
    assert.deepEqual(Common.ColorUtils.getContrastThreshold('11px', '100'), {aa: 4.5, aaa: 7});
    assert.deepEqual(Common.ColorUtils.getContrastThreshold('121px', '100'), {aa: 3, aaa: 4.5});
    assert.deepEqual(Common.ColorUtils.getContrastThreshold('16px', '100'), {aa: 4.5, aaa: 7});
    assert.deepEqual(Common.ColorUtils.getContrastThreshold('16px', '400'), {aa: 4.5, aaa: 7});
    assert.deepEqual(Common.ColorUtils.getContrastThreshold('16px', '900'), {aa: 4.5, aaa: 7});
  });
});
