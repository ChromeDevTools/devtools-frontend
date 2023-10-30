// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {click, getBrowserAndPages, getTestServerPort, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  doubleClickSourceTreeItem,
  getPieChartLegendRows,
  getQuotaUsage,
  getStorageItemsData,
  navigateToApplicationTab,
  waitForQuotaUsage,
} from '../helpers/application-helpers.js';

// The parent suffix makes sure we wait for the Cookies item to have children before trying to click it.
const COOKIES_SELECTOR = '[aria-label="Cookies"].parent';
const STORAGE_SELECTOR = '[aria-label="Storage"]';
const CLEAR_SITE_DATA_BUTTON_SELECTOR = '#storage-view-clear-button';
const INCLUDE_3RD_PARTY_COOKIES_SELECTOR = '[title="including third-party cookies"]';

let DOMAIN_SELECTOR: string;

describe('The Application Tab', async () => {
  before(async () => {
    DOMAIN_SELECTOR = `${COOKIES_SELECTOR} + ol > [aria-label="https://localhost:${getTestServerPort()}"]`;
  });

  afterEach(async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    const {target} = getBrowserAndPages();
    const cookies = await target.cookies();
    await target.deleteCookie(...cookies);
  });

  it('deletes only first party cookies when clearing site data', async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, 'cross-origin-cookies');

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    const dataGridRowValuesBefore = await waitForFunction(async () => {
      const data = await getStorageItemsData(['name', 'value'], 3);
      return data.length ? data : undefined;
    });

    assert.sameDeepMembers(dataGridRowValuesBefore, [
      {
        name: 'third_party',
        value: 'test',
      },
      {
        name: 'foo2',
        value: 'bar',
      },
      {
        name: 'foo',
        value: 'bar',
      },
    ]);

    await doubleClickSourceTreeItem(STORAGE_SELECTOR);
    await click(CLEAR_SITE_DATA_BUTTON_SELECTOR);

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    const dataGridRowValuesAfter = await waitForFunction(async () => {
      const data = await getStorageItemsData(['name', 'value']);
      return data.length ? data : undefined;
    });
    assert.sameDeepMembers(dataGridRowValuesAfter, [{
                             name: 'third_party',
                             value: 'test',
                           }]);
  });

  it('deletes first and third party cookies when clearing site data with the flag enabled', async () => {
    const {target} = getBrowserAndPages();
    // This sets a new cookie foo=bar
    await navigateToApplicationTab(target, 'cross-origin-cookies');

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    const dataGridRowValuesBefore = await waitForFunction(async () => {
      const data = await getStorageItemsData(['name', 'value'], 3);
      return data.length ? data : undefined;
    });

    assert.sameDeepMembers(dataGridRowValuesBefore, [
      {
        name: 'third_party',
        value: 'test',
      },
      {
        name: 'foo2',
        value: 'bar',
      },
      {
        name: 'foo',
        value: 'bar',
      },
    ]);

    await doubleClickSourceTreeItem(STORAGE_SELECTOR);
    await click(INCLUDE_3RD_PARTY_COOKIES_SELECTOR);
    await click(CLEAR_SITE_DATA_BUTTON_SELECTOR);

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    await waitForFunction(async () => {
      const data = await getStorageItemsData(['name', 'value'], 0);
      return data.length === 0;
    });
  });

  describe('the Storage pane', async function() {
    // The tests in this suite are particularly slow, as they perform a lot of actions
    this.timeout(20000);
    beforeEach(async () => {
      const {target} = getBrowserAndPages();
      await navigateToApplicationTab(target, 'storage-quota');
      await doubleClickSourceTreeItem(STORAGE_SELECTOR);
    });

    it('clear button clears storage correctly', async () => {
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

    it('reports storage correctly, including the pie chart legend', async () => {
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
