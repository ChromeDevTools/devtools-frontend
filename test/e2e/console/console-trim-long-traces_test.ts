// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$$, click, getBrowserAndPages, pasteText, step} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {focusConsolePrompt, unifyLogVM} from '../helpers/console-helpers.js';
import {CONSOLE_SELECTOR, CONSOLE_TAB_SELECTOR, STACK_PREVIEW_CONTAINER} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  it('truncates long stack traces ', async () => {
    const {frontend} = getBrowserAndPages();
    let messages: string[];

    await step('navigate to the Console tab', async () => {
      await click(CONSOLE_TAB_SELECTOR);
      await focusConsolePrompt();
    });

    await step('enter code into the console that produces two stack traces, one short and and one long', async () => {
      await pasteText(`
        function recursive(n) {
          if (n > 1) {
            return recursive(n-1);
          } else {
            return console.trace();
          }
        }
        recursive(10);
        recursive(50);
      `);

      await frontend.keyboard.press('Enter');

      // Wait for the console to be usable again.
      await frontend.waitForFunction(CONSOLE_SELECTOR => {
        return document.querySelectorAll(CONSOLE_SELECTOR).length === 1;
      }, {}, CONSOLE_SELECTOR);
    });

    await step('retrieve the console log', async () => {
      const container = await $$(STACK_PREVIEW_CONTAINER);
      messages = await Promise.all(container.map(elements => {
        return elements.evaluate(el => (el as HTMLElement).innerText);
      }));
    });

    await step('check that the first log is not truncated', async () => {
      const expectedLog = '\trecursive\t@\tVM11:6\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\t(anonymous)\t@\tVM11:9';

      assert.strictEqual(messages[0], await unifyLogVM(messages[0], expectedLog));
    });

    await step('check that the second log is truncated', async () => {
      const expectedLog = '\trecursive\t@\tVM11:6\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\trecursive\t@\tVM11:4\n' +
          '\tShow 21 more frames';

      assert.strictEqual(messages[1], await unifyLogVM(messages[1], expectedLog));
    });
  });
});
