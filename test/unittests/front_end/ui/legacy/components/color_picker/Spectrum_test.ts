// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as ColorPicker from '../../../../../../../front_end/ui/legacy/components/color_picker/color_picker.js';
import * as UI from '../../../../../../../front_end/ui/legacy/legacy.js';
import {deinitializeGlobalVars, initializeGlobalVars} from '../../../../helpers/EnvironmentHelpers.js';

const colorSpecs = [
  {string: 'red', format: Common.Color.Format.Nickname},
  {string: '#ABC', format: Common.Color.Format.ShortHEX},
  {string: '#ABCA', format: Common.Color.Format.ShortHEXA},
  {string: '#ABCDEF', format: Common.Color.Format.HEX},
  {string: '#ABCDEFAA', format: Common.Color.Format.HEXA},
  {string: 'rgb(1, 2, 3)', format: Common.Color.Format.RGB},
  {string: 'rgba(1, 2, 3, 0.2)', format: Common.Color.Format.RGBA},
  {string: 'rgb(1, 2, 3, 0.2)', format: Common.Color.Format.RGBA},
  {string: 'rgb(1 2 3 / 20%)', format: Common.Color.Format.RGBA},
  {string: 'rgbA(1 2 3)', format: Common.Color.Format.RGB},
  {string: 'rgba(1.5 2.6 3.1)', format: Common.Color.Format.RGB},
  {string: 'hsl(1, 100%, 50%)', format: Common.Color.Format.HSL},
  {string: 'hsl(1 100% 50%)', format: Common.Color.Format.HSL},
  {string: 'hsla(1, 100%, 50%, 0.2)', format: Common.Color.Format.HSLA},
  {string: 'hsl(1 100% 50% / 20%)', format: Common.Color.Format.HSLA},
  {string: 'hsL(1deg  100% 50%  /  20%)', format: Common.Color.Format.HSLA},
  {string: 'hwb(1 100% 50%)', format: Common.Color.Format.HWB},
  {string: 'hwb(100grad 100% 50% / 0.2)', format: Common.Color.Format.HWBA},
  {string: 'hwb(1rad 20% 50% / 20%)', format: Common.Color.Format.HWBA},
  {string: 'hwB(1deg  20% 50%  /  20%)', format: Common.Color.Format.HWBA},
];

function assertColorIsLegacyColor(color: Common.Color.Color|null): asserts color is Common.Color.Legacy {
  assertNotNullOrUndefined(color);
  assert.isTrue(color instanceof Common.Color.Legacy);
}

