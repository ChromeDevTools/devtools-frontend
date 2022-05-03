// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, step, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickOnContextMenu,
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  typeIntoConsole,
} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  it('recursively expands objects', async () => {
    const {frontend} = getBrowserAndPages();

    await step('open the console tab and focus the prompt', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });

    await typeIntoConsole(frontend, '({a: {x: 21}, b: {y: 42}})');

    // Expand the object node recursively
    await clickOnContextMenu('.console-view-object-properties-section', 'Expand recursively');
    const root = await waitFor('.console-view-object-properties-section.expanded');

    // Ensure that both a and b are expanded.
    const [aChildren, bChildren] = await Promise.all([
      waitFor('li[data-object-property-name-for-test="a"][aria-expanded=true] ~ ol.expanded', root),
      waitFor('li[data-object-property-name-for-test="b"][aria-expanded=true] ~ ol.expanded', root),
    ]);

    // The x and y properties should be visible now.
    await Promise.all([
      waitFor('li[data-object-property-name-for-test="x"]', aChildren),
      waitFor('li[data-object-property-name-for-test="y"]', bChildren),
    ]);

    // The [[Prototype]] internal properties should not be expanded now.
    await Promise.all([
      waitFor('li[data-object-property-name-for-test="[[Prototype]]"][aria-expanded=false]', aChildren),
      waitFor('li[data-object-property-name-for-test="[[Prototype]]"][aria-expanded=false]', bChildren),
    ]);
  });
});
