// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as puppeteer from 'puppeteer';

import {getBrowserAndPages, step, waitFor, waitForFunction} from '../../../shared/helper.js';
import {describe, it} from '../../../shared/mocha-extensions.js';
import {ACTIVITY_COLUMN_SELECTOR, navigateToCallTreeTab} from '../../helpers/performance-helpers.js';
import {clickOnFunctionLink, getTotalTimeFromSummary, navigateToBottomUpTab, navigateToPerformanceTab, retrieveActivity, searchForComponent, startRecording, stopRecording} from '../../helpers/performance-helpers.js';

async function expandAndCheckActivityTree(frontend: puppeteer.Page, expectedActivities: string[]) {
  let index = 0;
  do {
    await waitForFunction(async () => {
      const tree_item = await waitFor('.data-grid-data-grid-node.selected.revealed .activity-name');
      const tree_item_text = await frontend.evaluate(el => el.innerText, tree_item);
      return expectedActivities[index] === tree_item_text;
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
          await waitFor(ACTIVITY_COLUMN_SELECTOR);
          const mainWasmActivity = await retrieveActivity(frontend, 'mainWasm');
          await mainWasmActivity!.click();
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
      'getTime',
    ];

    await step('navigate to the Call Tree tab', async () => {
      await navigateToCallTreeTab();
    });

    await step(
        'expand the tree for the "Run Microtasks" activity and check that it displays the correct values', async () => {
          await expandAndCheckActivityTree(frontend, expectedActivities);
        });
  });
});
