// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'path';
import type * as puppeteer from 'puppeteer-core';

import {GEN_DIR} from '../../../conductor/paths.js';
import {
  $,
  getBrowserAndPages,
  step,
  waitFor,
  waitForElementWithTextContent,
  waitForFunction,
} from '../../../shared/helper.js';

import {
  BOTTOM_UP_SELECTOR,
  CALL_TREE_SELECTOR,
  getTotalTimeFromSummary,
  navigateToBottomUpTab,
  navigateToCallTreeTab,
  navigateToPerformanceTab,
  searchForComponent,
  startRecording,
  stopRecording,
  SUMMARY_TAB_SELECTOR,
} from '../../helpers/performance-helpers.js';

async function expandAndCheckActivityTree(frontend: puppeteer.Page, expectedActivities: string[]) {
  let index = 0;
  let parentItem: puppeteer.ElementHandle<Element>|undefined = undefined;
  do {
    await waitForFunction(async () => {
      if (parentItem) {
        parentItem.evaluate(e => e.scrollIntoView());
      }
      const treeItem = await $<HTMLElement>('.data-grid-data-grid-node.selected.revealed .activity-name');
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
    await frontend.keyboard.press('ArrowRight');
    await frontend.keyboard.press('ArrowRight');
  } while (index < expectedActivities.length);
}

describe('The Performance panel', function() {
  it('is able to record performance', async () => {
    const {target, frontend} = getBrowserAndPages();

    await step('navigate to the Performance tab', async () => {
      await navigateToPerformanceTab('wasm/profiling');
    });

    await step('open up the console', async () => {
      await frontend.keyboard.press('Escape');
      await waitFor('.console-searchable-view');
    });

    await step('click the record button', async () => {
      await startRecording();
    });

    await step('reload the page', async () => {
      await target.reload();
    });

    await step('navigate to console-filter.html and get console messages', async () => {
      await waitFor('.console-message-text .source-code');
    });

    await step('stop the recording', async () => {
      await stopRecording();
    });

    await step('check that the recording finished successfully', async () => {
      await waitFor(SUMMARY_TAB_SELECTOR);
      await waitFor(BOTTOM_UP_SELECTOR);
      await waitFor(CALL_TREE_SELECTOR);
    });
  });
});

async function searchForWasmCall() {
  const {frontend} = getBrowserAndPages();
  await waitForFunction(async () => {
    await searchForComponent(frontend, 'mainWasm');
    const title = await $('.timeline-details-chip-title');
    if (!title) {
      return false;
    }
    const titleText = await title.evaluate(x => x.textContent);
    return titleText === 'mainWasm';
  });
}

describe('The Performance panel', function() {
  // These tests have lots of waiting which might take more time to execute
  if (this.timeout() !== 0) {
    this.timeout(20000);
  }

  beforeEach(async () => {
    await step('navigate to the Performance tab and upload performance profile', async () => {
      await navigateToPerformanceTab('wasm/profiling');

      const uploadProfileHandle = await waitFor<HTMLInputElement>('input[type=file]');
      assert.isNotNull(uploadProfileHandle, 'unable to upload the performance profile');
      await uploadProfileHandle.uploadFile(
          path.join(GEN_DIR, 'test/e2e/resources/performance/wasm/mainWasm_profile.json'));
    });

    await step('search for "mainWasm"', async () => {
      await searchForWasmCall();
    });
  });

  it('is able to display the execution time for a wasm function', async () => {
    await step('check that the Summary tab shows more than zero total time for "mainWasm"', async () => {
      const totalTime = await getTotalTimeFromSummary();
      assert.isAbove(totalTime, 0, 'mainWasm function execution time is displayed incorrectly');
    });
  });

  // Flaky test
  it.skipOnPlatforms(
      ['mac'], '[crbug.com/1510890]: is able to inspect the call stack for a wasm function from the bottom up',
      async () => {
        const {frontend} = getBrowserAndPages();
        const expectedActivities = ['mainWasm', 'js-to-wasm::i', '(anonymous)', 'Run microtasks'];

        await step('navigate to the Bottom-up tab', async () => {
          await navigateToBottomUpTab();
        });

        await step(
            'expand the tree for the "mainWasm" activity and check that it displays the correct values', async () => {
              const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
              const rootActivity = await waitForElementWithTextContent(expectedActivities[0], timelineTree);
              if (!rootActivity) {
                assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
              }
              await rootActivity.click();
              await expandAndCheckActivityTree(frontend, expectedActivities);
            });
      });

  // Flaky test
  it.skipOnPlatforms(
      ['mac'], '[crbug.com/1510890]: is able to inspect the call stack for a wasm function from the call tree',
      async () => {
        const {frontend} = getBrowserAndPages();
        const expectedActivities = [
          'Run microtasks',
          '(anonymous)',
          'js-to-wasm::i',
          'mainWasm',
          'wasm-to-js::l-imports.getTime',
          'getTime',
        ];

        await step('navigate to the Call Tree tab', async () => {
          await navigateToCallTreeTab();
        });

        await step(
            'expand the tree for the "Run microtasks" activity and check that it displays the correct values',
            async () => {
              const timelineTree = await $('.timeline-tree-view') as puppeteer.ElementHandle<HTMLSelectElement>;
              const rootActivity = await waitForElementWithTextContent(expectedActivities[0], timelineTree);
              if (!rootActivity) {
                assert.fail(`Could not find ${expectedActivities[0]} in frontend.`);
              }
              await rootActivity.click();
              await expandAndCheckActivityTree(frontend, expectedActivities);
            });
      });
});
