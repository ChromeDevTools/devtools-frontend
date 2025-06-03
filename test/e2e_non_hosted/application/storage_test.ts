// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getPieChartLegendRows,
  getQuotaUsage,
  navigateToApplicationTab,
  navigateToStorage,
  waitForQuotaUsage,
} from '../../e2e/helpers/application-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

// The parent suffix makes sure we wait for the Cookies item to have children before trying to click it.
const CLEAR_SITE_DATA_BUTTON_SELECTOR = '#storage-view-clear-button';

async function navigateToAppStorage(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await navigateToApplicationTab('storage-quota', devToolsPage, inspectedPage);
  await navigateToStorage(devToolsPage);
}

describe('The Application Tab', () => {
  describe('contains a Storage pane', function() {
    // TODO (liviurau): Update navigateToApplicationTab helper to work in docked
    // mode and remove the setup below.
    setup({dockingMode: 'undocked'});

    it('which clears storage correctly using the clear button', async ({devToolsPage, inspectedPage}) => {
      await navigateToAppStorage(devToolsPage, inspectedPage);
      await inspectedPage.bringToFront();
      await inspectedPage.evaluate(async () => {
        const array: number[] = [];
        for (let i = 0; i < 20000; i++) {
          array.push(i % 10);
        }
        // @ts-expect-error
        await new Promise(resolve => createDatabase(resolve, 'Database1'));
        // @ts-expect-error
        await new Promise(resolve => createObjectStore(resolve, 'Database1', 'Store1', 'id', true));
        // @ts-expect-error
        await new Promise(resolve => addIDBValue(resolve, 'Database1', 'Store1', {key: 1, value: array}, ''));
      });

      await waitForQuotaUsage(quota => quota > 800, devToolsPage);

      // We may click too early. If the total quota exceeds 2999, some remaining
      // quota may show. Instead,
      // try to click another time, if necessary.
      await devToolsPage.waitForFunction(async () => {
        await devToolsPage.click(CLEAR_SITE_DATA_BUTTON_SELECTOR, {clickOptions: {delay: 250}});
        const quota = await getQuotaUsage(devToolsPage);
        return quota === 0;
      });
    });

    it('which reports storage correctly, including the pie chart legend', async ({devToolsPage, inspectedPage}) => {
      await navigateToAppStorage(devToolsPage, inspectedPage);
      await inspectedPage.evaluate(async () => {
        const array: number[] = [];
        for (let i = 0; i < 20000; i++) {
          array.push(i % 10);
        }
        // @ts-expect-error
        await new Promise(resolve => createDatabase(resolve, 'Database1'));
        // @ts-expect-error
        await new Promise(resolve => createObjectStore(resolve, 'Database1', 'Store1', 'id', true));
        // @ts-expect-error
        await new Promise(resolve => addIDBValue(resolve, 'Database1', 'Store1', {key: 1, value: array}, ''));
      });

      await waitForQuotaUsage(quota => quota > 800, devToolsPage);

      const rows = await getPieChartLegendRows(devToolsPage);
      // Only assert that the legend entries are correct.
      assert.lengthOf(rows, 2);
      assert.strictEqual(rows[0][2], 'IndexedDB');
      assert.strictEqual(rows[1][2], 'Total');
    });
  });
});
