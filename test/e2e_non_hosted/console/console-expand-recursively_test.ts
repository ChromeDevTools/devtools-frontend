// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  clickOnContextMenu,
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  typeIntoConsole,
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('recursively expands objects', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await typeIntoConsole('({a: {x: 21}, b: {y: 42}})', devToolsPage);

    // Expand the object node recursively
    await clickOnContextMenu('.console-view-object-properties-section', 'expand-recursively', devToolsPage);
    const root = await devToolsPage.waitFor('.console-view-object-properties-section.expanded');

    // Ensure that both a and b are expanded.
    const [aChildren, bChildren] = await Promise.all([
      devToolsPage.waitFor('li[data-object-property-name-for-test="a"][aria-expanded=true] ~ ol.expanded', root),
      devToolsPage.waitFor('li[data-object-property-name-for-test="b"][aria-expanded=true] ~ ol.expanded', root),
    ]);

    // The x and y properties should be visible now.
    await Promise.all([
      devToolsPage.waitFor('li[data-object-property-name-for-test="x"]', aChildren),
      devToolsPage.waitFor('li[data-object-property-name-for-test="y"]', bChildren),
    ]);

    // The [[Prototype]] internal properties should not be expanded now.
    await Promise.all([
      devToolsPage.waitFor('li[data-object-property-name-for-test="[[Prototype]]"][aria-expanded=false]', aChildren),
      devToolsPage.waitFor('li[data-object-property-name-for-test="[[Prototype]]"][aria-expanded=false]', bChildren),
    ]);
  });
});
