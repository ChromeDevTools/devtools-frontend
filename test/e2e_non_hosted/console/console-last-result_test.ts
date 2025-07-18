// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  focusConsolePrompt,
  navigateToConsoleTab,
  turnOffHistoryAutocomplete,
  typeIntoConsole,
  typeIntoConsoleAndWaitForResult,
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('exposes the last evaluation using "$_"', async ({devToolsPage}) => {
    await navigateToConsoleTab(devToolsPage);
    await turnOffHistoryAutocomplete(devToolsPage);
    await focusConsolePrompt(devToolsPage);

    await typeIntoConsoleAndWaitForResult('1+1', undefined, undefined, devToolsPage);
    await typeIntoConsoleAndWaitForResult('$_', undefined, undefined, devToolsPage);

    let evaluateResults = await devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
    });
    assert.deepEqual(evaluateResults, ['2', '2'], 'did not find expected output in the console');

    await typeIntoConsole('console.clear();', devToolsPage);

    await devToolsPage.waitForFunction(() => {
      return devToolsPage.evaluate(() => {
        return document.querySelectorAll('.console-user-command-result').length === 1;
      });
    });

    await typeIntoConsoleAndWaitForResult('$_', undefined, undefined, devToolsPage);

    evaluateResults = await devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
    });
    assert.deepEqual(evaluateResults, ['undefined', 'undefined'], 'did not find expected output in the console');
  });
});
