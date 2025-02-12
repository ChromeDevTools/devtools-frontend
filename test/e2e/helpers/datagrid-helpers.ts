// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import {$$, waitFor, waitForFunction} from '../../shared/helper.js';

export async function getDataGridRows(
    expectedNumberOfRows: number, root?: ElementHandle<Node>,
    matchExactNumberOfRows: boolean = true): Promise<Array<Array<ElementHandle<HTMLTableCellElement>>>> {
  const dataGrid = !root ? await waitFor('devtools-data-grid') : root;
  const handlers = await (async () => {
    if (matchExactNumberOfRows) {
      return await waitForFunction(async () => {
        const rows = await $$('tbody > tr[jslog]:not(.hidden)', dataGrid);
        return rows.length === expectedNumberOfRows ? rows : undefined;
      });
    }
    return await waitForFunction(async () => {
      const rows = await $$('tbody > tr[jslog]:not(.hidden)', dataGrid);
      return rows.length >= expectedNumberOfRows ? rows : undefined;
    });
  })();

  return Promise.all(handlers.map(handler => $$<HTMLTableCellElement>('td[jslog]:not(.hidden)', handler)));
}

export async function getDataGrid(root?: ElementHandle) {
  const dataGrid = await waitFor('devtools-data-grid', root);
  if (!dataGrid) {
    assert.fail('Could not find data-grid');
  }
  await waitForFunction(async () => {
    const height = await dataGrid.evaluate(elem => elem.clientHeight);
    // Give it a chance to fully render into the page.
    return height > 20;
  }, undefined, 'Ensuring the data grid has a minimum height of 20px');
  return dataGrid;
}

export async function getInnerTextOfDataGridCells(
    dataGridElement: ElementHandle<Element>, expectedNumberOfRows: number,
    matchExactNumberOfRows: boolean = true): Promise<string[][]> {
  const gridRows = await getDataGridRows(expectedNumberOfRows, dataGridElement, matchExactNumberOfRows);
  const table: string[][] = [];
  for (const row of gridRows) {
    const textRow = [];
    for (const cell of row.values()) {
      const text = await cell.evaluate(x => {
        return (x as HTMLElement).innerText || '';
      });
      textRow.push(text);
    }
    table.push(textRow);
  }
  return table;
}
