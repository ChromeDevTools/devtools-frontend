// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  CONSOLE_TAB_SELECTOR,
  maybeGetCurrentConsoleMessages,
} from '../helpers/console-helpers.js';
import {getAvailableSnippets, openCommandMenu, showSnippetsAutocompletion} from '../helpers/quick_open-helpers.js';
import {
  addSelectedTextToWatches,
  createNewSnippet,
  evaluateSelectedTextInConsole,
  getWatchExpressionsValues,
  openSnippetsSubPane,
  openSourcesPanel,
  runSnippet,
  waitForHighlightedLine,
} from '../helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';

describe('Snippet creation', () => {
  it('can show newly created snippets show up in command menu', async ({devToolsPage}) => {
    await openSourcesPanel(devToolsPage);
    await openSnippetsSubPane(devToolsPage);
    await createNewSnippet(devToolsPage, 'New snippet', undefined);

    await openCommandMenu(devToolsPage);
    await showSnippetsAutocompletion(devToolsPage);

    assert.deepEqual(await getAvailableSnippets(devToolsPage), ['New snippet']);

    await devToolsPage.typeText('New ');
    assert.deepEqual(await getAvailableSnippets(devToolsPage), ['New snippet']);

    await devToolsPage.typeText('w');
    assert.deepEqual(await getAvailableSnippets(devToolsPage), []);

    await devToolsPage.pressKey('Backspace');
    // TODO: it should actually wait for rendering to finish.
    await devToolsPage.drainTaskQueue();
    assert.deepEqual(await getAvailableSnippets(devToolsPage), ['New snippet']);
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
    await createNewSnippet(devToolsPage, 'New snippet', undefined);
    await devToolsPage.typeText(`(x => {debugger})(${message});`);
    await runSnippet(devToolsPage);
  }

  it('evaluates a selected expression in the console', async ({devToolsPage}) => {
    await navigateToSourcesAndRunSnippet(devToolsPage);
    const messages = await devToolsPage.waitForFunction(async () => {
      await selectFunctionParameterElement(devToolsPage);
      await evaluateSelectedTextInConsole(devToolsPage);
      const maybeMessages = await maybeGetCurrentConsoleMessages(devToolsPage, false, undefined);
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
    await createNewSnippet(devToolsPage, 'throwing', `
      (function foo() {
        throw new Error('kaboom');
      })();`);

    await runSnippet(devToolsPage);

    const errorLine = await devToolsPage.waitFor('.cm-waveUnderline');
    const text = await errorLine.evaluate(el => el.textContent);
    assert.strictEqual(text, 'throw new Error(\'kaboom\');');
  });
});

async function waitForConsoleMessages(devToolsPage: DevToolsPage, expectedCount: number) {
  await devToolsPage.waitFor('.console-group-messages');
  return await devToolsPage.waitForFunction(async logger => {
    const wrappers = await devToolsPage.$$('.console-group-messages .console-message-wrapper');
    if (wrappers.length !== expectedCount) {
      logger.log(`wrapper count: ${wrappers.length} !== ${expectedCount}`);
      return undefined;
    }
    const items = await Promise.all(wrappers.map(wrapper => wrapper.evaluate(el => {
      const msg = el.querySelector('.console-message');
      if (!msg || msg.childNodes.length === 0) {
        return {ready: false, reason: 'no console-message'};
      }
      const hasStackTrace = Boolean(msg.querySelector('.console-message-expand-icon'));
      const stackTraceRoot = msg.querySelector('.hidden-stack-trace > div');
      if (hasStackTrace && !stackTraceRoot?.shadowRoot?.querySelector('tbody')) {
        return {ready: false, reason: 'stack trace pending'};
      }
      const message = el.querySelector('.console-message-text')?.deepTextContent();
      const source = el.querySelector('.devtools-link')?.textContent ?? undefined;
      const stackPreviewRows = stackTraceRoot?.shadowRoot?.querySelectorAll('tbody') ?? null;
      return {
        ready: Boolean(message),
        reason: message ? '' : 'empty message',
        message,
        source,
        stackPreview: stackPreviewRows?.length ? Array.from(stackPreviewRows).map(x => x.textContent).join('') : null,
        wrapperClasses: el.className,
      };
    })));
    const unready = items.find(item => !item.ready);
    if (unready) {
      logger.log(`unready item: ${unready.reason}`);
      return undefined;
    }
    return items.map(({message, source, stackPreview, wrapperClasses}) =>
                         ({message, source, stackPreview, wrapperClasses}));
  }, undefined, `Waiting for ${expectedCount} console messages`);
}

async function getSnippetEditorErrorMarkers(devToolsPage: DevToolsPage, expectedCount: number) {
  return await devToolsPage.waitForFunction(async () => {
    const markers = await devToolsPage.evaluate(() => {
      const editor = document.querySelector('#sources-panel-sources-view devtools-text-editor');
      const lines = Array.from(editor?.shadowRoot?.querySelectorAll('.cm-content > .cm-line') ?? []);
      const result:
          Array<{line: number, lineText: string | null, underlineText: string | null, hasErrorIcon: boolean}> = [];
      lines.forEach((lineEl, index) => {
        const underline = lineEl.querySelector('.cm-waveUnderline');
        const icon = lineEl.querySelector('devtools-icon.cm-messageIcon-error[name="cross-circle-filled"]');
        if (underline || icon) {
          result.push({
            line: index + 1,
            lineText: lineEl.textContent,
            underlineText: underline?.textContent ?? null,
            hasErrorIcon: Boolean(icon),
          });
        }
      });
      return result;
    });
    return markers.length === expectedCount ? markers : undefined;
  });
}

describe('Snippet console links', () => {
  it('links console.log and return value locations to the snippet', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await openSourcesPanel(devToolsPage);
    await openSnippetsSubPane(devToolsPage);
    await createNewSnippet(devToolsPage, 'name1', 'console.log(239);42');
    await runSnippet(devToolsPage);

    const messages = await waitForConsoleMessages(devToolsPage, 2);
    assert.deepEqual(messages.map(({message, source, wrapperClasses}) => ({message, source, wrapperClasses})), [
      {
        message: '239',
        source: 'name1:1',
        wrapperClasses: 'console-message-wrapper console-from-api console-info-level',
      },
      {
        message: '42',
        source: 'name1:1',
        wrapperClasses: 'console-message-wrapper console-info-level',
      },
    ]);
  });

  it('links syntax error messages and marks the snippet editor line', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('empty.html');
    await openSourcesPanel(devToolsPage);
    await openSnippetsSubPane(devToolsPage);
    await createNewSnippet(devToolsPage, 'name2', undefined);
    await devToolsPage.pressKey('Enter');
    await devToolsPage.pasteText('}');
    await devToolsPage.pressKey('ArrowLeft');
    await devToolsPage.pressKey('Space');
    await devToolsPage.pressKey('s', {control: true});
    await runSnippet(devToolsPage);

    const markers = await getSnippetEditorErrorMarkers(devToolsPage, 1);
    assert.deepEqual(markers, [{line: 2, lineText: ' }', underlineText: '}', hasErrorIcon: true}]);

    await devToolsPage.hover('devtools-icon.cm-messageIcon-error[name="cross-circle-filled"]');
    const rowMessage = await devToolsPage.waitFor('.text-editor-row-message');
    const popoverText = await rowMessage.evaluate(el => (el as HTMLElement).innerText);
    assert.strictEqual(popoverText, 'Uncaught SyntaxError: Unexpected token \'}\'');

    const messages = await waitForConsoleMessages(devToolsPage, 1);
    assert.deepEqual(messages.map(({message, source, wrapperClasses}) => ({message, source, wrapperClasses})), [
      {
        message: 'Uncaught SyntaxError: Unexpected token \'}\' (at name2:2:2)',
        source: 'name2:2',
        wrapperClasses: 'console-message-wrapper console-error-level',
      },
    ]);
  });

  it('links console.error messages, marks editor lines, and navigates on click',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('empty.html');
       await openSourcesPanel(devToolsPage);
       await openSnippetsSubPane(devToolsPage);
       await createNewSnippet(devToolsPage, 'name3', undefined);
       await devToolsPage.pressKey('Enter');
       await devToolsPage.pasteText(
           'console.error(42);\nconsole.error(-0);\nconsole.error(false);\nconsole.error(null)');
       await devToolsPage.pressKey('s', {control: true});
       await runSnippet(devToolsPage);

       const markers = await getSnippetEditorErrorMarkers(devToolsPage, 4);
       assert.deepEqual(markers, [
         {line: 2, lineText: 'console.error(42);', underlineText: 'error(42);', hasErrorIcon: true},
         {line: 3, lineText: 'console.error(-0);', underlineText: 'error(-0);', hasErrorIcon: true},
         {line: 4, lineText: 'console.error(false);', underlineText: 'error(false);', hasErrorIcon: true},
         {line: 5, lineText: 'console.error(null)', underlineText: 'error(null)', hasErrorIcon: true},
       ]);

       const messages = await waitForConsoleMessages(devToolsPage, 5);
       assert.deepEqual(messages.map(({message, source, stackPreview, wrapperClasses}) =>
                                         ({message, source, stackPreview, wrapperClasses})),
                        [
                          {
                            message: '42',
                            source: 'name3:2',
                            stackPreview: '\n(anonymous) @ name3:2',
                            wrapperClasses: 'console-message-wrapper console-from-api console-error-level',
                          },
                          {
                            message: '-0',
                            source: 'name3:3',
                            stackPreview: '\n(anonymous) @ name3:3',
                            wrapperClasses: 'console-message-wrapper console-from-api console-error-level',
                          },
                          {
                            message: 'false',
                            source: 'name3:4',
                            stackPreview: '\n(anonymous) @ name3:4',
                            wrapperClasses: 'console-message-wrapper console-from-api console-error-level',
                          },
                          {
                            message: 'null',
                            source: 'name3:5',
                            stackPreview: '\n(anonymous) @ name3:5',
                            wrapperClasses: 'console-message-wrapper console-from-api console-error-level',
                          },
                          {
                            message: 'undefined',
                            source: 'name3:1',
                            stackPreview: null,
                            wrapperClasses: 'console-message-wrapper console-info-level',
                          },
                        ]);

       // Switch to the Console panel so clicking the snippet link navigates back to Sources at line 3.
       await devToolsPage.click(CONSOLE_TAB_SELECTOR);
       await devToolsPage.waitFor(`${CONSOLE_TAB_SELECTOR}[aria-selected="true"]`);
       await devToolsPage.waitFor('.console-view');
       const targetLink = await devToolsPage.waitForFunction(async () => {
         const links = await devToolsPage.$$('.console-group-messages .devtools-link');
         for (const link of links) {
           const text = await link.evaluate(el => el.textContent);
           if (text === 'name3:3') {
             return link;
           }
         }
         return undefined;
       });
       await targetLink.click();

       await devToolsPage.waitFor('[aria-label="name3"][role="tab"][aria-selected="true"]');
       await waitForHighlightedLine(devToolsPage, 3);
     });
});
