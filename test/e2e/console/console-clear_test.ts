// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$$, click, getBrowserAndPages, step, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  typeIntoConsole,
  typeIntoConsoleAndWaitForResult,
} from '../helpers/console-helpers.js';

describe('The Console Tab', async function() {
  it('is cleared via the console.clear() method', async () => {
    const {frontend, target} = getBrowserAndPages();
    await click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt();

    // eslint-disable-next-line no-console
    await target.evaluate(() => console.log('target'));

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
        const result = document.querySelector('.console-user-command-result');
        if (!result) {
          assert.fail('Could not find user command result in the DOM.');
        }
        return result.textContent;
      });
      assert.strictEqual(clearResult, 'undefined', 'the result of clear was not undefined');
    });

    // Check that the sidebar is also cleared.
    await click('[aria-label="Show console sidebar"]');
    const sideBar = await waitFor('div[slot="insertion-point-sidebar"]');
    const entries = await $$('li', sideBar);
    const entriesText = await Promise.all(entries.map(e => e.evaluate(e => e.textContent)));
    assert.deepStrictEqual(entriesText, [
      '1 message',
      '<other>1',
      '1 user message',
      '<other>1',
      'No errors',
      'No warnings',
      '1 info',
      '<other>1',
      'No verbose',
    ]);
  });
});
