// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getDataGridRows} from '../../e2e/helpers/datagrid-helpers.js';
import {
  enableCSSSelectorStats,
  increaseTimeoutForPerfPanel,
  navigateToPerformanceTab,
  navigateToSelectorStatsTab,
  selectRecalculateStylesEvent,
  startRecording,
  stopRecording,
} from '../../e2e/helpers/performance-helpers.js';
import {getOpenSources} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function validateSourceTabs(devToolsPage: DevToolsPage) {
  const openSources = await devToolsPage.waitForFunction(async () => {
    const sources = await getOpenSources(devToolsPage);
    return sources.length ? sources : undefined;
  });
  assert.deepEqual(openSources, ['page-with-style.css']);
}

async function cssSelectorStatsRecording(testName: string, devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await navigateToPerformanceTab(testName, devToolsPage, inspectedPage);
  await enableCSSSelectorStats(devToolsPage);
  await startRecording(devToolsPage);
  await inspectedPage.reload();
  await stopRecording(devToolsPage);
}

describe('The Performance panel', function() {
  setup({dockingMode: 'undocked'});
  increaseTimeoutForPerfPanel(this);

  it('Can navigate to CSS file in source panel via available link in selector stats table',
     async ({devToolsPage, inspectedPage}) => {
       await cssSelectorStatsRecording('selectorStats/page-with-style', devToolsPage, inspectedPage);

       await navigateToSelectorStatsTab(devToolsPage);
       const rows = await getDataGridRows(
           1 /* expectedNumberOfRows*/, undefined /* root*/, false /* matchExactNumberOfRows*/, devToolsPage);
       assert.isAtLeast(rows.length, 1, 'Selector stats table should contain at least one row');

       // Sort table by style sheet
       const styleSheetColumnHeader = await devToolsPage.waitFor('th.style_sheet_id-column');
       await styleSheetColumnHeader.click();
       await devToolsPage.timeout(100);

       // Click on the first source link
       // await devToolsPage.scrollElementIntoView('devtools-linkifier');
       await devToolsPage.click('devtools-linkifier');

       // Look at source tabs
       await validateSourceTabs(devToolsPage);
     });

  it('Includes a selector stats table in recalculate style events', async ({devToolsPage, inspectedPage}) => {
    await cssSelectorStatsRecording('empty', devToolsPage, inspectedPage);

    // Open select stats for a recorded "Recalculate styles" event
    await selectRecalculateStylesEvent(devToolsPage);
    await navigateToSelectorStatsTab(devToolsPage);

    // Check that the selector stats table was rendered successfully
    // Since the exact selector text, order, and match counts are implementation defined,
    // we are just checking whether any rows are rendered. This indicates that the trace events
    // we receive from the backend have the expected object structure. If the structure ever
    // changes, the data grid will fail to render and cause this test to fail.
    const rows = await getDataGridRows(
        1 /* expectedNumberOfRows*/, undefined /* root*/, false /* matchExactNumberOfRows*/, devToolsPage);
    assert.isAtLeast(rows.length, 1, 'Selector stats table should contain at least one row');
  });
});
