// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {AsyncScope} from '../../conductor/async-scope.js';
import {
  $,
  $$,
  click,
  getBrowserAndPages,
  goToResource,
  pasteText,
  timeout,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';

import {
  expectVeEvents,
  veChange,
  veClick,
  veImpression,
  veResize,
} from './visual-logging-helpers.js';

export const CONSOLE_TAB_SELECTOR = '#tab-console';
export const CONSOLE_MESSAGES_SELECTOR = '.console-group-messages';
export const CONSOLE_MESSAGES_TEXT_SELECTOR = '.source-code .console-message-text';
export const CONSOLE_ALL_MESSAGES_SELECTOR = `${CONSOLE_MESSAGES_SELECTOR} ${CONSOLE_MESSAGES_TEXT_SELECTOR}`;
export const CONSOLE_INFO_MESSAGES_SELECTOR =
    `${CONSOLE_MESSAGES_SELECTOR} .console-info-level ${CONSOLE_MESSAGES_TEXT_SELECTOR}`;
export const CONSOLE_ERROR_MESSAGES_SELECTOR =
    `${CONSOLE_MESSAGES_SELECTOR} .console-error-level ${CONSOLE_MESSAGES_TEXT_SELECTOR}`;
export const CONSOLE_MESSAGE_TEXT_AND_ANCHOR_SELECTOR = '.console-group-messages .source-code';
export const LOG_LEVELS_SELECTOR = '[aria-label^="Log level: "]';
export const LOG_LEVELS_VERBOSE_OPTION_SELECTOR = '[aria-label^="Verbose"]';
export const CONSOLE_PROMPT_SELECTOR = '.console-prompt-editor-container';
export const CONSOLE_VIEW_IN_DRAWER_SELECTOR = '.drawer-tabbed-pane .console-view';
export const CONSOLE_VIEW_SELECTOR = '.console-view';
export const CONSOLE_TOOLTIP_SELECTOR = '.cm-tooltip';
export const CONSOLE_COMPLETION_HINT_SELECTOR = '.cm-completionHint';
export const STACK_PREVIEW_CONTAINER = '.stack-preview-container';
export const CONSOLE_MESSAGE_WRAPPER_SELECTOR = '.console-group-messages .console-message-wrapper';
export const CONSOLE_SELECTOR = '.console-user-command-result';
export const CONSOLE_SETTINGS_SELECTOR = '[aria-label^="Console settings"]';
export const AUTOCOMPLETE_FROM_HISTORY_SELECTOR = '[title="Autocomplete from history"]';
export const SHOW_CORS_ERRORS_SELECTOR = '[title="Show CORS errors in console"]';
export const LOG_XML_HTTP_REQUESTS_SELECTOR = '[title="Log XMLHttpRequests"]';
export const CONSOLE_CREATE_LIVE_EXPRESSION_SELECTOR = '[aria-label^="Create live expression"]';

export const Level = {
  All: CONSOLE_ALL_MESSAGES_SELECTOR,
  Info: CONSOLE_INFO_MESSAGES_SELECTOR,
  Error: CONSOLE_ERROR_MESSAGES_SELECTOR,
};

export async function deleteConsoleMessagesFilter(frontend: puppeteer.Page) {
  await waitFor('.console-main-toolbar');
  const main = await $('.console-main-toolbar');
  await frontend.evaluate(n => {
    const deleteButton = n.shadowRoot?.querySelector('.toolbar-input-clear-button') as HTMLElement;
    if (deleteButton) {
      deleteButton.click();
    }
  }, main);
  await expectVeEvents([veClick('Toolbar > TextField: filter > Action: clear')], await veRoot());
}

export async function filterConsoleMessages(frontend: puppeteer.Page, filter: string) {
  await waitFor('.console-main-toolbar');
  const main = await $('.console-main-toolbar');
  await frontend.evaluate(n => {
    const toolbar = n.shadowRoot?.querySelector('.toolbar-input-prompt.text-prompt') as HTMLElement;
    toolbar.focus();
  }, main);
  await pasteText(filter);
  await frontend.keyboard.press('Tab');
  if (filter.length) {
    await expectVeEvents([veChange('Toolbar > TextField: filter')], await veRoot());
  }
}

export async function waitForConsoleMessagesToBeNonEmpty(numberOfMessages: number) {
  await waitForFunction(async () => {
    const messages = await $$(CONSOLE_ALL_MESSAGES_SELECTOR);
    if (messages.length < numberOfMessages) {
      return false;
    }
    const textContents =
        await Promise.all(messages.map(message => message.evaluate(message => message.textContent || '')));
    return textContents.every(text => text !== '');
  });
  await expectVeEvents([veImpressionForConsoleMessage()], await veRoot());
}

export async function waitForLastConsoleMessageToHaveContent(expectedTextContent: string) {
  await waitForFunction(async () => {
    const messages = await $$(CONSOLE_ALL_MESSAGES_SELECTOR);
    if (messages.length === 0) {
      return false;
    }
    const lastMessageContent = await messages[messages.length - 1].evaluate(message => message.textContent);
    return lastMessageContent === expectedTextContent;
  });
  await expectVeEvents([veImpressionForConsoleMessage()], await veRoot());
}

export async function getConsoleMessages(testName: string, withAnchor = false, callback?: () => Promise<void>) {
  // Ensure Console is loaded before the page is loaded to avoid a race condition.
  await navigateToConsoleTab();

  // Have the target load the page.
  await goToResource(`console/${testName}.html`);

  return getCurrentConsoleMessages(withAnchor, Level.All, callback);
}

export async function getCurrentConsoleMessages(withAnchor = false, level = Level.All, callback?: () => Promise<void>) {
  const {frontend} = getBrowserAndPages();
  const asyncScope = new AsyncScope();

  await navigateToConsoleTab();

  // Get console messages that were logged.
  await waitFor(CONSOLE_MESSAGES_SELECTOR, undefined, asyncScope);

  if (callback) {
    await callback();
  }

  // Ensure all messages are populated.
  await asyncScope.exec(() => frontend.waitForFunction((selector: string) => {
    const messages = document.querySelectorAll(selector);
    if (messages.length === 0) {
      return false;
    }
    return Array.from(messages).every(message => message.childNodes.length > 0);
  }, {timeout: 0, polling: 'mutation'}, CONSOLE_ALL_MESSAGES_SELECTOR));

  const selector = withAnchor ? CONSOLE_MESSAGE_TEXT_AND_ANCHOR_SELECTOR : level;

  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(100);

  await expectVeEvents([veImpressionForConsoleMessage()], await veRoot());

  // Get the messages from the console.
  return frontend.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector)).map(message => message.textContent as string);
  }, selector);
}

