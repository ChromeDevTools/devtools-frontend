// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {AsyncScope} from '../../conductor/async-scope.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import {
} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

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
export const CONSOLE_SIDEBAR_SELECTOR = 'div[slot="sidebar"]';

export const Level = {
  All: CONSOLE_ALL_MESSAGES_SELECTOR,
  Info: CONSOLE_INFO_MESSAGES_SELECTOR,
  Error: CONSOLE_ERROR_MESSAGES_SELECTOR,
};

export const SidebarItem = {
  Messages: 1,
  UserMessages: 2,
  Errors: 3,
  Warnings: 4,
  Info: 5,
  Verbose: 6,
};

export async function deleteConsoleMessagesFilter(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const main = await devToolsPage.waitFor('.console-main-toolbar');
  await devToolsPage.evaluate(toolbar => {
    const deleteButton = toolbar.querySelector<HTMLElement>('.toolbar-input-clear-button');
    if (deleteButton) {
      deleteButton.click();
    }
  }, main);
  await expectVeEvents(
      [veClick('Toolbar > TextField: filter > Action: clear')], await veRoot(devToolsPage), devToolsPage);
}

export async function filterConsoleMessages(filter: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const main = await devToolsPage.waitFor('.console-main-toolbar');
  await devToolsPage.evaluate(toolbar => {
    const prompt = toolbar.querySelector<HTMLElement>('.toolbar-input-prompt.text-prompt');
    prompt!.focus();
  }, main);
  await devToolsPage.pasteText(filter);
  await devToolsPage.drainTaskQueue();
  await devToolsPage.page.keyboard.press('Tab');
  if (filter.length) {
    await expectVeEvents([veChange('Toolbar > TextField: filter')], await veRoot(devToolsPage), devToolsPage);
  }
}

export async function waitForConsoleMessagesToBeNonEmpty(
    numberOfMessages: number, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const messages = await devToolsPage.$$(CONSOLE_ALL_MESSAGES_SELECTOR);
    if (messages.length < numberOfMessages) {
      return false;
    }
    const textContents =
        await Promise.all(messages.map(message => message.evaluate(message => message.textContent || '')));
    return textContents.every(text => text !== '');
  });
  await expectVeEvents([veImpressionForConsoleMessage()], await veRoot(devToolsPage), devToolsPage);
}

export async function waitForExactConsoleMessageCount(
    expectedCount: number, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const messageCount = await devToolsPage.waitForFunction(async () => {
    const selected = await devToolsPage.$$(CONSOLE_ALL_MESSAGES_SELECTOR);
    const messageTexts =
        await Promise.all(selected.map(message => message.evaluate(message => message.textContent || '')));
    const validMessages = messageTexts.filter(text => text !== '');
    return validMessages.length;
  });
  assert.strictEqual(messageCount, expectedCount);
  await expectVeEvents([veImpressionForConsoleMessage()], await veRoot(devToolsPage), devToolsPage);
}

export async function waitForLastConsoleMessageToHaveContent(
    expectedTextContent: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const messages = await devToolsPage.$$(CONSOLE_ALL_MESSAGES_SELECTOR);
    if (messages.length === 0) {
      return false;
    }
    const lastMessageContent = await messages[messages.length - 1].evaluate(message => message.textContent);
    return lastMessageContent === expectedTextContent;
  });
  await expectVeEvents([veImpressionForConsoleMessage()], await veRoot(devToolsPage), devToolsPage);
}

export async function getConsoleMessages(
    testName: string, withAnchor = false, callback?: () => Promise<void>,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  // Ensure Console is loaded before the page is loaded to avoid a race condition.
  await navigateToConsoleTab(devToolsPage);

  // Have the target load the page.
  await inspectedPage.goToResource(`console/${testName}.html`);

  return await getCurrentConsoleMessages(withAnchor, Level.All, callback, devToolsPage);
}

