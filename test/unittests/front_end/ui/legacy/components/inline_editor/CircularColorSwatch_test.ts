// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as InlineEditor from '../../../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';
import {
  assertElement,
  assertShadowRoot,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

function assertSwatch(
    swatch: InlineEditor.CircularColorSwatch.CircularColorSwatch,
    expected: {backgroundColor: string, colorTextInSlot: string}) {
  assertShadowRoot(swatch.shadowRoot);

  const swatchEl = swatch.shadowRoot.querySelector('.circular-color-swatch');
  const swatchInnerEl = swatch.shadowRoot.querySelector('.circular-color-swatch-inner');
  const slotEl = swatch.shadowRoot.querySelector('slot');
  assertElement(swatchEl, HTMLElement);
  assertElement(swatchInnerEl, HTMLElement);
  assertNotNullOrUndefined(slotEl);

  assert.strictEqual(swatchInnerEl.style.backgroundColor, expected.backgroundColor, 'The swatch has the correct color');

  assert.strictEqual(slotEl.textContent, expected.colorTextInSlot, 'The slot shows the correct default color');
}

function createSwatch(color: string) {
  const swatch = new InlineEditor.CircularColorSwatch.CircularColorSwatch();
  renderElementIntoDOM(swatch);
  swatch.renderColor(color);
  return swatch;
}

describeWithLocale('CircularColorSwatch', () => {
  it('renders correctly on the DOM', async () => {
    const swatch = createSwatch('rgb(255, 0, 0)');

    assertSwatch(swatch, {
      backgroundColor: 'rgb(255, 0, 0)',
      colorTextInSlot: 'rgb(255, 0, 0)',
    });
  });
});
