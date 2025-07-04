// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {CONSOLE_TAB_SELECTOR, focusConsolePrompt} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', function() {
  it('eval in console succeeds for pages with no CSP', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await devToolsPage.typeText('eval("1+1")');
    await devToolsPage.page.keyboard.press('Enter');

    const result = await devToolsPage.waitFor('.console-user-command-result');

    const evaluateResult = await devToolsPage.evaluate(result => {
      return result.textContent;
    }, result);
    assert.strictEqual(evaluateResult, '2', 'Eval result was not correct');
  });

  it('eval in console fails for pages with CSP that blocks eval', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('console/CSP-blocks-eval.html');

    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await devToolsPage.typeText('eval("1+1")');
    await devToolsPage.page.keyboard.press('Enter');

    await devToolsPage.waitForFunction(() => {
      return devToolsPage.evaluate(() => {
        const commandResults = [...document.querySelectorAll('.console-user-command-result')];
        // Stack trace rendering is lazy, we need to wait not only for the element, but for the text content
        // to be present.
        return commandResults.length === 1 && commandResults[0].textContent?.includes('EvalError');
      });
    });

    const evaluateResult = await devToolsPage.evaluate(() => {
      return [...document.querySelectorAll('.console-user-command-result')].map(e => e.textContent).join(' ');
    });
    assert.include(
        evaluateResult || '', '\'unsafe-eval\' is not an allowed source of script',
        'Didn\'t find expected CSP error message in ' + evaluateResult);
  });
});
