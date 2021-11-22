// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {$$, click, getBrowserAndPages, goToResource, setCheckBox, waitFor, waitForFunction} from '../../shared/helper.js';

import type {puppeteer} from '../../shared/helper.js';
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
    return requests.length >= numberOfRequests && Boolean(requests.map(name => name ? name.trim() : '').join(''));
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

export async function selectRequestByName(name: string, clickOptions?: puppeteer.ClickOptions) {
  const selector = REQUEST_LIST_SELECTOR + ' .name-column';
  const {frontend} = getBrowserAndPages();

  // Finding he click position is done in a single frontend.evaluate call
  // to make sure the element still exists after finding the element.
  // If this were done outside of evaluate code, it would be possible for an
  // element to be removed from the dom between the $$(.selector) call and the
  // click(element) call.
  const rect = await frontend.evaluate((name, selector) => {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (element.childNodes[1].textContent === name) {
        const {left, top, width, height} = element.getBoundingClientRect();
        return {left, top, width, height};
      }
    }
    return null;
  }, name, selector);

  if (rect) {
    const x = rect.left + rect.width * 0.5;
    const y = rect.top + rect.height * 0.5;
    await frontend.mouse.click(x, y, clickOptions);
  }
}

export async function waitForSelectedRequestChange(initialRequestName: string|null) {
  await waitForFunction(async () => {
    const name = await getSelectedRequestName();
    return name !== initialRequestName;
  });
}

export async function setPersistLog(persist: boolean) {
  await setCheckBox('[aria-label="Preserve log"]', persist);
}

export async function setCacheDisabled(disabled: boolean): Promise<void> {
  await setCheckBox('[aria-label="Disable cache"]', disabled);
}
