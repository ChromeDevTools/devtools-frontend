// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {
  $,
  $$,
  click,
  getBrowserAndPages,
  getTestServerPort,
  goToResource,
  waitFor,
  waitForFunction,
  waitForNone,
} from '../../shared/helper.js';

import {expectVeEvents, veChange, veClick, veImpression, veImpressionsUnder} from './visual-logging-helpers.js';

export async function navigateToApplicationTab(_target: puppeteer.Page, testName: string) {
  const {target, frontend} = getBrowserAndPages();
  await target.bringToFront();
  await goToResource(`application/${testName}.html`);
  await frontend.bringToFront();
  await click('#tab-resources');
  // Make sure the application navigation list is shown
  await waitFor('.storage-group-list-item');
  await expectVeEvents([veClick('Toolbar: main > PanelTabHeader: resources'), veImpressionForApplicationPanel()]);
}

export async function navigateToServiceWorkers() {
  const SERVICE_WORKER_ROW_SELECTOR = '[aria-label="Service workers"]';
  await click(SERVICE_WORKER_ROW_SELECTOR);
  await waitFor('.service-worker-list');
  await expectVeEvents([
    veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: application > TreeItem: service-workers'),
    veImpressionsUnder('Panel: resources', [veImpressionForServiceWorkersView()]),
  ]);
}

export async function navigateToFrame(name: string) {
  await doubleClickTreeItem(`[aria-label="${name}"]`);
  await waitFor('[title="Click to open in Sources panel"]');
  await expectVeEvents([
    veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: frames > TreeItem: frame'),
    veImpressionsUnder('Panel: resources', [veImpressionForFrameDetails()]),
  ]);
}

export async function navigateToManifestInApplicationTab(testName: string) {
  const MANIFEST_SELECTOR = '[aria-label="Manifest"]';
  const {target} = getBrowserAndPages();
  await navigateToApplicationTab(target, testName);
  await click(MANIFEST_SELECTOR);
}

export async function navigateToStorage() {
  const STORAGE_SELECTOR = '[aria-label="Storage"]';
  await click(STORAGE_SELECTOR);
  await waitFor('.clear-storage-button');
  await expectVeEvents([
    veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: application > TreeItem: storage'),
    veImpressionsUnder('Panel: resources', [veImpressionForStorageOverview()]),
  ]);
}

export async function navigateToOpenedWindows() {
  await doubleClickTreeItem('[aria-label="Opened Windows"]');
  await waitFor('.empty-view');
  await expectVeEvents([
    veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: frames > TreeItem: frame > TreeItem: opened-windows'),
    veImpressionsUnder(
        'Panel: resources', [veImpression('Pane', 'opened-windows', [veImpression('Section', 'empty-view')])]),
  ]);
}

export async function navigateToWebWorkers() {
  const WEB_WORKERS_SELECTOR = '[aria-label="Web Workers"]';
  await expectVeEvents([veImpressionsUnder(
      'Panel: resources > Pane: sidebar > Tree > TreeItem: frames > TreeItem: frame',
      [veImpression('TreeItem', 'web-workers')])]);
  await doubleClickTreeItem(WEB_WORKERS_SELECTOR);
  await waitFor(`${WEB_WORKERS_SELECTOR} + ol li:first-child`);
  await waitFor('.empty-view');
  await expectVeEvents([
    veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: frames > TreeItem: frame > TreeItem: web-workers'),
    veImpressionsUnder(
        'Panel: resources', [veImpression('Pane', 'web-workers', [veImpression('Section', 'empty-view')])]),
  ]);
}

export async function navigateToFrameServiceWorkers(frameName: string) {
  await navigateToFrame(frameName);
  const SERVICE_WORKERS_SELECTOR = `[aria-label="${frameName}"] ~ ol [aria-label="Service workers"]`;

  await doubleClickTreeItem(SERVICE_WORKERS_SELECTOR);
  await waitFor(`${SERVICE_WORKERS_SELECTOR} + ol li:first-child`);
  await waitFor('.empty-view');
  await expectVeEvents([
    veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: frames > TreeItem: frame > TreeItem: service-workers'),
    veImpressionsUnder(
        'Panel: resources', [veImpression('Pane', 'service-workers', [veImpression('Section', 'empty-view')])]),
  ]);
}

