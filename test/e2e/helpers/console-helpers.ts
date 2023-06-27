// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as puppeteer from 'puppeteer-core';

import {
  $,
  $$,
  assertNotNullOrUndefined,
  click,
  getBrowserAndPages,
  goToResource,
  pasteText,
  timeout,
  waitFor,
  waitForAria,
  waitForFunction,
} from '../../shared/helper.js';
import {AsyncScope} from '../../shared/async-scope.js';

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
    const deleteButton = n.shadowRoot?.querySelector('.search-cancel-button') as HTMLElement;
    if (deleteButton) {
      deleteButton.click();
    }
  }, main);
}

export async function filterConsoleMessages(frontend: puppeteer.Page, filter: string) {
  await waitFor('.console-main-toolbar');
  const main = await $('.console-main-toolbar');
  await frontend.evaluate(n => {
    const toolbar = n.shadowRoot?.querySelector('.toolbar-input-prompt.text-prompt') as HTMLElement;
    toolbar.focus();
  }, main);
  await pasteText(filter);
  await frontend.keyboard.press('Enter');
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
  await asyncScope.exec(() => frontend.waitForFunction((CONSOLE_FIRST_MESSAGES_SELECTOR: string) => {
    const messages = document.querySelectorAll(CONSOLE_FIRST_MESSAGES_SELECTOR);
    if (messages.length === 0) {
      return false;
    }
    return Array.from(messages).every(message => message.childNodes.length > 0);
  }, {timeout: 0, polling: 'mutation'}, CONSOLE_ALL_MESSAGES_SELECTOR));

  const selector = withAnchor ? CONSOLE_MESSAGE_TEXT_AND_ANCHOR_SELECTOR : level;

  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(100);

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
  return frontend.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector)).map(message => message.textContent);
  }, selector);
}

export async function getStructuredConsoleMessages() {
  const {frontend} = getBrowserAndPages();
  const asyncScope = new AsyncScope();

  await navigateToConsoleTab();

  // Get console messages that were logged.
  await waitFor(CONSOLE_MESSAGES_SELECTOR, undefined, asyncScope);

  // Ensure all messages are populated.
  await asyncScope.exec(() => frontend.waitForFunction((CONSOLE_FIRST_MESSAGES_SELECTOR: string) => {
    return Array.from(document.querySelectorAll(CONSOLE_FIRST_MESSAGES_SELECTOR))
        .every(message => message.childNodes.length > 0);
  }, {timeout: 0}, CONSOLE_ALL_MESSAGES_SELECTOR));

  return frontend.evaluate((CONSOLE_MESSAGE_WRAPPER_SELECTOR, STACK_PREVIEW_CONTAINER) => {
    return Array.from(document.querySelectorAll(CONSOLE_MESSAGE_WRAPPER_SELECTOR)).map(wrapper => {
      const message = wrapper.querySelector('.console-message-text')?.textContent;
      const source = wrapper.querySelector('.devtools-link')?.textContent;
      const consoleMessage = wrapper.querySelector('.console-message');
      const repeatCount = wrapper.querySelector('.console-message-repeat-count');
      const stackPreviewRoot = wrapper.querySelector('.hidden > span');
      const stackPreview = stackPreviewRoot?.shadowRoot?.querySelector(STACK_PREVIEW_CONTAINER) ?? null;
      return {
        message,
        messageClasses: consoleMessage?.className,
        repeatCount: repeatCount ? repeatCount?.textContent : null,
        source,
        stackPreview: stackPreview ? stackPreview?.textContent : null,
        wrapperClasses: wrapper?.className,
      };
    });
  }, CONSOLE_MESSAGE_WRAPPER_SELECTOR, STACK_PREVIEW_CONTAINER);
}

export async function focusConsolePrompt() {
  await waitFor(CONSOLE_PROMPT_SELECTOR);
  await click(CONSOLE_PROMPT_SELECTOR);
  await waitFor('[aria-label="Console prompt"]');
  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await timeout(50);
}

export async function showVerboseMessages() {
  await click(LOG_LEVELS_SELECTOR);
  await click(LOG_LEVELS_VERBOSE_OPTION_SELECTOR);
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

  if (actualLogArray.length !== expectedLogArray.length) {
    throw 'logs are not the same length';
  }

  for (let index = 0; index < actualLogArray.length; index++) {
    const repl = actualLogArray[index].match(/VM\d+:/g);
    if (repl) {
      expectedLogArray[index] = expectedLogArray[index].replace(/VM\d+:/g, repl[0]);
    }
  }

  return expectedLogArray.join('\n');
}

export async function switchToTopExecutionContext(frontend: puppeteer.Page) {
  const dropdown = await waitFor('[aria-label^="JavaScript context:"]');
  // Use keyboard to open drop down, select first item.
  await dropdown.press('Space');
  await frontend.keyboard.press('Home');
  await frontend.keyboard.press('Space');
  // Double-check that it worked.
  await waitFor('[aria-label="JavaScript context: top"]');
}

export async function navigateToConsoleTab() {
  // Locate the button for switching to the console tab.
  await click(CONSOLE_TAB_SELECTOR);
  await waitFor(CONSOLE_VIEW_SELECTOR);
}

export async function waitForConsoleInfoMessageAndClickOnLink() {
  const consoleMessage = await waitFor('div.console-group-messages .console-info-level span.source-code');
  await click('span.devtools-link', {root: consoleMessage});
}

export async function navigateToIssuesPanelViaInfoBar() {
  // Navigate to Issues panel
  await waitFor('#console-issues-counter');
  await click('#console-issues-counter');
  await waitFor('.issues-pane');
}

export async function turnOffHistoryAutocomplete() {
  await click(CONSOLE_SETTINGS_SELECTOR);
  await waitFor(AUTOCOMPLETE_FROM_HISTORY_SELECTOR);
  await click(AUTOCOMPLETE_FROM_HISTORY_SELECTOR);
}

export async function toggleShowCorsErrors() {
  await click(CONSOLE_SETTINGS_SELECTOR);
  await waitFor(SHOW_CORS_ERRORS_SELECTOR);
  await click(SHOW_CORS_ERRORS_SELECTOR);
  await click(CONSOLE_SETTINGS_SELECTOR);
}

export async function toggleConsoleSetting(settingSelector: string) {
  await click(CONSOLE_SETTINGS_SELECTOR);
  await waitFor(settingSelector);
  await click(settingSelector);
  await click(CONSOLE_SETTINGS_SELECTOR);
}

async function getIssueButtonLabel(): Promise<string|null> {
  const infobarButton = await waitFor('#console-issues-counter');
  const iconButton = await waitFor('icon-button', infobarButton);
  const titleElement = await waitFor('.icon-button-title', iconButton);
  assertNotNullOrUndefined(titleElement);
  const infobarButtonText = await titleElement.evaluate(node => (node as HTMLElement).textContent);
  return infobarButtonText;
}

export async function waitForIssueButtonLabel(expectedLabel: string) {
  await waitForFunction(async () => {
    const label = await getIssueButtonLabel();
    return expectedLabel === label;
  });
}

export async function clickOnContextMenu(selectorForNode: string, ctxMenuItemName: string) {
  await click(selectorForNode, {clickOptions: {button: 'right'}});
  const copyButton = await waitForAria(ctxMenuItemName);
  await copyButton.click();
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
