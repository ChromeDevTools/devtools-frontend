// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  click,
  getBrowserAndPages,
  goToResource,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';
import {assertMatchesJSONSnapshot} from '../../shared/snapshots.js';
import {
  clearStorageItems,
  clearStorageItemsFilter,
  filterStorageItems,
  getDataGridData,
  getStorageItemsData,
  navigateToApplicationTab,
  navigateToCookiesForTopDomain,
  selectCookieByName,
} from '../helpers/application-helpers.js';

describe('The Application Tab', () => {
  afterEach(async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    const {target} = getBrowserAndPages();
    const cookies = await target.cookies();

    await target.deleteCookie(...cookies);
  });

  // Flaky test
  it.skip(
      '[crbug.com/1443434]: shows cookies even when navigating to an unreachable page (crbug.com/1047348)',
      async () => {
        // This sets a new cookie foo=bar
        await navigateToApplicationTab('cookies');

        await goToResource('network/unreachable.rawresponse');

        await navigateToCookiesForTopDomain();

        const dataGridRowValues = await getStorageItemsData(['name', 'value']);
        assertMatchesJSONSnapshot(dataGridRowValues);
      });

  it('shows a preview of the cookie value (crbug.com/462370)', async () => {
    // This sets a new cookie foo=bar
    await navigateToApplicationTab('cookies');

    await navigateToCookiesForTopDomain();

    await selectCookieByName('foo');

    await waitForFunction(async () => {
      const previewValueNode = await waitFor('.cookie-preview-widget-cookie-value');
      const previewValue = await previewValueNode.evaluate(e => e.textContent);
      return previewValue === 'bar';
    });
  });

  // This test will fail until the puppeteer API is updated to
  // reflect the change from the partitionKey column to the partition key site and
  // cross-site columns.
  it.skip('[crbug.com/345285378]shows cookie partition key site and has cross site ancestor', async () => {
    // This sets a new cookie foo=bar
    await navigateToApplicationTab('cookies');

    await navigateToCookiesForTopDomain();

    const dataGridRowValues1 = await getStorageItemsData(['partition-key-site'], 4);
    assert.deepEqual(dataGridRowValues1, [
      {
        'partition-key-site': 'https://localhost',
      },
      {
        'partition-key-site': '',
      },
      {
        'partition-key-site': '',
      },
      {
        'partition-key-site': '',
      },
    ]);

    const dataGridRowValues2 = await getStorageItemsData(['has-cross-site-ancestor'], 4);
    assert.deepEqual(dataGridRowValues2, [
      {
        'has-cross-site-ancestor': 'true',
      },
      {
        'has-cross-site-ancestor': '',
      },
      {
        'has-cross-site-ancestor': '',
      },
      {
        'has-cross-site-ancestor': '',
      },
    ]);
  });

  it('can also show the urldecoded value (crbug.com/997625)', async () => {
    // This sets a new cookie foo=bar
    await navigateToApplicationTab('cookies');

    await navigateToCookiesForTopDomain();

    await click('.cookies-table devtools-data-grid');

    await selectCookieByName('urlencoded');

    await waitForFunction(async () => {
      const previewValueNode = await waitFor('.cookie-preview-widget-cookie-value');
      const previewValue = await previewValueNode.evaluate(e => e.textContent);
      return previewValue === 'Hello%2BWorld!';
    });

    await click('[title="Show URL-decoded"]');

    await waitForFunction(async () => {
      const previewValueNode = await waitFor('.cookie-preview-widget-cookie-value');
      const previewValue = await previewValueNode.evaluate(e => e.textContent);
      return previewValue === 'Hello+World!';
    });
  });

  it('clears the preview value when clearing cookies (crbug.com/1086462)', async () => {
    // This sets a new cookie foo=bar
    await navigateToApplicationTab('cookies');

    await navigateToCookiesForTopDomain();

    await selectCookieByName('foo');

    // Select a cookie first
    await waitForFunction(async () => {
      const previewValueNode1 = await waitFor('.cookie-preview-widget-cookie-value');
      const previewValue1 = await previewValueNode1.evaluate(e => e.textContent);
      return previewValue1 === 'bar';
    });

    await clearStorageItems();

    // Make sure that the preview resets
    await waitForFunction(async () => {
      const previewValueNode2 = await waitFor('.empty-state');
      const previewValue2 = await previewValueNode2.evaluate(e => e.textContent as string);

      return previewValue2.match(/Select a cookie to preview its value/);
    });
  });

  it('only clear currently visible cookies (crbug.com/978059)', async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    // This sets a new cookie foo=bar
    await navigateToApplicationTab('cookies');

    await navigateToCookiesForTopDomain();

    const dataGridRowValues1 = await getStorageItemsData(['name'], 4);
    assert.deepEqual(dataGridRowValues1, [
      {
        name: '__Host-foo3',
      },
      {
        name: 'foo',
      },
      {
        name: 'foo2',
      },
      {
        name: 'urlencoded',
      },
    ]);

    await filterStorageItems('foo2');
    await waitForFunction(async () => {
      const values = await getDataGridData('.storage-view table', ['name']);
      return values.length === 1;
    });
    await clearStorageItems();
    await clearStorageItemsFilter();

    const dataGridRowValues2 = await waitForFunction(async () => {
      const values = await getDataGridData('.storage-view table', ['name']);
      return values.length === 3 ? values : undefined;
    });

    assert.deepEqual(dataGridRowValues2, [
      {
        name: '__Host-foo3',
      },
      {
        name: 'foo',
      },
      {
        name: 'urlencoded',
      },
    ]);
  });

  it('can sort cookies', async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    await navigateToApplicationTab('cookies');

    await navigateToCookiesForTopDomain();
    const dataGrid = await waitFor('devtools-data-grid');
    await click('th.name-column', {root: dataGrid});
    await click('th.name-column', {root: dataGrid});
    const dataGridRowValues = await waitForFunction(async () => {
      const values = await getDataGridData('.storage-view table', ['name']);
      return values.length === 4 && values[0].name === 'urlencoded' ? values : undefined;
    });
    assert.deepEqual(dataGridRowValues, [
      {
        name: 'urlencoded',
      },
      {
        name: 'foo2',
      },
      {
        name: 'foo',
      },
      {
        name: '__Host-foo3',
      },
    ]);
  });
});
