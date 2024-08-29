// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $textContent,
  assertNotNullOrUndefined,
  click,
  clickElement,
  getBrowserAndPages,
  goToResource,
  hasClass,
  pressKey,
  step,
  waitFor,
  waitForFunction,
  waitForMany,
} from '../../shared/helper.js';

import {navigateToConsoleTab} from '../helpers/console-helpers.js';
import {openSourcesPanel, RESUME_BUTTON} from '../helpers/sources-helpers.js';

describe('The Console Tab', () => {
  it('context selector', async () => {
    await goToResource('console/context-selector.html');
    await navigateToConsoleTab();
    const {target} = getBrowserAndPages();
    await target.evaluate('setup()');
    let contextSelectorButton = await waitFor('[aria-label="JavaScript context: top"]');

    async function waitForMenuItemWithText(text: string) {
      const result = await waitForFunction(async () => {
        for (const menuItem of await waitForMany('[role=menuitem]', 1)) {
          if (await $textContent(text, menuItem)) {
            return menuItem;
          }
        }
        return null;
      });
      assertNotNullOrUndefined(result);
      return result;
    }

    const FRAME_CONTEXT_LABEL = 'myframe (context-selector-inner.html)';

    await step('switch to the iframe context', async () => {
      await contextSelectorButton.press('Enter');
      const frameMenuItem = await waitForMenuItemWithText(FRAME_CONTEXT_LABEL);
      await clickElement(frameMenuItem);
      await pressKey('Enter');
      contextSelectorButton = await waitFor(`[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`);
    });

    await step('pause in main frame', async () => {
      void target.evaluate('pauseInMain()');
      await waitFor('#tab-sources[aria-selected="true"]');
      await navigateToConsoleTab();
      contextSelectorButton = await waitFor('[aria-label="JavaScript context: top"]');
      await contextSelectorButton.press('Enter');
      assert.isTrue(await hasClass(await waitForMenuItemWithText(FRAME_CONTEXT_LABEL), 'disabled'));
      await pressKey('Escape');
    });

    await step('resume in main frame', async () => {
      await openSourcesPanel();
      await click(RESUME_BUTTON);
      await navigateToConsoleTab();

      contextSelectorButton = await waitFor('[aria-label="JavaScript context: top"]');
      await contextSelectorButton.press('Enter');
      assert.isFalse(await hasClass(await waitForMenuItemWithText(FRAME_CONTEXT_LABEL), 'disabled'));
      await pressKey('Escape');
    });

    const WORKER_CONTEXT_LABEL = '⚙ worker-pause.js';
    await step('pause in worker', async () => {
      void target.evaluate('pauseInWorker()');
      await waitFor('#tab-sources[aria-selected="true"]');
      await navigateToConsoleTab();

      contextSelectorButton = await waitFor(`[aria-label="JavaScript context: ${WORKER_CONTEXT_LABEL}"]`);
      await contextSelectorButton.press('Enter');
      assert.isFalse(await hasClass((await waitForMenuItemWithText('top')), 'disabled'));
      assert.isFalse(await hasClass((await waitForMenuItemWithText(FRAME_CONTEXT_LABEL)), 'disabled'));
      await pressKey('Escape');
    });

    await step('resume in worker', async () => {
      await openSourcesPanel();
      await click(RESUME_BUTTON);
      await navigateToConsoleTab();

      contextSelectorButton = await waitFor(`[aria-label="JavaScript context: ${WORKER_CONTEXT_LABEL}"]`);
    });

    await step('pause in the iframe', async () => {
      void target.evaluate('pauseInIframe()');
      await waitFor('#tab-sources[aria-selected="true"]');
      await navigateToConsoleTab();

      contextSelectorButton = await waitFor(`[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`);
      await contextSelectorButton.press('Enter');
      assert.isTrue(await hasClass((await waitForMenuItemWithText('top')), 'disabled'));
      await pressKey('Escape');
    });

    await step('resume in the iframe', async () => {
      await openSourcesPanel();
      await click(RESUME_BUTTON);
      await navigateToConsoleTab();

      contextSelectorButton = await waitFor(`[aria-label="JavaScript context: ${FRAME_CONTEXT_LABEL}"]`);
      await contextSelectorButton.press('Enter');
      assert.isFalse(await hasClass((await waitForMenuItemWithText('top')), 'disabled'));
      await pressKey('Escape');
    });
  });
});
