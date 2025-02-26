// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, drainFrontendTaskQueue, getBrowserAndPages, pasteText, step} from '../../shared/helper.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt, getCurrentConsoleMessages} from '../helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('interacts with the global scope correctly', async () => {
    const {frontend} = getBrowserAndPages();

    await step('navigate to the Console tab', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });

    await step('enter code that implicitly creates global properties', async () => {
      await pasteText(`
        var foo = 'fooValue';
        var bar = {
          a: 'b',
        };
      `);
      await frontend.keyboard.press('Enter');
      // Wait for the console to be usable again.
      await frontend.waitForFunction(() => {
        return document.querySelectorAll('.console-user-command-result').length === 1;
      });
    });

    await step('enter code that references the created bindings', async () => {
      // TODO: it should actually wait for rendering to finish.
      await drainFrontendTaskQueue();

      await pasteText('foo;');
      await frontend.keyboard.press('Enter');

      // Wait for the console to be usable again.
      await frontend.waitForFunction(() => {
        return document.querySelectorAll('.console-user-command-result').length === 1;
      });

      // TODO: it should actually wait for rendering to finish.
      await drainFrontendTaskQueue();

      await pasteText('bar;');
      await frontend.keyboard.press('Enter');
    });

    await step('check that the expected output is logged', async () => {
      // TODO: it should actually wait for rendering to finish.
      await drainFrontendTaskQueue();
      const messages = await getCurrentConsoleMessages();
      assert.deepEqual(messages, [
        'undefined',
        '\'fooValue\'',
        '{a: \'b\'}',
      ]);
    });
  });
});