export async function navigateToCookiesForTopDomain() {
  // The parent suffix makes sure we wait for the Cookies item to have children before trying to click it.
  const COOKIES_SELECTOR = '[aria-label="Cookies"].parent';
  const DOMAIN_SELECTOR = `${COOKIES_SELECTOR} + ol > [aria-label="https://localhost:${getTestServerPort()}"]`;
  await doubleClickTreeItem(COOKIES_SELECTOR);
  await doubleClickTreeItem(DOMAIN_SELECTOR);

  await expectVeEvents([
    veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: cookies'),
    veImpressionsUnder(
        'Panel: resources',
        [
          veImpression(
              'Pane', 'cookies', [veImpression('Section', 'empty-view', [veImpression('Link', 'learn-more')])]),
          veImpressionsUnder(
              'Pane: sidebar > Tree > TreeItem: storage > TreeItem: cookies',
              [veImpression('TreeItem', 'cookies-for-frame')]),
        ]),
    veClick(
        'Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: cookies > TreeItem: cookies-for-frame'),
    veImpressionsUnder('Panel: resources', [veImpressionForCookieTable()]),
  ]);
}

export async function navigateToSessionStorageForTopDomain() {
  const SESSION_STORAGE_SELECTOR = '[aria-label="Session storage"].parent';
  const DOMAIN_SELECTOR = `${SESSION_STORAGE_SELECTOR} + ol > [aria-label="https://localhost:${getTestServerPort()}"]`;
  await doubleClickTreeItem(SESSION_STORAGE_SELECTOR);
  await doubleClickTreeItem(DOMAIN_SELECTOR);

  await expectVeEvents([
    veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: session-storage'),
    veImpressionsUnder(
        'Panel: resources',
        [
          veImpression(
              'Pane', 'session-storage', [veImpression('Section', 'empty-view', [veImpression('Link', 'learn-more')])]),
          veImpressionsUnder(
              'Pane: sidebar > Tree > TreeItem: storage > TreeItem: session-storage',
              [veImpression('TreeItem', 'session-storage-for-domain')]),
        ]),
    veClick(
        'Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: session-storage > TreeItem: session-storage-for-domain'),
    veImpressionsUnder('Panel: resources', [veImpressionForSessionStorageView()]),
  ]);
}

const SHARED_STORAGE_SELECTOR = '[aria-label="Shared storage"].parent';

export async function navigateToSharedStorage() {
  await doubleClickTreeItem(SHARED_STORAGE_SELECTOR);
  await waitFor('devtools-shared-storage-access-grid');
  // await new Promise(resolve => setTimeout(resolve, 1000));
  await expectVeEvents([
    veClick('Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: shared-storage'),
    veImpressionsUnder(
        'Panel: resources', [veImpression('Pane', 'shared-storage-events', [veImpression('Section', 'events-table')])]),
  ]);
}

export async function navigateToSharedStorageForTopDomain() {
  await navigateToSharedStorage();
  const DOMAIN_SELECTOR = `${SHARED_STORAGE_SELECTOR} + ol > [aria-label="https://localhost:${getTestServerPort()}"]`;
  await doubleClickTreeItem(DOMAIN_SELECTOR);
  // await new Promise(resolve => setTimeout(resolve, 1000));
  await expectVeEvents([
    veClick(
        'Panel: resources > Pane: sidebar > Tree > TreeItem: storage > TreeItem: shared-storage > TreeItem: shared-storage-instance'),
    veImpressionsUnder('Panel: resources', [veImpressionForSharedStorageView()]),
  ]);
}

async function doubleClickTreeItem(selector: string) {
  const element = await waitFor(selector);
  element.evaluate(el => el.scrollIntoView(true));
  await click(selector, {clickOptions: {clickCount: 2}});
}

