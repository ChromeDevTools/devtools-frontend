// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const COMMENT_TOGGLE_SELECTOR = '[aria-label="Add comments to send to your AI coding agent"]';
const OVERLAY_CONTAINER_SELECTOR = '.comments-overlay-container';
const COMMENT_PIN_SELECTOR = '.comment-pin';
const COMMENT_ANCHOR_HIGHLIGHT_SELECTOR = '.comment-anchor-highlight';

describe('Click-to-Comment mode across DevTools panels', function() {
  async function setupForTests(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await devToolsPage.setupMockHostConfigAndReload({
      devToolsComments: {
        enabled: true,
      },
    });
    await inspectedPage.goToResource('cross_tool/default.html');
    await devToolsPage.closeAllCloseableTabs();
  }

  async function isCommentModeActive(devToolsPage: DevToolsPage): Promise<boolean> {
    const toggleButton = await devToolsPage.waitFor(COMMENT_TOGGLE_SELECTOR);
    return await toggleButton.evaluate(el => el.getAttribute('aria-pressed') === 'true');
  }

  async function toggleCommentMode(devToolsPage: DevToolsPage): Promise<void> {
    const initialState = await isCommentModeActive(devToolsPage);
    await devToolsPage.waitFor(COMMENT_TOGGLE_SELECTOR);
    await devToolsPage.click(COMMENT_TOGGLE_SELECTOR);
    await devToolsPage.waitForFunction(async () => {
      return (await isCommentModeActive(devToolsPage)) !== initialState;
    });
  }

  async function getCommentPins(devToolsPage: DevToolsPage) {
    return await devToolsPage.$$(COMMENT_PIN_SELECTOR);
  }

  async function getCommentHighlights(devToolsPage: DevToolsPage) {
    return await devToolsPage.$$(COMMENT_ANCHOR_HIGHLIGHT_SELECTOR);
  }

  it('completes basic comment flow: toggle mode, click target, verify pin and highlight, and deactivate',
     async ({devToolsPage, inspectedPage}) => {
       await setupForTests(devToolsPage, inspectedPage);
       await devToolsPage.click('#tab-elements');
       await devToolsPage.waitFor('[role="treeitem"]');

       // 1. Verify initial state: comment mode is not active and no overlay artifacts exist.
       assert.isFalse(await isCommentModeActive(devToolsPage));
       assert.lengthOf(await getCommentPins(devToolsPage), 0);
       assert.lengthOf(await getCommentHighlights(devToolsPage), 0);

       // 2. Toggle comment mode ON.
       await toggleCommentMode(devToolsPage);
       assert.isTrue(await isCommentModeActive(devToolsPage));
       await devToolsPage.waitFor(OVERLAY_CONTAINER_SELECTOR);

       // 3. Click on a target element in Elements panel.
       await devToolsPage.click('[role="treeitem"]');

       // 4. Verify that a comment pin and highlight have been created.
       const pin = await devToolsPage.waitFor(COMMENT_PIN_SELECTOR);
       await devToolsPage.waitFor(COMMENT_ANCHOR_HIGHLIGHT_SELECTOR);

       const pinHtml = await pin.evaluate(el => el.innerHTML.trim());
       assert.isNotEmpty(pinHtml);

       // 5. Toggle comment mode OFF.
       await toggleCommentMode(devToolsPage);
       assert.isFalse(await isCommentModeActive(devToolsPage));

       // 6. Verify existing pin and highlight persist.
       assert.lengthOf(await getCommentPins(devToolsPage), 1);
       assert.lengthOf(await getCommentHighlights(devToolsPage), 1);

       // 7. Verify subsequent clicks do not create new comments when mode is deactivated.
       await devToolsPage.click('[role="treeitem"]');
       assert.lengthOf(await getCommentPins(devToolsPage), 1);
     });
});
