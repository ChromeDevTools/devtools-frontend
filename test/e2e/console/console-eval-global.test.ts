// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {step} from '../../shared/helper.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt, getCurrentConsoleMessages} from '../helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('interacts with the global scope correctly', async ({devToolsPage}) => {
    await step('navigate to the Console tab', async () => {
      await devToolsPage.click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt(devToolsPage);
    });

    await step('enter code that implicitly creates global properties', async () => {
      await devToolsPage.pasteText(`
        var foo = 'fooValue';
        var bar = {
          a: 'b',
        };
      `);
      await devToolsPage.pressKey('Enter');
      // Wait for the console to be usable again.
      await devToolsPage.waitForFunction(async () => {
        return (await devToolsPage.$$('.console-user-command-result')).length === 1;
      });
    });

    await step('enter code that references the created bindings', async () => {
      await devToolsPage.pasteText('foo;');
      await devToolsPage.pressKey('Enter');

      // Wait for the console to be usable again.
      await devToolsPage.waitForFunction(async () => {
        return (await devToolsPage.$$('.console-user-command-result')).length === 2;
      });

      await devToolsPage.pasteText('bar;');
      await devToolsPage.pressKey('Enter');

      // Wait for the console to be usable again.
      await devToolsPage.waitForFunction(async () => {
        return (await devToolsPage.$$('.console-user-command-result')).length === 3;
      });
    });

    await step('check that the expected output is logged', async () => {
      const messages = await getCurrentConsoleMessages(devToolsPage, false, undefined, undefined);
      assert.deepEqual(messages, [
        'undefined',
        '\'fooValue\'',
        '{a: \'b\'}',
      ]);
    });
  });
});
