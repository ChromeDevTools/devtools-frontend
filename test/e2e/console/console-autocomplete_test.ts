// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, typeText, waitFor, waitForNone} from '../../shared/helper.js';
import {beforeEach, describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();

    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

    await typeText('let object = {a:1, b:2};');
    await frontend.keyboard.press('Enter');

    // Wait for the console to be usable again.
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });
  });

  // See the comments in console-repl-mode_test to see why this is necessary.
  async function objectAutocompleteTest(textAfterObject: string) {
    const {frontend} = getBrowserAndPages();

    const appearPromise = waitFor('.suggest-box');
    await typeText('object');
    await appearPromise;

    const disappearPromise = waitForNone('.suggest-box');
    await frontend.keyboard.press('Escape');
    await disappearPromise;

    const appearPromise2 = waitFor('.suggest-box');
    await typeText(textAfterObject);
    await appearPromise2;
  }

  it('triggers autocompletion for `object.`', async () => {
    await objectAutocompleteTest('.');
  });

  it('triggers autocompletion for `object?.`', async () => {
    await objectAutocompleteTest('?.');
  });

  it('triggers autocompletion for `object[`', async () => {
    await objectAutocompleteTest('[');
  });
});
