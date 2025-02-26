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
  it('should render color-mix swatch icon when the syntax is correct', () => {
    const swatch = createSwatch('color-mix(in srgb, red, blue)', 'red', 'blue');

    const swatchIcon = swatch.shadowRoot?.querySelector('.swatch-icon');

    assert.strictEqual(swatch?.getText(), 'color-mix(in srgb, red, blue)');
    assert.isNotNull(swatchIcon);
  });

  it('should changing the second color work correctly when the colors are the same', () => {
    const swatch = createSwatch('color-mix(in srgb, red, red)', 'red', 'red');
    swatch.setSecondColor('blue');

    assert.strictEqual(swatch?.getText(), 'color-mix(in srgb, red, blue)');

    const swatchIcon = swatch.shadowRoot?.querySelector('.swatch-icon');
    assert.isNotNull(swatchIcon);
  });
});
