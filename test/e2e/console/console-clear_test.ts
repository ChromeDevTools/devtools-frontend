// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, step} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {CONSOLE_TAB_SELECTOR, focusConsolePrompt, typeIntoConsole, typeIntoConsoleAndWaitForResult} from '../helpers/console-helpers.js';

describe('The Console Tab', async function() {
  it('is cleared via the console.clear() method', async () => {
    const {frontend} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

    await step('enter 1 in console', async () => {
      await typeIntoConsoleAndWaitForResult(frontend, '1;');
    });
    await step('enter 2 in console', async () => {
      await typeIntoConsoleAndWaitForResult(frontend, '2;');
    });
    await step('enter 3 in console', async () => {
      await typeIntoConsoleAndWaitForResult(frontend, '3;');
    });
    await step('Check the evaluation results from console', async () => {
      const evaluateResults = await frontend.evaluate(() => {
        return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
      });
      assert.deepEqual(evaluateResults, ['1', '2', '3'], 'did not find expected output in the console');
    });
    await step('enter console.clear() in console', async () => {
      await typeIntoConsole(frontend, 'console.clear();');
    });
    await step('wait for the console to be cleared', async () => {
      await frontend.waitForFunction(() => {
        return document.querySelectorAll('.console-user-command-result').length === 1;
      });
    });
    await step('check that the remaining text in the console is correct', async () => {
      const clearResult = await frontend.evaluate(() => {
        return document.querySelector('.console-user-command-result')!.textContent;
      });
      assert.strictEqual(clearResult, 'undefined', 'the result of clear was not undefined');
    });
  });
});
