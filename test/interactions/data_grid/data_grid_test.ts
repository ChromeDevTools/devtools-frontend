// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getDataGrid, getDataGridCellAtIndex, getDataGridRows, getInnerTextOfDataGridCells} from '../../e2e/helpers/datagrid-helpers.js';
import {$, $$, getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {loadComponentDocExample} from '../helpers/shared.js';

import type {ElementHandle} from 'puppeteer';

function assertNumberBetween(number: number, min: number, max: number) {
  assert.isAbove(number, min);
  assert.isBelow(number, max);
}

async function clickAndDragResizeHandlerHorizontally(handler: ElementHandle<Element>, mouseXChange: number) {
  const position = await handler.evaluate(handler => {
    return {
      x: handler.getBoundingClientRect().x,
      y: handler.getBoundingClientRect().y,
    };
  });
  const {frontend} = getBrowserAndPages();
  await frontend.mouse.move(position.x, position.y);
  await frontend.mouse.down();
  await frontend.mouse.move(position.x + mouseXChange, position.y);
}


async function getColumnPixelWidths(columns: ElementHandle<Element>[]) {
  return Promise.all(columns.map(col => {
    return col.evaluate(cell => cell.clientWidth);
  }));
}

async function getColumnPercentageWidths(dataGrid: ElementHandle<Element>) {
  const cols = await $$('col', dataGrid);
  return Promise.all(cols.map(col => {
    return col.evaluate(cell => window.parseInt((cell as HTMLElement).style.width, 10));
  }));
}

describe('data grid', () => {
  it('lists the data grid contents', async () => {
    await loadComponentDocExample('data_grid/basic.html');
    const dataGrid = await getDataGrid();
    const renderedText = await getInnerTextOfDataGridCells(dataGrid, 3);
    assert.deepEqual(
        [
          ['Bravo', 'Letter B'],
          ['Alpha', 'Letter A'],
          ['Charlie', 'Letter C'],
        ],
        renderedText);
  });

  it('can resize two columns', async () => {
    await loadComponentDocExample('data_grid/basic.html');
    const dataGrid = await getDataGrid();
    await waitFor('.cell-resize-handle', dataGrid);
    await getDataGridRows(3, dataGrid);
    const firstResizeHandler = await $('.cell-resize-handle', dataGrid);
    if (!firstResizeHandler) {
      assert.fail('Could not find resizeHandler');
    }
    const columns = [
      await getDataGridCellAtIndex(dataGrid, {row: 1, column: 0}),
      await getDataGridCellAtIndex(dataGrid, {row: 1, column: 1}),
    ];

    let columnWidths = await getColumnPixelWidths(columns);
    assertNumberBetween(columnWidths[0], 500, 510);
    assertNumberBetween(columnWidths[1], 500, 510);

    await clickAndDragResizeHandlerHorizontally(firstResizeHandler, -50);
    columnWidths = await getColumnPixelWidths(columns);
    assertNumberBetween(columnWidths[0], 450, 460);
    assertNumberBetween(columnWidths[1], 550, 560);
  });

  it('can resize two columns in a grid of 3 and leave the other column untouched', async () => {
    await loadComponentDocExample('data_grid/three_columns.html');
    const dataGrid = await getDataGrid();
    await waitFor('.cell-resize-handle', dataGrid);
    await getDataGridRows(3, dataGrid);
    const firstResizeHandler = await $('.cell-resize-handle', dataGrid);
    if (!firstResizeHandler) {
      assert.fail('Could not find resizeHandler');
    }

    const columns = [
      await getDataGridCellAtIndex(dataGrid, {row: 1, column: 0}),
      await getDataGridCellAtIndex(dataGrid, {row: 1, column: 1}),
      await getDataGridCellAtIndex(dataGrid, {row: 1, column: 2}),
    ];

    let columnWidths = await getColumnPixelWidths(columns);

    // The container is 900px wide so we expect each column to be ~300
    assertNumberBetween(columnWidths[0], 295, 305);
    assertNumberBetween(columnWidths[1], 295, 305);
    assertNumberBetween(columnWidths[2], 295, 305);

    await clickAndDragResizeHandlerHorizontally(firstResizeHandler, -100);
    /* The resize calculation is roughly as follows
     * mouse delta = 100px (-100, but we Math.abs it)
     * delta as a % = (100 / (leftCellWidth + rightCellWidth)) * 100
     * % delta = (100 / 300 + 300) * 100
     * % delta = 16.6%
     * therefore left column % = -16.6%
     * and right column % = + 16.6%
     */
    const newColumnPercentageWidths = await getColumnPercentageWidths(dataGrid);
    assert.deepEqual(
        [
          16,  // 33 - 16.6 rounded
          50,  // 33 + 16.6 rounded
          33,  // left alone
        ],
        newColumnPercentageWidths);
    columnWidths = await getColumnPixelWidths(columns);
    assertNumberBetween(columnWidths[0], 143, 148);  // 16% of 900 = 144
    assertNumberBetween(columnWidths[1], 447, 454);  // 50% of 900 = 450
    assertNumberBetween(columnWidths[2], 297, 304);  // 33% of 900 = 300
  });
});
