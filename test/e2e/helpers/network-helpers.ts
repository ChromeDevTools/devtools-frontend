// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {
  $,
  $$,
  click,
  getBrowserAndPages,
  goToResource,
  setCheckBox,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';

const REQUEST_LIST_SELECTOR = '.network-log-grid tbody';

export async function waitForNetworkTab(): Promise<void> {
  // Make sure the network tab is shown on the screen
  await waitFor('.network-log-grid');
}

export async function openNetworkTab(): Promise<void> {
  await click('#tab-network');
  await waitForNetworkTab();
}

/**
 * Select the Network tab in DevTools
 */
export async function navigateToNetworkTab(testName: string) {
  await goToResource(`network/${testName}`);
  await openNetworkTab();
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

export async function getNumberOfRequests() {
  return (await getAllRequestNames()).length;
}

export async function getSelectedRequestName() {
  const request = await $(REQUEST_LIST_SELECTOR + ' tr.selected .name-column');
  if (!request) {
    return null;
  }
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
  await setCheckBox('[title="Do not clear log on page reload / navigation"]', persist);
}

export async function setCacheDisabled(disabled: boolean): Promise<void> {
  await setCheckBox('[title^="Disable cache"]', disabled);
}

export async function setTimeWindow(): Promise<void> {
  const overviewGridCursorArea = await waitFor('.overview-grid-cursor-area');
  await overviewGridCursorArea.click({offset: {x: 0, y: 10}});
}

export async function clearTimeWindow(): Promise<void> {
  const overviewGridCursorArea = await waitFor('.overview-grid-cursor-area');
  await overviewGridCursorArea.click({count: 2});
}

export async function getTextFromHeadersRow(row: puppeteer.ElementHandle<Element>) {
  const headerNameElement = await waitFor('.header-name', row);
  const headerNameText = await headerNameElement.evaluate(el => el.textContent || '');

  const headerValueElement = await waitFor('.header-value', row);
  let headerValueText = (await headerValueElement.evaluate(el => el.textContent || '')).trim();
  if (headerValueText === '') {
    const headerValueEditableSpanComponent = await waitFor('.header-value devtools-editable-span', row);
    const editableSpan = await waitFor('.editable', headerValueEditableSpanComponent);
    headerValueText = (await editableSpan.evaluate(el => el.textContent || '')).trim();
  }

  return [headerNameText.trim(), headerValueText];
}

export async function elementContainsTextWithSelector(
    element: puppeteer.ElementHandle<Element>, textContent: string, selector: string): Promise<boolean> {
  const selectedElements = await element.evaluate((node, selector) => {
    return [...node.querySelectorAll(selector)].map(node => node.textContent || '') || [];
  }, selector);
  return selectedElements.includes(textContent);
}
