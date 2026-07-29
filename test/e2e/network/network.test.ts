// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  clearTimeWindow,
  getAllRequestNames,
  getNumberOfRequests,
  getSelectedRequestName,
  navigateToNetworkTab,
  selectRequestByName,
  setCacheDisabled,
  setKeepLog,
  setTextFilter,
  setTimeWindow,
  waitForSelectedRequestChange,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const SIMPLE_PAGE_REQUEST_NUMBER = 10;
const SIMPLE_PAGE_URL = `requests.html?num=${SIMPLE_PAGE_REQUEST_NUMBER}`;

describe('The Network Tab', function() {
  async function navigateToNetworkTabEmptyPage(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await navigateToNetworkTab(devToolsPage, inspectedPage, 'empty.html');
    await setCacheDisabled(devToolsPage, true);
    await setKeepLog(devToolsPage, false);
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
