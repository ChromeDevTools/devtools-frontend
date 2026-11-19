// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it, setup} from '../conductor/mocha-interface.js';
import {
  clearTimeWindow,
  getAllRequestNames,
  getNumberOfRequests,
  getSelectedRequestName,
  navigateToNetworkTab,
  openNetworkTab,
  selectRequestByName,
  setCacheDisabled,
  setKeepLog,
  setTextFilter,
  setTimeWindow,
  waitForSelectedRequestChange,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';
import type {InspectedPage} from '../shared/InspectedPage.js';

const SIMPLE_PAGE_REQUEST_NUMBER = 10;
const SIMPLE_PAGE_URL = `requests.html?num=${SIMPLE_PAGE_REQUEST_NUMBER}`;

describe('The Network Tab', function() {
  async function navigateToNetworkTabEmptyPage(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await navigateToNetworkTab(devToolsPage, inspectedPage, 'empty.html');
    await setCacheDisabled(devToolsPage, true);
    await setKeepLog(devToolsPage, false);
  }

  async function enableNetworkColumn(devToolsPage: DevToolsPage, title: string, submenu?: string) {
    await devToolsPage.click('pierce/thead .name-column', {clickOptions: {button: 'right'}});
    if (submenu) {
      await devToolsPage.click(`aria/${submenu}`);
    }
    await devToolsPage.click(`aria/${title}, unchecked`);
    await devToolsPage.waitForNone('.soft-context-menu');
  }

  async function waitForRequestRowColumns(
      devToolsPage: DevToolsPage,
      requestName: string,
      columnIds: readonly string[],
      ): Promise<Record<string, string>> {
    return await devToolsPage.waitForFunction(async () => {
      return await devToolsPage.evaluate((name, cols) => {
        const rows = Array.from(document.querySelectorAll('.network-log-grid tbody tr'));
        const row = rows.find(r => r.querySelector('.name-column')?.textContent === name);
        const timeText = row?.querySelector('.time-column')?.textContent ?? '';
        if (!row || !timeText || timeText === 'Pending' ||
            row.querySelector('.status-column')?.textContent !== '200OK') {
          return undefined;
        }
        const values: Record<string, string> = {};
        for (const col of cols) {
          const cell = row.querySelector(`.${col}-column`);
          if (!cell) {
            return undefined;
          }
          values[col] = cell.textContent ?? '';
        }
        return values;
      }, requestName, [...columnIds]);
    });
  }

  async function loadXhrTestPage(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await navigateToNetworkTabEmptyPage(devToolsPage, inspectedPage);
    await inspectedPage.goTo(`https://127.0.0.1:${inspectedPage.serverPort}/test/e2e/resources/network/xhr.html`, {
      waitUntil: 'networkidle0',
    });
  }

  async function loadCacheableXhrInNetworkTab(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goTo(`https://127.0.0.1:${inspectedPage.serverPort}/test/e2e/resources/network/hello.html`);
    await openNetworkTab(devToolsPage);
    await setCacheDisabled(devToolsPage, true);
    await inspectedPage.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'cacheable.rawresponse?xhr');
        xhr.onload = () => resolve();
        xhr.onerror = () => reject(new Error('XHR failed'));
        xhr.send();
      });
    });
  }

  it('displays requests', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTabEmptyPage(devToolsPage, inspectedPage);
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);

    // Wait for all the requests to be displayed + 1 to account for the page itself.
    await waitForSomeRequestsToAppear(devToolsPage, SIMPLE_PAGE_REQUEST_NUMBER + 1);

    const expectedNames = [];
    expectedNames.push('favicon.ico');
    for (let i = 0; i < SIMPLE_PAGE_REQUEST_NUMBER; i++) {
      expectedNames.push(`image.svg?id=${i}`);
    }
    expectedNames.push(SIMPLE_PAGE_URL);

    const names = (await getAllRequestNames(devToolsPage)).sort();
    assert.deepEqual(names, expectedNames, 'The right request names should appear in the list');
  });

  it('can select requests', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTabEmptyPage(devToolsPage, inspectedPage);
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);

    let selected = await getSelectedRequestName(devToolsPage);
    assert.isNull(selected, 'No request should be selected by default');

    await selectRequestByName(devToolsPage, SIMPLE_PAGE_URL, {});
    await waitForSelectedRequestChange(devToolsPage, selected);

    selected = await getSelectedRequestName(devToolsPage);
    assert.strictEqual(selected, SIMPLE_PAGE_URL, 'Selecting the first request should work');

    const lastRequestName = `image.svg?id=${SIMPLE_PAGE_REQUEST_NUMBER - 1}`;
    await selectRequestByName(devToolsPage, lastRequestName, {});
    await waitForSelectedRequestChange(devToolsPage, selected);

    selected = await getSelectedRequestName(devToolsPage);
    assert.strictEqual(selected, lastRequestName, 'Selecting the last request should work');
  });

  it('can persist requests', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTabEmptyPage(devToolsPage, inspectedPage);
    await navigateToNetworkTab(devToolsPage, inspectedPage, SIMPLE_PAGE_URL);

    // Wait for all the requests to be displayed + 1 to account for the page itself, and get their names.
    await waitForSomeRequestsToAppear(devToolsPage, SIMPLE_PAGE_REQUEST_NUMBER + 1);
    const firstPageRequestNames = (await getAllRequestNames(devToolsPage)).sort();

    await setKeepLog(devToolsPage, true);

    // Navigate to a new page, and wait for the same requests to still be there.
    await inspectedPage.goTo('about:blank');
    await waitForSomeRequestsToAppear(devToolsPage, SIMPLE_PAGE_REQUEST_NUMBER + 1);
    let secondPageRequestNames: Array<string|null> = [];
    await devToolsPage.waitForFunction(async () => {
      secondPageRequestNames = await getAllRequestNames(devToolsPage);
      return secondPageRequestNames.length === SIMPLE_PAGE_REQUEST_NUMBER + 2;
    });
    secondPageRequestNames.sort();

    assert.deepEqual(secondPageRequestNames, firstPageRequestNames, 'The requests were persisted');
  });

  it('should continue receiving new requests after timeline filter is cleared',
     async ({devToolsPage, inspectedPage}) => {
       await navigateToNetworkTabEmptyPage(devToolsPage, inspectedPage);
       await navigateToNetworkTab(devToolsPage, inspectedPage, 'infinite-requests.html');
       await waitForSomeRequestsToAppear(devToolsPage, 2);

       await setTimeWindow(devToolsPage);
       const initialNumberOfRequests = await getNumberOfRequests(devToolsPage);
       assert.isTrue(initialNumberOfRequests > 1);

       await clearTimeWindow(devToolsPage);

       // Time filter is cleared so the number of requests must be greater than the initial number.
       const numOfRequest = await devToolsPage.waitForFunction(async () => {
         const numberOfRequestsAfterFilter = await getNumberOfRequests(devToolsPage);
         if (numberOfRequestsAfterFilter < initialNumberOfRequests) {
           return false;
         }

         return numberOfRequestsAfterFilter;
       });

       // After some time we expect new requests to come so it must be
       // that the number of requests increased.
       await waitForSomeRequestsToAppear(devToolsPage, numOfRequest + 1);
     });

  it('should display preloaded request column with correct value', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTabEmptyPage(devToolsPage, inspectedPage);
    await navigateToNetworkTab(devToolsPage, inspectedPage, 'preload.html');

    await setTextFilter(devToolsPage, 'is:preloaded');
    await waitForSomeRequestsToAppear(devToolsPage, 1);

    const names = await getAllRequestNames(devToolsPage);
    assert.include(names, 'style.css');

    await devToolsPage.click('pierce/thead .name-column', {clickOptions: {button: 'right'}});
    await devToolsPage.click('aria/Preloaded, unchecked');

    await devToolsPage.waitForFunction(async () => {
      const values = await devToolsPage.page.$$eval('pierce/.is-preloaded-column',
                                                    cells => cells.map(cell => cell.textContent?.trim()));
      return values.includes('true');
    });
  });

  it('displays visible basic request columns with matching cell data', async ({devToolsPage, inspectedPage}) => {
    await loadXhrTestPage(devToolsPage, inspectedPage);

    for (const title of ['Method', 'Protocol', 'Scheme', 'Domain']) {
      await enableNetworkColumn(devToolsPage, title);
    }

    const values = await waitForRequestRowColumns(devToolsPage, 'image.svg/test/e2e/resources/network', [
      'name',
      'method',
      'status',
      'protocol',
      'scheme',
      'domain',
      'type',
      'initiator',
    ]);
    assert.deepEqual(values, {
      name: 'image.svg/test/e2e/resources/network',
      method: 'GET',
      status: '200OK',
      protocol: 'http/1.1',
      scheme: 'https',
      domain: '127.0.0.1',
      type: 'xhr',
      initiator: 'xhr.html:9Script',
    });
  });

  it('displays visible connection, cookie, and priority columns with matching cell data',
     async ({devToolsPage, inspectedPage}) => {
       await loadXhrTestPage(devToolsPage, inspectedPage);

       for (const title of ['Remote address', 'Cookies', 'Set cookies', 'Priority']) {
         await enableNetworkColumn(devToolsPage, title);
       }

       const values = await waitForRequestRowColumns(devToolsPage, 'image.svg/test/e2e/resources/network', [
         'remote-address',
         'cookies',
         'set-cookies',
         'priority',
       ]);
       assert.deepEqual(values, {
         'remote-address': `127.0.0.1:${inspectedPage.serverPort}`,
         cookies: '0',
         'set-cookies': '0',
         priority: 'HighHigh',
       });
     });

  it('displays visible cache, connection, and vary response header columns', async ({devToolsPage, inspectedPage}) => {
    await loadCacheableXhrInNetworkTab(devToolsPage, inspectedPage);

    for (const title of ['Cache-Control', 'Connection', 'Vary']) {
      await enableNetworkColumn(devToolsPage, title, 'Response headers');
    }

    const values = await waitForRequestRowColumns(
        devToolsPage,
        'cacheable.rawresponse?xhr/test/e2e/resources/network',
        [
          'response-header-cache-control',
          'response-header-connection',
          'response-header-vary',
        ],
    );
    assert.deepEqual(values, {
      'response-header-cache-control': 'max-age=315360000',
      'response-header-connection': 'close',
      'response-header-vary': 'Origin',
    });
  });

  it('displays visible content encoding and content length response header columns',
     async ({devToolsPage, inspectedPage}) => {
       await loadCacheableXhrInNetworkTab(devToolsPage, inspectedPage);

       for (const title of ['Content-Encoding', 'Content-Length']) {
         await enableNetworkColumn(devToolsPage, title, 'Response headers');
       }

       const values = await waitForRequestRowColumns(
           devToolsPage,
           'cacheable.rawresponse?xhr/test/e2e/resources/network',
           [
             'response-header-content-encoding',
             'response-header-content-length',
           ],
       );
       assert.deepEqual(values, {
         'response-header-content-encoding': '',
         'response-header-content-length': '28',
       });
     });

  describe('with durable messages', function() {
    setup({enabledFeatures: ['DevToolsEnableDurableMessages']});

    it('can persist requests across cross-origin navigation', async ({devToolsPage, inspectedPage}) => {
      await navigateToNetworkTabEmptyPage(devToolsPage, inspectedPage);
      await setKeepLog(devToolsPage, true);

      await navigateToNetworkTab(devToolsPage, inspectedPage, 'headers-and-payload.html');
      await waitForSomeRequestsToAppear(devToolsPage, 3);

      // Navigate to a different origin's page
      await inspectedPage.goToResourceWithCustomHost('devtools.test', 'host/page-with-oopif.html');

      // Introspect a request from the first navigation
      await selectRequestByName(devToolsPage, 'headers-and-payload.html', {});
      const networkView = await devToolsPage.waitFor('.network-item-view');
      await devToolsPage.click('[aria-label=Response].tabbed-pane-header-tab', {
        root: networkView,
      });
      await devToolsPage.waitFor('[aria-label=Response].tabbed-pane-header-tab[aria-selected=true]', networkView);
      await devToolsPage.waitFor('devtools-text-editor');
    });

    it('does not persist response body if keep log was disabled during request',
       async ({devToolsPage, inspectedPage}) => {
         await navigateToNetworkTabEmptyPage(devToolsPage, inspectedPage);
         await setKeepLog(devToolsPage, false);

         await navigateToNetworkTab(devToolsPage, inspectedPage, 'headers-and-payload.html');
         await waitForSomeRequestsToAppear(devToolsPage, 3);

         // Enable keep log after requests are made
         await setKeepLog(devToolsPage, true);

         // Navigate to a different origin's page
         await inspectedPage.goToResourceWithCustomHost('devtools.test', 'host/page-with-oopif.html');

         // Requests should still be there because keep log was enabled before navigation
         await waitForSomeRequestsToAppear(devToolsPage, 3);

         // Introspect a request from the first navigation
         await selectRequestByName(devToolsPage, 'headers-and-payload.html', {});
         const networkView = await devToolsPage.waitFor('.network-item-view');
         await devToolsPage.click('[aria-label=Response].tabbed-pane-header-tab', {
           root: networkView,
         });
         await devToolsPage.waitFor('[aria-label=Response].tabbed-pane-header-tab[aria-selected=true]', networkView);

         // Verify that the response body is NOT available.
         // Wait for the expected fallback UI element that DevTools renders when a response body isn't available.
         const emptyView = await devToolsPage.waitFor('.empty-state');
         const emptyStateHeader = await emptyView.$('.empty-state-header');
         const emptyStateText = await emptyStateHeader?.evaluate(el => el.textContent);
         assert.strictEqual(emptyStateText, 'Failed to load response data');

         const editors = await devToolsPage.$$('devtools-text-editor');
         assert.isEmpty(editors, 'Editor should not have appeared because body should not be durable');
       });
  });
});
