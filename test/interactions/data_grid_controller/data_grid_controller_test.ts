// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer';
import {getDataGrid, getDataGridController, getInnerTextOfDataGridCells} from '../../e2e/helpers/datagrid-helpers.js';
import {$, $$, $textContent, click, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../helpers/shared.js';
import {platform} from '../../shared/helper.js';

function platformSpecificTextForSubMenuEntryItem(text: string): string {
  /**
   * On Mac the context menu adds the ▶ icon to the sub menu entry points in the
   * context menu, but on Linux/Windows it uses an image. So if we're running on
   * Mac, we append the search text with the icon, else we do not.
   */
  return platform === 'mac' ? `${text}▶` : text;
}

async function assertTopLevelContextMenuItemsText(expectedOptions: string[]): Promise<void> {
  const contextMenu = await $('.soft-context-menu');
  if (!contextMenu) {
    assert.fail('Could not find context menu.');
  }

  const allItems = await $$('.soft-context-menu > .soft-context-menu-item');
  const allItemsText = await Promise.all(allItems.map(item => item.evaluate(div => div.textContent)));

  assert.deepEqual(allItemsText, expectedOptions);
}

async function assertSubMenuItemsText(subMenuText: string, expectedOptions: string[]): Promise<void> {
  const subMenuEntryItem = await findSubMenuEntryItem(subMenuText);
  if (!subMenuEntryItem) {
    const allItems = await $$('.soft-context-menu > .soft-context-menu-item');
    const allItemsText = await Promise.all(allItems.map(item => item.evaluate(div => div.textContent)));
    assert.fail(`Could not find "${subMenuText}" option on context menu. Found items: ${allItemsText.join(' | ')}`);
    return;
  }

  await subMenuEntryItem.hover();
  await waitForFunction(async () => {
    const menus = await $$('.soft-context-menu');
    // Wait for the main menu + the sub menu to be in the DOM
    return menus.length === 2;
  });
  const allMenus = await $$('.soft-context-menu');
  // Each submenu is rendered as a separate context menu and is appended to
  // the DOM after the main context menu, hence the array index.
  const subMenuElement = allMenus[1];
  if (!subMenuElement) {
    assert.fail(`Could not find sub menu for ${subMenuText}`);
  }
  const subMenuItems = await $$('.soft-context-menu-item', subMenuElement);
  const subMenuItemsText = await Promise.all(subMenuItems.map(item => item.evaluate(div => div.textContent)));
  assert.deepEqual(subMenuItemsText, expectedOptions);
}

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
  const textToSearchFor = platformSpecificTextForSubMenuEntryItem(text);
  const matchingElement = await $textContent(textToSearchFor);

  if (!matchingElement) {
    const allItems = await $$('.soft-context-menu > .soft-context-menu-item');
    const allItemsText = await Promise.all(allItems.map(item => item.evaluate(div => div.textContent)));
    assert.fail(`Could not find "${text}" option on context menu. Found items: ${allItemsText.join(' | ')}`);
  }
  return matchingElement;
}
async function activateContextMenuOnBodyCell(cellText: string) {
  const dataGridController = await getDataGridController();
  const dataGrid = await getDataGrid(dataGridController);
  const headerCell = await $textContent(cellText, dataGrid);
  if (!headerCell) {
    assert.fail(`Could not find body cell with text ${cellText}`);
  }
  await click(headerCell, {
    clickOptions: {
      button: 'right',
    },
  });
  return headerCell;
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
