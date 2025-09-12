// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {navigateToConsoleTab} from '../../e2e/helpers/console-helpers.js';
import {openSourcesPanel, RESUME_BUTTON} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

describe('The Console Tab', () => {
  it('context selector', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('console/context-selector.html');
    await navigateToConsoleTab(devToolsPage);
    await inspectedPage.evaluate('setup()');
    await devToolsPage.waitFor('[aria-label="JavaScript context: top"]');

    async function waitForMenuItemWithText(text: string, devToolsPage: DevToolsPage) {
      const result = await devToolsPage.waitForFunction(async () => {
        for (const menuItem of await devToolsPage.waitForMany('[role=menuitem]', 1)) {
          if (await devToolsPage.$textContent(text, menuItem)) {
            return menuItem;
          }
        }
        return null;
      });
      assert.exists(result);
      return result;
    }

    const FRAME_CONTEXT_LABEL = 'myframe (context-selector-inner.html)';

    // switch to the iframe context
    await devToolsPage.click('[aria-label="JavaScript context: top"]');
    const frameMenuItem = await waitForMenuItemWithText(FRAME_CONTEXT_LABEL, devToolsPage);
    await frameMenuItem.click();
    await devToolsPage.pressKey('Enter');
    await devToolsPage.waitFor(`[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`);

    // pause in main frame
    void inspectedPage.evaluate('pauseInMain()');
    await devToolsPage.waitFor('#tab-sources[aria-selected="true"]');
    await navigateToConsoleTab(devToolsPage);
    await devToolsPage.waitFor('[aria-label="JavaScript context: top"]');
    await devToolsPage.click('[aria-label="JavaScript context: top"]');
    const disabledFrameMenuItem = await waitForMenuItemWithText(FRAME_CONTEXT_LABEL, devToolsPage);
    assert.isTrue(await disabledFrameMenuItem.evaluate(node => node.classList.contains('disabled')));
    await devToolsPage.pressKey('Escape');

    // resume in main frame
    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(RESUME_BUTTON);
    await navigateToConsoleTab(devToolsPage);

    await devToolsPage.waitFor('[aria-label="JavaScript context: top"]');
    await devToolsPage.click('[aria-label="JavaScript context: top"]');
    const enabledFrameMenuItem = await waitForMenuItemWithText(FRAME_CONTEXT_LABEL, devToolsPage);
    assert.isFalse(await enabledFrameMenuItem.evaluate(node => node.classList.contains('disabled')));
    await devToolsPage.pressKey('Escape');

    const WORKER_CONTEXT_LABEL = '⚙ worker-pause.js';
    // pause in worker
    void inspectedPage.evaluate('pauseInWorker()');
    await devToolsPage.waitFor('#tab-sources[aria-selected="true"]');
    await navigateToConsoleTab(devToolsPage);

    await devToolsPage.waitFor(`[aria-label="JavaScript context: ${WORKER_CONTEXT_LABEL}"]`);
    await devToolsPage.click(`[aria-label="JavaScript context: ${WORKER_CONTEXT_LABEL}"]`);
    const topMenuItem = await waitForMenuItemWithText('top', devToolsPage);
    assert.isFalse(await topMenuItem.evaluate(node => node.classList.contains('disabled')));
    const workerFrameMenuItem = await waitForMenuItemWithText(FRAME_CONTEXT_LABEL, devToolsPage);
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

    await devToolsPage.waitFor(`[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`);
    await devToolsPage.click(`[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`);
    const disabledTopMenuItem = await waitForMenuItemWithText('top', devToolsPage);
    assert.isTrue(await disabledTopMenuItem.evaluate(node => node.classList.contains('disabled')));
    await devToolsPage.pressKey('Escape');

    // resume in the iframe
    await openSourcesPanel(devToolsPage);
    await devToolsPage.click(RESUME_BUTTON);
    await navigateToConsoleTab(devToolsPage);

    await devToolsPage.waitFor(`[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`);
    await devToolsPage.click(`[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`);
    const enabledTopMenuItem = await waitForMenuItemWithText('top', devToolsPage);
    assert.isFalse(await enabledTopMenuItem.evaluate(node => node.classList.contains('disabled')));
    await devToolsPage.pressKey('Escape');
  });
});
