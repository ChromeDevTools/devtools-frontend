// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../../testing/EnvironmentHelpers.js';

import * as InlineEditor from './inline_editor.js';

function createSwatch(text: string, firstColor: string, secondColor: string) {
  const swatch = new InlineEditor.ColorMixSwatch.ColorMixSwatch();
  renderElementIntoDOM(swatch);
  swatch.setColorMixText(text);
  swatch.setFirstColor(firstColor);
  swatch.setSecondColor(secondColor);
  return swatch;
}

describeWithLocale('ColorMixSwatch', () => {
  it('should render color-mix swatch with icon and text when the syntax is correct', () => {
    const swatch = createSwatch('color-mix(in srgb, red, blue)', 'red', 'blue');

    const swatchIcon = swatch.shadowRoot?.querySelector('.swatch-icon');

    assert.strictEqual(swatch.shadowRoot?.textContent?.trim(), 'color-mix(in srgb, red, blue)');
    assert.isNotNull(swatchIcon);
  });

  it('should changing the second color work correctly when the colors are the same', () => {
    const swatch = createSwatch('color-mix(in srgb, red, red)', 'red', 'red');
    swatch.setSecondColor('blue');

    const swatchIcon = swatch.shadowRoot?.querySelector('.swatch-icon');

    assert.strictEqual(swatch.shadowRoot?.textContent?.trim(), 'color-mix(in srgb, red, blue)');
    assert.isNotNull(swatchIcon);
  });

  it('calls the popover registration callback upon rendering', () => {
    const swatch = createSwatch('color-mix(in srgb, red, red)', 'red', 'red');

    const cb = sinon.stub<[InlineEditor.ColorMixSwatch.ColorMixSwatch], void>();
    const values: string[] = [];
    cb.callsFake(swatch => values.push(swatch.shadowRoot?.textContent?.trim() ?? ''));
    swatch.setRegisterPopoverCallback(cb);
    swatch.setFirstColor('blue');
    swatch.setSecondColor('purple');
    swatch.setColorMixText('color-mix(in hsl, yellow, yellow)');
    assert.lengthOf(cb.getCalls(), 4);

    assert.deepStrictEqual(values, [
      'color-mix(in srgb, red, red)',
      'color-mix(in srgb, blue, red)',
      'color-mix(in srgb, blue, purple)',
      'color-mix(in hsl, yellow, yellow)',
    ]);
  });
});