export async function getLastConsoleMessages(offset: number = 0) {
  return (await getCurrentConsoleMessages()).at(-1 - offset);
}

export async function maybeGetCurrentConsoleMessages(withAnchor = false, callback?: () => Promise<void>) {
  const {frontend} = getBrowserAndPages();
  const asyncScope = new AsyncScope();

  await navigateToConsoleTab();

  // Get console messages that were logged.
  await waitFor(CONSOLE_MESSAGES_SELECTOR, undefined, asyncScope);

  if (callback) {
    await callback();
  }

  const selector = withAnchor ? CONSOLE_MESSAGE_TEXT_AND_ANCHOR_SELECTOR : CONSOLE_ALL_MESSAGES_SELECTOR;

  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(100);

  // Get the messages from the console.
  const result = await frontend.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector)).map(message => message.textContent);
  }, selector);

  if (result.length) {
    await expectVeEvents([veImpressionForConsoleMessage()], await veRoot());
  }
  return result;
}

export async function getStructuredConsoleMessages() {
  const {frontend} = getBrowserAndPages();
  const asyncScope = new AsyncScope();

  await navigateToConsoleTab();

  // Get console messages that were logged.
  await waitFor(CONSOLE_MESSAGES_SELECTOR, undefined, asyncScope);

  // Ensure all messages are populated.
  await asyncScope.exec(() => frontend.waitForFunction((selector: string) => {
    return Array.from(document.querySelectorAll(selector)).every(message => message.childNodes.length > 0);
  }, {timeout: 0}, CONSOLE_ALL_MESSAGES_SELECTOR));
  await expectVeEvents([veImpressionForConsoleMessage()], await veRoot());

  return frontend.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector)).map(wrapper => {
      const message = wrapper.querySelector('.console-message-text')?.textContent;
      const source = wrapper.querySelector('.devtools-link')?.textContent;
      const consoleMessage = wrapper.querySelector('.console-message');
      const repeatCount = wrapper.querySelector('.console-message-repeat-count');
      const stackPreviewRoot = wrapper.querySelector('.hidden-stack-trace > span');
      const stackPreview = stackPreviewRoot?.shadowRoot?.querySelectorAll('tbody') ?? null;
      return {
        message,
        messageClasses: consoleMessage?.className,
        repeatCount: repeatCount?.textContent ?? null,
        source,
        stackPreview: stackPreview?.length ? Array.from(stackPreview).map(x => x.textContent).join('') : null,
        wrapperClasses: wrapper?.className,
      };
    });
  }, CONSOLE_MESSAGE_WRAPPER_SELECTOR);
}

export async function focusConsolePrompt() {
  await click(CONSOLE_PROMPT_SELECTOR);
  await waitFor('[aria-label="Console prompt"]');
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(50);
}

