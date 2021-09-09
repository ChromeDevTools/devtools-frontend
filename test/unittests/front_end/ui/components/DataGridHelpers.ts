// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertElement, assertElements, dispatchFocusEvent, dispatchKeyDownEvent} from '../../helpers/DOMHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
const {assert} = chai;

export const getFocusableCell = (shadowRoot: ShadowRoot) => {
  // We only expect one here, but we qSA so we can assert on only one.
  // Can't use td as it may be a th if the user has focused a column header.
  const tabIndexCells = shadowRoot.querySelectorAll('table [tabindex="0"]');
  assertElements(tabIndexCells, HTMLTableCellElement);
  assert.lengthOf(tabIndexCells, 1);
  return tabIndexCells[0];
};

export const getCellByIndexes = (shadowRoot: ShadowRoot, indexes: {column: number, row: number}) => {
  const cell = shadowRoot.querySelector<HTMLTableCellElement>(
      `[data-row-index="${indexes.row}"][data-col-index="${indexes.column}"]`);
  assertElement(cell, HTMLTableCellElement);
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
    }): string[] => {
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

export const getAllRows = (shadowRoot: ShadowRoot): HTMLTableRowElement[] => {
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
  assertElement(selectedRow, HTMLTableRowElement);
  assert.strictEqual(selectedRow.getAttribute('aria-rowindex'), String(row), 'The row index was not as expected.');
};

export const focusCurrentlyFocusableCell = (shadowRoot: ShadowRoot) => {
  const cell = getFocusableCell(shadowRoot);
  dispatchFocusEvent(cell);
};

export const emulateUserKeyboardNavigation =
    (shadowRoot: ShadowRoot, key: 'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown') => {
      const table = shadowRoot.querySelector('table');
      assertElement(table, HTMLTableElement);
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
}): string[][] => {
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

export const getBodyRowByAriaIndex = (shadowRoot: ShadowRoot, rowIndex: number): HTMLTableRowElement => {
  const row = shadowRoot.querySelector(`[aria-rowindex="${rowIndex}"]`);
  assertElement(row, HTMLTableRowElement);
  return row;
};

export const getHeaderCellForColumnId = (shadowRoot: ShadowRoot, columnId: string): HTMLTableCellElement => {
  const cell = shadowRoot.querySelector(`[data-grid-header-cell="${columnId}`);
  assertElement(cell, HTMLTableCellElement);
  return cell;
};

export const getValuesForColumn = (shadowRoot: ShadowRoot, columnId: string): string[] => {
  const cells = shadowRoot.querySelectorAll(`[data-grid-value-cell-for-column=${columnId}]`);
  assertElements(cells, HTMLTableCellElement);
  return Array.from(cells, cell => cell.innerText);
};
