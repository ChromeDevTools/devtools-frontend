// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {
  $,
  click,
  goToResource,
  setCheckBox,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

import {veImpression} from './visual-logging-helpers.js';

const REQUEST_LIST_SELECTOR = '.network-log-grid tbody';

export async function waitForNetworkTab(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<void> {
  // Make sure the network tab is shown on the screen
  await devToolsPage.waitFor('.network-log-grid');
}

export async function openNetworkTab(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage):
    Promise<void> {
  await devToolsPage.click('#tab-network');
  await waitForNetworkTab(devToolsPage);
}

/**
 * Select the Network tab in DevTools
 */
export async function navigateToNetworkTab(
    testName: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage,
    inspectedPage: InspectedPage = getBrowserAndPagesWrappers().inspectedPage) {
  await goToResource(`network/${testName}`, {inspectedPage});
  await openNetworkTab(devToolsPage);
}

/**
 * Wait until a certain number of requests are shown in the request list.
 * @param numberOfRequests The expected number of requests to wait for.
 * @param selector Optional. The selector to use to get the list of requests.
 */
export async function waitForSomeRequestsToAppear(
    numberOfRequests: number, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const requests = await getAllRequestNames(devToolsPage);
    return requests.length >= numberOfRequests && Boolean(requests.map(name => name ? name.trim() : '').join(''));
  });
}

export async function getAllRequestNames(devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const requests = await devToolsPage.$$(REQUEST_LIST_SELECTOR + ' .name-column');
  return await Promise.all(requests.map(
      request => request.evaluate(
          r => [...r.childNodes].find(({nodeType}) => nodeType === Node.TEXT_NODE)?.textContent ?? '')));
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
    return node?.childNodes[2].textContent;
  });
}

export async function selectRequestByName(
    name: string, clickOptions?: puppeteer.ClickOptions&{devToolsPage?: DevToolsPage}) {
  const devToolsPage = clickOptions?.devToolsPage ?? getBrowserAndPagesWrappers().devToolsPage;
  const selector = REQUEST_LIST_SELECTOR + ' .name-column';

  // Finding he click position is done in a single frontend.evaluate call
  // to make sure the element still exists after finding the element.
  // If this were done outside of evaluate code, it would be possible for an
  // element to be removed from the dom between the $$(.selector) call and the
  // click(element) call.
  const rect = await devToolsPage.evaluate((name, selector) => {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if ([...element.childNodes].find(({nodeType}) => nodeType === Node.TEXT_NODE)?.textContent === name) {
        const {left, top, width, height} = element.getBoundingClientRect();
        return {left, top, width, height};
      }
    }
    return null;
  }, name, selector);

  if (rect) {
    const x = rect.left + rect.width * 0.5;
    const y = rect.top + rect.height * 0.5;
    await devToolsPage.page.mouse.click(x, y, clickOptions);
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

export async function setCacheDisabled(
    disabled: boolean, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<void> {
  await devToolsPage.setCheckBox('[title^="Disable cache"]', disabled);
}

export async function setInvert(invert: boolean) {
  await setCheckBox('[title="Invert"]', invert);
}

export async function setTimeWindow(): Promise<void> {
  const overviewGridCursorArea = await waitFor('.overview-grid-cursor-area');
  await overviewGridCursorArea.click({offset: {x: 0, y: 10}});
}

export async function clearTimeWindow(): Promise<void> {
  const overviewGridCursorArea = await waitFor('.overview-grid-cursor-area');
  await overviewGridCursorArea.click({count: 2});
}

export async function setTextFilter(
    text: string, devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<void> {
  const toolbarHandle = await devToolsPage.waitFor('.text-filter');
  const input = await devToolsPage.waitForAria('Filter', toolbarHandle);
  await input.focus();
  await devToolsPage.typeText(text);
}

export async function getTextFilterContent(): Promise<string> {
  const toolbarHandle = await waitFor('.text-filter');
  const textFilterContent = toolbarHandle.evaluate(toolbar => {
    return toolbar.querySelector('[aria-label="Filter"]')?.textContent ?? '';
  });
  return await textFilterContent;
}

export async function clearTextFilter(): Promise<void> {
  const textFilterContent = await getTextFilterContent();
  if (textFilterContent) {
    const toolbarHandle = await waitFor('.text-filter');
    await click('[aria-label="Clear"]', {root: toolbarHandle});
  }
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

export function veImpressionForNetworkPanel(options?: {newFilterBar?: boolean}) {
  const filterBar = options?.newFilterBar ?
      [
        veImpression('DropDown', 'request-types'),
        veImpression('DropDown', 'more-filters'),
        veImpression('Toggle', 'invert-filter'),
        veImpression('TextField', 'filter'),
      ] :
      [
        veImpression('DropDown', 'more-filters'),
        veImpression(
            'Section', 'filter-bitset',
            [
              veImpression('Item', 'all'),
              veImpression('Item', 'xhr'),
              veImpression('Item', 'document'),
              veImpression('Item', 'stylesheet'),
              veImpression('Item', 'script'),
              veImpression('Item', 'font'),
              veImpression('Item', 'image'),
              veImpression('Item', 'media'),
              veImpression('Item', 'manifest'),
              veImpression('Item', 'socket'),
              veImpression('Item', 'wasm'),
              veImpression('Item', 'other'),
            ]),
        veImpression('TextField', 'filter'),
        veImpression('Toggle', 'invert-filter'),
      ];
  return veImpression('Panel', 'network', [
    veImpression('Toolbar', 'filter-bar', filterBar),
    veImpression(
        'Toolbar', 'network-main',
        [
          veImpression('Toggle', 'network.toggle-recording'),
          veImpression('Action', 'network.clear'),
          veImpression('Toggle', 'filter'),
          veImpression('Toggle', 'search'),
          veImpression('Action', 'network-conditions'),
          veImpression('Action', 'import-har'),
          veImpression('Action', 'export-har'),
          veImpression('Toggle', 'network-log.preserve-log'),
          veImpression('Toggle', 'cache-disabled'),
          veImpression('DropDown', 'active-network-condition-key'),
        ]),
    veImpression('Timeline', 'network-overview'),
    veImpression('Toggle', 'network-settings'),
    veImpression(
        'Section', 'empty-view',
        [
          veImpression('Action', 'inspector-main.reload'),
          veImpression('Link', 'learn-more'),
        ]),
    veImpression('TableHeader', 'name'),
    veImpression('TableHeader', 'status'),
    veImpression('TableHeader', 'type'),
    veImpression('TableHeader', 'initiator'),
    veImpression('TableHeader', 'size'),
    veImpression('TableHeader', 'time'),
  ]);
}
