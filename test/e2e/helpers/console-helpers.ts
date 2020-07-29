// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';

import {$, click, getBrowserAndPages, goToResource, pasteText, waitFor} from '../../shared/helper.js';

export const CONSOLE_TAB_SELECTOR = '#tab-console';
export const CONSOLE_MESSAGES_SELECTOR = '.console-group-messages';
export const CONSOLE_FIRST_MESSAGES_SELECTOR = '.console-group-messages .source-code .console-message-text';
export const CONSOLE_MESSAGE_TEXT_AND_ANCHOR_SELECTOR = '.console-group-messages .source-code';
export const LOG_LEVELS_SELECTOR = '[aria-label^="Log level: "]';
export const LOG_LEVELS_VERBOSE_OPTION_SELECTOR = '[aria-label^="Verbose"]';
export const CONSOLE_PROMPT_SELECTOR = '.console-prompt-editor-container';
export const CONSOLE_VIEW_SELECTOR = '.console-view';
export const STACK_PREVIEW_CONTAINER = '.stack-preview-container';
export const CONSOLE_MESSAGE_WRAPPER_SELECTOR = '.console-group-messages .console-message-wrapper';
export const CONSOLE_SELECTOR = '.console-user-command-result';
export const CONSOLE_SETTINGS_SELECTOR = '[aria-label^="Console settings"]';
export const AUTOCOMPLETE_FROM_HISTORY_SELECTOR = '[aria-label^="Autocomplete from history"]';

export async function deleteConsoleMessagesFilter(frontend: puppeteer.Page) {
  await waitFor('.console-main-toolbar');
  const main = await $('.console-main-toolbar');
  await frontend.evaluate(n => {
    const deleteButton = n.shadowRoot.querySelector('.search-cancel-button');
    if (deleteButton) {
      deleteButton.click();
    }
  }, main);
}

export async function filterConsoleMessages(frontend: puppeteer.Page, filter: string) {
  await waitFor('.console-main-toolbar');
  const main = await $('.console-main-toolbar');
  await frontend.evaluate(n => {
    const toolbar = n.shadowRoot.querySelector('.toolbar-input-prompt.text-prompt');
    toolbar.focus();
  }, main);
  await pasteText(filter);
  await frontend.keyboard.press('Enter');
}

export async function getConsoleMessages(
    testName: string, withAnchor = false, callback?: (page: puppeteer.Page) => Promise<void>) {
  // Ensure Console is loaded before the page is loaded to avoid a race condition.
  await getCurrentConsoleMessages();

  // Have the target load the page.
  await goToResource(`console/${testName}.html`);

  return getCurrentConsoleMessages(withAnchor, callback);
}

export async function getCurrentConsoleMessages(
    withAnchor = false, callback?: (page: puppeteer.Page) => Promise<void>) {
  const {frontend} = getBrowserAndPages();

  await navigateToConsoleTab();

  // Get console messages that were logged.
  await waitFor(CONSOLE_MESSAGES_SELECTOR);

  if (callback) {
    await callback(frontend);
  }

  // Ensure all messages are populated.
  await frontend.waitForFunction(CONSOLE_FIRST_MESSAGES_SELECTOR => {
    return Array.from(document.querySelectorAll(CONSOLE_FIRST_MESSAGES_SELECTOR))
        .every(message => message.childNodes.length > 0);
  }, {timeout: 3000}, CONSOLE_FIRST_MESSAGES_SELECTOR);

  const selector = withAnchor ? CONSOLE_MESSAGE_TEXT_AND_ANCHOR_SELECTOR : CONSOLE_FIRST_MESSAGES_SELECTOR;

  // Get the messages from the console.
  return frontend.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector)).map(message => message.textContent);
  }, selector);
}

