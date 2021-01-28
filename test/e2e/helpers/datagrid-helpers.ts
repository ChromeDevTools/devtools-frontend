// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ElementHandle} from 'puppeteer';
import {$, $$, waitFor, waitForFunction} from '../../shared/helper.js';

export async function getDataGridRows(
    expectedNumberOfRows: number, root?: ElementHandle<Element>): Promise<ElementHandle<Element>[][]> {
  const dataGrid = await waitFor('devtools-data-grid', root);
  const rowsSelector = 'tbody > tr:not(.padding-row):not(.hidden)';
  const rowsHandler = await waitForFunction(async () => {
    const rows = (await $$(rowsSelector, dataGrid));
    return (rows.length === expectedNumberOfRows) ? rows : undefined;
  });

  const tableElements = [];
  for (const rowHandler of rowsHandler) {
    const cells = await $$('td[data-row-index]:not(.hidden)', rowHandler);
    tableElements.push(cells);
  }
  return tableElements;
}

export async function getDataGrid(root?: ElementHandle) {
  const dataGrid = await waitFor('devtools-data-grid', root);
  if (!dataGrid) {
    assert.fail('Could not find data-grid');
  }
  return dataGrid;
}

export async function getDataGridController() {
  const dataGrid = await waitFor('devtools-data-grid-controller');
  if (!dataGrid) {
    assert.fail('Could not find data-grid-controller');
  }
  return dataGrid;
}


export async function getInnerTextOfDataGridCells(
    dataGridElement: ElementHandle<Element>, expectedNumberOfRows: number): Promise<string[][]> {
  const gridRows = await getDataGridRows(expectedNumberOfRows, dataGridElement);
  const table: Array<Array<string>> = [];
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
export async function getDataGridCellAtIndex(
    dataGrid: ElementHandle<Element>, position: {row: number, column: number}) {
  const cell = await $(`td[data-row-index="${position.row}"][data-col-index="${position.column}"]`, dataGrid);
  if (!cell) {
    assert.fail(`Could not load column at position ${JSON.stringify(position)}`);
  }
  return cell;
}

export async function getDataGridFillerCellAtColumnIndex(dataGrid: ElementHandle<Element>, columnIndex: number) {
  const cell = await $(`tr.filler-row > td[data-filler-row-column-index="${columnIndex}"]`, dataGrid);
  if (!cell) {
    assert.fail(`Could not load filler column at position ${columnIndex}`);
  }
  return cell;
}
