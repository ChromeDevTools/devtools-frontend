// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type {ElementHandle} from 'puppeteer-core';

import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import {getBrowserAndPagesWrappers} from '../../shared/non_hosted_wrappers.js';

export async function getDataGridRows(
    expectedNumberOfRows: number, root?: ElementHandle<Node>, matchExactNumberOfRows = true,
    devToolsPage: DevToolsPage =
        getBrowserAndPagesWrappers().devToolsPage): Promise<Array<Array<ElementHandle<HTMLTableCellElement>>>> {
  const dataGrid = !root ? await devToolsPage.waitFor('devtools-data-grid') : root;
  const handlers = await (async () => {
    if (matchExactNumberOfRows) {
      return await devToolsPage.waitForFunction(async () => {
        const rows = await devToolsPage.$$('tbody > tr[jslog]:not(.hidden)', dataGrid);
        return rows.length === expectedNumberOfRows ? rows : undefined;
      });
    }
    return await devToolsPage.waitForFunction(async () => {
      const rows = await devToolsPage.$$('tbody > tr[jslog]:not(.hidden)', dataGrid);
      return rows.length >= expectedNumberOfRows ? rows : undefined;
    });
  })();

  return await Promise.all(handlers.map(handler => devToolsPage.$$('td[jslog]:not(.hidden)', handler)));
}

export async function getDataGridColumnNames(
    root?: ElementHandle<Node>,
    devToolsPage: DevToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<String[]> {
  const columnNames: String[] = [];
  const dataGrid = !root ? await devToolsPage.waitFor('devtools-data-grid') : root;

  const columnNodes = await dataGrid.$$('pierce/[role="columnheader"]');
  for (const column of columnNodes) {
    const text = await column.evaluate(x => {
      return (x as HTMLElement).innerText || '';
    });
    columnNames.push(text);
  }

  return columnNames;
}

export async function getDataGrid(root?: ElementHandle, devToolsPage = getBrowserAndPagesWrappers().devToolsPage) {
  const dataGrid = await devToolsPage.waitFor('devtools-data-grid', root);
  if (!dataGrid) {
    assert.fail('Could not find data-grid');
  }
  await devToolsPage.waitForFunction(async () => {
    const height = await dataGrid.evaluate(elem => elem.clientHeight);
    // Give it a chance to fully render into the page.
    return height > 20;
  }, undefined, 'Ensuring the data grid has a minimum height of 20px');
  return dataGrid;
}

export async function getInnerTextOfDataGridCells(
    dataGridElement: ElementHandle<Element>, expectedNumberOfRows: number, matchExactNumberOfRows = true,
    devToolsPage = getBrowserAndPagesWrappers().devToolsPage): Promise<string[][]> {
  const gridRows = await getDataGridRows(expectedNumberOfRows, dataGridElement, matchExactNumberOfRows, devToolsPage);
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
