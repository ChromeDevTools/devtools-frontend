
// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  CONSOLE_MESSAGE_WRAPPER_SELECTOR,
  CONSOLE_TAB_SELECTOR,
  CONSOLE_TOOLTIP_SELECTOR,
  focusConsolePrompt,
  typeIntoConsole,
} from '../helpers/console-helpers.js';

describe('The Console Tab', function() {
  it('allows re-declaration of let variables', async ({devToolsPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    // To avoid races with the autosuggest box, which appears asynchronously to
    // typing, we need to:
    //   1. Type until the last character that causes a suggestion, waiting for
    //      the suggestion box to open. We need to start waiting for the box to
    //      open before we start typing to ensure we catch the opening.
    //   2. Hit escape to close the suggestion box, and wait for it to
    //      disappear. As above, we need to start waiting for it to disappear
    //      before we hit escape.
    //   3. Type the rest of the expression, where the characters don't cause
    //      additional suggestions. Suggestions from history behave differently
    //      and don't auto-complete on hitting enter, so they are irrelevant
    //      here even if they do show up.
    //   4. Hit enter
    //   5. Wait for the results to show up and verify them.

    const appearPromise = devToolsPage.waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.typeText('let');
    await appearPromise;

    const disappearPromise = devToolsPage.waitForNone(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.pressKey('Escape');
    await disappearPromise;

    await devToolsPage.typeText(' x = 1;');
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitForFunction(() => {
      return devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 1);
    });

    const appearPromise2 = devToolsPage.waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.typeText('let');
    await appearPromise2;

    const disappearPromise2 = devToolsPage.waitForNone(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.pressKey('Escape');
    await disappearPromise2;

    await devToolsPage.typeText(' x = 2;');
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitForFunction(() => {
      return devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 2);
    });

    const appearPromise3 = devToolsPage.waitFor(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.typeText('x');
    await appearPromise3;

    const disappearPromise3 = devToolsPage.waitForNone(CONSOLE_TOOLTIP_SELECTOR);
    await devToolsPage.pressKey('Escape');
    await disappearPromise3;

    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitForFunction(() => {
      return devToolsPage.evaluate(() => document.querySelectorAll('.console-user-command-result').length === 3);
    });

    const evaluateResults = await devToolsPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.console-user-command-result')).map(node => node.textContent);
    });

    assert.deepEqual(evaluateResults, ['undefined', 'undefined', '2']);
  });

  it('associates a console result with its originating command', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.click(CONSOLE_TAB_SELECTOR);
    await focusConsolePrompt(devToolsPage);

    await typeIntoConsole(devToolsPage, '1 + 1');

    await devToolsPage.waitForFunction(async () => {
      return await devToolsPage.evaluate(selector => {
        return document.querySelectorAll(selector).length === 2;
      }, CONSOLE_MESSAGE_WRAPPER_SELECTOR);
    });

    await inspectedPage.evaluate(() => {
      // eslint-disable-next-line no-console
      console.log('standalone');
      Object.defineProperty(globalThis, 'logAndReturn', {
        get() {
          // Logs before Runtime.evaluate resolves so a log separates command and result.
          // eslint-disable-next-line no-console
          console.log('interleaved');
          return 2 + 2;
        },
      });
    });

    await devToolsPage.waitForFunction(async () => {
      return await devToolsPage.evaluate(selector => {
        return document.querySelectorAll(selector).length === 3;
      }, CONSOLE_MESSAGE_WRAPPER_SELECTOR);
    });

    await typeIntoConsole(devToolsPage, 'logAndReturn');

    await devToolsPage.waitForFunction(async () => {
      return await devToolsPage.evaluate(selector => {
        return document.querySelectorAll(selector).length === 6;
      }, CONSOLE_MESSAGE_WRAPPER_SELECTOR);
    });

    const renderedMessages = await devToolsPage.evaluate(selector => {
      return Array.from(document.querySelectorAll(selector))
          .map(wrapper => ({
                 isAdjacentResult: wrapper.classList.contains('console-adjacent-user-command-result'),
                 commandText: wrapper.querySelector('.console-user-command')?.textContent ?? null,
                 resultText: wrapper.querySelector('.console-user-command-result')?.textContent ?? null,
                 messageText: wrapper.querySelector('.console-message-text')?.textContent ?? null,
               }));
    }, CONSOLE_MESSAGE_WRAPPER_SELECTOR);

    assert.deepEqual(renderedMessages, [
      {
        isAdjacentResult: false,
        commandText: '1 + 1',
        resultText: null,
        messageText: null,
      },
      {
        isAdjacentResult: true,
        commandText: null,
        resultText: '2',
        messageText: '2',
      },
      {
        isAdjacentResult: false,
        commandText: null,
        resultText: null,
        messageText: 'standalone',
      },
      {
        isAdjacentResult: false,
        commandText: 'logAndReturn',
        resultText: null,
        messageText: null,
      },
      {
        isAdjacentResult: false,
        commandText: null,
        resultText: null,
        messageText: 'interleaved',
      },
      {
        isAdjacentResult: false,
        commandText: null,
        resultText: '4',
        messageText: '4',
      },
    ]);
  });
});
