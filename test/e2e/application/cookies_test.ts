// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  click,
  getBrowserAndPages,
  getTestServerPort,
  goToResource,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {assertMatchesJSONSnapshot} from '../../shared/snapshots.js';
import {
  clearStorageItems,
  clearStorageItemsFilter,
  doubleClickSourceTreeItem,
  filterStorageItems,
  getStorageItemsData,
  navigateToApplicationTab,
  selectCookieByName,
} from '../helpers/application-helpers.js';

// The parent suffix makes sure we wait for the Cookies item to have children before trying to click it.
const COOKIES_SELECTOR = '[aria-label="Cookies"].parent';
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

  // Flaky test
  it.skip(
      '[crbug.com/1443434]: shows cookies even when navigating to an unreachable page (crbug.com/1047348)',
      async () => {
        const {target} = getBrowserAndPages();
        // This sets a new cookie foo=bar
        await navigateToApplicationTab(target, 'cookies');

        await goToResource('network/unreachable.rawresponse');

        await doubleClickSourceTreeItem(COOKIES_SELECTOR);
        await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

        const dataGridRowValues = await getStorageItemsData(['name', 'value']);
        assertMatchesJSONSnapshot(dataGridRowValues);
      });

  it('shows a preview of the cookie value (crbug.com/462370)', async () => {
    const {target} = getBrowserAndPages();
    // This sets a new cookie foo=bar
    await navigateToApplicationTab(target, 'cookies');

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    await selectCookieByName('foo');

    await waitForFunction(async () => {
      const previewValueNode = await waitFor('.cookie-preview-widget-cookie-value');
      const previewValue = await previewValueNode.evaluate(e => e.textContent);
      return previewValue === 'bar';
    });
  });

  it('shows cookie partition key', async () => {
    const {target} = getBrowserAndPages();
    // This sets a new cookie foo=bar
    await navigateToApplicationTab(target, 'cookies');

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    const dataGridRowValues1 = await getStorageItemsData(['partitionKey'], 4);
    assert.deepEqual(dataGridRowValues1, [
      {
        partitionKey: '',
      },
      {
        partitionKey: 'https://localhost',
      },
      {
        partitionKey: '',
      },
      {
        partitionKey: '',
      },
    ]);
  });

  it('can also show the urldecoded value (crbug.com/997625)', async () => {
    const {target} = getBrowserAndPages();
    // This sets a new cookie foo=bar
    await navigateToApplicationTab(target, 'cookies');

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    await waitFor('.cookies-table .data-grid-data-grid-node');
    await click('.cookies-table .data-grid-data-grid-node');

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
    const {target} = getBrowserAndPages();
    // This sets a new cookie foo=bar
    await navigateToApplicationTab(target, 'cookies');

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

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
      const previewValueNode2 = await waitFor('.empty-view');
      const previewValue2 = await previewValueNode2.evaluate(e => e.textContent as string);

      return previewValue2.match(/Select a cookie to preview its value/);
    });
  });

  it('only clear currently visible cookies (crbug.com/978059)', async () => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    const {target} = getBrowserAndPages();
    // This sets a new cookie foo=bar
    await navigateToApplicationTab(target, 'cookies');

    await doubleClickSourceTreeItem(COOKIES_SELECTOR);
    await doubleClickSourceTreeItem(DOMAIN_SELECTOR);

    const dataGridRowValues1 = await getStorageItemsData(['name'], 4);
    assert.deepEqual(dataGridRowValues1, [
      {
        name: 'urlencoded',
      },
      {
        name: '__Host-foo3',
      },
      {
        name: 'foo2',
      },
      {
        name: 'foo',
      },
    ]);

    await filterStorageItems('foo2');
    await clearStorageItems();
    await clearStorageItemsFilter();

    const dataGridRowValues2 = await getStorageItemsData(['name'], 3);
    assert.deepEqual(dataGridRowValues2, [
      {
        name: '__Host-foo3',
      },
      {
        name: 'urlencoded',
      },
      {
        name: 'foo',
      },
    ]);
  });
});
