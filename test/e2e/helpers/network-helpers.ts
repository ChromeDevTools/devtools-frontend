// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$$, click, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';

const REQUEST_LIST_SELECTOR = '.network-log-grid .data';

/**
 * Select the Network tab in DevTools
 */
export async function navigateToNetworkTab(testName: string) {
  await goToResource(`network/${testName}`);
  await click('#tab-network');
  // Make sure the network tab is shown on the screen
  await waitFor('.network-log-grid');
}

/**
 * Wait until a certain number of requests are shown in the request list.
 * @param numberOfRequests The expected number of requests to wait for.
 * @param selector Optional. The selector to use to get the list of requests.
 */
export async function waitForSomeRequestsToAppear(numberOfRequests: number) {
  await waitForFunction(async () => {
    const requests = await getAllRequestNames();
    return requests.length >= numberOfRequests && !!requests.map(name => name ? name.trim() : '').join('');
  });
}

export async function getAllRequestNames() {
  const requests = await $$(REQUEST_LIST_SELECTOR + ' .name-column');
  return await Promise.all(requests.map(request => request.evaluate(r => r.childNodes[1].textContent)));
}

export async function getSelectedRequestName() {
  const request = await waitFor(REQUEST_LIST_SELECTOR + ' tr.selected .name-column');
  return await request.evaluate(node => {
    return node && node.childNodes[1].textContent;
  });
}

export async function selectRequestByName(name: string) {
  const requests = await $$(REQUEST_LIST_SELECTOR + ' .name-column');
  for (const request of requests) {
    const hasSoughtName = await request.evaluate((node, name) => node.childNodes[1].textContent === name, name);
    if (hasSoughtName) {
      await click(request);
      return;
    }
  }
}

export async function waitForSelectedRequestChange(initialRequestName: string|null) {
  await waitForFunction(async () => {
    const name = await getSelectedRequestName();
    return name !== initialRequestName;
  });
}

export async function togglePersistLog() {
  await click('[aria-label="Preserve log"]');
}
