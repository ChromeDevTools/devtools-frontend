// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, step, waitForFunction} from '../../shared/helper.js';

import {reloadDevTools} from '../helpers/cross-tool-helper.js';
import {getDataGridRows} from '../helpers/datagrid-helpers.js';
import {
  disableCSSSelectorStats,
  enableCSSSelectorStats,
  getRenderingTimeFromSummary,
  navigateToPerformanceTab,
  navigateToSelectorStatsTab,
  reloadAndRecord,
  selectRecalculateStylesEvent,
  startRecording,
  stopRecording,
} from '../helpers/performance-helpers.js';
import {getOpenSources} from '../helpers/sources-helpers.js';

async function validateSourceTabs() {
  await step('Validate exactly one source file is open', async () => {
    const openSources = await waitForFunction(async () => {
      const sources = await getOpenSources();
      return sources.length ? sources : undefined;
    });
    assert.deepEqual(openSources, ['page-with-style.css']);
  });
}

describe('The Performance panel', function() {
  // These tests move between panels, which takes time.
  if (this.timeout() !== 0) {
    this.timeout(30000);
  }

  async function cssSelectorStatsRecording(testName: string) {
    const {target} = getBrowserAndPages();
    await navigateToPerformanceTab(testName);
    await enableCSSSelectorStats();
    await startRecording();
    await target.reload();
    await stopRecording();
  }

  it('Includes a selector stats table in recalculate style events', async () => {
    await cssSelectorStatsRecording('empty');

    await step('Open select stats for a recorded "Recalculate styles" event', async () => {
      await selectRecalculateStylesEvent();
      await navigateToSelectorStatsTab();
    });

    await step('Check that the selector stats table was rendered successfully', async () => {
      // Since the exact selector text, order, and match counts are implementation defined,
      // we are just checking whether any rows are rendered. This indicates that the trace events
      // we receive from the backend have the expected object structure. If the structure ever
      // changes, the data grid will fail to render and cause this test to fail.
      const rows =
          await getDataGridRows(1 /* expectedNumberOfRows*/, undefined /* root*/, false /* matchExactNumberOfRows*/);
      assert.isAtLeast(rows.length, 1, 'Selector stats table should contain at least one row');
    });
  });

  it('Can navigate to CSS file in source panel via available link in selector stats table', async () => {
    await cssSelectorStatsRecording('selectorStats/page-with-style');

    await step('Check that the selector stats table was rendered successfully by default', async () => {
      await navigateToSelectorStatsTab();
      const rows =
          await getDataGridRows(1 /* expectedNumberOfRows*/, undefined /* root*/, false /* matchExactNumberOfRows*/);
      assert.isAtLeast(rows.length, 1, 'Selector stats table should contain at least one row');
    });

    await step('Validate source file is open via available link in selector stats table', async () => {
      await click('devtools-linkifier');
      // Look at source tabs
      await validateSourceTabs();
    });
  });

  // Flaking on multiple bots on CQ.
  it.skip('[crbug.com/349787448] CSS selector stats performance test', async () => {
    // set a tentative threshold of 50%
    const timeDiffPercentageMax = 0.5;

    await navigateToPerformanceTab('selectorStats/page-with-style-perf-test');
    await disableCSSSelectorStats();
    await reloadAndRecord();
    const [recordingTimeWithSelectorStatsDisabled, chartName] = await getRenderingTimeFromSummary();
    assert.strictEqual(chartName, 'Rendering');

    await reloadDevTools({selectedPanel: {name: 'timeline'}});
    await enableCSSSelectorStats();
    await reloadAndRecord();
    const [recordingTimeWithSelectorStatsEnabled] = await getRenderingTimeFromSummary();

    const timeDiffPercentage = (recordingTimeWithSelectorStatsEnabled - recordingTimeWithSelectorStatsDisabled) /
        recordingTimeWithSelectorStatsDisabled;
    assert.isAtMost(timeDiffPercentage, timeDiffPercentageMax);
  });
});
