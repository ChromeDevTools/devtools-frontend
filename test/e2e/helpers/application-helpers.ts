// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {$, $$, click, getBrowserAndPages, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';

export async function navigateToApplicationTab(_target: puppeteer.Page, testName: string) {
  const {target, frontend} = getBrowserAndPages();
  await target.bringToFront();
  await goToResource(`application/${testName}.html`);
  await frontend.bringToFront();
  await click('#tab-resources');
  // Make sure the application navigation list is shown
  await waitFor('.storage-group-list-item');
}

export async function navigateToServiceWorkers() {
  const SERVICE_WORKER_ROW_SELECTOR = '[aria-label="Service workers"]';
  await click(SERVICE_WORKER_ROW_SELECTOR);
}

export async function navigateToManifestInApplicationTab(testName: string) {
  const MANIFEST_SELECTOR = '[aria-label="Manifest"]';
  const {target} = getBrowserAndPages();
  await navigateToApplicationTab(target, testName);
  await click(MANIFEST_SELECTOR);
}

export async function doubleClickSourceTreeItem(selector: string) {
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
  await element.type(filter);
}

export async function clearStorageItemsFilter() {
  await click('.toolbar-input .toolbar-input-clear-button');
}

export async function clearStorageItems() {
  await waitFor('#storage-items-delete-all');
  await click('#storage-items-delete-all');
}

export async function selectStorageItemAtIndex(index: number) {
  await waitForFunction(async () => {
    try {
      const dataGridNodes = await $$('.storage-view .data-grid-data-grid-node:not(.creation-node)');
      await dataGridNodes[index].click();
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
  await waitFor('[aria-label="Delete Selected"]');
  await click('[aria-label="Delete Selected"]');
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
  await cell.click();
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
      quotaString.replace(/^\D*([\d.]+)\D*(kM?)B.used.out.of\D*\d+\D*.?B.*$/, '$1 $2').split(' ');
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