export async function showVerboseMessages() {
  await click(LOG_LEVELS_SELECTOR);
  await click(LOG_LEVELS_VERBOSE_OPTION_SELECTOR);
  await expectVeEvents(
      [
        veClick(''),
        veImpression(
            'Menu', undefined,
            [
              veImpression('Action', 'default'),
              veImpression('Toggle', 'error'),
              veImpression('Toggle', 'info'),
              veImpression('Toggle', 'verbose'),
              veImpression('Toggle', 'warning'),
            ]),
        veClick('Menu > Toggle: verbose'),
        veResize('Menu'),
      ],
      `${await veRoot()} > Toolbar > DropDown: log-level`);
}

export async function typeIntoConsole(frontend: puppeteer.Page, message: string) {
  const asyncScope = new AsyncScope();
  const consoleElement = await waitFor(CONSOLE_PROMPT_SELECTOR, undefined, asyncScope);
  await consoleElement.click();
  await consoleElement.type(message);
  // Wait for autocomplete text to catch up.
  const line = await waitFor('[aria-label="Console prompt"]', consoleElement, asyncScope);
  const autocomplete = await $(CONSOLE_TOOLTIP_SELECTOR);
  // The autocomplete element doesn't exist until the first autocomplete suggestion
  // is actually given.

  // Sometimes the autocomplete suggests `assert` when typing `console.clear()` which made a test flake.
  // The following checks if there is any autocomplete text and dismisses it by pressing escape.
  if (autocomplete && await autocomplete.evaluate(e => e.textContent)) {
    consoleElement.press('Escape');
  }
  await asyncScope.exec(
      () =>
          frontend.waitForFunction((msg: string, ln: Element) => ln.textContent === msg, {timeout: 0}, message, line));
  await consoleElement.press('Enter');
}

export async function typeIntoConsoleAndWaitForResult(
    frontend: puppeteer.Page, message: string, leastExpectedMessages = 1, selector = Level.All) {
  // Get the current number of console results so we can check we increased it.
  const originalLength = await frontend.evaluate(selector => {
    return document.querySelectorAll(selector).length;
  }, selector);

  await typeIntoConsole(frontend, message);

  await new AsyncScope().exec(
      () => frontend.waitForFunction((originalLength: number, leastExpectedMessages: number, selector: string) => {
        return document.querySelectorAll(selector).length >= originalLength + leastExpectedMessages;
      }, {timeout: 0}, originalLength, leastExpectedMessages, selector));
}

export async function unifyLogVM(actualLog: string, expectedLog: string) {
  const actualLogArray = actualLog.trim().split('\n').map(s => s.trim());
  const expectedLogArray = expectedLog.trim().split('\n').map(s => s.trim());

  assert.strictEqual(actualLogArray.length, expectedLogArray.length, 'logs are not the same length');

  for (let index = 0; index < actualLogArray.length; index++) {
    const repl = actualLogArray[index].match(/VM\d+:/g);
    if (repl) {
      expectedLogArray[index] = expectedLogArray[index].replace(/VM\d+:/g, repl[0]);
    }
  }

  return expectedLogArray.join('\n');
}

export async function navigateToConsoleTab() {
  // Locate the button for switching to the console tab.
  if ((await $$(CONSOLE_VIEW_SELECTOR)).length) {
    return;
  }
  await click(CONSOLE_TAB_SELECTOR);
  await waitFor(CONSOLE_PROMPT_SELECTOR);
  await expectVeEvents([veImpressionForConsolePanel()]);
}

export async function waitForConsoleInfoMessageAndClickOnLink() {
  const consoleMessage = await waitFor('div.console-group-messages .console-info-level span.source-code');
  await click('button.devtools-link', {root: consoleMessage});
  await expectVeEvents([veClick('Item: console-message > Link: script-location')], await veRoot());
}

export async function turnOffHistoryAutocomplete() {
  await click(CONSOLE_SETTINGS_SELECTOR);
  await click(AUTOCOMPLETE_FROM_HISTORY_SELECTOR);
  await expectVeEvents(
      [
        veClick('Toolbar > ToggleSubpane: console-settings'),
        ...veImpressionsForConsoleSettings(),
        veChange('Toggle: console-history-autocomplete'),
      ],
      await veRoot());
}

export async function toggleShowCorsErrors() {
  await click(CONSOLE_SETTINGS_SELECTOR);
  await click(SHOW_CORS_ERRORS_SELECTOR);
  await expectVeEvents(
      [
        veClick('Toolbar > ToggleSubpane: console-settings'),
        ...veImpressionsForConsoleSettings(),
        veChange('Toggle: console-shows-cors-errors'),
      ],
      await veRoot());
}

