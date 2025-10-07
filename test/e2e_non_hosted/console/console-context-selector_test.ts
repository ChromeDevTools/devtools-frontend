// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {navigateToConsoleTab} from '../../e2e/helpers/console-helpers.js';
import {openSourcesPanel, RESUME_BUTTON} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

describe('The Console Tab', () => {
  it('context selector', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('console/context-selector.html');
    await navigateToConsoleTab(devToolsPage);
    await inspectedPage.evaluate('setup()');
    await devToolsPage.waitFor('[aria-label="JavaScript context: top"]');

    async function findMenuItemWithText(text: string, menuItems: Array<puppeteer.ElementHandle<Element>>) {
      for (const menuItem of menuItems) {
        if (await devToolsPage.$textContent(text, menuItem)) {
          return menuItem;
        }
      }
      return null;
    }

    async function clickMenuAndWaitForItemsWithText(
        menuSelector: string, itemLabels: string[], devToolsPage: DevToolsPage) {
      const result = await devToolsPage.waitForFunction(async () => {
        await devToolsPage.click(menuSelector);
        const menuItems =
            await devToolsPage.waitForManyWithTries('[role=menuitem]', 1, 3, undefined, undefined, undefined);
        if (!menuItems) {
          return null;
        }
        const selectedItems: Array<puppeteer.ElementHandle<Element>> = [];
        for (const itemText of itemLabels) {
          const itemForLabel = await findMenuItemWithText(itemText, menuItems);
          if (!itemForLabel) {
            return null;
          }
          selectedItems.push(itemForLabel);
        }
        return selectedItems;
      });
      assert.exists(result);
      return result;
    }

    const FRAME_CONTEXT_LABEL = 'myframe (context-selector-inner.html)';

    // switch to the iframe context
    const [frameMenuItem] = await clickMenuAndWaitForItemsWithText(
        '[aria-label="JavaScript context: top"]', [FRAME_CONTEXT_LABEL], devToolsPage);
    await frameMenuItem.click();
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitFor(`[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`);

    // pause in main frame
    void inspectedPage.evaluate('pauseInMain()');
    await devToolsPage.waitFor('#tab-sources[aria-selected="true"]');
    await navigateToConsoleTab(devToolsPage);
    const [disabledFrameMenuItem] = await clickMenuAndWaitForItemsWithText(
        '[aria-label="JavaScript context: top"]', [FRAME_CONTEXT_LABEL], devToolsPage);
    assert.isTrue(await disabledFrameMenuItem.evaluate(node => node.classList.contains('disabled')));
    await devToolsPage.pressKey('Escape');

    // resume in main frame
    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(RESUME_BUTTON);
    await navigateToConsoleTab(devToolsPage);

    const [enabledFrameMenuItem] = await clickMenuAndWaitForItemsWithText(
        '[aria-label="JavaScript context: top"]', [FRAME_CONTEXT_LABEL], devToolsPage);
    assert.isFalse(await enabledFrameMenuItem.evaluate(node => node.classList.contains('disabled')));
    await devToolsPage.pressKey('Escape');

    const WORKER_CONTEXT_LABEL = '⚙ worker-pause.js';
    // pause in worker
    void inspectedPage.evaluate('pauseInWorker()');
    await devToolsPage.waitFor('#tab-sources[aria-selected="true"]');
    await navigateToConsoleTab(devToolsPage);

    const [topMenuItem, workerFrameMenuItem] = await clickMenuAndWaitForItemsWithText(
        `[aria-label="JavaScript context: ${WORKER_CONTEXT_LABEL}"]`, ['top', FRAME_CONTEXT_LABEL], devToolsPage);
    assert.isFalse(await topMenuItem.evaluate(node => node.classList.contains('disabled')));
    assert.isFalse(await workerFrameMenuItem.evaluate(node => node.classList.contains('disabled')));
    await devToolsPage.pressKey('Escape');

    // resume in worker
    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(RESUME_BUTTON);
    await navigateToConsoleTab(devToolsPage);

    await devToolsPage.waitFor(`[aria-label="JavaScript context: ${WORKER_CONTEXT_LABEL}"]`);

    // pause in the iframe
    void inspectedPage.evaluate('pauseInIframe()');
    await devToolsPage.waitFor('#tab-sources[aria-selected="true"]');
    await navigateToConsoleTab(devToolsPage);

    const [disabledTopMenuItem] = await clickMenuAndWaitForItemsWithText(
        `[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`, ['top'], devToolsPage);
    assert.isTrue(await disabledTopMenuItem.evaluate(node => node.classList.contains('disabled')));
    await devToolsPage.pressKey('Escape');

    // resume in the iframe
    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(RESUME_BUTTON);
    await navigateToConsoleTab(devToolsPage);

    const [enabledTopMenuItem] = await clickMenuAndWaitForItemsWithText(
        `[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`, ['top'], devToolsPage);
    assert.isFalse(await enabledTopMenuItem.evaluate(node => node.classList.contains('disabled')));
    await devToolsPage.pressKey('Escape');
  });
});
