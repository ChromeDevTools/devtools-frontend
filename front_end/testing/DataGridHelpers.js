// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { assertElements, dispatchKeyDownEvent, } from './DOMHelpers.js';
export const getFocusableCell = (node) => {
    // We only expect one here, but we qSA so we can assert on only one.
    // Can't use td as it may be a th if the user has focused a column header.
    const tabIndexCells = node.querySelectorAll('table [tabindex="0"]');
    assert.lengthOf(tabIndexCells, 1);
    assert.instanceOf(tabIndexCells[0], HTMLTableCellElement);
    return tabIndexCells[0];
};
export const getCellByIndexes = (node, indexes) => {
    const cell = node.querySelector(`tr:nth-child(${indexes.row + 1}) td:nth-child(${indexes.column + 1})`);
    assert.instanceOf(cell, HTMLTableCellElement);
    return cell;
};
export const getHeaderCells = (node, options = {
    onlyVisible: false,
    withJslog: true,
}) => {
    const querySelector = options.withJslog ? 'th[jslog]' : 'th';
    const cells = node.querySelectorAll(querySelector);
    assertElements(cells, HTMLTableCellElement);
    return Array.from(cells).filter(cell => {
        if (!options.onlyVisible) {
            return true;
        }
        return cell.classList.contains('hidden') === false;
    });
};
export const getAllRows = (node, options = {
    withJslog: true
}) => {
    const querySelector = options.withJslog ? 'tbody tr[jslog]' : 'tbody tr';
    const rows = node.querySelectorAll(querySelector);
    assertElements(rows, HTMLTableRowElement);
    return Array.from(rows);
};
export const assertGridContents = (gridComponent, headerExpected, rowsExpected) => {
    const grid = gridComponent.shadowRoot?.querySelector('devtools-data-grid');
    assert.isNotNull(grid.shadowRoot);
    const headerActual = getHeaderCells(grid.shadowRoot).map(({ textContent }) => textContent.trim());
    assert.deepEqual(headerActual, headerExpected);
    const rowsActual = getValuesOfAllBodyRows(grid.shadowRoot).map(row => row.map(cell => cell.trim()));
    assert.deepEqual(rowsActual, rowsExpected);
    return grid;
};
export const assertGridWidgetContents = (gridComponent, headerExpected, rowsExpected) => {
    const grid = gridComponent.querySelector('devtools-data-grid');
    const headerActual = getHeaderCells(grid, { onlyVisible: false, withJslog: false }).map(({ textContent }) => textContent.trim());
    assert.deepEqual(headerActual, headerExpected);
    const rowsActual = getValuesOfAllBodyRows(grid, { onlyVisible: false, withJslog: false })
        .filter(row => row.length !== 0)
        .map(row => row.map(cell => cell.trim()));
    assert.deepEqual(rowsActual, rowsExpected);
    return grid;
};
export const emulateUserKeyboardNavigation = (shadowRoot, key) => {
    const table = shadowRoot.querySelector('table');
    assert.instanceOf(table, HTMLTableElement);
    dispatchKeyDownEvent(table, { key });
};
export const getValuesOfAllBodyRows = (node, options = {
    onlyVisible: false,
    withJslog: true,
}) => {
    const rows = getAllRows(node, { withJslog: options.withJslog });
    return rows
        .map(row => {
        // now decide if the row should be included or not
        const rowIsHidden = row.classList.contains('hidden');
        const querySelector = options.withJslog ? 'td[jslog]' : 'td';
        return {
            rowValues: [...row.querySelectorAll(querySelector)]
                .filter(cell => !options.onlyVisible || !cell.classList.contains('hidden'))
                .map(cell => cell.innerText.trim()),
            hidden: options.onlyVisible && rowIsHidden,
        };
    })
        .filter(row => row.hidden === false)
        .map(r => r.rowValues);
};
//# sourceMappingURL=DataGridHelpers.js.map