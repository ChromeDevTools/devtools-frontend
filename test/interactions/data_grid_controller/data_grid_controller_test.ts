// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getDataGrid, getDataGridController, getInnerTextOfDataGridCells} from '../../e2e/helpers/datagrid-helpers.js';
import {$, $$, $textContent, click, waitFor, waitForFunction} from '../../shared/helper.js';
import {loadComponentDocExample} from '../helpers/shared.js';

async function activateContextMenuOnColumnHeader(headerText: string) {
  const dataGridController = await getDataGridController();
  const dataGrid = await getDataGrid(dataGridController);
  const headerCell = await $textContent(headerText, dataGrid);
  if (!headerCell) {
    assert.fail(`Could not find header cell with text ${headerText}`);
  }
  await click(headerCell, {
    clickOptions: {
      button: 'right',
    },
  });
  return headerCell;
}


describe('data grid controller', () => {
  it('lets the user right click on a header to show the context menu', async () => {
    await loadComponentDocExample('data_grid_controller/basic.html');
    await activateContextMenuOnColumnHeader('Key');

    const contextMenu = await $('.soft-context-menu');
    assert.isNotNull(contextMenu);
  });

  it('lists the hideable columns in the context menu and lets the user click to toggle the visibility', async () => {
    await loadComponentDocExample('data_grid_controller/basic.html');
    await activateContextMenuOnColumnHeader('Key');
    const contextMenu = await $('.soft-context-menu');
    assert.isNotNull(contextMenu);
    const valueColumnOption = await $('[aria-label="Value, checked"]');
    if (!valueColumnOption) {
      assert.fail('Could not find Value column in context menu.');
    }
    await click(valueColumnOption);
    const dataGrid = await getDataGrid();

    await waitForFunction(async () => {
      const hiddenCells = await $$('tbody td.hidden', dataGrid);
      return hiddenCells.length === 3;
    });

    const renderedText = await getInnerTextOfDataGridCells(dataGrid, 3);
    assert.deepEqual(
        [
          ['Bravo'],
          ['Alpha'],
          ['Charlie'],
        ],
        renderedText);
  });

  it('lists sortable columns in a sub-menu and lets the user click to sort', async () => {
    await loadComponentDocExample('data_grid_controller/basic.html');
    await activateContextMenuOnColumnHeader('Key');
    const contextMenu = await $('.soft-context-menu');
    if (!contextMenu) {
      assert.fail('Could not find context menu.');
    }
    const sortBy = await $textContent('Sort By');
    if (!sortBy) {
      assert.fail('Could not find sort by option on context menu');
    }
    await sortBy.hover();

    const keyColumnSort = await waitFor('[aria-label="Key"]');
    await keyColumnSort.click();

    await waitForFunction(async () => {
      const dataGrid = await getDataGrid();
      const firstBodyCell = await $('tbody td', dataGrid);
      const text = firstBodyCell && await firstBodyCell.evaluate(cell => (cell as HTMLElement).innerText);
      return text === 'Alpha';
    });

    const dataGrid = await getDataGrid();
    const renderedText = await getInnerTextOfDataGridCells(dataGrid, 3);
    assert.deepEqual(
        [
          ['Alpha', 'Letter A'],
          ['Bravo', 'Letter B'],
          ['Charlie', 'Letter C'],
        ],
        renderedText);
  });
});