export async function getDataGridData(selector: string, columns: string[]) {
  // Wait for Storage data-grid to show up
  await waitFor(selector);

  const dataGridNodes = await $$('.data-grid-data-grid-node:not(.creation-node)');
  const dataGridRowValues = await Promise.all(dataGridNodes.map(node => node.evaluate((row: Element, columns) => {
    const data: {[key: string]: string|null} = {};
    for (const column of columns) {
      const columnElement = row.querySelector(`.${column}-column`);
      data[column] = columnElement ? columnElement.textContent : '';
    }
    return data;
  }, columns)));

  return dataGridRowValues;
}

export async function getTrimmedTextContent(selector: string) {
  const elements = await $$(selector);
  return Promise.all(elements.map(element => element.evaluate(e => {
    return (e.textContent || '').trim().replace(/[ \n]{2,}/gm, '');  // remove multiple consecutive whitespaces
  })));
}

export async function getFrameTreeTitles() {
  const treeTitles = await $$('[aria-label="Resources Section"] ~ ol .tree-element-title');
  return Promise.all(treeTitles.map(node => node.evaluate(e => e.textContent)));
}

export async function getStorageItemsData(columns: string[], leastExpected: number = 1) {
  const gridData = await waitForFunction(async () => {
    const values = await getDataGridData('.storage-view table', columns);
    if (values.length >= leastExpected) {
      return values;
    }
    return undefined;
  });
  return gridData;
}

export async function filterStorageItems(filter: string) {
  const element = await $('.toolbar-input-prompt') as puppeteer.ElementHandle;
  await expectVeEvents(
      [veImpressionsUnder('Panel: resources > Pane: cookies-data > Toolbar', [veImpression('TextField', 'filter')])]);
  await element.type(filter);
  await expectVeEvents([
    veChange('Panel: resources > Pane: cookies-data > Toolbar > TextField: filter'),
    veImpressionsUnder(
        'Panel: resources > Pane: cookies-data > Toolbar > TextField: filter', [veImpression('Action', 'clear')]),
  ]);
}

export async function clearStorageItemsFilter() {
  await click('.toolbar-input .toolbar-input-clear-button');
  await expectVeEvents(
      [veClick('Panel: resources > Pane: cookies-data > Toolbar > TextField: filter > Action: clear')]);
}

export async function clearStorageItems() {
  await click('#storage-items-delete-all');
}

export async function selectStorageItemAtIndex(index: number) {
  await waitForFunction(async () => {
    try {
      const dataGridNodes = await $$('.storage-view .data-grid-data-grid-node:not(.creation-node)');
      await dataGridNodes[index].click();
      await expectVeEvents([veClick('Panel: resources > Pane: session-storage-data > TableRow > TableCell: value')]);
    } catch (error) {
      if (error.message === 'Node is detached from document') {
        return false;
      }
      throw error;
    }
    return true;
  });
}

export async function deleteSelectedStorageItem() {
  await click('[aria-label="Delete Selected"]');
  await expectVeEvents([veClick(
      'Panel: resources > Pane: session-storage-data > Toolbar > Action: storage-items-view.delete-selected')]);
}

export async function selectCookieByName(name: string) {
  const {frontend} = getBrowserAndPages();
  await waitFor('.cookies-table');
  const cell = await waitForFunction(async () => {
    const tmp = await frontend.evaluateHandle(name => {
      const result = [...document.querySelectorAll('.cookies-table .name-column')]
                         .map(c => ({cell: c, textContent: c.textContent || ''}))
                         .find(({textContent}) => textContent.trim() === name);
      return result ? result.cell : undefined;
    }, name);

    return tmp.asElement() as puppeteer.ElementHandle<HTMLElement>|| undefined;
  });
  await expectVeEvents([veImpressionsUnder('Panel: resources', [veImpression('Pane', 'cookies-data')])]);
  await cell.click();
  await expectVeEvents([veClick('Panel: resources > Pane: cookies-data > TableRow > TableCell: name')]);
}

export async function waitForQuotaUsage(p: (quota: number) => boolean) {
  const {frontend} = getBrowserAndPages();
  await frontend.bringToFront();
  await waitForFunction(async () => {
    const usedQuota = await getQuotaUsage();
    return p(usedQuota);
  });
}

