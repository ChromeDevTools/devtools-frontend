// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InlineEditor from '../../../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';
import {
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

function createSwatch(text: string) {
  const swatch = new InlineEditor.ColorMixSwatch.ColorMixSwatch();
  renderElementIntoDOM(swatch);
  swatch.setText(text);
  return swatch;
}

describeWithLocale('ColorMixSwatch', () => {
  it('should render color-mix swatch with icon and text when the syntax is correct', () => {
    const swatch = createSwatch('color-mix(in srgb, red, blue)');

    const swatchIcon = swatch.shadowRoot?.querySelector('.swatch-icon');

    assert.strictEqual(swatch.shadowRoot?.textContent?.trim(), 'color-mix(in srgb, red, blue)');
    assert.isNotNull(swatchIcon);
  });

  it('should render color-mix swatch with only text when the syntax is not correct', () => {
    const swatch = createSwatch('color-mix(in srgb not, blue)');

    const swatchIcon = swatch.shadowRoot?.querySelector('.swatch-icon');

    assert.strictEqual(swatch.shadowRoot?.textContent?.trim(), 'color-mix(in srgb not, blue)');
    assert.isNull(swatchIcon);
  });
});
