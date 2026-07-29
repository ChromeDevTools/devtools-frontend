// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  typeIntoConsole,
  typeIntoConsoleAndWaitForResult,
} from '../helpers/console-helpers.js';

describe('The Console Tab', function() {
  it('is cleared via the console.clear() method', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    // eslint-disable-next-line no-console
    await inspectedPage.evaluate(() => console.log('target'));

    await typeIntoConsoleAndWaitForResult(devToolsPage, '1;', 1, undefined);
    await typeIntoConsoleAndWaitForResult(devToolsPage, '2;', 1, undefined);
    await typeIntoConsoleAndWaitForResult(devToolsPage, '3;', 1, undefined);

    const evaluateResults = await devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
    });
    assert.deepEqual(evaluateResults, ['1', '2', '3'], 'did not find expected output in the console');

    await typeIntoConsole(devToolsPage, 'console.clear();');

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
    await devToolsPage.click('[aria-label="Show Console sidebar"]');
    const sideBar = await devToolsPage.waitFor('div[slot="sidebar"]');
    const treeOutline = await devToolsPage.waitFor('.tree-outline', sideBar);
    const entries = await devToolsPage.$$('li', treeOutline);
    const entriesText = await Promise.all(entries.map(e => e.evaluate(e => e.innerText)));
    assert.deepEqual(entriesText, [
      '1 message',
      '<other> 1',
      '1 user message',
      '<other> 1',
      'No errors',
      'No warnings',
      '1 info',
      '<other> 1',
      'No verbose',
    ]);
  });
});
