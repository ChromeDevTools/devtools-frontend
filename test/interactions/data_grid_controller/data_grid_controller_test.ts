// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer';
import {getDataGrid, getDataGridController, getInnerTextOfDataGridCells} from '../../e2e/helpers/datagrid-helpers.js';
import {$, $$, $textContent, click, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {loadComponentDocExample} from '../helpers/shared.js';
import {platform} from '../../shared/helper.js';

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

async function findSubMenuEntryItem(text: string): Promise<puppeteer.ElementHandle<Element>> {
  /**
   * On Mac the context menu adds the ▶ icon to the sub menu entry points in the
   * context menu, but on Linux/Windows it uses an image. So we search for
   * textContent with and without the ▶ symbol to find the match regardless of
   * the platform the tests are running on.
   */
  const textToSearchFor = platform === 'mac' ? `${text}▶` : text;
  const matchingElement = await $textContent(textToSearchFor);

  if (!matchingElement) {
    const allItems = await $$('.soft-context-menu > .soft-context-menu-item');
    const allItemsText = await Promise.all(allItems.map(item => item.evaluate(div => div.textContent)));
    assert.fail(`Could not find "${text}" option on context menu. Found items: ${allItemsText.join(' | ')}`);
  }
  return matchingElement;
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
    const sortBy = await findSubMenuEntryItem('Sort By');
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
