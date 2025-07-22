// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  typeIntoConsole,
  typeIntoConsoleAndWaitForResult,
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', function() {
  it('is cleared via the console.clear() method', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    // eslint-disable-next-line no-console
    await inspectedPage.evaluate(() => console.log('target'));

    await typeIntoConsoleAndWaitForResult('1;', 1, undefined, devToolsPage);
    await typeIntoConsoleAndWaitForResult('2;', 1, undefined, devToolsPage);
    await typeIntoConsoleAndWaitForResult('3;', 1, undefined, devToolsPage);

    const evaluateResults = await devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
    });
    assert.deepEqual(evaluateResults, ['1', '2', '3'], 'did not find expected output in the console');

    await typeIntoConsole('console.clear();', devToolsPage);

    await devToolsPage.waitForFunction(async () => {
      return await devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 1);
    });

    const clearResult = await devToolsPage.evaluate(() => {
      const result = document.querySelector('.console-user-command-result');
      if (!result) {
        throw new Error('Could not find user command result in the DOM.');
      }
      return result.textContent;
    });
    assert.strictEqual(clearResult, 'undefined', 'the result of clear was not undefined');

    // Check that the sidebar is also cleared.
    await devToolsPage.click('[aria-label="Show console sidebar"]');
    const sideBar = await devToolsPage.waitFor('div[slot="sidebar"]');
    const entries = await devToolsPage.$$('li', sideBar);
    const entriesText = await Promise.all(entries.map(e => e.evaluate(e => e.textContent)));
    assert.deepEqual(entriesText, [
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