export async function getQuotaUsage() {
  const storageRow = await waitFor('.quota-usage-row');
  const quotaString = await storageRow.evaluate(el => el.textContent || '');
  const [usedQuotaText, modifier] =
      quotaString.replaceAll(',', '').replace(/^\D*([\d.]+)\D*(kM?)B.used.out.of\D*\d+\D*.?B.*$/, '$1 $2').split(' ');
  let usedQuota = Number.parseInt(usedQuotaText, 10);
  if (modifier === 'k') {
    usedQuota *= 1000;
  } else if (modifier === 'M') {
    usedQuota *= 1000000;
  }
  return usedQuota;
}

export async function getPieChartLegendRows() {
  const pieChartLegend = await waitFor('.pie-chart-legend');
  const rows = await pieChartLegend.evaluate(legend => {
    const rows = [];
    for (const tableRow of legend.children) {
      const row = [];
      for (const cell of tableRow.children) {
        row.push(cell.textContent);
      }
      rows.push(row);
    }
    return rows;
  });
  return rows;
}

export async function unregisterServiceWorker() {
  const UNREGISTER_SERVICE_WORKER_SELECTOR = '[title="Unregister service worker"]';
  await click('#tab-resources');
  await navigateToServiceWorkers();
  await click(UNREGISTER_SERVICE_WORKER_SELECTOR);
  await waitForNone(UNREGISTER_SERVICE_WORKER_SELECTOR);
}

export function veImpressionForApplicationPanel() {
  return veImpression('Panel', 'resources', [
    veImpression('Pane', 'sidebar', [
      veImpression('Tree', undefined, [
        veImpression('TreeItem', 'application', [
          veImpression('Expand'),
          veImpression('TreeItem', 'manifest', [veImpression('Expand')]),
          veImpression('TreeItem', 'service-workers'),
          veImpression('TreeItem', 'storage'),
        ]),
        veImpression('TreeItem', 'storage', [
          veImpression('Expand'),
          veImpression('TreeItem', 'cache-storage'),
          veImpression('TreeItem', 'cookies'),
          veImpression('TreeItem', 'indexed-db'),
          veImpression('TreeItem', 'interest-groups'),
          veImpression('TreeItem', 'local-storage'),
          veImpression('TreeItem', 'private-state-tokens'),
          veImpression('TreeItem', 'session-storage'),
          veImpression('TreeItem', 'shared-storage'),
          veImpression('TreeItem', 'storage-buckets'),
        ]),
        veImpression('TreeItem', 'background-services', [
          veImpression('Expand'),
          veImpression('TreeItem', 'background-fetch'),
          veImpression('TreeItem', 'background-sync'),
          veImpression('TreeItem', 'bfcache'),
          veImpression('TreeItem', 'bounce-tracking-mitigations'),
          veImpression('TreeItem', 'notifications'),
          veImpression('TreeItem', 'payment-handler'),
          veImpression('TreeItem', 'periodic-background-sync'),
          veImpression('TreeItem', 'preloading', [veImpression('Expand')]),
          veImpression('TreeItem', 'push-messaging'),
          veImpression('TreeItem', 'reporting-api'),
        ]),
        veImpression('TreeItem', 'frames', [
          veImpression('Expand'),
          veImpression('TreeItem', 'frame', [veImpression('Expand')]),
        ]),
      ]),
    ]),
    veImpression('Pane', 'manifest', [
    ]),
  ]);
}

function veImpressionForCookieTable() {
  return veImpression('Pane', 'cookies-data', [
    veImpression('Pane', 'preview', [veImpression('Section', 'empty-view')]),
    veImpression('TableHeader', 'domain'),
    veImpression('TableHeader', 'expires'),
    veImpression('TableHeader', 'http-only'),
    veImpression('TableHeader', 'name'),
    veImpression('TableHeader', 'partition-key-site'),
    veImpression('TableHeader', 'path'),
    veImpression('TableHeader', 'priority'),
    veImpression('TableHeader', 'same-site'),
    veImpression('TableHeader', 'secure'),
    veImpression('TableHeader', 'size'),
    veImpression('TableHeader', 'value'),
    veImpression(
        'Toolbar', undefined,
        [
          veImpression('Action', 'storage-items-view.clear-all'),
          veImpression('Action', 'storage-items-view.delete-selected'),
          veImpression('Action', 'storage-items-view.refresh'),
          veImpression('TextField', 'filter'),
          veImpression('Toggle', 'only-show-cookies-with-issues'),
        ]),
  ]);
}

