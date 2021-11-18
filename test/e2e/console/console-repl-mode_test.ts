// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, typeText, waitFor, waitForNone} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../helpers/console-helpers.js';

describe('The Console Tab', async function() {
  // The tests in this suite are particularly slow, as they perform a lot of actions
  this.timeout(10000);

  it('allows re-declaration of let variables', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

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

    const appearPromise = waitFor('.suggest-box');
    await typeText('let');
    await appearPromise;

    const disappearPromise = waitForNone('.suggest-box');
    await frontend.keyboard.press('Escape');
    await disappearPromise;

    await typeText(' x = 1;');
    await frontend.keyboard.press('Enter');
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    const appearPromise2 = waitFor('.suggest-box');
    await typeText('let');
    await appearPromise2;

    const disappearPromise2 = waitForNone('.suggest-box');
    await frontend.keyboard.press('Escape');
    await disappearPromise2;

    await typeText(' x = 2;');
    await frontend.keyboard.press('Enter');
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 2;
    });

    const appearPromise3 = waitFor('.suggest-box');
    await typeText('x');
    await appearPromise3;

    const disappearPromise3 = waitForNone('.suggest-box');
    await frontend.keyboard.press('Escape');
    await disappearPromise3;

    await frontend.keyboard.press('Enter');
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 3;
    });

    const evaluateResults = await frontend.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
    });

    assert.deepEqual(evaluateResults, ['undefined', 'undefined', '2']);
  });
});
