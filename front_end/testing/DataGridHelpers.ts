// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as DataGrid from '../ui/components/data_grid/data_grid.js';
import * as Coordinator from '../ui/components/render_coordinator/render_coordinator.js';

import {
  assertElements,
  dispatchFocusEvent,
  dispatchKeyDownEvent,
  getElementWithinComponent,
} from './DOMHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
export const getFocusableCell = (shadowRoot: ShadowRoot) => {
  // We only expect one here, but we qSA so we can assert on only one.
  // Can't use td as it may be a th if the user has focused a column header.
  const tabIndexCells = shadowRoot.querySelectorAll('table [tabindex="0"]');
  assert.lengthOf(tabIndexCells, 1);
  assert.instanceOf(tabIndexCells[0], HTMLTableCellElement);
  return tabIndexCells[0];
};

export const getCellByIndexes = (shadowRoot: ShadowRoot, indexes: {column: number, row: number}) => {
  const cell = shadowRoot.querySelector<HTMLTableCellElement>(
      `[data-row-index="${indexes.row}"][data-col-index="${indexes.column}"]`);
  assert.instanceOf(cell, HTMLTableCellElement);
  return cell;
};

export const getHeaderCells = (shadowRoot: ShadowRoot, options: {onlyVisible: boolean} = {
  onlyVisible: false,
}) => {
  const cells = shadowRoot.querySelectorAll('[data-grid-header-cell]');
  assertElements(cells, HTMLTableCellElement);
  return Array.from(cells).filter(cell => {
    if (!options.onlyVisible) {
      return true;
    }

    return cell.classList.contains('hidden') === false;
  });
};

export const getValuesOfBodyRowByAriaIndex =
    (shadowRoot: ShadowRoot, ariaIndex: number, options: {onlyVisible: boolean} = {
      onlyVisible: false,
    }) => {
      const row = getBodyRowByAriaIndex(shadowRoot, ariaIndex);
      const cells = row.querySelectorAll('[data-grid-value-cell-for-column]');
      assertElements(cells, HTMLTableCellElement);
      return Array.from(cells)
          .filter(cell => {
            return !options.onlyVisible || cell.classList.contains('hidden') === false;
          })
          .map(cell => {
            return cell.innerText;
          });
    };

export const getAllRows = (shadowRoot: ShadowRoot) => {
  const rows = shadowRoot.querySelectorAll('[aria-rowindex]');
  assertElements(rows, HTMLTableRowElement);
  return Array.from(rows);
};

export const assertCurrentFocusedCellIs = (shadowRoot: ShadowRoot, {column, row}: {column: number, row: number}) => {
  const cell = getFocusableCell(shadowRoot);
  // Convert to strings as attributes are always strings.
  assert.strictEqual(cell.getAttribute('data-row-index'), String(row), 'The row index was not as expected.');
  assert.strictEqual(cell.getAttribute('data-col-index'), String(column), 'The column index was not as expected.');
};

export const assertSelectedRowIs = (shadowRoot: ShadowRoot, row: number) => {
  const selectedRow = shadowRoot.querySelector('tr.selected');
  assert.instanceOf(selectedRow, HTMLTableRowElement);
  assert.strictEqual(selectedRow.getAttribute('aria-rowindex'), String(row), 'The row index was not as expected.');
};

export const getDataGrid = (gridComponent: HTMLElement) => {
  const controller = getElementWithinComponent(
      gridComponent, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  return getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
};

export const assertGridContents = (gridComponent: HTMLElement, headerExpected: string[], rowsExpected: string[][]) => {
  const grid = getDataGrid(gridComponent);
  assert.isNotNull(grid.shadowRoot);

  const headerActual = getHeaderCells(grid.shadowRoot).map(({textContent}) => textContent!.trim());
  assert.deepEqual(headerActual, headerExpected);

  const rowsActual = getValuesOfAllBodyRows(grid.shadowRoot).map(row => row.map(cell => cell.trim()));
  assert.deepEqual(rowsActual, rowsExpected);

  return grid;
};

export const focusCurrentlyFocusableCell = (shadowRoot: ShadowRoot) => {
  const cell = getFocusableCell(shadowRoot);
  dispatchFocusEvent(cell);
};

export const emulateUserKeyboardNavigation =
    (shadowRoot: ShadowRoot, key: 'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown') => {
      const table = shadowRoot.querySelector('table');
      assert.instanceOf(table, HTMLTableElement);
      dispatchKeyDownEvent(table, {key});
    };

export const emulateUserFocusingCellAt = async (shadowRoot: ShadowRoot, position: {column: number, row: number}) => {
  const cellToFocus = getCellByIndexes(shadowRoot, position);
  dispatchFocusEvent(cellToFocus);
  await coordinator.done();
  assertCurrentFocusedCellIs(shadowRoot, position);
};

export const getValuesOfAllBodyRows = (shadowRoot: ShadowRoot, options: {onlyVisible: boolean} = {
  onlyVisible: false,
}) => {
  const rows = getAllRows(shadowRoot);
  return rows
      .map(row => {
        // now decide if the row should be included or not
        const rowIsHidden = row.classList.contains('hidden');
        const rowIndex = window.parseInt(row.getAttribute('aria-rowindex') || '-1', 10);
        return {
          rowValues: getValuesOfBodyRowByAriaIndex(shadowRoot, rowIndex, options),
          hidden: options.onlyVisible && rowIsHidden,
        };
      })
      .filter(row => row.hidden === false)
      .map(r => r.rowValues);
};

export const getBodyRowByAriaIndex = (shadowRoot: ShadowRoot, rowIndex: number) => {
  const row = shadowRoot.querySelector(`[aria-rowindex="${rowIndex}"]`);
  assert.instanceOf(row, HTMLTableRowElement);
  return row;
};

export const getHeaderCellForColumnId = (shadowRoot: ShadowRoot, columnId: string) => {
  const cell = shadowRoot.querySelector(`[data-grid-header-cell="${columnId}`);
  assert.instanceOf(cell, HTMLTableCellElement);
  return cell;
};

export const getValuesForColumn = (shadowRoot: ShadowRoot, columnId: string) => {
  const cells = shadowRoot.querySelectorAll(`[data-grid-value-cell-for-column=${columnId}]`);
  assertElements(cells, HTMLTableCellElement);
  return Array.from(cells, cell => cell.innerText);
};
