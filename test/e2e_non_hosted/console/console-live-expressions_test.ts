// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  CONSOLE_CREATE_LIVE_EXPRESSION_SELECTOR,
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  getCurrentConsoleMessages,
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('commits live expression with Enter', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await devToolsPage.click(CONSOLE_CREATE_LIVE_EXPRESSION_SELECTOR);

    const consolePin = await devToolsPage.waitFor('.console-pin');

    await devToolsPage.waitFor('.cm-editor.cm-focused', consolePin);
    await devToolsPage.typeText('1 + 2 + 3');

    const editorUnfocusedPromise = devToolsPage.waitForNone('.cm-editor.cm-focused', consolePin);
    await devToolsPage.page.keyboard.press('Enter');
    await editorUnfocusedPromise;

    await devToolsPage.waitForElementWithTextContent('6');
  });

  it('live expression does not change $_', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);

    // Evaluate an expression in the console.
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.pasteText('"console expression"');
    await devToolsPage.page.keyboard.press('Enter');

    // Add a live expression.
    await devToolsPage.click(CONSOLE_CREATE_LIVE_EXPRESSION_SELECTOR);
    const consolePin = await devToolsPage.waitFor('.console-pin');
    await devToolsPage.waitFor('.cm-editor.cm-focused', consolePin);
    await devToolsPage.typeText('"live expression"');
    const editorUnfocusedPromise = devToolsPage.waitForNone('.cm-editor.cm-focused', consolePin);
    await devToolsPage.page.keyboard.press('Enter');
    await editorUnfocusedPromise;

    // Wait for the live expression to be displayed.
    await devToolsPage.waitForElementWithTextContent('\'live expression\'');

    // Evaluate '$_'.
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.pasteText('$_');
    await devToolsPage.page.keyboard.press('Enter');

    // Wait for the console to contain both results.
    await devToolsPage.waitForFunction(async () => {
      const messages = await devToolsPage.evaluate(() => {
        return Array.from(document.querySelectorAll('.console-user-command-result'));
      });
      return messages.length === 2;
    });

    const messages = await getCurrentConsoleMessages(false, undefined, undefined, devToolsPage);
    assert.deepEqual(messages, [
      '\'console expression\'',
      '\'console expression\'',
    ]);
  });
});
