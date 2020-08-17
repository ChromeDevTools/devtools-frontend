// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, step} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {focusConsolePrompt, navigateToConsoleTab, turnOffHistoryAutocomplete, typeIntoConsole, typeIntoConsoleAndWaitForResult} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  it('exposes the last evaluation using "$_"', async () => {
    const {frontend} = getBrowserAndPages();

    await step('turn off "Autocomplete from history"', async () => {
      await navigateToConsoleTab();
      await turnOffHistoryAutocomplete();
      await focusConsolePrompt();
    });

    await step('enter "1+1" in console', async () => {
      await typeIntoConsoleAndWaitForResult(frontend, '1+1');
    });

    await step('enter "$_" in console', async () => {
      await typeIntoConsoleAndWaitForResult(frontend, '$_');
    });

    await step('check the evaluation results from console', async () => {
      const evaluateResults = await frontend.evaluate(() => {
        return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
      });
      assert.deepEqual(evaluateResults, ['2', '2'], 'did not find expected output in the console');
    });

    await step('enter "console.clear()" in console', async () => {
      await typeIntoConsole(frontend, 'console.clear();');
    });

    await step('wait for the console to be cleared', async () => {
      await frontend.waitForFunction(() => {
        return document.querySelectorAll('.console-user-command-result').length === 1;
      });
    });

    await step('enter "$_" in console', async () => {
      await typeIntoConsoleAndWaitForResult(frontend, '$_');
    });

    await step('check the evaluation results from console', async () => {
      const evaluateResults = await frontend.evaluate(() => {
        return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
      });
      assert.deepEqual(evaluateResults, ['undefined', 'undefined'], 'did not find expected output in the console');
    });
  });
});
