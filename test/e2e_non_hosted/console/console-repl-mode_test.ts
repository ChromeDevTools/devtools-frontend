
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  CONSOLE_TAB_SELECTOR,
  CONSOLE_TOOLTIP_SELECTOR,
  focusConsolePrompt,
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', function() {
  it('allows re-declaration of let variables', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    // To avoid races with the autosuggest box, which appears asynchronously to
    // typing, we need to:
    //   1. Type until the last character that causes a suggestion, waiting for
    //      the suggestion box to open. We need to start waiting for the box to
    //      open before we start typing to ensure we catch the opening.
    //   2. Hit escape to close the suggestion box, and wait for it to
    //      disappear. As above, we need to start waiting for it to disappear
    //      before we hit escape.
    //   3. Type the rest of the expression, where the characters don't cause
    //      additional suggestions. Suggestions from history behave differently
    //      and don't auto-complete on hitting enter, so they are irrelevant
    //      here even if they do show up.
    //   4. Hit enter
    //   5. Wait for the results to show up and verify them.

    const appearPromise = devToolsPage.waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.typeText('let');
    await appearPromise;

    const disappearPromise = devToolsPage.waitForNone(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.pressKey('Escape');
    await disappearPromise;

    await devToolsPage.typeText(' x = 1;');
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitForFunction(() => {
      return devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 1);
    });

    const appearPromise2 = devToolsPage.waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.typeText('let');
    await appearPromise2;

    const disappearPromise2 = devToolsPage.waitForNone(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.pressKey('Escape');
    await disappearPromise2;

    await devToolsPage.typeText(' x = 2;');
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitForFunction(() => {
      return devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 2);
    });

    const appearPromise3 = devToolsPage.waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.typeText('x');
    await appearPromise3;

    const disappearPromise3 = devToolsPage.waitForNone(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.pressKey('Escape');
    await disappearPromise3;

    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitForFunction(() => {
      return devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 3);
    });

    const evaluateResults = await devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
    });

    assert.deepEqual(evaluateResults, ['undefined', 'undefined', '2']);
  });
});
