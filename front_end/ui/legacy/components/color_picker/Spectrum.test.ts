// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../../testing/MockConnection.js';
import * as UI from '../../legacy.js';

import * as ColorPicker from './color_picker.js';

const displayP3Color = Common.Color.parse('color(display-p3 1 1 1)') as Common.Color.Color;
const rgbColor = Common.Color.parse('rgb(255 0 0)') as Common.Color.Color;

describeWithEnvironment('ColorPicker aka Spectrum', () => {
  beforeEach(async () => {
    const forceNew = true;
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance({forceNew});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew, actionRegistry});
  });

  describe('sRGB overlay', () => {
    it('should show sRGB overlay when the format supports display-p3 colors', () => {
      const spectrum = new ColorPicker.Spectrum.Spectrum();

      spectrum.setColor(displayP3Color);

      assert.isNotNull(spectrum.contentElement.querySelector('devtools-spectrum-srgb-overlay'));
    });

    it('should not show sRGB overlay when the format doesn\'t support display-p3 colors', () => {
      const spectrum = new ColorPicker.Spectrum.Spectrum();

      spectrum.setColor(rgbColor);

      assert.isNull(spectrum.contentElement.querySelector('devtools-spectrum-srgb-overlay'));
    });
  });

  it('uses appropriate stepping and clipping for keyboard/mousewheel interactions', () => {
    const spectrum = new ColorPicker.Spectrum.Spectrum();
    const textInputs = Array.from(
        spectrum.contentElement.querySelectorAll('.spectrum-text:not(.spectrum-text-hex) .spectrum-text-value'));
    assert.lengthOf(textInputs, 4);

    const increment = (element: Element) => element.dispatchEvent(new WheelEvent('wheel', {deltaX: -1}));
    const decrement = (element: Element) => element.dispatchEvent(new WheelEvent('wheel', {deltaX: 1}));

    spectrum.setColor(new Common.Color.ColorFunction(Common.Color.Format.XYZ, 0.5, 1, 0, 0.3));
    textInputs.forEach(increment);
    assert.strictEqual(spectrum.color.asString(), 'color(xyz 0.51 1 0.01 / 0.31)');
    textInputs.forEach(decrement);
    textInputs.forEach(decrement);
    assert.strictEqual(spectrum.color.asString(), 'color(xyz 0.49 0.98 0 / 0.29)');

    spectrum.setColor(new Common.Color.ColorFunction(Common.Color.Format.SRGB, 0.5, 1, 0, 0.3));
    textInputs.forEach(increment);
    assert.strictEqual(spectrum.color.asString(), 'color(srgb 0.51 1 0.01 / 0.31)');
    textInputs.forEach(decrement);
    textInputs.forEach(decrement);
    assert.strictEqual(spectrum.color.asString(), 'color(srgb 0.49 0.98 0 / 0.29)');

    spectrum.setColor(new Common.Color.Legacy([0.5, 1, 0, 0.3], Common.Color.Format.RGBA));
    assert.strictEqual(spectrum.color.asString(), 'rgb(128 255 0 / 30%)');
    textInputs.forEach(increment);
    assert.strictEqual(spectrum.color.asString(), 'rgb(129 255 1 / 31%)');
    textInputs.forEach(decrement);
    textInputs.forEach(decrement);
    assert.strictEqual(spectrum.color.asString(), 'rgb(127 253 0 / 29%)');
  });
});

describeWithMockConnection('PaletteGenerator', () => {
  it('does not interpret selectors as colors', async () => {
    createTarget();
    const [model] = SDK.TargetManager.TargetManager.instance().models(SDK.CSSModel.CSSModel);

    assert.exists(model);
    const stylesheet = sinon.createStubInstance(SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
    sinon.stub(model, 'allStyleSheets').returns([stylesheet]);
    const content = `
    #f00: {
      --#fff: unset;
    }
    body: {color: #0f0;}
    #00f: {}
    `;
    stylesheet.requestContentData.resolves(new TextUtils.ContentData.ContentData(
        content,
        /* isBase64=*/ false, 'text/css'));

    const palette = await new Promise<ColorPicker.Spectrum.Palette>(r => new ColorPicker.Spectrum.PaletteGenerator(r));

    assert.deepEqual(palette.colors, ['#0f0']);
  });
});
