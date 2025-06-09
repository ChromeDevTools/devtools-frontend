// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'path';
import type * as puppeteer from 'puppeteer-core';

import {GEN_DIR} from '../../../conductor/paths.js';
import {
  BOTTOM_UP_SELECTOR,
  CALL_TREE_SELECTOR,
  getTotalTimeFromPie,
  increaseTimeoutForPerfPanel,
  navigateToBottomUpTab,
  navigateToCallTreeTab,
  navigateToPerformanceTab,
  searchForComponent,
  startRecording,
  stopRecording,
  SUMMARY_TAB_SELECTOR,
} from '../../../e2e/helpers/performance-helpers.js';
import type {DevToolsPage} from '../../shared/frontend-helper.js';
import type {InspectedPage} from '../../shared/target-helper.js';

async function searchForWasmCall(devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    await searchForComponent('mainWasm', devToolsPage);
    const title = await devToolsPage.$('.timeline-details-chip-title');
    if (!title) {
      return false;
    }
    const titleText = await title.evaluate(x => x.textContent);
    return titleText === 'mainWasm';
  });
}

async function expandAndCheckActivityTree(expectedActivities: string[], devtoolsPage: DevToolsPage) {
  let index = 0;
  let parentItem: puppeteer.ElementHandle<Element>|undefined = undefined;
  do {
    await devtoolsPage.waitForFunction(async () => {
      if (parentItem) {
        await parentItem.evaluate(e => e.scrollIntoView());
      }
      const treeItem = await devtoolsPage.$<HTMLElement>('.data-grid-data-grid-node.selected.revealed .activity-name');
      if (!treeItem) {
        return false;
      }
      const treeItemText = await treeItem.evaluate(el => el.innerText);
      if (expectedActivities[index] === treeItemText) {
        parentItem = treeItem;
        return true;
      }
      return false;
    });
    index++;
    await devtoolsPage.page.keyboard.press('ArrowRight');
    await devtoolsPage.page.keyboard.press('ArrowRight');
  } while (index < expectedActivities.length);
}

describe('The Performance panel', function() {
  setup({dockingMode: 'undocked'});
  increaseTimeoutForPerfPanel(this);

  async function setupPerformancePanel(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await navigateToPerformanceTab('wasm/profiling', devToolsPage, inspectedPage);

    const uploadProfileHandle = await devToolsPage.waitFor<HTMLInputElement>('input[type=file]');
    assert.isNotNull(uploadProfileHandle, 'unable to upload the performance profile');
    await uploadProfileHandle.uploadFile(
        path.join(GEN_DIR, 'test/e2e/resources/performance/wasm/mainWasm_profile.json'));

    await searchForWasmCall(devToolsPage);
  }

  // Flaky test (~1/10)
  it.skipOnPlatforms(
      ['mac'], '[crbug.com/416404064]: is able to record performance', async ({devToolsPage, inspectedPage}) => {
        await navigateToPerformanceTab('wasm/profiling', devToolsPage, inspectedPage);
        await devToolsPage.page.keyboard.press('Escape');
        await devToolsPage.waitFor('.console-searchable-view');
        await startRecording(devToolsPage);
        await inspectedPage.reload();
        await devToolsPage.waitFor('.console-message-text .source-code');
        await stopRecording(devToolsPage);
        await devToolsPage.waitFor(SUMMARY_TAB_SELECTOR);
        await devToolsPage.waitFor(BOTTOM_UP_SELECTOR);
        await devToolsPage.waitFor(CALL_TREE_SELECTOR);
      });

  // Flaky test
  it.skipOnPlatforms(
      ['mac'], '[crbug.com/416404064]: is able to display the execution time for a wasm function',
      async ({devToolsPage, inspectedPage}) => {
        await setupPerformancePanel(devToolsPage, inspectedPage);

        const totalTime = await getTotalTimeFromPie(devToolsPage);
        assert.isAbove(totalTime, 0, 'mainWasm function execution time is displayed incorrectly');
      });

  // Flaky test
  it.skipOnPlatforms(
      ['mac'], '[crbug.com/1510890]: is able to inspect the call stack for a wasm function from the bottom up',
      async ({devToolsPage, inspectedPage}) => {
        await setupPerformancePanel(devToolsPage, inspectedPage);
        const expectedActivities = ['mainWasm', 'js-to-wasm::i', '(anonymous)', 'Run microtasks'];

        await navigateToBottomUpTab(devToolsPage, 'url');

        const timelineTree = await devToolsPage.$('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
        const rootActivity = await devToolsPage.waitForElementWithTextContent(expectedActivities[0], timelineTree);
        if (!rootActivity) {
          assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
        }
        await rootActivity.click();
        await expandAndCheckActivityTree(expectedActivities, devToolsPage);
      });

  // Flaky test
  it.skip(
      '[crbug.com/1510890]: is able to inspect the call stack for a wasm function from the call tree',
      async ({devToolsPage, inspectedPage}) => {
        await setupPerformancePanel(devToolsPage, inspectedPage);

        const expectedActivities = [
          'Run microtasks',
          '(anonymous)',
          'js-to-wasm::i',
          'mainWasm',
          'wasm-to-js::l-imports.getTime',
          'getTime',
        ];

        await navigateToCallTreeTab(devToolsPage);

        const timelineTree = await devToolsPage.$('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
        const rootActivity = await devToolsPage.waitForElementWithTextContent(expectedActivities[0], timelineTree);
        if (!rootActivity) {
          assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
        }
        await rootActivity.click();
        await expandAndCheckActivityTree(expectedActivities, devToolsPage);
      });
});
