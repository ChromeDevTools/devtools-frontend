// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, typeText, waitFor, waitForFunction} from '../../shared/helper.js';

import {maybeGetCurrentConsoleMessages} from '../helpers/console-helpers.js';
import {getAvailableSnippets, openCommandMenu, showSnippetsAutocompletion} from '../helpers/quick_open-helpers.js';
import {
  addSelectedTextToWatches,
  createNewSnippet,
  evaluateSelectedTextInConsole,
  getWatchExpressionsValues,
  openSnippetsSubPane,
  openSourcesPanel,
  runSnippet,
} from '../helpers/sources-helpers.js';

describe('Snippet creation', () => {
  it('can show newly created snippets show up in command menu', async () => {
    const {frontend} = getBrowserAndPages();

    await openSourcesPanel();
    await openSnippetsSubPane();
    await createNewSnippet('New snippet');

    await openCommandMenu();
    await showSnippetsAutocompletion();

    assert.deepEqual(await getAvailableSnippets(), [
      'New snippet\u200B',
    ]);

    await typeText('New ');
    assert.deepEqual(await getAvailableSnippets(), [
      'New snippet\u200B',
    ]);

    await typeText('w');
    assert.deepEqual(await getAvailableSnippets(), []);

    await frontend.keyboard.press('Backspace');
    assert.deepEqual(await getAvailableSnippets(), [
      'New snippet\u200B',
    ]);
  });
});

describe('Expression evaluation', () => {
  const message = '\'Hello\'';
  async function selectFunctionParameterElement() {
    const {frontend} = getBrowserAndPages();
    const functionParameterElement = await waitFor('.token-definition');
    const parameterElementPosition = await functionParameterElement.evaluate(elem => {
      const {x, y, right} = elem.getBoundingClientRect();
      return {x, y, right};
    });
    await frontend.mouse.move(parameterElementPosition.x, parameterElementPosition.y);
    await frontend.mouse.down();
    await frontend.mouse.move(parameterElementPosition.right, parameterElementPosition.y);
    await frontend.mouse.up();
  }

  async function navigateToSourcesAndRunSnippet() {
    await openSourcesPanel();
    await openSnippetsSubPane();
    await createNewSnippet('New snippet');
    await typeText(`(x => {debugger})(${message});`);
    await runSnippet();
  }

  afterEach(async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.reload();
  });

  it('evaluates a selected expression in the console', async () => {
    await navigateToSourcesAndRunSnippet();
    const messages = await waitForFunction(async () => {
      await selectFunctionParameterElement();
      await evaluateSelectedTextInConsole();
      const maybeMessages = await maybeGetCurrentConsoleMessages();
      if (maybeMessages.length) {
        return maybeMessages;
      }
      await openSourcesPanel();
      await openSnippetsSubPane();
      return null;
    });
    assert.deepEqual(messages, [
      message,
    ]);
  });

  it('adds an expression to watches', async () => {
    await navigateToSourcesAndRunSnippet();
    const watchExpressions = await waitForFunction(async () => {
      await selectFunctionParameterElement();
      await addSelectedTextToWatches();
      return await getWatchExpressionsValues();
    });

    if (!watchExpressions) {
      assert.fail('No watch expressions found');
    }
    const cleanWatchExpressions = watchExpressions.map(expression => expression.replace(/["]+/g, '\''));
    assert.deepEqual(cleanWatchExpressions[0], message);
  });
});

describe('Snippet evaluation', () => {
  it('highlights the correct line when a snippet throws an error', async () => {
    await openSourcesPanel();
    await openSnippetsSubPane();
    await createNewSnippet('throwing', `
      (function foo() {
        throw new Error('kaboom');
      })();`);

    await runSnippet();

    const errorLine = await waitFor('.cm-waveUnderline');
    const text = await errorLine.evaluate(el => el.textContent);
    assert.strictEqual(text, 'throw new Error(\'kaboom\');');
  });
});