export async function toggleShowLogXmlHttpRequests() {
  await click(CONSOLE_SETTINGS_SELECTOR);
  await click(LOG_XML_HTTP_REQUESTS_SELECTOR);
  await expectVeEvents(
      [
        veClick('Toolbar > ToggleSubpane: console-settings'),
        ...veImpressionsForConsoleSettings(),
        veChange('Toggle: monitoring-xhr-enabled'),
      ],
      await veRoot());
}

async function getIssueButtonLabel(): Promise<string|null> {
  const infobarButton = await waitFor('#console-issues-counter');
  const iconButton = await waitFor('icon-button', infobarButton);
  const titleElement = await waitFor('.icon-button-title', iconButton);
  const infobarButtonText = await titleElement.evaluate(node => (node as HTMLElement).textContent);
  await expectVeEvents([veImpression('Counter', 'issues')], `${await veRoot()} > Toolbar`);
  return infobarButtonText;
}

export async function waitForIssueButtonLabel(expectedLabel: string) {
  await waitForFunction(async () => {
    const label = await getIssueButtonLabel();
    return expectedLabel === label;
  });
}

export async function clickOnContextMenu(selectorForNode: string, jslogContext: string) {
  await click(selectorForNode, {clickOptions: {button: 'right'}});
  const menuItem = await waitFor(`[jslog*="context: ${jslogContext}"]`);
  await menuItem.click();
  const isObject = ['copy-object', 'expand-recursively'].includes(jslogContext);
  await expectVeEvents(
      [
        veClick(isObject ? 'Tree > TreeItem' : ''),
        veImpressionForConsoleMessageContextMenu(jslogContext),
        veClick(`Menu > Action: ${jslogContext}`),
        veResize('Menu'),
      ],
      `${await veRoot()} > Item: console-message`);
}

/**
 * Creates a function that runs a command and checks the nth output from the
 * bottom (checks last message by default)
 */
export function checkCommandResultFunction(offset: number = 0) {
  return async function(command: string, expected: string, message?: string) {
    await typeIntoConsoleAndWaitForResult(getBrowserAndPages().frontend, command);
    assert.strictEqual(await getLastConsoleMessages(offset), expected, message);
  };
}

export async function getLastConsoleStacktrace(offset: number = 0) {
  return (await getStructuredConsoleMessages()).at(-1 - offset)?.stackPreview as string;
}

export async function checkCommandStacktrace(
    command: string, expected: string, leastMessages: number = 1, offset: number = 0) {
  await typeIntoConsoleAndWaitForResult(getBrowserAndPages().frontend, command, leastMessages);
  await unifyLogVM(await getLastConsoleStacktrace(offset), expected);
}

function veImpressionForConsoleMessage() {
  return veImpression('Item', 'console-message');
}

export function veImpressionForConsolePanel() {
  return veImpression('Panel', 'console', [
    veImpression(
        'Toolbar', undefined,
        [
          veImpression('ToggleSubpane', 'console-sidebar'),
          veImpression('Action', 'console.clear'),
          veImpression('DropDown', 'javascript-context'),
          veImpression('Action', 'console.create-pin'),
          veImpression('DropDown', 'log-level'),
          veImpression('ToggleSubpane', 'console-settings'),
          veImpression('TextField', 'filter'),
        ]),
    veImpression('TextField', 'console-prompt'),
  ]);
}

function veImpressionsForConsoleSettings() {
  return [
    veImpression('Toggle', 'console-eager-eval'),
    veImpression('Toggle', 'console-group-similar'),
    veImpression('Toggle', 'console-history-autocomplete'),
    veImpression('Toggle', 'console-shows-cors-errors'),
    veImpression('Toggle', 'console-user-activation-eval'),
    veImpression('Toggle', 'hide-network-messages'),
    veImpression('Toggle', 'monitoring-xhr-enabled'),
    veImpression('Toggle', 'preserve-console-log'),
    veImpression('Toggle', 'selected-context-filter-enabled'),
  ];
}
function veImpressionForConsoleMessageContextMenu(expectedItem: string) {
  const isObject = ['copy-object', 'expand-recursively'].includes(expectedItem);
  const isString = expectedItem.startsWith('copy-string');
  const isValue = isObject || expectedItem.startsWith('copy');
  const menuItems = new Set([expectedItem]);
  if (isValue) {
    menuItems.add('store-as-global-variable');
  }
  if (isObject) {
    menuItems.add('copy-object').add('collapse-children').add('expand-recursively');
  }
  if (isString) {
    menuItems.add('copy-string-as-js-literal').add('copy-string-as-json-literal').add('copy-string-contents');
  }
  return veImpression('Menu', undefined, [...menuItems].map(i => veImpression('Action', i)));
}

async function veRoot(): Promise<string> {
  return (await $$(CONSOLE_VIEW_IN_DRAWER_SELECTOR)).length ? 'Drawer > Panel: console' : 'Panel: console';
}
