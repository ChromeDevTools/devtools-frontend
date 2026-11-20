// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  CONSOLE_ALL_MESSAGES_SELECTOR,
  CONSOLE_SETTINGS_SELECTOR,
  navigateToConsoleTab,
} from '../helpers/console-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';

async function readConsoleMessages(devToolsPage: DevToolsPage): Promise<string[]> {
  return await devToolsPage.evaluate(selector => {
    return Array.from(document.querySelectorAll(selector))
        .map(message => message.deepTextContent().replace(/\u200b/g, ''));
  }, CONSOLE_ALL_MESSAGES_SELECTOR);
}

describe('The Host browser', () => {
  it('resolves .test domains to localhost and OOPIFs work as intended', async ({inspectedPage, browser}) => {
    await inspectedPage.goToResourceWithCustomHost('devtools.test', 'host/page-with-oopif.html');

    const iframeTarget = browser.browser.targets().find(
        target => target.type() === 'other' && target.url().startsWith('https://devtools.oopif.test'));
    assert.exists(iframeTarget);
  });

  it('preserves console log messages across cross-process navigations', async ({devToolsPage, inspectedPage}) => {
    await navigateToConsoleTab(devToolsPage);
    await inspectedPage.goToResourceWithCustomHost('devtools.oopif.test', 'empty.html');

    await devToolsPage.click(CONSOLE_SETTINGS_SELECTOR);
    const preserveLogCheckbox = await devToolsPage.waitFor('devtools-checkbox[jslog*="preserve-console-log"]');
    await devToolsPage.waitFor('input[type="checkbox"]:not(:checked)', preserveLogCheckbox);
    await devToolsPage.click('input[type="checkbox"]', {root: preserveLogCheckbox});
    await devToolsPage.waitFor('input[type="checkbox"]:checked', preserveLogCheckbox);

    await inspectedPage.evaluate(() => {
      // eslint-disable-next-line no-console
      console.log('before navigation');
    });
    await devToolsPage.waitForFunction(async () => {
      const messages = await readConsoleMessages(devToolsPage);
      return messages.includes('before navigation');
    }, undefined, 'Waiting for initial console message before cross-process navigation');

    const secondUrl = `${inspectedPage.getResourcesPath('127.0.0.1')}/empty.html`;
    await inspectedPage.goTo(secondUrl);
    await inspectedPage.evaluate(() => {
      // eslint-disable-next-line no-console
      console.log('after navigation');
    });

    const expectedMessages = [
      'before navigation',
      `Navigated to ${secondUrl}`,
      'after navigation',
    ];
    const actualMessages = await devToolsPage.waitForFunction(async () => {
      const messages = await readConsoleMessages(devToolsPage);
      return messages.length >= expectedMessages.length ? messages : undefined;
    }, undefined, 'Waiting for preserved console messages after cross-process navigation');
    assert.deepEqual(actualMessages, expectedMessages);
  });
});