export async function getCurrentConsoleMessages(
    withAnchor = false, level = Level.All, callback?: () => Promise<void>, devToolsPage?: DevToolsPage) {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  const asyncScope = new AsyncScope();

  await navigateToConsoleTab(devToolsPage);

  // Get console messages that were logged.
  await devToolsPage.waitFor(CONSOLE_MESSAGES_SELECTOR, undefined, asyncScope);

  if (callback) {
    await callback();
  }

  // Ensure all messages are populated.
  await asyncScope.exec(() => devToolsPage.page.waitForFunction((selector: string) => {
    const messages = document.querySelectorAll(selector);
    if (messages.length === 0) {
      return false;
    }
    return Array.from(messages).every(message => message.childNodes.length > 0);
  }, {timeout: 0, polling: 'mutation'}, CONSOLE_ALL_MESSAGES_SELECTOR));

  const selector = withAnchor ? CONSOLE_MESSAGE_TEXT_AND_ANCHOR_SELECTOR : level;

  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await devToolsPage.timeout(100);

  await expectVeEvents([veImpressionForConsoleMessage()], await veRoot(devToolsPage), devToolsPage);

  // Get the messages from the console.
  return await devToolsPage.page.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector)).map(message => message.textContent as string);
  }, selector);
}

export async function getLastConsoleMessages(offset = 0, devToolsPage?: DevToolsPage) {
  return (await getCurrentConsoleMessages(false, Level.All, undefined, devToolsPage)).at(-1 - offset);
}

export async function maybeGetCurrentConsoleMessages(
    withAnchor = false, callback?: () => Promise<void>, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const asyncScope = new AsyncScope();

  await navigateToConsoleTab(devToolsPage);

  // Get console messages that were logged.
  await devToolsPage.waitFor(CONSOLE_MESSAGES_SELECTOR, undefined, asyncScope);

  if (callback) {
    await callback();
  }

  const selector = withAnchor ? CONSOLE_MESSAGE_TEXT_AND_ANCHOR_SELECTOR : CONSOLE_ALL_MESSAGES_SELECTOR;

  // FIXME(crbug/1112692): Refactor test to remove the timeout.
  await devToolsPage.timeout(100);

  // Get the messages from the console.
  const result = await devToolsPage.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector)).map(message => message.textContent);
  }, selector);

  if (result.length) {
    await expectVeEvents([veImpressionForConsoleMessage()], await veRoot(devToolsPage), devToolsPage);
  }
  return result;
}

