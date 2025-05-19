// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertElements,
  dispatchKeyDownEvent,
} from './DOMHelpers.js';

export const getFocusableCell = (node: ParentNode) => {
  // We only expect one here, but we qSA so we can assert on only one.
  // Can't use td as it may be a th if the user has focused a column header.
  const tabIndexCells = node.querySelectorAll('table [tabindex="0"]');
  assert.lengthOf(tabIndexCells, 1);
  assert.instanceOf(tabIndexCells[0], HTMLTableCellElement);
  return tabIndexCells[0];
};

export const getCellByIndexes = (node: ParentNode, indexes: {column: number, row: number}) => {
  const cell =
      node.querySelector<HTMLTableCellElement>(`tr:nth-child(${indexes.row + 1}) td:nth-child(${indexes.column + 1})`);
  assert.instanceOf(cell, HTMLTableCellElement);
  return cell;
};

export const getHeaderCells = (node: ParentNode, options: {onlyVisible: boolean} = {
  onlyVisible: false,
}) => {
  const cells = node.querySelectorAll('th[jslog]');
  assertElements(cells, HTMLTableCellElement);
  return Array.from(cells).filter(cell => {
    if (!options.onlyVisible) {
      return true;
    }

    return cell.classList.contains('hidden') === false;
  });
};

export const getAllRows = (node: ParentNode) => {
  const rows = node.querySelectorAll('tbody tr[jslog]');
  assertElements(rows, HTMLTableRowElement);
  return Array.from(rows);
};

export const assertGridContents = (gridComponent: HTMLElement, headerExpected: string[], rowsExpected: string[][]) => {
  const grid = gridComponent.shadowRoot?.querySelector('devtools-data-grid')!;
  assert.isNotNull(grid.shadowRoot);

  const headerActual = getHeaderCells(grid.shadowRoot).map(({textContent}) => textContent!.trim());
  assert.deepEqual(headerActual, headerExpected);

  const rowsActual = getValuesOfAllBodyRows(grid.shadowRoot).map(row => row.map(cell => cell.trim()));
  assert.deepEqual(rowsActual, rowsExpected);

  return grid;
};

export const emulateUserKeyboardNavigation =
    (shadowRoot: ShadowRoot, key: 'ArrowLeft'|'ArrowRight'|'ArrowUp'|'ArrowDown') => {
      const table = shadowRoot.querySelector('table');
      assert.instanceOf(table, HTMLTableElement);
      dispatchKeyDownEvent(table, {key});
    };

export const getValuesOfAllBodyRows = (node: ParentNode, options: {onlyVisible: boolean} = {
  onlyVisible: false,
}) => {
  const rows = getAllRows(node);
  return rows
      .map(row => {
        // now decide if the row should be included or not
        const rowIsHidden = row.classList.contains('hidden');
        return {
          rowValues: [...row.querySelectorAll('td[jslog]')]
                         .filter(cell => !options.onlyVisible || !cell.classList.contains('hidden'))
                         .map(cell => (cell as HTMLTableCellElement).innerText.trim()),
          hidden: options.onlyVisible && rowIsHidden,
        };
      })
      .filter(row => row.hidden === false)
      .map(r => r.rowValues);
};
