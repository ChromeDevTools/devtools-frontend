// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';

import {$, $$, click, getBrowserAndPages, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';

export async function navigateToApplicationTab(target: puppeteer.Page, testName: string) {
  await goToResource(`application/${testName}.html`);
  await click('#tab-resources');
  // Make sure the application navigation list is shown
  await waitFor('.storage-group-list-item');
}

export async function navigateToServiceWorkers() {
  const SERVICE_WORKER_ROW_SELECTOR = '[aria-label="Service Workers"]';
  await click(SERVICE_WORKER_ROW_SELECTOR);
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

// TODO(crbug.com/1165710): remove after front_end/ui/ReportView.js removal
export async function getReportValues() {
  const fields = await $$('.report-field-value');
  return Promise.all(fields.map(node => node.evaluate(e => e.textContent)));
}

// TODO(crbug.com/1165710): rename after front_end/ui/ReportView.js removal
export async function getCustomComponentReportValues() {
  const fields = await $$('devtools-report-value');
  return Promise.all(fields.map(node => node.evaluate(e => {
    return (e.textContent || '')
        .trim()
        .replace(/\n/gm, ' ')    // replace new line character with space
        .replace(/\s+/gm, ' ');  // replace multiple spaces with single space
  })));
}

export async function getFrameTreeTitles() {
  const treeTitles = await $$('[aria-label="Resources Section"] ~ ol .tree-element-title');
  return Promise.all(treeTitles.map(node => node.evaluate(e => e.textContent)));
}

export async function getStorageItemsData(columns: string[]) {
  return getDataGridData('.storage-view table', columns);
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

    return tmp.asElement() || undefined;
  });
  cell.click();
}
