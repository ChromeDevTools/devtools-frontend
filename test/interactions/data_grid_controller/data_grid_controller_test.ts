// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  assertSubMenuItemsText,
  assertTopLevelContextMenuItemsText,
  findSubMenuEntryItem,
  platformSpecificTextForSubMenuEntryItem,
} from '../../e2e/helpers/context-menu-helpers.js';
import {getDataGrid, getDataGridController, getInnerTextOfDataGridCells} from '../../e2e/helpers/datagrid-helpers.js';
import {$, $$, click, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../helpers/shared.js';

async function activateContextMenuOnColumnHeader(headerText: string) {
  const dataGridController = await getDataGridController();
  const dataGrid = await getDataGrid(dataGridController);
  return await click(`pierceShadowText/${headerText}`, {
    root: dataGrid,
    clickOptions: {
      button: 'right',
    },
  });
}

async function activateContextMenuOnBodyCell(cellText: string) {
  const dataGridController = await getDataGridController();
  const dataGrid = await getDataGrid(dataGridController);
  return await click(`pierceShadowText/${cellText}`, {
    root: dataGrid,
    clickOptions: {
      button: 'right',
    },
  });
}

async function waitForFirstBodyCellText(cellText: string) {
  await waitForFunction(async () => {
    const dataGrid = await getDataGrid();
    const firstBodyCell = await $<HTMLTableCellElement>('tbody td', dataGrid);
    const text = firstBodyCell && await firstBodyCell.evaluate(cell => cell.innerText);
    return text === cellText;
  });
}

describe('data grid controller', () => {
  preloadForCodeCoverage('data_grid_controller/basic.html');

  it('lets the user right click on a header to show the context menu', async () => {
    await loadComponentDocExample('data_grid_controller/basic.html');
    await activateContextMenuOnColumnHeader('Key');

    const contextMenu = await $('.soft-context-menu');
    assert.isNotNull(contextMenu);
    await assertTopLevelContextMenuItemsText(
        ['Value', platformSpecificTextForSubMenuEntryItem('Sort By'), 'Reset Columns']);
  });

  it('lists the hideable columns in the context menu and lets the user click to toggle the visibility', async () => {
    await loadComponentDocExample('data_grid_controller/basic.html');
    await activateContextMenuOnColumnHeader('Key');
    const contextMenu = await $('.soft-context-menu');
    assert.isNotNull(contextMenu);
    await click('[aria-label="Value, checked"]');
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
    const sortBy = await findSubMenuEntryItem('Sort By', true);
    await sortBy.hover();

    const keyColumnSort = await waitFor('[aria-label="Key"]');
    await keyColumnSort.click();
    await waitForFirstBodyCellText('Alpha');

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

  it('lets the user click on a column header to sort it', async () => {
    await loadComponentDocExample('data_grid_controller/basic.html');

    const dataGrid = await getDataGrid();

    // Wait until 3 rows have appeared.
    await getInnerTextOfDataGridCells(dataGrid, 3);

    // Sort and wait for the first row to be as expected.
    await click('th[data-grid-header-cell="key"]');
    await waitForFirstBodyCellText('Alpha');

    const renderedText = await getInnerTextOfDataGridCells(dataGrid, 3);
    assert.deepEqual(
        [
          ['Alpha', 'Letter A'],
          ['Bravo', 'Letter B'],
          ['Charlie', 'Letter C'],
        ],
        renderedText);
  });

  it('lists sort by and header options when right clicking on a body row', async () => {
    await loadComponentDocExample('data_grid_controller/basic.html');
    await activateContextMenuOnBodyCell('Bravo');

    await assertTopLevelContextMenuItemsText([
      platformSpecificTextForSubMenuEntryItem('Sort By'),
      platformSpecificTextForSubMenuEntryItem('Header Options'),
    ]);
    await assertSubMenuItemsText('Header Options', ['Value', 'Reset Columns']);
    await assertSubMenuItemsText('Sort By', ['Key', 'Value']);
  });

  it('allows the parent to add custom context menu items', async () => {
    await loadComponentDocExample('data_grid_controller/custom-context-menu-items.html');
    await activateContextMenuOnBodyCell('Bravo');
    await assertTopLevelContextMenuItemsText([
      platformSpecificTextForSubMenuEntryItem('Sort By'),
      platformSpecificTextForSubMenuEntryItem('Header Options'),
      'Hello World',
    ]);
  });
});
