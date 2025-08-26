// Copyright 2020 The Chromium Authors. All rights reserved.
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
  setPersistLog,
  setTimeWindow,
  waitForSelectedRequestChange,
  waitForSomeRequestsToAppear,
} from '../../e2e/helpers/network-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const SIMPLE_PAGE_REQUEST_NUMBER = 10;
const SIMPLE_PAGE_URL = `requests.html?num=${SIMPLE_PAGE_REQUEST_NUMBER}`;

describe('The Network Tab', function() {
  async function navigateToNetworkTabEmptyPage(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await navigateToNetworkTab('empty.html', devToolsPage, inspectedPage);
    await setCacheDisabled(true, devToolsPage);
    await setPersistLog(false, devToolsPage);
  }

  it('displays requests', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTabEmptyPage(devToolsPage, inspectedPage);
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);

    // Wait for all the requests to be displayed + 1 to account for the page itself.
    await waitForSomeRequestsToAppear(SIMPLE_PAGE_REQUEST_NUMBER + 1, devToolsPage);

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
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);

    let selected = await getSelectedRequestName(devToolsPage);
    assert.isNull(selected, 'No request should be selected by default');

    await selectRequestByName(SIMPLE_PAGE_URL, {devToolsPage});
    await waitForSelectedRequestChange(selected, devToolsPage);

    selected = await getSelectedRequestName(devToolsPage);
    assert.strictEqual(selected, SIMPLE_PAGE_URL, 'Selecting the first request should work');

    const lastRequestName = `image.svg?id=${SIMPLE_PAGE_REQUEST_NUMBER - 1}`;
    await selectRequestByName(lastRequestName, {devToolsPage});
    await waitForSelectedRequestChange(selected, devToolsPage);

    selected = await getSelectedRequestName(devToolsPage);
    assert.strictEqual(selected, lastRequestName, 'Selecting the last request should work');
  });

  it('can persist requests', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTabEmptyPage(devToolsPage, inspectedPage);
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);

    // Wait for all the requests to be displayed + 1 to account for the page itself, and get their names.
    await waitForSomeRequestsToAppear(SIMPLE_PAGE_REQUEST_NUMBER + 1, devToolsPage);
    const firstPageRequestNames = (await getAllRequestNames(devToolsPage)).sort();

    await setPersistLog(true, devToolsPage);

    // Navigate to a new page, and wait for the same requests to still be there.
    await inspectedPage.goTo('about:blank');
    await waitForSomeRequestsToAppear(SIMPLE_PAGE_REQUEST_NUMBER + 1, devToolsPage);
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
       await navigateToNetworkTab('infinite-requests.html', devToolsPage, inspectedPage);
       await waitForSomeRequestsToAppear(2, devToolsPage);

       await setTimeWindow(devToolsPage);
       const initialNumberOfRequests = await getNumberOfRequests(devToolsPage);
       assert.isTrue(initialNumberOfRequests > 1);

       await clearTimeWindow(devToolsPage);

       // Alow for some time to pass; otherwise this is to fast in non-hosted
       await devToolsPage.timeout(100);
       const numberOfRequestsAfterFilter = await getNumberOfRequests(devToolsPage);
       // Time filter is cleared so the number of requests must be greater than the initial number.
       assert.isTrue(numberOfRequestsAfterFilter > initialNumberOfRequests);

       // After some time we expect new requests to come so it must be
       // that the number of requests increased.
       await waitForSomeRequestsToAppear(numberOfRequestsAfterFilter + 1, devToolsPage);
     });
});
