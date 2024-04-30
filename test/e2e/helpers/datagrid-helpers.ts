// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {type ElementHandle} from 'puppeteer-core';

import {$, $$, getBrowserAndPages, waitFor, waitForFunction} from '../../shared/helper.js';

export async function getDataGridRows(
    expectedNumberOfRows: number, root?: ElementHandle<Node>,
    matchExactNumberOfRows: boolean = true): Promise<ElementHandle<HTMLTableCellElement>[][]> {
  const dataGrid = !root ? await waitFor('devtools-data-grid') : root;
  const handlers = await (async () => {
    if (matchExactNumberOfRows) {
      return await waitForFunction(async () => {
        const rows = await $$('tbody > tr:not(.padding-row):not(.hidden)', dataGrid);
        return rows.length === expectedNumberOfRows ? rows : undefined;
      });
    }
    return await waitForFunction(async () => {
      const rows = await $$('tbody > tr:not(.padding-row):not(.hidden)', dataGrid);
      return rows.length >= expectedNumberOfRows ? rows : undefined;
    });
  })();

  return Promise.all(handlers.map(handler => $$<HTMLTableCellElement>('td[data-row-index]:not(.hidden)', handler)));
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

export async function getDataGridController() {
  const dataGrid = await waitFor('devtools-data-grid-controller');
  if (!dataGrid) {
    assert.fail('Could not find data-grid-controller');
  }
  return dataGrid;
}

export async function getInnerTextOfDataGridCells(
    dataGridElement: ElementHandle<Element>, expectedNumberOfRows: number,
    matchExactNumberOfRows: boolean = true): Promise<string[][]> {
  const gridRows = await getDataGridRows(expectedNumberOfRows, dataGridElement, matchExactNumberOfRows);
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
export async function getDataGridScrollTop(dataGrid: ElementHandle) {
  const wrappingContainer = await $('.wrapping-container', dataGrid);
  if (!wrappingContainer) {
    throw new Error('Could not find wrapping container.');
  }
  return await wrappingContainer.evaluate((elem: Element) => {
    return elem.scrollTop;
  });
}

export async function assertDataGridNotScrolled(dataGrid: ElementHandle) {
  const scrollTop = await getDataGridScrollTop(dataGrid);
  assert.strictEqual(scrollTop, 0, 'The data-grid did not have 0 scrollTop');
}

export async function waitForScrollTopOfDataGrid(dataGrid: ElementHandle, targetTop: number): Promise<boolean> {
  return waitForFunction(async () => {
    const scrollTop = await getDataGridScrollTop(dataGrid);
    // Allow for a few pixels either side
    return scrollTop >= targetTop - 5 && scrollTop <= targetTop + 5;
  });
}

export async function scrollDataGridDown(dataGrid: ElementHandle, targetDown: number): Promise<void> {
  const scrollWrapper = await $('.wrapping-container', dataGrid);
  if (!scrollWrapper) {
    throw new Error('Could not find wrapping container.');
  }
  const wrappingBox = await scrollWrapper.boundingBox();
  if (!wrappingBox) {
    throw new Error('Wrapping box did not have a bounding box.');
  }
  const {frontend} = getBrowserAndPages();
  // +20 to move from the top left point so we are definitely scrolling
  // within the container
  await frontend.mouse.move(wrappingBox.x + 20, wrappingBox.y + 20);
  await frontend.mouse.wheel({deltaY: targetDown});
  await waitForScrollTopOfDataGrid(dataGrid, targetDown);
}
