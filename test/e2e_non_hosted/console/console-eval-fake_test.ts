// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  focusConsolePrompt,
  getCurrentConsoleMessages,
  navigateToConsoleTab
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('does not break when global `eval` is overwritten', async ({devToolsPage}) => {
    await navigateToConsoleTab(devToolsPage);
    await focusConsolePrompt(devToolsPage);

    await devToolsPage.typeText('const foo = \'fooValue\'; globalThis.eval = \'non-function\';');
    await devToolsPage.page.keyboard.press('Enter');

    // Wait for the console to be usable again.
    await devToolsPage.waitForFunction(
        () => devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 1));

    await devToolsPage.typeText('foo;');
    await devToolsPage.page.keyboard.press('Enter');

    // Wait for the console to be usable again.
    await devToolsPage.waitForFunction(
        () => devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 2));

    const messages = await getCurrentConsoleMessages(false, undefined, undefined, devToolsPage);

    assert.deepEqual(messages, [
      '\'non-function\'',
      '\'fooValue\'',
    ]);
  });
});
