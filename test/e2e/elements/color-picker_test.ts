// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  $,
  $textContent,
  assertNotNullOrUndefined,
  click,
  clickElement,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';

import {getColorSwatch, goToResourceAndWaitForStyleSection} from '../helpers/elements-helpers.js';

describe('ColorPicker', () => {
  it('scrolls to the bottom when previewing palettes', async () => {
    await goToResourceAndWaitForStyleSection('elements/css-variables-many.html');

    const swatch = await waitForFunction(() => getColorSwatch(/* parent*/ undefined, 0));
    await clickElement(swatch);

    const panel = await waitFor('.palette-panel');
    await click('.spectrum-palette-switcher');
    await waitForFunction(() => panel.isIntersectingViewport({threshold: 1}));

    const palette = await waitForFunction(async () => await $textContent('CSS Variables') ?? undefined);

    // Need to wait for the spectrum overlay to disappear (i.e., finish its transition) for it to not eat our next click
    const overlay = await $('.spectrum-overlay');
    assertNotNullOrUndefined(overlay);

    await clickElement(palette);
    await waitForFunction(
        async () => (await waitFor('.spectrum-overlay'))
                        .evaluate(e => e.computedStyleMap().get('visibility')?.toString() === 'hidden'));

    await click('.spectrum-palette-switcher');
    await waitForFunction(() => panel.isIntersectingViewport({threshold: 1}));
  });
});
