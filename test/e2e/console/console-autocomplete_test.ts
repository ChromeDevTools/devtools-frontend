// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, tabForward, timeout, typeText, waitFor, waitForFunction, waitForNone} from '../../shared/helper.js';
import {beforeEach, describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_COMPLETION_HINT_SELECTOR, CONSOLE_TAB_SELECTOR, CONSOLE_TOOLTIP_SELECTOR, focusConsolePrompt, waitForLastConsoleMessageToHaveContent} from '../helpers/console-helpers.js';
import {openSourcesPanel} from '../helpers/sources-helpers.js';

describe('The Console Tab', async () => {
  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();

    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

    await typeText('let object = {a:1, b:2}; let map = new Map([["somekey", 5], ["some other key", 42]])');
    await frontend.keyboard.press('Enter');

    // Wait for the console to be usable again.
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 1;
    });
  });

  afterEach(async () => {
    // Make sure we don't close DevTools while there is an outstanding
    // Runtime.evaluate CDP request, which causes an error. crbug.com/1134579.
    await openSourcesPanel();
  });

  // See the comments in console-repl-mode_test to see why this is necessary.
  async function objectAutocompleteTest(textAfterObject: string) {
    const {frontend} = getBrowserAndPages();

    const appearPromise = waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await typeText('object');
    await appearPromise;

    const disappearPromise = waitForNone(CONSOLE_TOOLTIP_SELECTOR);
    await frontend.keyboard.press('Escape');
    await disappearPromise;

    const appearPromise2 = waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await typeText(textAfterObject);
    await appearPromise2;

    // The first auto-suggest result is evaluated and generates a preview, which
    // we wait for so that we don't end the test/navigate with an open
    // Runtime.evaluate CDP request, which causes an error. crbug.com/1134579.
    await waitFor('.console-eager-inner-preview > span');
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

  describe('triggers autocompletion for maps', () => {
    async function typeMapGetter() {
      const {frontend} = getBrowserAndPages();

      const appearPromise = waitFor(CONSOLE_TOOLTIP_SELECTOR);
      await typeText('map.get');
      await appearPromise;

      const disappearPromise = waitForNone(CONSOLE_TOOLTIP_SELECTOR);
      await frontend.keyboard.press('Escape');
      await disappearPromise;

      const appearPromise2 = waitFor(CONSOLE_COMPLETION_HINT_SELECTOR);
      await typeText('(');
      await appearPromise2;

      await waitForFunction(async () => {
        const completionHint = await waitFor(CONSOLE_COMPLETION_HINT_SELECTOR);
        return await completionHint.evaluate(node => node.textContent === '"somekey")');
      });

      // Even though the completion hint has the correct contents, there are no atomic DOM updates
      // for the console input. This means that there is a race condition between when CodeMirror
      // has finished computing the completion hint (and written it to the DOM) and when it is
      // ready to receive further key inputs. This typically happens near instantly, but it is
      // possible for another task to be inserted in between these two events. Since we are
      // writing to the DOM, 100ms timeout is sufficient to flush the DOM and let all of the components
      // be in sync.
      await timeout(100);
    }

    it('can select the first key result', async () => {
      const {frontend} = getBrowserAndPages();
      await typeMapGetter();

      const completionPromise = waitForNone(CONSOLE_COMPLETION_HINT_SELECTOR);
      await tabForward();
      await completionPromise;

      await frontend.keyboard.press('Enter');
      await frontend.waitForFunction(() => {
        return document.querySelectorAll('.console-user-command-result').length === 2;
      });

      await waitForLastConsoleMessageToHaveContent('5');
    });

    it('can select the second key result', async () => {
      const {frontend} = getBrowserAndPages();
      await typeMapGetter();

      // Select the second key by pressing the arrow down.
      // Keys should be ordered by appearance in the original `Map.keys()` array
      await frontend.keyboard.press('ArrowDown');

      await frontend.waitForFunction(() => {
        return document.querySelectorAll('.console-eager-inner-preview').length === 1 &&
            document.querySelectorAll('.console-eager-inner-preview')[0].textContent === '42';
      });

      const completionPromise = waitForNone(CONSOLE_COMPLETION_HINT_SELECTOR);
      await tabForward();
      await completionPromise;

      await frontend.keyboard.press('Enter');
      await frontend.waitForFunction(() => {
        return document.querySelectorAll('.console-user-command-result').length === 2;
      });

      await waitForLastConsoleMessageToHaveContent('42');
    });
  });
});
