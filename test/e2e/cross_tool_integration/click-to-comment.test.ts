// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {navigateToConsoleTab} from '../helpers/console-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('Click-to-Comment mode across DevTools panels', function() {
  async function setupForTests(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('cross_tool/default.html');
    await devToolsPage.closeAllCloseableTabs();
  }

  async function enableCommentMode(devToolsPage: DevToolsPage) {
    await devToolsPage.evaluate(async () => {
      // @ts-expect-error global helper defined in MainImpl
      const mgr = await globalThis.comments();
      // @ts-expect-error test hook
      window.__testCommentManager = mgr;
    });
  }

  async function getCommentThreadsCount(devToolsPage: DevToolsPage): Promise<number> {
    return await devToolsPage.evaluate(() => {
      // @ts-expect-error test hook
      const mgr = window.__testCommentManager;
      return mgr?.getCommentThreads().length ?? 0;
    });
  }

  async function getLastCommentVePath(devToolsPage: DevToolsPage): Promise<string> {
    return await devToolsPage.evaluate(() => {
      // @ts-expect-error test hook
      const mgr = window.__testCommentManager;
      const threads = mgr?.getCommentThreads() ?? [];
      const last = threads[threads.length - 1];
      return last ? last.anchor.vePath : '';
    });
  }

  async function isPinAndHighlightVisible(devToolsPage: DevToolsPage): Promise<boolean> {
    return await devToolsPage.evaluate(() => {
      // @ts-expect-error test hook
      const mgr = window.__testCommentManager;
      const pins = mgr?.getPinPositions() ?? [];
      const highlights = mgr?.getHighlightRects() ?? [];
      return pins.some((p: {visible: boolean}) => p.visible) || highlights.some((h: {visible: boolean}) => h.visible);
    });
  }

  it('creates comment on DOM tree item in Elements panel with TreeItem vePath',
     async ({devToolsPage, inspectedPage}) => {
       await setupForTests(devToolsPage, inspectedPage);
       await devToolsPage.click('#tab-elements');
       await devToolsPage.waitFor('[role="treeitem"]');

       await enableCommentMode(devToolsPage);
       await devToolsPage.click('[role="treeitem"]');

       const count = await getCommentThreadsCount(devToolsPage);
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

    const count = await getCommentThreadsCount(devToolsPage);
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

    const count = await getCommentThreadsCount(devToolsPage);
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

    const count = await getCommentThreadsCount(devToolsPage);
    assert.isAbove(count, 0);

    const vePath = await getLastCommentVePath(devToolsPage);
    assert.include(vePath, 'TableRow');
  });
});
