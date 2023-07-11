// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, pasteText, step} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt, getCurrentConsoleMessages} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  it('doesn’t break when global `eval` is overwritten', async () => {
    const {frontend} = getBrowserAndPages();
    let messages: string[];

    await step('navigate to the Console tab', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });

    await step('enter code that overwrites eval', async () => {
      await pasteText(`
        const foo = 'fooValue';
        globalThis.eval = 'non-function';
      `);
      await frontend.keyboard.press('Enter');

      // Wait for the console to be usable again.
      await frontend.waitForFunction(() => {
        return document.querySelectorAll('.console-user-command-result').length === 1;
      });
    });

    await step('enter a code snippet', async () => {
      await pasteText('foo;');
      await frontend.keyboard.press('Enter');
    });

    // Wait for the console to be usable again.
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 2;
    });

    await step('retrieve the console log', async () => {
      messages = await getCurrentConsoleMessages();
    });

    await step('check that the expected output is logged', async () => {
      assert.deepEqual(messages, [
        '\'non-function\'',
        '\'fooValue\'',
      ]);
    });
  });
});