function veImpressionForFrameDetails() {
  return veImpression('Pane', 'frames', [
    veImpression('Action', 'reveal-in-elements'),
    veImpression('Action', 'reveal-in-network'),
    veImpression('Action', 'reveal-in-sources'),
    veImpression('Link', 'learn-more.coop-coep'),
    veImpression('Link', 'learn-more.monitor-memory-usage'),
    veImpression('Link', 'learn-more.origin-trials'),
  ]);
}

function veImpressionForStorageViewToolbar() {
  return veImpression('Toolbar', undefined, [
    veImpression('Action', 'storage-items-view.refresh'),
    veImpression('TextField', 'filter'),
    veImpression('Action', 'storage-items-view.clear-all'),
    veImpression('Action', 'storage-items-view.delete-selected'),
  ]);
}

function veImpressionForSessionStorageView() {
  return veImpression('Pane', 'session-storage-data', [
    veImpressionForStorageViewToolbar(),
    veImpression('Pane', 'preview'),
    veImpression('TableHeader', 'key'),
    veImpression('TableHeader', 'value'),
  ]);
}

function veImpressionForSharedStorageView() {
  return veImpression('Pane', 'shared-storage-data', [
    veImpressionForStorageViewToolbar(),
    veImpression('TableHeader', 'key'),
    veImpression('TableHeader', 'value'),
    veImpression('Action', 'reset-entropy-budget'),
    veImpression('Pane', 'preview', [veImpression('Section', 'json-view')]),
  ]);
}

function veImpressionForServiceWorkersView() {
  return veImpression('Pane', 'service-workers', [
    veImpression('Section', 'other-origin', [veImpression('Link', 'view-all')]),
    veImpression(
        'Section', 'this-origin',
        [
          veImpression('Action', 'periodic-sync-tag'),
          veImpression('Action', 'push-message'),
          veImpression('Action', 'show-network-requests'),
          veImpression('Action', 'sync-tag'),
          veImpression('Action', 'unregister'),
          veImpression('Action', 'update'),
          veImpression('Link', 'source-location'),
          veImpression('TextField', 'periodic-sync-tag'),
          veImpression('TextField', 'push-message'),
          veImpression('TextField', 'sync-tag'),
          veImpression('Toggle', 'bypass-service-worker'),
          veImpression('Toggle', 'disconnect-from-network'),
          veImpression('Toggle', 'service-worker-update-on-reload'),
          veImpression('Tree', 'update-timing-table'),
        ]),
  ]);
}

function veImpressionForStorageOverview() {
  return veImpression('Pane', 'clear-storage', [
    veImpression('Action', 'storage.clear-site-data'),
    veImpression('Section', 'application', [veImpression('Toggle', 'clear-storage-service-workers')]),
    veImpression(
        'Section', 'storage',
        [
          veImpression('Toggle', 'clear-storage-cache-storage'),
          veImpression('Toggle', 'clear-storage-cookies'),
          veImpression('Toggle', 'clear-storage-indexeddb'),
          veImpression('Toggle', 'clear-storage-local-storage'),
          veImpression('Toggle', 'clear-storage-websql'),
        ]),
    veImpression(
        'Section', 'usage',
        [
          veImpression('Link', 'learn-more'),
          veImpression(
              'PieChart', undefined,
              [
                veImpression('Section', 'legend', [veImpression('PieChartTotal', 'select-total')]),
              ]),
          veImpression('Toggle', 'simulate-custom-quota'),
        ]),
    veImpression('Toggle', 'clear-storage-include-third-party-cookies'),
  ]);
}
