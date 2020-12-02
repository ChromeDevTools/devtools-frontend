// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ElementHandle} from 'puppeteer';
import {$$, waitFor, waitForFunction} from '../../shared/helper.js';

export async function getDataGridRows(
    expectedNumberOfRows: number, root?: ElementHandle<Element>): Promise<ElementHandle<Element>[][]> {
  const dataGrid = await waitFor('devtools-data-grid', root);
  const rowsSelector = 'tbody > tr:not(.filler-row):not(.hidden)';
  const rowsHandler = await waitForFunction(async () => {
    const rows = (await $$(rowsSelector, dataGrid));
    return (rows.length === expectedNumberOfRows) ? rows : undefined;
  });

  const tableElements = [];
  for (const rowHandler of rowsHandler) {
    const cells = await $$('td[data-row-index]', rowHandler);
    tableElements.push(cells);
  }
  return tableElements;
}
