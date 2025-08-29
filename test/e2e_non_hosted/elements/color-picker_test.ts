// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getColorSwatch, goToResourceAndWaitForStyleSection} from '../../e2e/helpers/elements-helpers.js';

describe('ColorPicker', () => {
  it('scrolls to the bottom when previewing palettes', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/css-variables-many.html', devToolsPage, inspectedPage);

    const swatch = await devToolsPage.waitForFunction(() => getColorSwatch(/* parent*/ undefined, 0, devToolsPage));
    await devToolsPage.clickElement(swatch);

    const panel = await devToolsPage.waitFor('.palette-panel');
    await devToolsPage.click('.spectrum-palette-switcher');
    await devToolsPage.waitForFunction(() => panel.isIntersectingViewport({threshold: 1}));

    const palette =
        await devToolsPage.waitForFunction(async () => await devToolsPage.$textContent('CSS Variables') ?? undefined);

    // Need to wait for the spectrum overlay to disappear (i.e., finish its transition) for it to not eat our next click
    const overlay = await devToolsPage.$('.spectrum-overlay');
    assert.isOk(overlay);

    await devToolsPage.clickElement(palette);
    await devToolsPage.waitForFunction(
        async () => await (await devToolsPage.waitFor('.spectrum-overlay'))
                        .evaluate(e => e.computedStyleMap().get('visibility')?.toString() === 'hidden'));

    await devToolsPage.click('.spectrum-palette-switcher');
    await devToolsPage.waitForFunction(() => panel.isIntersectingViewport({threshold: 1}));
  });
});
