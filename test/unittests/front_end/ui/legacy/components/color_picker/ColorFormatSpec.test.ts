// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as ColorPicker from '../../../../../../../front_end/ui/legacy/components/color_picker/color_picker.js';

describe('ColorFormatSpec for inputs', () => {
  describe('rgb/rgba() format', () => {
    it('should return rounded numbers between 0 - 255 as input values and rounded alpha', () => {
      const color = Common.Color.parse('rgb(224.21 255 157 / 0.324)');
      assertNotNullOrUndefined(color);

      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.RGB];
      const values = spec.toValues(color);

      assert.deepEqual(values, ['224', '255', '157', '0.32']);
    });

    it('should create the color from the input values', () => {
      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.RGB];

      const color = spec.fromValues(['224', '211', '155', '1']);
      assertNotNullOrUndefined(color);

      const expectedColor = Common.Color.parse('rgb(224 211 155 / 1)');
      assertNotNullOrUndefined(expectedColor);
      assert.isTrue(color.equal(expectedColor));
    });
  });

  describe('hsl/hsla() format', () => {
    it('should return rounded numbers with percentages', () => {
      const color = Common.Color.parse('hsl(225deg 6% 13% / 0.324)');
      assertNotNullOrUndefined(color);

      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.HSL];
      const values = spec.toValues(color);

      assert.deepEqual(values, ['225', '6%', '13%', '0.32']);
    });

    it('should create the color from the input values', () => {
      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.HSL];

      const color = spec.fromValues(['225', '6%', '13%', '0.32']);
      assertNotNullOrUndefined(color);

      const expectedColor = Common.Color.parse('hsl(225deg 6% 13% / 0.32)');
      assertNotNullOrUndefined(expectedColor);

      assert.isTrue(color.equal(expectedColor));
    });
  });

  describe('hwb() format', () => {
    it('should return rounded numbers with percentages', () => {
      const color = Common.Color.parse('hwb(225deg 13% 86% / 0.32)');
      assertNotNullOrUndefined(color);

      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.HWB];
      const values = spec.toValues(color);

      assert.deepEqual(values, ['225', '13%', '86%', '0.32']);
    });

    it('should create the color from the input values', () => {
      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.HWB];

      const color = spec.fromValues(['225', '13%', '86%', '0.32']);
      assertNotNullOrUndefined(color);

      const expectedColor = Common.Color.parse('hwb(225deg 13% 86% / 0.32)');
      assertNotNullOrUndefined(expectedColor);

      assert.isTrue(color.equal(expectedColor));
    });
  });

  describe('lch() format', () => {
    it('should return values', () => {
      const color = Common.Color.parse('lch(21 98 0)');
      assertNotNullOrUndefined(color);

      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.LCH];
      const values = spec.toValues(color);

      assert.deepEqual(values, ['21', '98', '0', '1']);
    });

    it('should create the color from the input values', () => {
      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.LCH];

      const color = spec.fromValues(['55', '98', '0', '0.32']);
      assertNotNullOrUndefined(color);

      const expectedColor = Common.Color.parse('lch(55% 98 0 / 0.32)');
      assertNotNullOrUndefined(expectedColor);

      assert.isTrue(color.equal(expectedColor));
    });
  });

  describe('oklch() format', () => {
    it('should return values', () => {
      const color = Common.Color.parse('oklch(65% 0.26 20deg)');
      assertNotNullOrUndefined(color);

      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.OKLCH];
      const values = spec.toValues(color);

      assert.deepEqual(values, ['0.65', '0.26', '20', '1']);
    });

    it('should create the color from the input values', () => {
      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.OKLCH];

      const color = spec.fromValues(['0.65', '0.26', '20', '1']);
      assertNotNullOrUndefined(color);

      const expectedColor = Common.Color.parse('oklch(65% 0.26 20 / 1)');
      assertNotNullOrUndefined(expectedColor);
      assert.isTrue(color.equal(expectedColor));
    });
  });

  describe('lab() format', () => {
    it('should return values', () => {
      const color = Common.Color.parse('lab(21 98 0)');
      assertNotNullOrUndefined(color);

      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.LAB];
      const values = spec.toValues(color);

      assert.deepEqual(values, ['21', '98', '0', '1']);
    });

    it('should create the color from the input values', () => {
      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.LAB];

      const color = spec.fromValues(['0.21', '98', '0', '1']);
      assertNotNullOrUndefined(color);

      const expectedColor = Common.Color.parse('lab(0.21 98 0 / 1)');
      assertNotNullOrUndefined(expectedColor);
      assert.isTrue(color.equal(expectedColor));
    });
  });

  describe('oklab() format', () => {
    it('should return values', () => {
      const color = Common.Color.parse('oklab(0.12 0.47 -0.03)');
      assertNotNullOrUndefined(color);

      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.OKLAB];
      const values = spec.toValues(color);

      assert.deepEqual(values, ['0.12', '0.47', '-0.03', '1']);
    });

    it('should create the color from the input values', () => {
      const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[Common.Color.Format.OKLAB];

      const color = spec.fromValues(['0.12', '0.47', '-0.03', '1']);
      assertNotNullOrUndefined(color);

      const expectedColor = Common.Color.parse('oklab(0.12 0.47 -0.03 / 1)');
      assertNotNullOrUndefined(expectedColor);
      assert.isTrue(color.equal(expectedColor));
    });
  });

  describe('color() function formats', () => {
    it('should return values', () => {
      for (const colorSpace
               of [Common.Color.Format.SRGB, Common.Color.Format.SRGB_LINEAR, Common.Color.Format.DISPLAY_P3,
                   Common.Color.Format.A98_RGB, Common.Color.Format.PROPHOTO_RGB, Common.Color.Format.REC_2020] as
           const) {
        const color = Common.Color.parse(`color(${colorSpace} 0.12 0.47 -0.03)`);
        assertNotNullOrUndefined(color);

        const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[colorSpace];
        const values = spec.toValues(color);

        assert.deepEqual(values, ['0.12', '0.47', '0', '1'], colorSpace);
      }

      for (const colorSpace of [Common.Color.Format.XYZ, Common.Color.Format.XYZ_D50, Common.Color.Format.XYZ_D65] as
           const) {
        const color = Common.Color.parse(`color(${colorSpace} 0.12 0.47 -0.03)`);
        assertNotNullOrUndefined(color);

        const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[colorSpace];
        const values = spec.toValues(color);

        assert.deepEqual(values, ['0.12', '0.47', '-0.03', '1'], colorSpace);
      }
    });

    it('should create the color from the input values', () => {
      for (const colorSpace
               of [Common.Color.Format.SRGB, Common.Color.Format.SRGB_LINEAR, Common.Color.Format.DISPLAY_P3,
                   Common.Color.Format.A98_RGB, Common.Color.Format.PROPHOTO_RGB, Common.Color.Format.REC_2020,
                   Common.Color.Format.XYZ, Common.Color.Format.XYZ_D50, Common.Color.Format.XYZ_D65] as const) {
        const spec = ColorPicker.ColorFormatSpec.colorFormatSpec[colorSpace];

        const color = spec.fromValues(['0.12', '0.47', '0.1', '1']);
        assertNotNullOrUndefined(color);

        const expectedColor = Common.Color.parse(`color(${colorSpace} 0.12 0.47 0.1 / 1)`);
        assertNotNullOrUndefined(expectedColor);
        assert.isTrue(color.equal(expectedColor), `Colors were not equal for color format ${colorSpace}`);
      }
    });
  });
});