export async function getStructuredConsoleMessages(devToolsPage?: DevToolsPage) {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  const asyncScope = new AsyncScope();

  await navigateToConsoleTab(devToolsPage);

  // Get console messages that were logged.
  await devToolsPage.waitFor(CONSOLE_MESSAGES_SELECTOR, undefined, asyncScope);

  // Ensure all messages are populated.
  await asyncScope.exec(() => devToolsPage.page.waitForFunction((selector: string) => {
    return Array.from(document.querySelectorAll(selector)).every(message => message.childNodes.length > 0);
  }, {timeout: 0}, CONSOLE_ALL_MESSAGES_SELECTOR));
  await expectVeEvents([veImpressionForConsoleMessage()], await veRoot(devToolsPage), devToolsPage);

  return await devToolsPage.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector)).map(wrapper => {
      const message = wrapper.querySelector('.console-message-text')?.textContent;
      const source = wrapper.querySelector('.devtools-link')?.textContent;
      const consoleMessage = wrapper.querySelector('.console-message');
      const repeatCount = wrapper.querySelector('.console-message-repeat-count');
      const stackPreviewRoot = wrapper.querySelector('.hidden-stack-trace > div');
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

export async function focusConsolePrompt(devToolsPage?: DevToolsPage) {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  await devToolsPage.click(CONSOLE_PROMPT_SELECTOR);
  await devToolsPage.waitFor('[aria-label="Console prompt"]');
}

export async function showVerboseMessages(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(LOG_LEVELS_SELECTOR);
  await devToolsPage.click(LOG_LEVELS_VERBOSE_OPTION_SELECTOR);
}

export async function typeIntoConsole(message: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const asyncScope = new AsyncScope();
  const consoleElement = await devToolsPage.waitFor(CONSOLE_PROMPT_SELECTOR, undefined, asyncScope);
  await consoleElement.click();
  await devToolsPage.typeText(message);
  // Wait for autocomplete text to catch up.
  const line = await devToolsPage.waitFor('[aria-label="Console prompt"]', consoleElement, asyncScope);
  const autocomplete = await devToolsPage.$(CONSOLE_TOOLTIP_SELECTOR);
  // The autocomplete element doesn't exist until the first autocomplete suggestion
  // is actually given.

  // Sometimes the autocomplete suggests `assert` when typing `console.clear()` which made a test flake.
  // The following checks if there is any autocomplete text and dismisses it by pressing escape.
  if (autocomplete && await autocomplete.evaluate(e => e.textContent)) {
    await devToolsPage.pressKey('Escape');
  }
  await asyncScope.exec(
      () => devToolsPage.page.waitForFunction(
          (msg: string, ln: Element) => ln.textContent === msg, {timeout: 0}, message, line));
  await devToolsPage.pressKey('Enter');
}

export async function typeIntoConsoleAndWaitForResult(
    message: string, leastExpectedMessages = 1, selector = Level.All,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  // Get the current number of console results so we can check we increased it.
  const originalLength = await devToolsPage.evaluate(selector => {
    return document.querySelectorAll(selector).length;
  }, selector);

  await typeIntoConsole(message, devToolsPage);

  await new AsyncScope().exec(
      () => devToolsPage.page.waitForFunction(
          (originalLength: number, leastExpectedMessages: number, selector: string) => {
            return document.querySelectorAll(selector).length >= originalLength + leastExpectedMessages;
          },
          {timeout: 0}, originalLength, leastExpectedMessages, selector));
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

export async function navigateToConsoleTab(devToolsPage?: DevToolsPage) {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  // Locate the button for switching to the console tab.
  if ((await devToolsPage.$$(CONSOLE_VIEW_SELECTOR)).length) {
    return;
  }
  await devToolsPage.click(CONSOLE_TAB_SELECTOR);
  await devToolsPage.waitFor(CONSOLE_PROMPT_SELECTOR);
  await expectVeEvents([veImpressionForConsolePanel()], undefined, devToolsPage);
}

export async function openConsoleSidebar(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click('[aria-label="Show console sidebar"]');
  await devToolsPage.waitFor(CONSOLE_SIDEBAR_SELECTOR);
}

export async function closeConsoleSidebar(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click('[aria-label="Hide console sidebar"]');
}

export async function selectConsoleSidebarItem(
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage, itemPosition = SidebarItem.Info) {
  const sidebar = await devToolsPage.waitFor(CONSOLE_SIDEBAR_SELECTOR);
  const itemSelector = `[role="tree"]>[role="treeitem"]:nth-of-type(${itemPosition})`;

  await devToolsPage.click(itemSelector, {root: sidebar});
}

export async function waitForConsoleInfoMessageAndClickOnLink(
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const consoleMessage = await devToolsPage.waitFor('div.console-group-messages .console-info-level span.source-code');
  await devToolsPage.click('button.devtools-link', {root: consoleMessage});
  await expectVeEvents(
      [veClick('Item: console-message > Link: script-location')], await veRoot(devToolsPage), devToolsPage);
}

export async function turnOffHistoryAutocomplete(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(CONSOLE_SETTINGS_SELECTOR);
  await devToolsPage.click(AUTOCOMPLETE_FROM_HISTORY_SELECTOR);
  await expectVeEvents(
      [
        veClick('Toolbar > ToggleSubpane: console-settings'),
        ...veImpressionsForConsoleSettings(),
        veChange('Toggle: console-history-autocomplete'),
      ],
      await veRoot(devToolsPage), devToolsPage);
}

export async function toggleShowCorsErrors(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(CONSOLE_SETTINGS_SELECTOR);
  await devToolsPage.click(SHOW_CORS_ERRORS_SELECTOR);
  await expectVeEvents(
      [
        veClick('Toolbar > ToggleSubpane: console-settings'),
        ...veImpressionsForConsoleSettings(),
        veChange('Toggle: console-shows-cors-errors'),
      ],
      await veRoot(devToolsPage), devToolsPage);
}

export async function toggleShowLogXmlHttpRequests(devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(CONSOLE_SETTINGS_SELECTOR);
  await devToolsPage.click(LOG_XML_HTTP_REQUESTS_SELECTOR);
  await expectVeEvents(
      [
        veClick('Toolbar > ToggleSubpane: console-settings'),
        ...veImpressionsForConsoleSettings(),
        veChange('Toggle: monitoring-xhr-enabled'),
      ],
      await veRoot(devToolsPage), devToolsPage);
}

async function getIssueButtonLabel(devToolsPage: DevToolsPage): Promise<string|null> {
  const infobarButton = await devToolsPage.waitFor('#console-issues-counter');
  const iconButton = await devToolsPage.waitFor('icon-button', infobarButton);
  const titleElement = await devToolsPage.waitFor('.icon-button-title', iconButton);
  const infobarButtonText = await titleElement.evaluate(node => (node as HTMLElement).textContent);
  await expectVeEvents([veImpression('Counter', 'issues')], `${await veRoot(devToolsPage)} > Toolbar`, devToolsPage);
  return infobarButtonText;
}

export async function waitForIssueButtonLabel(
    expectedLabel: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const label = await getIssueButtonLabel(devToolsPage);
    return expectedLabel === label;
  });
}

export async function clickOnContextMenu(
    selectorForNode: string, jslogContext: string,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.click(selectorForNode, {clickOptions: {button: 'right'}});
  const menuItem = await devToolsPage.waitFor(`[jslog*="context: ${jslogContext}"]`);
  await menuItem.click();
  const isObject = ['copy-object', 'expand-recursively'].includes(jslogContext);
  await expectVeEvents(
      [
        veClick(isObject ? 'Tree > TreeItem' : ''),
        veImpressionForConsoleMessageContextMenu(jslogContext),
        veClick(`Menu > Action: ${jslogContext}`),
        veResize('Menu'),
      ],
      `${await veRoot(devToolsPage)} > Item: console-message`, devToolsPage);
}

/**
 * Creates a function that runs a command and checks the nth output from the
 * bottom (checks last message by default)
 */
export function checkCommandResultFunction(offset = 0) {
  return async function(
      command: string, expected: string, message?: string, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
    await typeIntoConsoleAndWaitForResult(command, 1, undefined, devToolsPage);
    assert.strictEqual(await getLastConsoleMessages(offset, devToolsPage), expected, message);
  };
}

export async function getLastConsoleStacktrace(offset = 0, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  return (await getStructuredConsoleMessages(devToolsPage)).at(-1 - offset)?.stackPreview as string;
}

export async function checkCommandStacktrace(
    command: string, expected: string, leastMessages = 1, offset = 0,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await typeIntoConsoleAndWaitForResult(command, leastMessages, undefined, devToolsPage);
  await unifyLogVM(await getLastConsoleStacktrace(offset, devToolsPage), expected);
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

async function veRoot(devToolsPage?: DevToolsPage): Promise<string> {
  devToolsPage = devToolsPage || getBrowserAndPagesWrappers().devToolsPage;
  return (await devToolsPage.$$(CONSOLE_VIEW_IN_DRAWER_SELECTOR)).length ? 'Drawer > Panel: console' : 'Panel: console';
}
