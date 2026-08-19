// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {navigateToConsoleTab} from '../helpers/console-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const COMMENT_TOGGLE_SELECTOR = '[aria-label="Add comments to send to your AI coding agent"]';

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

  async function enableCommentMode(devToolsPage: DevToolsPage) {
    await devToolsPage.waitFor(COMMENT_TOGGLE_SELECTOR);
    await devToolsPage.click(COMMENT_TOGGLE_SELECTOR);
    await devToolsPage.waitForFunction(async () => {
      return await devToolsPage.evaluate(async () => {
        // @ts-expect-error Evaluated in DevTools context
        const Root = await import('./core/root/root.js');
        // @ts-expect-error Evaluated in DevTools context
        const CommentManager = await import('./models/comment_manager/comment_manager.js');
        const mgr = Root.DevToolsContext.globalInstance().get(CommentManager.CommentManager.CommentManager);
        return mgr?.isCommentMode() === true;
      });
    });
  }

  async function getCommentThreadsCount(devToolsPage: DevToolsPage): Promise<number> {
    return await devToolsPage.evaluate(async () => {
      // @ts-expect-error Evaluated in DevTools context
      const Root = await import('./core/root/root.js');
      // @ts-expect-error Evaluated in DevTools context
      const CommentManager = await import('./models/comment_manager/comment_manager.js');
      const mgr = Root.DevToolsContext.globalInstance().get(CommentManager.CommentManager.CommentManager);
      return mgr?.getCommentThreads().length ?? 0;
    });
  }

  async function waitForCommentThreadCount(devToolsPage: DevToolsPage, minCount = 1): Promise<number> {
    await devToolsPage.waitForFunction(async () => {
      const count = await devToolsPage.evaluate(async () => {
        // @ts-expect-error Evaluated in DevTools context
        const Root = await import('./core/root/root.js');
        // @ts-expect-error Evaluated in DevTools context
        const CommentManager = await import('./models/comment_manager/comment_manager.js');
        const mgr = Root.DevToolsContext.globalInstance().get(CommentManager.CommentManager.CommentManager);
        return mgr?.getCommentThreads().length ?? 0;
      });
      return count >= minCount;
    });
    return await getCommentThreadsCount(devToolsPage);
  }

  async function getLastCommentVePath(devToolsPage: DevToolsPage): Promise<string> {
    return await devToolsPage.evaluate(async () => {
      // @ts-expect-error Evaluated in DevTools context
      const Root = await import('./core/root/root.js');
      // @ts-expect-error Evaluated in DevTools context
      const CommentManager = await import('./models/comment_manager/comment_manager.js');
      const mgr = Root.DevToolsContext.globalInstance().get(CommentManager.CommentManager.CommentManager);
      const threads = mgr?.getCommentThreads() ?? [];
      const last = threads[threads.length - 1];
      return last ? last.anchor.vePath : '';
    });
  }

  async function isPinAndHighlightVisible(devToolsPage: DevToolsPage): Promise<boolean> {
    const pin = await devToolsPage.waitFor('.comment-pin');
    const highlight = await devToolsPage.waitFor('.comment-anchor-highlight');
    return Boolean(pin && highlight);
  }

  it('creates comment on DOM tree item in Elements panel with TreeItem vePath',
     async ({devToolsPage, inspectedPage}) => {
       await setupForTests(devToolsPage, inspectedPage);
       await devToolsPage.click('#tab-elements');
       await devToolsPage.waitFor('[role="treeitem"]');

       await enableCommentMode(devToolsPage);
       await devToolsPage.click('[role="treeitem"]');

       const count = await waitForCommentThreadCount(devToolsPage, 1);
       assert.isAbove(count, 0);

       const vePath = await getLastCommentVePath(devToolsPage);
       assert.include(vePath, 'TreeItem');

       const visible = await isPinAndHighlightVisible(devToolsPage);
       assert.isTrue(visible);
     });

  it('creates comment on console message in Console panel', async ({devToolsPage, inspectedPage}) => {
    await setupForTests(devToolsPage, inspectedPage);
    await navigateToConsoleTab(devToolsPage);
    await devToolsPage.waitFor('.console-message-wrapper');

    await enableCommentMode(devToolsPage);
    await devToolsPage.click('.console-message-wrapper');

    const count = await waitForCommentThreadCount(devToolsPage, 1);
    assert.isAbove(count, 0);

    const visible = await isPinAndHighlightVisible(devToolsPage);
    assert.isTrue(visible);
  });

  it('creates comment on item in Sources panel', async ({devToolsPage, inspectedPage}) => {
    await setupForTests(devToolsPage, inspectedPage);
    await devToolsPage.click('#tab-sources');
    await devToolsPage.waitFor('.navigator-file-tree-item, .empty-state');

    await enableCommentMode(devToolsPage);
    await devToolsPage.click('.navigator-file-tree-item, .empty-state');

    const count = await waitForCommentThreadCount(devToolsPage, 1);
    assert.isAbove(count, 0);
  });

  it('escalates cell click to entire TableRow in Network panel', async ({devToolsPage, inspectedPage}) => {
    await setupForTests(devToolsPage, inspectedPage);
    await devToolsPage.click('#tab-network');
    await devToolsPage.waitFor('.network-log-grid');
    await inspectedPage.reload();
    await devToolsPage.waitFor('.network-log-grid tbody .name-column');

    await enableCommentMode(devToolsPage);
    await devToolsPage.click('.network-log-grid tbody .name-column');

    const count = await waitForCommentThreadCount(devToolsPage, 1);
    assert.isAbove(count, 0);

    const vePath = await getLastCommentVePath(devToolsPage);
    assert.include(vePath, 'TableRow');
  });
});
