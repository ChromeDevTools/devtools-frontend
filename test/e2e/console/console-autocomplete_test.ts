// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, typeText, waitFor, waitForNone} from '../../shared/helper.js';

import {CONSOLE_TAB_SELECTOR, CONSOLE_TOOLTIP_SELECTOR, focusConsolePrompt} from '../helpers/console-helpers.js';
import {openSourcesPanel} from '../helpers/sources-helpers.js';

describe('The Console Tab', () => {
  beforeEach(async () => {
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();
  });

  afterEach(async () => {
    // Make sure we don't close DevTools while there is an outstanding
    // Runtime.evaluate CDP request, which causes an error. crbug.com/1134579.
    await openSourcesPanel();
  });

  // See the comments in console-repl-mode_test to see why this is necessary.
  async function autocompleteTest(prefix: string, suffix: string) {
    const {frontend} = getBrowserAndPages();

    await typeText('let object = {aaa:1, bbb:2}; let map = new Map([["somekey", 5], ["some other key", 42]])');
    await frontend.keyboard.press('Enter');

    // Wait for the console to be usable again.
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    const appearPromise = waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await typeText(prefix);
    await appearPromise;

    const disappearPromise = waitForNone(CONSOLE_TOOLTIP_SELECTOR);
    await frontend.keyboard.press('Escape');
    await disappearPromise;

    const appearPromise2 = waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await typeText(suffix);
    await appearPromise2;

    // The first auto-suggest result is evaluated and generates a preview, which
    // we wait for so that we don't end the test/navigate with an open
    // Runtime.evaluate CDP request, which causes an error. crbug.com/1134579.
    await waitFor('.console-eager-inner-preview > span');
  }

  it('triggers autocompletion for `object.`', async () => {
    await autocompleteTest('object', '.');
  });

  it('triggers autocompletion for `object?.`', async () => {
    await autocompleteTest('object', '?.');
  });

  it('triggers autocompletion for `object[`', async () => {
    await autocompleteTest('object', '[');
  });

  it('triggers autocompletion for `map.get(`', async () => {
    await autocompleteTest('map.get', '(');
  });

  it('triggers autocompletion for `foo.#my`', async () => {
    const {frontend} = getBrowserAndPages();

    await typeText('class Foo {#myPrivateField = 1}; let foo = new Foo');
    await frontend.keyboard.press('Enter');

    // Wait for the console to be usable again.
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });

    const appearPromise = waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await typeText('foo');
    await appearPromise;

    const disappearPromise = waitForNone(CONSOLE_TOOLTIP_SELECTOR);
    await frontend.keyboard.press('Escape');
    await disappearPromise;

    const appearPromise2 = waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await typeText('.#my');
    await appearPromise2;
  });
});
