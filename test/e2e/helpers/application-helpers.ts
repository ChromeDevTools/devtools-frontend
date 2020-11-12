// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';

import {$, $$, click, goToResource, waitFor} from '../../shared/helper.js';

export async function navigateToApplicationTab(target: puppeteer.Page, testName: string) {
  await goToResource(`application/${testName}.html`);
  await click('#tab-resources');
  // Make sure the application navigation list is shown
  await waitFor('.storage-group-list-item');
}

export async function doubleClickSourceTreeItem(selector: string) {
  const element = await waitFor(selector);
  element.evaluate(el => el.scrollIntoView(true));
  await click(selector, {clickOptions: {clickCount: 2}});
}

export async function getDataGridData(selector: string, columns: string[]) {
  // Wait for Storage data-grid to show up
  await waitFor(selector);

  const dataGridNodes = await $$('.data-grid-data-grid-node');
  const dataGridRowValues = await Promise.all(dataGridNodes.map(node => node.evaluate((row: Element, columns) => {
    const data: {[key: string]: string|null} = {};
    for (const column of columns) {
      data[column] = row.querySelector(`.${column}-column`)!.textContent;
    }
    return data;
  }, columns)));

  return dataGridRowValues;
}

export async function getReportValues() {
  const fields = await $$('.report-field-value');
  return Promise.all(fields.map(node => node.evaluate(e => e.textContent)));
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
