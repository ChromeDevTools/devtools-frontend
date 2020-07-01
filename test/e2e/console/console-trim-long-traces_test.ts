// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$$, click, getBrowserAndPages, pasteText, step} from '../../shared/helper.js';
import {focusConsolePrompt} from '../helpers/console-helpers.js';
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
      messages = await (await $$(STACK_PREVIEW_CONTAINER)).evaluate(elements => {
        return elements.map((el: HTMLElement) => el.innerText);
      });
    });

    // match was used here because line numbers differ from one machine to another
    await step('check that the first log is not truncated', async () => {
      assert.match(messages[0], /([\t]recursive[\t]@[\t]VM\d+:\d+[\n]){10}([\t]\(anonymous\)[\t]@[\t]VM\d+:\d+){1}/);
    });

    // match was used here because line numbers differ from one machine to another
    await step('check that the second log is truncated', async () => {
      assert.match(messages[1], /([\t]recursive[\t]@[\t]VM\d+:\d+[\n]){30}([\t]Show 21 more frames){1}/);
    });
  });
});
