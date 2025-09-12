// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  clearStorageItems,
  clearStorageItemsFilter,
  filterStorageItems,
  getDataGridData,
  getStorageItemsData,
  navigateToApplicationTab,
  navigateToCookiesForTopDomain,
  selectCookieByName,
} from '../../e2e/helpers/application-helpers.js';
import type {BrowserWrapper} from '../shared/browser-helper.js';

async function deleteCookies(browserWrapper: BrowserWrapper) {
  expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');

  const cookies = await browserWrapper.browser.cookies();

  await browserWrapper.browser.deleteCookie(...cookies);
}

describe('The Application Tab', () => {
  // TODO (liviurau): Update navigateToApplicationTab helper to work in docked
  // mode and remove the setup below.
  setup({dockingMode: 'undocked'});

  it('shows cookies even when navigating to an unreachable page (crbug.com/1047348)',
     async ({devToolsPage, inspectedPage, browser}) => {
       // This sets a new cookie foo=bar
       await navigateToApplicationTab('cookies', devToolsPage, inspectedPage);
       await inspectedPage.goToResource('network/unreachable.rawresponse');

       await navigateToCookiesForTopDomain(devToolsPage, inspectedPage);

       const dataGridRowValues = await getStorageItemsData(['name', 'value'], undefined, devToolsPage);
       const match = dataGridRowValues.find(item => item.name === 'foo');
       assert.deepEqual(match, {name: 'foo', value: 'bar'});
       await deleteCookies(browser);
     });

  it('shows a preview of the cookie value (crbug.com/462370)', async ({devToolsPage, inspectedPage, browser}) => {
    // This sets a new cookie foo=bar
    await navigateToApplicationTab('cookies', devToolsPage, inspectedPage);

    await navigateToCookiesForTopDomain(devToolsPage, inspectedPage);

    await selectCookieByName('foo', devToolsPage);

    await devToolsPage.waitForFunction(async () => {
      const previewValueNode = await devToolsPage.waitFor('.cookie-preview-widget-cookie-value');
      const previewValue = await previewValueNode.evaluate(e => e.textContent);
      return previewValue === 'bar';
    });
    await deleteCookies(browser);
  });

  // This test will fail until the puppeteer API is updated to
  // reflect the change from the partitionKey column to the partition key site and
  // cross-site columns.
  it.skip(
      '[crbug.com/345285378]shows cookie partition key site and has cross site ancestor',
      async ({devToolsPage, inspectedPage, browser}) => {
        // This sets a new cookie foo=bar
        await navigateToApplicationTab('cookies', devToolsPage, inspectedPage);

        await navigateToCookiesForTopDomain(devToolsPage, inspectedPage);

        const dataGridRowValues1 = await getStorageItemsData(['partition-key-site'], 4, devToolsPage);
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

        const dataGridRowValues2 = await getStorageItemsData(['has-cross-site-ancestor'], 4, devToolsPage);
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
        await deleteCookies(browser);
      });

  it('can also show the urldecoded value (crbug.com/997625)', async ({devToolsPage, inspectedPage, browser}) => {
    // This sets a new cookie foo=bar
    await navigateToApplicationTab('cookies', devToolsPage, inspectedPage);

    await navigateToCookiesForTopDomain(devToolsPage, inspectedPage);

    await devToolsPage.click('.cookies-table devtools-data-grid');

    await selectCookieByName('urlencoded', devToolsPage);

    await devToolsPage.waitForFunction(async () => {
      const previewValueNode = await devToolsPage.waitFor('.cookie-preview-widget-cookie-value');
      const previewValue = await previewValueNode.evaluate(e => e.textContent);
      return previewValue === 'Hello%2BWorld!';
    });

    await devToolsPage.click('[title="Show URL-decoded"]');

    await devToolsPage.waitForFunction(async () => {
      const previewValueNode = await devToolsPage.waitFor('.cookie-preview-widget-cookie-value');
      const previewValue = await previewValueNode.evaluate(e => e.textContent);
      return previewValue === 'Hello+World!';
    });
    await deleteCookies(browser);
  });

  it('clears the preview value when clearing cookies (crbug.com/1086462)',
     async ({devToolsPage, inspectedPage, browser}) => {
       // This sets a new cookie foo=bar
       await navigateToApplicationTab('cookies', devToolsPage, inspectedPage);

       await navigateToCookiesForTopDomain(devToolsPage, inspectedPage);

       await selectCookieByName('foo', devToolsPage);

       // Select a cookie first
       await devToolsPage.waitForFunction(async () => {
         const previewValueNode1 = await devToolsPage.waitFor('.cookie-preview-widget-cookie-value');
         const previewValue1 = await previewValueNode1.evaluate(e => e.textContent);
         return previewValue1 === 'bar';
       });

       await clearStorageItems(devToolsPage);

       // Make sure that the preview resets
       await devToolsPage.waitForFunction(async () => {
         const previewValueNode2 = await devToolsPage.waitFor('.empty-state');
         const previewValue2 = await previewValueNode2.evaluate(e => e.textContent as string);

         return previewValue2.match(/Select a cookie to preview its value/);
       });
       await deleteCookies(browser);
     });

  it('only clear currently visible cookies (crbug.com/978059)', async ({devToolsPage, inspectedPage, browser}) => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    // This sets a new cookie foo=bar
    await navigateToApplicationTab('cookies', devToolsPage, inspectedPage);

    await navigateToCookiesForTopDomain(devToolsPage, inspectedPage);

    const dataGridRowValues1 = await getStorageItemsData(['name'], 4, devToolsPage);
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

    await filterStorageItems('foo2', devToolsPage);
    await devToolsPage.waitForFunction(async () => {
      const values = await getDataGridData('.storage-view table', ['name'], devToolsPage);
      return values.length === 1;
    });
    await clearStorageItems(devToolsPage);
    await clearStorageItemsFilter(devToolsPage);

    const dataGridRowValues2 = await devToolsPage.waitForFunction(async () => {
      const values = await getDataGridData('.storage-view table', ['name'], devToolsPage);
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
    await deleteCookies(browser);
  });

  it('can sort cookies', async ({devToolsPage, inspectedPage, browser}) => {
    expectError('Request CacheStorage.requestCacheNames failed. {"code":-32602,"message":"Invalid security origin"}');
    await navigateToApplicationTab('cookies', devToolsPage, inspectedPage);

    await navigateToCookiesForTopDomain(devToolsPage, inspectedPage);
    const dataGrid = await devToolsPage.waitFor('devtools-data-grid');
    await devToolsPage.click('th.name-column', {root: dataGrid});
    await devToolsPage.click('th.name-column', {root: dataGrid});
    const dataGridRowValues = await devToolsPage.waitForFunction(async () => {
      const values = await getDataGridData('.storage-view table', ['name'], devToolsPage);
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

    await deleteCookies(browser);
  });
});
