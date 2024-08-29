// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, waitForFunction} from '../../shared/helper.js';

import {
  getPieChartLegendRows,
  getQuotaUsage,
  navigateToApplicationTab,
  navigateToStorage,
  waitForQuotaUsage,
} from '../helpers/application-helpers.js';

// The parent suffix makes sure we wait for the Cookies item to have children before trying to click it.
const CLEAR_SITE_DATA_BUTTON_SELECTOR = '#storage-view-clear-button';

describe('The Application Tab', () => {
  describe('contains a Storage pane', function() {
    // The tests in this suite are particularly slow, as they perform a lot of actions
    this.timeout(20000);
    beforeEach(async () => {
      const {target} = getBrowserAndPages();
      await navigateToApplicationTab(target, 'storage-quota');
      await navigateToStorage();
    });

    it('which clears storage correctly using the clear button', async () => {
      const {target} = getBrowserAndPages();
      await target.bringToFront();
      await target.evaluate(async () => {
        const array: number[] = [];
        for (let i = 0; i < 20000; i++) {
          array.push(i % 10);
        }
        // @ts-ignore
        await new Promise(resolve => createDatabase(resolve, 'Database1'));
        // @ts-ignore
        await new Promise(resolve => createObjectStore(resolve, 'Database1', 'Store1', 'id', true));
        // @ts-ignore
        await new Promise(resolve => addIDBValue(resolve, 'Database1', 'Store1', {key: 1, value: array}, ''));
      });

      await waitForQuotaUsage(quota => quota > 800);

      // We may click too early. If the total quota exceeds 2999, some remaining
      // quota may show. Instead,
      // try to click another time, if necessary.
      await waitForFunction(async () => {
        await click(CLEAR_SITE_DATA_BUTTON_SELECTOR, {clickOptions: {delay: 250}});
        const quota = await getQuotaUsage();
        return quota === 0;
      });
    });

    // Skip test for now to allow autorollers to continue.
    it.skip('[crbug.com/327372236] which reports storage correctly, including the pie chart legend', async () => {
      const {target} = getBrowserAndPages();

      await target.evaluate(async () => {
        const array: number[] = [];
        for (let i = 0; i < 20000; i++) {
          array.push(i % 10);
        }
        // @ts-ignore
        await new Promise(resolve => createDatabase(resolve, 'Database1'));
        // @ts-ignore
        await new Promise(resolve => createObjectStore(resolve, 'Database1', 'Store1', 'id', true));
        // @ts-ignore
        await new Promise(resolve => addIDBValue(resolve, 'Database1', 'Store1', {key: 1, value: array}, ''));
      });

      await waitForQuotaUsage(quota => quota > 800);

      const rows = await getPieChartLegendRows();
      // Only assert that the legend entries are correct.
      assert.strictEqual(rows.length, 2);
      assert.strictEqual(rows[0][2], 'IndexedDB');
      assert.strictEqual(rows[1][2], 'Total');
    });
  });
});
