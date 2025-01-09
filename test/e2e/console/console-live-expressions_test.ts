// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  getBrowserAndPages,
  pasteText,
  typeText,
  waitFor,
  waitForElementWithTextContent,
  waitForNone
} from '../../shared/helper.js';
import {
  CONSOLE_CREATE_LIVE_EXPRESSION_SELECTOR,
  CONSOLE_TAB_SELECTOR,
  focusConsolePrompt,
  getCurrentConsoleMessages
} from '../helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('commits live expression with Enter', async () => {
    const {frontend} = getBrowserAndPages();

    await click(CONSOLE_TAB_SELECTOR);
    await click(CONSOLE_CREATE_LIVE_EXPRESSION_SELECTOR);

    const consolePin = await waitFor('.console-pin');

    await waitFor('.cm-editor.cm-focused', consolePin);
    await typeText('1 + 2 + 3');

    const editorUnfocusedPromise = waitForNone('.cm-editor.cm-focused', consolePin);
    await frontend.keyboard.press('Enter');
    await editorUnfocusedPromise;

    await waitForElementWithTextContent('6');
  });

  it('live expression does not change $_', async () => {
    const {frontend} = getBrowserAndPages();

    await click(CONSOLE_TAB_SELECTOR);

    // Evaluate an expression in the console.
    await focusConsolePrompt();
    await pasteText('"console expression"');
    await frontend.keyboard.press('Enter');

    // Add a live expression.
    await click(CONSOLE_CREATE_LIVE_EXPRESSION_SELECTOR);
    const consolePin = await waitFor('.console-pin');
    await waitFor('.cm-editor.cm-focused', consolePin);
    await typeText('"live expression"');
    const editorUnfocusedPromise = waitForNone('.cm-editor.cm-focused', consolePin);
    await frontend.keyboard.press('Enter');
    await editorUnfocusedPromise;

    // Wait for the live expression to be displayed.
    await waitForElementWithTextContent('\'live expression\'');

    // Evaluate '$_'.
    await focusConsolePrompt();
    await pasteText('$_');
    await frontend.keyboard.press('Enter');

    // Wait for the console to contain both results.
    await frontend.waitForFunction(() => {
      return document.querySelectorAll('.console-user-command-result').length === 2;
    });

    const messages = await getCurrentConsoleMessages();
    assert.deepEqual(messages, [
      '\'console expression\'',
      '\'console expression\'',
    ]);
  });
});
