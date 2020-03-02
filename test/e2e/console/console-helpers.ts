// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';

import {click, debuggerStatement, getBrowserAndPages, resourcesPath} from '../../shared/helper.js';

export const CONSOLE_TAB_SELECTOR = '#tab-console';
export const CONSOLE_MESSAGES_SELECTOR = '.console-group-messages';
export const CONSOLE_FIRST_MESSAGES_SELECTOR = '.console-group-messages .source-code .console-message-text';
export const LOG_LEVELS_SELECTOR = '[aria-label^="Log level: "]';
export const LOG_LEVELS_VERBOSE_OPTION_SELECTOR = '[aria-label^="Verbose"]';

export async function obtainConsoleMessages(testName: string, callback?: (page: puppeteer.Page) => Promise<void>) {
  const {target, frontend} = getBrowserAndPages();

  // Have the target load the page.
  await target.goto(`${resourcesPath}/console/${testName}.html`);

  // Locate the button for switching to the console tab.
  await click(CONSOLE_TAB_SELECTOR);
  // Obtain console messages that were logged
  await frontend.waitForSelector(CONSOLE_MESSAGES_SELECTOR);

  if (callback) {
    await debuggerStatement(frontend);
    await callback(frontend);
  }
  await debuggerStatement(frontend);

  // Ensure all messages are populated.
  await frontend.waitForFunction(CONSOLE_FIRST_MESSAGES_SELECTOR => {
    return Array.from(document.querySelectorAll(CONSOLE_FIRST_MESSAGES_SELECTOR))
        .every(message => message.childNodes.length > 0);
  }, {timeout: 3000}, CONSOLE_FIRST_MESSAGES_SELECTOR);

  // Get the messages from the console.
  return frontend.evaluate(CONSOLE_FIRST_MESSAGES_SELECTOR => {
    return Array.from(document.querySelectorAll(CONSOLE_FIRST_MESSAGES_SELECTOR))
        .map(message => message.textContent);
  }, CONSOLE_FIRST_MESSAGES_SELECTOR);
}

export async function showVerboseMessages() {
  await click(LOG_LEVELS_SELECTOR);
  await click(LOG_LEVELS_VERBOSE_OPTION_SELECTOR);
}