export async function getStructuredConsoleMessages() {
  const {frontend} = getBrowserAndPages();

  await navigateToConsoleTab();

  // Get console messages that were logged.
  await waitFor(CONSOLE_MESSAGES_SELECTOR);

  // Ensure all messages are populated.
  await frontend.waitForFunction(CONSOLE_FIRST_MESSAGES_SELECTOR => {
    return Array.from(document.querySelectorAll(CONSOLE_FIRST_MESSAGES_SELECTOR))
        .every(message => message.childNodes.length > 0);
  }, {timeout: 3000}, CONSOLE_FIRST_MESSAGES_SELECTOR);

  return frontend.evaluate((CONSOLE_MESSAGE_WRAPPER_SELECTOR, STACK_PREVIEW_CONTAINER) => {
    return Array.from(document.querySelectorAll(CONSOLE_MESSAGE_WRAPPER_SELECTOR)).map(wrapper => {
      const message = wrapper.querySelector('.console-message-text').textContent;
      const source = wrapper.querySelector('.devtools-link').textContent;
      const consoleMessage = wrapper.querySelector('.console-message');
      const repeatCount = wrapper.querySelector('.console-message-repeat-count');
      const stackPreviewRoot = wrapper.querySelector('.hidden > span');
      const stackPreview = stackPreviewRoot ? stackPreviewRoot.shadowRoot.querySelector(STACK_PREVIEW_CONTAINER) : null;
      return {
        message,
        messageClasses: consoleMessage.className,
        repeatCount: repeatCount ? repeatCount.textContent : null,
        source,
        stackPreview: stackPreview ? stackPreview.textContent : null,
        wrapperClasses: wrapper.className,
      };
    });
  }, CONSOLE_MESSAGE_WRAPPER_SELECTOR, STACK_PREVIEW_CONTAINER);
}

export async function focusConsolePrompt() {
  await waitFor(CONSOLE_PROMPT_SELECTOR);
  await click(CONSOLE_PROMPT_SELECTOR);
  await waitFor('[aria-label="Console prompt"]');
}

export async function showVerboseMessages() {
  await click(LOG_LEVELS_SELECTOR);
  await click(LOG_LEVELS_VERBOSE_OPTION_SELECTOR);
}

export async function typeIntoConsole(frontend: puppeteer.Page, message: string) {
  const console = (await waitFor(CONSOLE_PROMPT_SELECTOR)).asElement()!;
  await console.type(message);

  // Wait for autocomplete text to catch up.
  const line = (await console.$('.CodeMirror-activeline'))!.asElement()!;
  const autocompleteHandle = (await line.$('.auto-complete-text'));
  // The autocomplete element doesn't exist until the first autocomplete suggestion
  // is actaully given.
  const autocomplete = autocompleteHandle ? autocompleteHandle.asElement()! : null;
  await frontend.waitForFunction(
      (msg, ln, ac) => ln.textContent === msg && (!ac || ac.textContent === ''), undefined, message, line,
      autocomplete);

  await console.press('Enter');
}

export async function typeIntoConsoleAndWaitForResult(frontend: puppeteer.Page, message: string) {
  // Get the current number of console results so we can check we increased it.
  const originalLength = await frontend.evaluate(() => {
    return document.querySelectorAll('.console-user-command-result').length;
  });

  await typeIntoConsole(frontend, message);

  await frontend.waitForFunction(originalLength => {
    return document.querySelectorAll('.console-user-command-result').length === originalLength + 1;
  }, {}, originalLength);
}

export async function unifyLogVM(actualLog: string, expectedLog: string) {
  const actualLogArray = actualLog.split('\n');
  const expectedLogArray = expectedLog.split('\n');

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
  const dropdown = (await waitFor('[aria-label^="JavaScript context:"]')).asElement()!;
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

export async function waitForConsoleMessageAndClickOnLink() {
  const console_message = await waitFor('div.console-group-messages span.source-code');
  await click('span.devtools-link', {root: console_message});
}

export async function navigateToIssuesPanelViaInfoBar() {
  // Navigate to Issues panel
  await waitFor('.infobar');
  await click('.infobar .infobar-button');
  await waitFor('.issues-pane');
}

export async function turnOffHistoryAutocomplete() {
  await click(CONSOLE_SETTINGS_SELECTOR);
  await waitFor(AUTOCOMPLETE_FROM_HISTORY_SELECTOR);
  await click(AUTOCOMPLETE_FROM_HISTORY_SELECTOR);
}
