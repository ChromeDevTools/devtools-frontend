// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as puppeteer from 'puppeteer';

import {$, getBrowserAndPages, step, waitFor, waitForElementWithTextContent, waitForFunction} from '../../../shared/helper.js';
import {describe, it} from '../../../shared/mocha-extensions.js';
import {clickOnFunctionLink, getTotalTimeFromSummary, navigateToBottomUpTab, navigateToCallTreeTab, navigateToPerformanceTab, searchForComponent, startRecording, stopRecording} from '../../helpers/performance-helpers.js';

async function expandAndCheckActivityTree(frontend: puppeteer.Page, expectedActivities: string[]) {
  let index = 0;
  let parentItem: puppeteer.ElementHandle<Element>|undefined = undefined;
  do {
    await waitForFunction(async () => {
      if (parentItem) {
        parentItem.evaluate(e => e.scrollIntoView());
      }
      const treeItem = await $('.data-grid-data-grid-node.selected.revealed .activity-name');
      if (!treeItem) {
        return false;
      }
      const treeItemText = await frontend.evaluate(el => el.innerText, treeItem);
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

describe('The Performance panel', async function() {
  // These tests have lots of waiting which might take more time to execute
  this.timeout(20000);

  beforeEach(async () => {
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

    await step('search for "mainWasm"', async () => {
      await searchForComponent(frontend, 'mainWasm');
    });
  });

  // Link to wasm function is broken in profiling tab
  it.skip('[crbug.com/1125986] is able to inspect how long a wasm function takes to execute', async () => {
    await step('check that the total time is more than zero', async () => {
      const totalTime = await getTotalTimeFromSummary();
      assert.isAbove(totalTime, 0, 'total time for "mainWasm" is not above zero');
    });

    await step('click on the function link', async () => {
      await clickOnFunctionLink();
    });

    // TODO(almuthanna): this step will be added once the bug crbug.com/1125986 is solved
    await step(
        'check that the system has navigated to the Sources tab with the "mainWasm" function highlighted',
        async () => {
            // step pending
        });
  });

  it('is able to display the execution time for a wasm function', async () => {
    await step('check that the Summary tab shows more than zero total time for "mainWasm"', async () => {
      const totalTime = await getTotalTimeFromSummary();
      assert.isAbove(totalTime, 0, 'mainWasm function execution time is displayed incorrectly');
    });
  });

  it('is able to inspect the call stack for a wasm function from the bottom up', async () => {
    const {frontend} = getBrowserAndPages();
    const expectedActivities = ['mainWasm', 'js-to-wasm::i', '(anonymous)', 'Run Microtasks'];

    await step('navigate to the Bottom Up tab', async () => {
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

  it('is able to inspect the call stack for a wasm function from the call tree', async () => {
    const {frontend} = getBrowserAndPages();
    const expectedActivities = [
      'Run Microtasks',
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
        'expand the tree for the "Run Microtasks" activity and check that it displays the correct values', async () => {
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
