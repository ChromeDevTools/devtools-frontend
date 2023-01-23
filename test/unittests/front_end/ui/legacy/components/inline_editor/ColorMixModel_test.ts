// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InlineEditor from '../../../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';

const {assert} = chai;

describe('ColorMixModel', () => {
  it('should parse a normal case', () => {
    const colorMixModel = InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb, red, blue)');

    assert.deepEqual(colorMixModel?.parts, [
      {
        name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
        value: 'in srgb',
      },
      {
        name: InlineEditor.ColorMixModel.PartName.Param,
        value: [{
          name: InlineEditor.ColorMixModel.PartName.Value,
          value: 'red',
        }],
      },
      {
        name: InlineEditor.ColorMixModel.PartName.Param,
        value: [{name: InlineEditor.ColorMixModel.PartName.Value, value: 'blue'}],
      },
    ]);
  });

  it('should extra whitespace be removed from the arguments', () => {
    const colorMixModel = InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in    srgb   ,   red   , blue   )');

    assert.deepEqual(colorMixModel?.parts, [
      {
        name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
        value: 'in srgb',
      },
      {
        name: InlineEditor.ColorMixModel.PartName.Param,
        value: [{
          name: InlineEditor.ColorMixModel.PartName.Value,
          value: 'red',
        }],
      },
      {
        name: InlineEditor.ColorMixModel.PartName.Param,
        value: [{name: InlineEditor.ColorMixModel.PartName.Value, value: 'blue'}],
      },
    ]);
  });

  it('should parse interpolation method with variable', () => {
    const colorMixModel = InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in lch var(--space), red, blue)');

    assert.deepEqual(colorMixModel?.parts, [
      {
        name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
        value: 'in lch var(--space)',
      },
      {
        name: InlineEditor.ColorMixModel.PartName.Param,
        value: [{
          name: InlineEditor.ColorMixModel.PartName.Value,
          value: 'red',
        }],
      },
      {
        name: InlineEditor.ColorMixModel.PartName.Param,
        value: [{name: InlineEditor.ColorMixModel.PartName.Value, value: 'blue'}],
      },
    ]);
  });

  describe('for different kinds of values', () => {
    it('should parse with a variable in first position', () => {
      const colorMixModel = InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb, var(--a), blue)');

      assert.deepEqual(colorMixModel?.parts, [
        {
          name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
          value: 'in srgb',
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'var(--a)',
          }],
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'blue',
          }],
        },
      ]);
    });

    it('should parse with a variable in second position', () => {
      const colorMixModel = InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb, blue, var(--a))');

      assert.deepEqual(colorMixModel?.parts, [
        {
          name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
          value: 'in srgb',
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'blue',
          }],
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'var(--a)',
          }],
        },

      ]);
    });

    it('should parse with a color defined with rgba', () => {
      const colorMixModel = InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb, rgba(0 0 0 / 1), red)');

      assert.deepEqual(colorMixModel?.parts, [
        {
          name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
          value: 'in srgb',
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'rgba(0 0 0 / 1)',
          }],
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'red',
          }],
        },

      ]);
    });

    it('should parse with a color defined with color-mix', () => {
      const colorMixModel =
          InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb, color-mix(in lch, red, blue), red)');

      assert.deepEqual(colorMixModel?.parts, [
        {
          name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
          value: 'in srgb',
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'color-mix(in lch, red, blue)',
          }],
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'red',
          }],
        },
      ]);
    });

    it('should parse with a color defined with hex values', () => {
      const colorMixModel = InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb, #000000, red)');

      assert.deepEqual(colorMixModel?.parts, [
        {
          name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
          value: 'in srgb',
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: '#000000',
          }],
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'red',
          }],
        },
      ]);
    });

    it('should parse with hue interpolation case', () => {
      const colorMixModel =
          InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb increasing hue, red, blue)');

      assert.deepEqual(colorMixModel?.parts, [
        {
          name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
          value: 'in srgb increasing hue',
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'red',
          }],
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'blue',
          }],
        },
      ]);
    });
  });

  describe('mixed with percentages', () => {
    it('percentage on the right', () => {
      const colorMixModel = InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb, red 20%, blue)');

      assert.deepEqual(colorMixModel?.parts, [
        {
          name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
          value: 'in srgb',
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [
            {
              name: InlineEditor.ColorMixModel.PartName.Value,
              value: 'red',
            },
            {
              name: InlineEditor.ColorMixModel.PartName.Percentage,
              value: '20%',
            },
          ],
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'blue',
          }],
        },
      ]);
    });

    it('percentage on the left', () => {
      const colorMixModel = InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb, 20% red, blue)');

      assert.deepEqual(colorMixModel?.parts, [
        {
          name: InlineEditor.ColorMixModel.PartName.InterpolationMethod,
          value: 'in srgb',
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [
            {
              name: InlineEditor.ColorMixModel.PartName.Percentage,
              value: '20%',
            },
            {
              name: InlineEditor.ColorMixModel.PartName.Value,
              value: 'red',
            },
          ],
        },
        {
          name: InlineEditor.ColorMixModel.PartName.Param,
          value: [{
            name: InlineEditor.ColorMixModel.PartName.Value,
            value: 'blue',
          }],
        },
      ]);
    });
  });

  describe('parse in wrong syntax', () => {
    it('should return null when color interpolation text does not start with in', () => {
      assert.isNull(InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(srgb, red red, blue)'));
    });

    it('should return null when there are multiple values in one part', () => {
      assert.isNull(InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb, red red, blue)'));
    });

    it('should return null when there are percentages values in one part', () => {
      assert.isNull(InlineEditor.ColorMixModel.ColorMixModel.parse('color-mix(in srgb, red 20% 20%, blue)'));
    });
  });
});