describe('Spectrum', () => {
  beforeEach(async () => {
    await initializeGlobalVars();
    const forceNew = true;
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance({forceNew});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew, actionRegistry});
  });

  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  it('shows the correct colorString', () => {
    const spectrum = new ColorPicker.Spectrum.Spectrum();
    const colorStrings = [
      'red',
      '#abc',
      '#abca',
      '#abcdef',
      '#abcdefaa',
      'rgb(1 2 3)',
      'rgb(1 2 3 / 20%)',
      'rgb(1 2 3 / 20%)',
      'rgb(1 2 3 / 20%)',
      'rgb(1 2 3)',
      'rgb(2 3 3)',
      'hsl(1deg 100% 50%)',
      'hsl(1deg 100% 50%)',
      'hsl(1deg 100% 50% / 20%)',
      'hsl(1deg 100% 50% / 20%)',
      'hsl(1deg 100% 50% / 20%)',
      'hwb(0deg 67% 33%)',
      'hwb(0deg 67% 33% / 20%)',
      'hwb(57deg 20% 50% / 20%)',
      'hwb(1deg 20% 50% / 20%)',
    ];
    for (const i in colorSpecs) {
      console.time('color');
      const colorSpec = colorSpecs[i];
      const colorString = colorStrings[i];
      const color = Common.Color.parse(colorSpec.string);
      assertColorIsLegacyColor(color);
      assert.deepEqual(color.format(), colorSpec.format);
      spectrum.setColor(color, colorSpec.format);
      assert.deepEqual(spectrum.colorString(), colorString);
      console.timeEnd('color');
    }
  });

  it('sets alpha correctly', () => {
    const spectrum = new ColorPicker.Spectrum.Spectrum();
    const colorAlpha = [
      '#ff000000',
      '#abc0',
      '#abc0',
      '#abcdef00',
      '#abcdef00',
      'rgb(1 2 3 / 0%)',
      'rgb(1 2 3 / 0%)',
      'rgb(1 2 3 / 0%)',
      'rgb(1 2 3 / 0%)',
      'rgb(1 2 3 / 0%)',
      'rgb(2 3 3 / 0%)',
      'hsl(1deg 100% 50% / 0%)',
      'hsl(1deg 100% 50% / 0%)',
      'hsl(1deg 100% 50% / 0%)',
      'hsl(1deg 100% 50% / 0%)',
      'hsl(1deg 100% 50% / 0%)',
      'hwb(0deg 67% 33% / 0%)',
      'hwb(0deg 67% 33% / 0%)',
      'hwb(57deg 20% 50% / 0%)',
      'hwb(1deg 20% 50% / 0%)',
    ];
    for (const i in colorSpecs) {
      const colorSpec = colorSpecs[i];
      const colorString = colorAlpha[i];
      const color = Common.Color.parse(colorSpec.string);
      assertColorIsLegacyColor(color);
      assert.deepEqual(color.format(), colorSpec.format);
      spectrum.setColor(color, colorSpec.format);

      spectrum.colorSelected(color.setAlpha(0));
      assert.deepEqual(spectrum.colorString(), colorString);
    }
  });

  it('switches the format view', () => {
    const spectrum = new ColorPicker.Spectrum.Spectrum();
    const colorStrings = [
      ['red', 'rgb(255 0 0)', 'hsl(0deg 100% 50%)'],
      ['#abc', 'rgb(170 187 204)', 'hsl(210deg 25% 73%)'],
      ['#abca', 'rgb(170 187 204 / 67%)', 'hsl(210deg 25% 73% / 67%)'],
      ['#abcdef', 'rgb(171 205 239)', 'hsl(210deg 68% 80%)'],
      ['#abcdefaa', 'rgb(171 205 239 / 67%)', 'hsl(210deg 68% 80% / 67%)'],
      ['rgb(1 2 3)', 'hsl(210deg 50% 1%)', 'hwb(210deg 0% 99%)'],
      ['rgb(1 2 3 / 20%)', 'hsl(210deg 50% 1% / 20%)', 'hwb(210deg 0% 99% / 20%)'],
      ['rgb(1 2 3 / 20%)', 'hsl(210deg 50% 1% / 20%)', 'hwb(210deg 0% 99% / 20%)'],
      ['rgb(1 2 3 / 20%)', 'hsl(210deg 50% 1% / 20%)', 'hwb(210deg 0% 99% / 20%)'],
      ['rgb(1 2 3)', 'hsl(210deg 50% 1%)', 'hwb(210deg 0% 99%)'],
      ['rgb(2 3 3)', 'hsl(199deg 35% 1%)', 'hwb(199deg 1% 99%)'],
      ['hsl(1deg 100% 50%)', 'hwb(1deg 0% 0%)', '#ff0400'],
      ['hsl(1deg 100% 50%)', 'hwb(1deg 0% 0%)', '#ff0400'],
      ['hsl(1deg 100% 50% / 20%)', 'hwb(1deg 0% 0% / 20%)', '#ff040033'],
      ['hsl(1deg 100% 50% / 20%)', 'hwb(1deg 0% 0% / 20%)', '#ff040033'],
      ['hsl(1deg 100% 50% / 20%)', 'hwb(1deg 0% 0% / 20%)', '#ff040033'],
      ['hwb(0deg 67% 33%)', '#aaaaaa', 'rgb(170 170 170)'],
      ['hwb(0deg 67% 33% / 20%)', '#aaaaaa33', 'rgb(170 170 170 / 20%)'],
      ['hwb(57deg 20% 50% / 20%)', '#807c3333', 'rgb(128 124 51 / 20%)'],
      ['hwb(1deg 20% 50% / 20%)', '#80343333', 'rgb(128 52 51 / 20%)'],
    ];
    for (const i in colorSpecs) {
      const colorSpec = colorSpecs[i];
      const expectedColorStrings = colorStrings[i];
      const color = Common.Color.parse(colorSpec.string);
      assertColorIsLegacyColor(color);
      spectrum.setColor(color, colorSpec.format);

      const resultingColorStrings = [spectrum.colorString()];
      const switcher = spectrum.contentElement.querySelector('.spectrum-switcher') as HTMLElement | null;
      assertNotNullOrUndefined(switcher);
      switcher.click();
      resultingColorStrings.push(spectrum.colorString());
      switcher.click();
      resultingColorStrings.push(spectrum.colorString());
      assert.deepStrictEqual(resultingColorStrings, expectedColorStrings);
    }
  });
});
