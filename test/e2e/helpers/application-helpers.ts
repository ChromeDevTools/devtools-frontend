// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as puppeteer from 'puppeteer';

import {$$, click, goToResource, waitFor} from '../../shared/helper.js';

export async function navigateToApplicationTab(target: puppeteer.Page, testName: string) {
  await goToResource(`application/${testName}.html`);
  await click('#tab-resources');
  // Make sure the application navigation list is shown
  await waitFor('.storage-group-list-item');
}

export async function doubleClickSourceTreeItem(selector: string) {
  await waitFor(selector);
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
