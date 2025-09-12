// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {maybeGetCurrentConsoleMessages} from '../../e2e/helpers/console-helpers.js';
import {
  getAvailableSnippets,
  openCommandMenu,
  showSnippetsAutocompletion
} from '../../e2e/helpers/quick_open-helpers.js';
import {
  addSelectedTextToWatches,
  createNewSnippet,
  evaluateSelectedTextInConsole,
  getWatchExpressionsValues,
  openSnippetsSubPane,
  openSourcesPanel,
  runSnippet,
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';

describe('Snippet creation', () => {
  it('can show newly created snippets show up in command menu', async ({devToolsPage}) => {
    await openSourcesPanel(devToolsPage);
    await openSnippetsSubPane(devToolsPage);
    await createNewSnippet('New snippet', undefined, devToolsPage);

    await openCommandMenu(devToolsPage);
    await showSnippetsAutocompletion(devToolsPage);

    assert.deepEqual(await getAvailableSnippets(devToolsPage), [
      'New snippet\u200B',
    ]);

    await devToolsPage.typeText('New ');
    assert.deepEqual(await getAvailableSnippets(devToolsPage), [
      'New snippet\u200B',
    ]);

    await devToolsPage.typeText('w');
    assert.deepEqual(await getAvailableSnippets(devToolsPage), []);

    await devToolsPage.pressKey('Backspace');
    // TODO: it should actually wait for rendering to finish.
    await devToolsPage.drainTaskQueue();
    assert.deepEqual(await getAvailableSnippets(devToolsPage), [
      'New snippet\u200B',
    ]);
  });
});

describe('Expression evaluation', () => {
  const message = '\'Hello\'';
  async function selectFunctionParameterElement(devToolsPage: DevToolsPage) {
    const functionParameterElement = await devToolsPage.waitFor('.token-definition');
    const parameterElementPosition = await functionParameterElement.evaluate(elem => {
      const {x, y, right} = elem.getBoundingClientRect();
      return {x, y, right};
    });
    await devToolsPage.page.mouse.move(parameterElementPosition.x, parameterElementPosition.y);
    await devToolsPage.page.mouse.down();
    await devToolsPage.page.mouse.move(parameterElementPosition.right, parameterElementPosition.y);
    await devToolsPage.page.mouse.up();
  }

  async function navigateToSourcesAndRunSnippet(devToolsPage: DevToolsPage) {
    await openSourcesPanel(devToolsPage);
    await openSnippetsSubPane(devToolsPage);
    await createNewSnippet('New snippet', undefined, devToolsPage);
    await devToolsPage.typeText(`(x => {debugger})(${message});`);
    await runSnippet(devToolsPage);
  }

  it('evaluates a selected expression in the console', async ({devToolsPage}) => {
    await navigateToSourcesAndRunSnippet(devToolsPage);
    const messages = await devToolsPage.waitForFunction(async () => {
      await selectFunctionParameterElement(devToolsPage);
      await evaluateSelectedTextInConsole(devToolsPage);
      const maybeMessages = await maybeGetCurrentConsoleMessages(false, undefined, devToolsPage);
      if (maybeMessages.length) {
        return maybeMessages;
      }
      await openSourcesPanel(devToolsPage);
      await openSnippetsSubPane(devToolsPage);
      return null;
    });
    assert.deepEqual(messages, [
      message,
    ]);
    await devToolsPage.reload();
  });

  it('adds an expression to watches', async ({devToolsPage}) => {
    await navigateToSourcesAndRunSnippet(devToolsPage);
    const watchExpressions = await devToolsPage.waitForFunction(async () => {
      await selectFunctionParameterElement(devToolsPage);
      await addSelectedTextToWatches(devToolsPage);
      return await getWatchExpressionsValues(devToolsPage);
    });

    assert.isOk(watchExpressions, 'No watch expressions found');
    const cleanWatchExpressions = watchExpressions.map(expression => expression.replace(/["]+/g, '\''));
    assert.deepEqual(cleanWatchExpressions[0], message);
    await devToolsPage.reload();
  });
});

describe('Snippet evaluation', () => {
  it('highlights the correct line when a snippet throws an error', async ({devToolsPage}) => {
    await openSourcesPanel(devToolsPage);
    await openSnippetsSubPane(devToolsPage);
    await createNewSnippet(
        'throwing', `
      (function foo() {
        throw new Error('kaboom');
      })();`,
        devToolsPage);

    await runSnippet(devToolsPage);

    const errorLine = await devToolsPage.waitFor('.cm-waveUnderline');
    const text = await errorLine.evaluate(el => el.textContent);
    assert.strictEqual(text, 'throw new Error(\'kaboom\');');
  });
});
