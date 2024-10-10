// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import {
  assertCurrentFocusedCellIs,
  assertSelectedRowIs,
  emulateUserFocusingCellAt,
  emulateUserKeyboardNavigation,
  focusCurrentlyFocusableCell,
  getAllRows,
  getBodyRowByAriaIndex,
  getCellByIndexes,
  getFocusableCell,
  getHeaderCellForColumnId,
  getHeaderCells,
  getValuesOfAllBodyRows,
  getValuesOfBodyRowByAriaIndex,
} from '../../../testing/DataGridHelpers.js';
import {
  dispatchClickEvent,
  dispatchFocusOutEvent,
  dispatchKeyDownEvent,
  getEventPromise,
  renderElementIntoDOM,
  stripLitHtmlCommentNodes,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import {withMutations} from '../../../testing/MutationHelpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as IconButton from '../icon_button/icon_button.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as DataGrid from './data_grid.js';

const {html} = LitHtml;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const createColumns = (): DataGrid.DataGridUtils.Column[] => {
  return [
    {id: 'city', title: 'City', sortable: true, widthWeighting: 2, visible: true, hideable: false},
    {id: 'country', title: 'Country', sortable: false, widthWeighting: 2, visible: true, hideable: false},
    {id: 'population', title: 'Population', sortable: false, widthWeighting: 1, visible: true, hideable: false},
  ];
};

const createRows = (): DataGrid.DataGridUtils.Row[] => {
  return [
    {
      cells: [
        {columnId: 'city', value: 'London'},
        {columnId: 'country', value: 'UK'},
        {columnId: 'population', value: '8.98m'},
      ],
    },
    {
      cells: [
        {columnId: 'city', value: 'Munich'},
        {columnId: 'country', value: 'Germany'},
        {columnId: 'population', value: '1.47m'},
      ],
    },
    {
      cells: [
        {columnId: 'city', value: 'Barcelona'},
        {columnId: 'country', value: 'Spain'},
        {columnId: 'population', value: '1.62m'},
      ],
    },
  ];
};

const columns: DataGrid.DataGridUtils.Column[] = createColumns();
const rows: DataGrid.DataGridUtils.Row[] = createRows();
const columnsWithNoneSortable = createColumns().map(col => {
  col.sortable = false;
  return col;
});
const label: string = 'Test Data Grid Label';

Object.freeze(columns);
Object.freeze(columnsWithNoneSortable);
Object.freeze(rows);

const renderDataGrid = (data: Partial<DataGrid.DataGrid.DataGridData>): DataGrid.DataGrid.DataGrid => {
  const component = new DataGrid.DataGrid.DataGrid();
  component.data = {
    rows: data.rows || [],
    columns: data.columns || [],
    activeSort: data.activeSort || null,
    label: data.label,
  };
  renderElementIntoDOM(component);
  return component;
};

describe('DataGrid', () => {
  describe('rendering and hiding rows/columns', () => {
    it('renders the right headers and values', async () => {
      const component = renderDataGrid({rows, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const headerCells = getHeaderCells(component.shadowRoot);
      const values = Array.from(headerCells, cell => cell.textContent || '');
      assert.deepEqual(values, ['City', 'Country', 'Population']);

      const rowValues = getValuesOfAllBodyRows(component.shadowRoot);
      assert.deepEqual(rowValues, [
        ['London', 'UK', '8.98m'],
        ['Munich', 'Germany', '1.47m'],
        ['Barcelona', 'Spain', '1.62m'],
      ]);
    });

    it('does not render DOM within a cell whose column is hidden', async () => {
      const columnsWithFirstHidden = createColumns();
      columnsWithFirstHidden[0].hideable = true;
      columnsWithFirstHidden[0].visible = false;
      const component = renderDataGrid({rows, columns: columnsWithFirstHidden});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const renderedRows = Array.from(component.shadowRoot.querySelectorAll('tbody tr:not(.padding-row)'));
      const cellsHaveChildren = renderedRows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'), cell => {
          // Figure out if the cell has any children.
          return stripLitHtmlCommentNodes(cell.innerHTML).length > 0;
        });
        return cells;
      });
      assert.deepEqual(cellsHaveChildren, [
        // False for column 1 as it is hidden, true for the rest which are
        // visible.
        [false, true, true],
        [false, true, true],
        [false, true, true],
      ]);
    });

    it('uses the cell\'s value as its title attribute by default', async () => {
      const component = renderDataGrid({rows, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const renderedBodyRows = getAllRows(component.shadowRoot);
      const renderedBodyCells = renderedBodyRows.map(row => Array.from(row.querySelectorAll('td')));
      const titleAttributesForCellsByRow = renderedBodyCells.map(row => row.map(cell => cell.getAttribute('title')));

      assert.deepEqual(titleAttributesForCellsByRow, [
        ['London', 'UK', '8.98m'],
        ['Munich', 'Germany', '1.47m'],
        ['Barcelona', 'Spain', '1.62m'],
      ]);
    });

    it('takes a title override and uses that if provided', async () => {
      const rowsWithTitleSpecified = createRows();
      rowsWithTitleSpecified[0].cells[0].title = 'EXPLICITLY_PROVIDED_TITLE';
      const component = renderDataGrid({rows: rowsWithTitleSpecified, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const renderedBodyRows = getAllRows(component.shadowRoot);
      const renderedBodyCells = renderedBodyRows.map(row => Array.from(row.querySelectorAll('td')));
      const titleAttributesForCellsByRow = renderedBodyCells.map(row => row.map(cell => cell.getAttribute('title')));

      assert.deepEqual(titleAttributesForCellsByRow, [
        ['EXPLICITLY_PROVIDED_TITLE', 'UK', '8.98m'],
        ['Munich', 'Germany', '1.47m'],
        ['Barcelona', 'Spain', '1.62m'],
      ]);
    });

    it('hides columns marked as hidden', async () => {
      const columnsWithCityHidden = createColumns();
      columnsWithCityHidden[0].visible = false;
      const component = renderDataGrid({rows, columns: columnsWithCityHidden});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const headerCells = getHeaderCells(component.shadowRoot, {onlyVisible: true});
      const values = Array.from(headerCells, cell => cell.textContent || '');
      assert.deepEqual(values, ['Country', 'Population']);

      const rowValues = getValuesOfAllBodyRows(component.shadowRoot, {onlyVisible: true});
      assert.deepEqual(rowValues, [
        ['UK', '8.98m'],
        ['Germany', '1.47m'],
        ['Spain', '1.62m'],
      ]);
    });

    it('hides rows marked as hidden', async () => {
      const rowsWithLondonHidden = createRows();
      rowsWithLondonHidden[0].hidden = true;
      const component = renderDataGrid({rows: rowsWithLondonHidden, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const rowValues = getValuesOfAllBodyRows(component.shadowRoot, {onlyVisible: true});
      assert.deepEqual(rowValues, [
        ['Munich', 'Germany', '1.47m'],
        ['Barcelona', 'Spain', '1.62m'],
      ]);
    });
  });

  describe('data-grid renderers', () => {
    it('uses the string renderer by default', async () => {
      const columns: DataGrid.DataGridUtils.Column[] =
          [{id: 'key', title: 'Key', widthWeighting: 1, visible: true, hideable: false}];
      const rows: DataGrid.DataGridUtils.Row[] = [{cells: [{columnId: 'key', value: 'Hello World'}]}];
      const component = renderDataGrid({columns, rows});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const cell = getCellByIndexes(component.shadowRoot, {column: 0, row: 1});
      assert.deepEqual(stripLitHtmlCommentNodes(cell.innerHTML), 'Hello World');
    });

    it('can use the code block renderer to render text in a <code> tag', async () => {
      const columns: DataGrid.DataGridUtils.Column[] =
          [{id: 'key', title: 'Key', widthWeighting: 1, visible: true, hideable: false}];
      const rows: DataGrid.DataGridUtils.Row[] = [{
        cells: [
          {
            columnId: 'key',
            value: 'Hello World',
            title: 'Hello World',
            renderer: DataGrid.DataGridRenderers.codeBlockRenderer,
          },
        ],
      }];
      const component = renderDataGrid({columns, rows});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const cell = getCellByIndexes(component.shadowRoot, {column: 0, row: 1});
      assert.deepEqual(stripLitHtmlCommentNodes(cell.innerHTML), '<code>Hello World</code>');
    });

    it('can use the icon renderer for rendering icons', async () => {
      const icon = new IconButton.Icon.Icon();
      icon.data = {iconName: 'arrow-down', color: 'var(--icon-request)', width: '16px', height: '16px'};

      const columns: DataGrid.DataGridUtils.Column[] =
          [{id: 'type', title: 'Type', widthWeighting: 1, visible: true, hideable: false}];
      const rows: DataGrid.DataGridUtils.Row[] = [{
        cells: [
          {
            columnId: 'type',
            value: icon,
            title: 'received',
            renderer: DataGrid.DataGridRenderers.iconRenderer,
          },
        ],
      }];
      const component = renderDataGrid({columns, rows});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const cell = getCellByIndexes(component.shadowRoot, {column: 0, row: 1});
      assert.deepEqual(
          stripLitHtmlCommentNodes(cell.innerHTML),
          '<div style="display: flex; justify-content: center;"><devtools-icon role="presentation" name="arrow-down" style="color: var(--icon-request); width: 16px; height: 16px;"></devtools-icon></div>');
    });

    it('accepts any custom renderer', async () => {
      const columns: DataGrid.DataGridUtils.Column[] =
          [{id: 'key', title: 'Key', widthWeighting: 1, visible: true, hideable: false}];
      const rows: DataGrid.DataGridUtils.Row[] = [{
        cells: [{
          columnId: 'key',
          value: 'Hello World',
          title: 'Hello World',
          renderer: value => html`<p>foo: ${value}</p>`,
        }],
      }];
      const component = renderDataGrid({columns, rows});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const cell = getCellByIndexes(component.shadowRoot, {column: 0, row: 1});
      assert.deepEqual(stripLitHtmlCommentNodes(cell.innerHTML), '<p>foo: Hello World</p>');
    });
  });

  describe('aria-labels', () => {
    it('it adds aria-label to the table if one is specified', async () => {
      const component = renderDataGrid({columns, rows, label});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const table = component.shadowRoot.querySelector('table');
      assert.instanceOf(table, HTMLTableElement);
      assert.strictEqual(table.getAttribute('aria-label'), label);
    });

    it('it does not add an aria-label to the table if one is not specified', async () => {
      const component = renderDataGrid({columns, rows});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const table = component.shadowRoot.querySelector('table');
      assert.instanceOf(table, HTMLTableElement);
      assert.strictEqual(table.getAttribute('aria-label'), null);
    });

    it('adds rowcount and colcount to the table', async () => {
      const component = renderDataGrid({columns, rows});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const table = component.shadowRoot.querySelector('table');
      assert.instanceOf(table, HTMLTableElement);
      assert.strictEqual(table.getAttribute('aria-rowcount'), '3');
      assert.strictEqual(table.getAttribute('aria-colcount'), '3');
    });

    it('shows the total row and colcount regardless of any hidden rows', async () => {
      const rowsWithLondonHidden = createRows();
      rowsWithLondonHidden[0].hidden = true;
      const component = renderDataGrid({columns, rows: rowsWithLondonHidden});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const table = component.shadowRoot.querySelector('table');
      assert.instanceOf(table, HTMLTableElement);
      assert.strictEqual(table.getAttribute('aria-rowcount'), '3');
      assert.strictEqual(table.getAttribute('aria-colcount'), '3');
    });

    it('labels a column when it is sortable and does not add a label when it is not', async () => {
      const component = renderDataGrid({columns, rows});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const cityHeader = getHeaderCellForColumnId(component.shadowRoot, 'city');
      const countryHeader = getHeaderCellForColumnId(component.shadowRoot, 'country');
      assert.strictEqual(cityHeader.getAttribute('aria-sort'), 'none');
      assert.strictEqual(countryHeader.getAttribute('aria-sort'), null);
    });

    it('labels a column when it is sorted in ASC order', async () => {
      const component = renderDataGrid({
        columns,
        rows,
        activeSort: {
          columnId: 'city',
          direction: DataGrid.DataGridUtils.SortDirection.ASC,
        },
      });
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const cityHeader = getHeaderCellForColumnId(component.shadowRoot, 'city');
      assert.strictEqual(cityHeader.getAttribute('aria-sort'), 'ascending');
    });

    it('labels a column when it is sorted in DESC order', async () => {
      const component = renderDataGrid({
        columns,
        rows,
        activeSort: {
          columnId: 'city',
          direction: DataGrid.DataGridUtils.SortDirection.DESC,
        },
      });
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const cityHeader = getHeaderCellForColumnId(component.shadowRoot, 'city');
      assert.strictEqual(cityHeader.getAttribute('aria-sort'), 'descending');
    });
  });

  describeWithLocale('navigating with the keyboard', () => {
    it('makes the first body cell focusable by default when no columns are sortable', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('does not let the user navigate into the columns when no colums are sortable', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowUp');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('focuses the column header by default when it is sortable', async () => {
      const component = renderDataGrid({rows, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 0});
    });

    it('lets the user press the right arrow key to navigate right', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      focusCurrentlyFocusableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowRight');
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 1, row: 1});
    });

    it('lets the user press the left arrow key to navigate left', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      // Find a cell in the 2nd column to click to focus
      await emulateUserFocusingCellAt(component.shadowRoot, {column: 1, row: 1});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowLeft');
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('does not let the user move left if they are at the first visible column', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      focusCurrentlyFocusableCell(component.shadowRoot);
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowLeft');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('lets the user press the down arrow key to navigate down', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      focusCurrentlyFocusableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 2});
    });

    it('keeps the user where they are if they are on the last row', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      focusCurrentlyFocusableCell(component.shadowRoot);
      // Go down to row 2
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      await coordinator.done();
      // Go down to row 3 (the last row)
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 3});
      // Try going down again
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 3});
    });

    it('lets the user press the up arrow key to navigate up', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      await emulateUserFocusingCellAt(component.shadowRoot, {column: 1, row: 2});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowUp');
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 1, row: 1});
    });

    it('does not let the user move up into the column row when none are sortable', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      focusCurrentlyFocusableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowUp');
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('does let the user move up into the column row when they are sortable', async () => {
      const component = renderDataGrid({rows, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const table = component.shadowRoot.querySelector('table');
      assert.instanceOf(table, HTMLTableElement);
      await emulateUserFocusingCellAt(component.shadowRoot, {column: 0, row: 1});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowUp');
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 0});
    });

    it('correctly skips hidden columns', async () => {
      const columnsWithCountryHidden = createColumns();
      columnsWithCountryHidden[1].visible = false;
      const component = renderDataGrid({rows, columns: columnsWithCountryHidden});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      focusCurrentlyFocusableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowRight');
      await coordinator.done();
      // It's column 2 here because column 1 is hidden
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 2, row: 0});
    });

    it('correctly skips hidden rows when navigating from the column header', async () => {
      const rowsWithLondonHidden = createRows();
      rowsWithLondonHidden[0].hidden = true;
      const component = renderDataGrid({rows: rowsWithLondonHidden, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      focusCurrentlyFocusableCell(component.shadowRoot);
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 0});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      await coordinator.done();
      // It's row 2 here because row 1 is hidden
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 2});
    });

    it('correctly skips hidden rows when navigating from a body row to another', async () => {
      const rowsWithMunichHidden = createRows();
      rowsWithMunichHidden[1].hidden = true;
      const component = renderDataGrid({rows: rowsWithMunichHidden, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      focusCurrentlyFocusableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      await coordinator.done();
      // It's 3 here because row 2 is hidden
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 3});
    });

    it('correctly marks the first visible row cell as focusable when the first row is hidden', async () => {
      const rowsWithLondonHidden = createRows();
      rowsWithLondonHidden[0].hidden = true;
      const component = renderDataGrid({rows: rowsWithLondonHidden, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      focusCurrentlyFocusableCell(component.shadowRoot);
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 2});
    });

    it('re-adjusts the focused cell if a re-render puts that cell out of bounds', async () => {
      const component = renderDataGrid({rows: createRows(), columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      focusCurrentlyFocusableCell(component.shadowRoot);
      await coordinator.done();
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      await coordinator.done();
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 3});
      const rowsWithLastRemoved = createRows();
      rowsWithLastRemoved.splice(2);
      component.data = {
        columns: columnsWithNoneSortable,
        rows: rowsWithLastRemoved,
        activeSort: null,
      };
      await coordinator.done();
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 2});
    });
  });
  describeWithLocale('emits an event', () => {
    it('when the user clicks a column header', async () => {
      const component = renderDataGrid({rows, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const columnHeaderClickEvent =
          getEventPromise<DataGrid.DataGridEvents.ColumnHeaderClickEvent>(component, 'columnheaderclick');
      const cityColumn = getHeaderCellForColumnId(component.shadowRoot, 'city');
      dispatchClickEvent(cityColumn);

      const clickEvent = await columnHeaderClickEvent;
      assert.deepEqual(clickEvent.data, {column: columns[0], columnIndex: 0});
    });

    it('when the user "clicks" a column header with the enter key', async () => {
      const component = renderDataGrid({rows, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const columnHeaderClickEvent =
          getEventPromise<DataGrid.DataGridEvents.ColumnHeaderClickEvent>(component, 'columnheaderclick');
      const focusableCell = getFocusableCell(component.shadowRoot);
      // Check that the focusable cell is the header cell as it's a table with
      // sortable columns.
      assert.strictEqual(focusableCell.getAttribute('data-row-index'), '0');
      assert.strictEqual(focusableCell.getAttribute('data-col-index'), '0');
      focusableCell.focus();
      await coordinator.done();

      const table = component.shadowRoot.querySelector('table');
      assert.instanceOf(table, HTMLTableElement);
      dispatchKeyDownEvent(table, {key: 'Enter'});
      const clickEvent = await columnHeaderClickEvent;
      assert.deepEqual(clickEvent.data, {column: columns[0], columnIndex: 0});
    });

    it('when the user focuses a cell', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const bodyCellFocusedEvent =
          getEventPromise<DataGrid.DataGridEvents.BodyCellFocusedEvent>(component, 'cellfocused');
      const focusableCell = getFocusableCell(component.shadowRoot);
      focusableCell.focus();
      const cellFocusedEvent = await bodyCellFocusedEvent;
      assert.deepEqual(cellFocusedEvent.data, {cell: rows[0].cells[0], row: rows[0]});
    });

    it('when the user hovers over a row', async () => {
      const component = renderDataGrid({rows, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const rowHoveredEvent = getEventPromise<DataGrid.DataGridEvents.RowMouseEnterEvent>(component, 'rowmouseenter');
      const rowLeaveEvent = getEventPromise<DataGrid.DataGridEvents.RowMouseLeaveEvent>(component, 'rowmouseleave');

      const row = getBodyRowByAriaIndex(component.shadowRoot, 1);
      row.dispatchEvent(new MouseEvent('mouseenter'));

      const hoverEvent = await rowHoveredEvent;
      assert.deepEqual(hoverEvent.data, {row: rows[0]});

      row.dispatchEvent(new MouseEvent('mouseleave'));
      const leaveEvent = await rowLeaveEvent;
      assert.deepEqual(leaveEvent.data, {row: rows[0]});
    });
  });

  describe('adding new rows', () => {
    it('only has one DOM mutation to add the new row', async () => {
      const component = renderDataGrid({rows, columns});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      await withMutations(
          [
            // We expect one <tr> to be added
            {target: 'tr', max: 1},
          ],
          component.shadowRoot, async shadowRoot => {
            const newRow = {
              cells: [
                {columnId: 'city', value: 'Berlin'},
                {columnId: 'country', value: 'Germany'},
                {columnId: 'population', value: '3.66m'},
              ],
            };

            component.data = {
              columns,
              rows: [...rows, newRow],
              activeSort: null,
            };

            await coordinator.done();

            const newRowValues = getValuesOfBodyRowByAriaIndex(shadowRoot, 4);
            assert.deepEqual(newRowValues, ['Berlin', 'Germany', '3.66m']);
          });
    });
  });

  describe('marking a row as selected', () => {
    it('marks the row as selected when the user clicks on a cell', async () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      // Ensure no row is selected before the user clicks
      let selectedRow = component.shadowRoot.querySelector('tr.selected');
      assert.isNull(selectedRow);
      // // Focus the very first cell
      await emulateUserFocusingCellAt(component.shadowRoot, {column: 0, row: 1});
      await coordinator.done();
      // // Ensure the row is updated to be marked as selected
      selectedRow = component.shadowRoot.querySelector('tbody tr.selected');
      assert.instanceOf(selectedRow, HTMLTableRowElement);
    });

    it('persists over re-renders when not focused', async () => {
      const rows = createRows();
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      focusCurrentlyFocusableCell(component.shadowRoot);
      await coordinator.done();

      const wrapper = component.shadowRoot.querySelector('.wrapping-container');
      if (wrapper) {
        dispatchFocusOutEvent(wrapper);
      }
      await coordinator.done();
      assertSelectedRowIs(component.shadowRoot, 1);

      rows.push({
        cells: [
          {columnId: 'city', value: 'Vienna'},
          {columnId: 'country', value: 'Austria'},
          {columnId: 'population', value: '1.92m'},
        ],
      });
      component.data = {
        columns: columnsWithNoneSortable,
        rows,
        activeSort: null,
      };
      await coordinator.done();
      assertSelectedRowIs(component.shadowRoot, 1);
    });
  });

  describe('DataGrid.DataGridUtils.calculateColumnWidthPercentageFromWeighting', () => {
    const makeColumnsWithWeightings = (...weights: number[]): DataGrid.DataGridUtils.Column[] => {
      return weights.map((weight, index) => {
        return {
          id: `column-${index}` as Lowercase<string>,
          title: `Column ${index}`,
          sortable: false,
          visible: true,
          hideable: false,
          widthWeighting: weight,
        };
      });
    };

    it('correctly divides columns based on the weighting', async () => {
      const columns = makeColumnsWithWeightings(1, 1);
      const calculatedWidths =
          columns.map(col => DataGrid.DataGridUtils.calculateColumnWidthPercentageFromWeighting(columns, col.id));
      assert.deepEqual(calculatedWidths, [50, 50]);
    });

    it('correctly divides and rounds when the % are not whole numbers', async () => {
      const columns = makeColumnsWithWeightings(1, 1, 1);
      const calculatedWidths =
          columns.map(col => DataGrid.DataGridUtils.calculateColumnWidthPercentageFromWeighting(columns, col.id));
      assert.deepEqual(calculatedWidths, [33, 33, 33]);
    });

    it('does not include hidden columns when calculating weighting', async () => {
      const columns = makeColumnsWithWeightings(1, 1, 1);
      columns[0].visible = false;
      const calculatedWidths =
          columns.map(col => DataGrid.DataGridUtils.calculateColumnWidthPercentageFromWeighting(columns, col.id));
      assert.deepEqual(calculatedWidths, [0, 50, 50]);
    });

    it('errors if a column has a weighting of less than 1', async () => {
      const columns = makeColumnsWithWeightings(0.5);
      assert.throws(
          () => DataGrid.DataGridUtils.calculateColumnWidthPercentageFromWeighting(columns, columns[0].id),
          'Error with column column-0: width weightings must be >= 1.');
    });
  });

  describe('#DataGrid.DataGridUtils.handleArrowKeyNavigation util', () => {
    const makeColumns = (): DataGrid.DataGridUtils.Column[] => {
      return [
        {id: 'a', title: 'A', sortable: false, visible: true, hideable: false, widthWeighting: 1},
        {id: 'b', title: 'B', sortable: false, visible: true, hideable: false, widthWeighting: 1},
        {id: 'c', title: 'C', sortable: false, visible: true, hideable: false, widthWeighting: 1},
      ];
    };

    const makeRows = (): DataGrid.DataGridUtils.Row[] => {
      return [
        {
          cells: [
            {columnId: 'a', value: 'a: row 1'},
            {columnId: 'b', value: 'b: row 1'},
            {columnId: 'c', value: 'c: row 1'},
          ],
          hidden: false,
        },
        {
          cells: [
            {columnId: 'a', value: 'a: row 2'},
            {columnId: 'b', value: 'b: row 2'},
            {columnId: 'c', value: 'c: row 2'},
          ],
          hidden: false,
        },
        {
          cells: [
            {columnId: 'a', value: 'a: row 3'},
            {columnId: 'b', value: 'b: row 3'},
            {columnId: 'c', value: 'c: row 3'},
          ],
          hidden: false,
        },
      ];
    };

    describe('navigating left', () => {
      it('does not let the user move further left than the first column', async () => {
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.LEFT,
          currentFocusedCell: [0, 1],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });

      it('does not let the user move left if there are no visible columns to the left', async () => {
        const columnsWithFirstHidden = makeColumns();
        columnsWithFirstHidden[0].visible = false;
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.LEFT,
          currentFocusedCell: [1, 1],
          columns: columnsWithFirstHidden,
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [1, 1]);
      });

      it('lets the user move left if the column to the left is visible', async () => {
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.LEFT,
          currentFocusedCell: [1, 1],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });

      it('correctly skips a hidden column to get to the next left visible column', async () => {
        const withSecondColumnHidden = makeColumns();
        withSecondColumnHidden[1].visible = false;
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.LEFT,
          currentFocusedCell: [2, 1],
          columns: withSecondColumnHidden,
          rows,
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });
    });

    describe('navigating right', () => {
      it('does not let the user move further right than the last column', async () => {
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.RIGHT,
          currentFocusedCell: [2, 1],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [2, 1]);
      });

      it('does not let the user move right if there are no visible columns to the right', async () => {
        const columnsWithLastHidden = makeColumns();
        columnsWithLastHidden[2].visible = false;
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.RIGHT,
          currentFocusedCell: [1, 1],
          columns: columnsWithLastHidden,
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [1, 1]);
      });

      it('lets the user move right if the column to the right is visible', async () => {
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.RIGHT,
          currentFocusedCell: [1, 1],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [2, 1]);
      });

      it('correctly skips a hidden column to get to the next right visible column', async () => {
        const withSecondColumnHidden = makeColumns();
        withSecondColumnHidden[1].visible = false;
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.RIGHT,
          currentFocusedCell: [0, 1],
          columns: withSecondColumnHidden,
          rows,
        });
        assert.deepEqual(newFocusedCell, [2, 1]);
      });
    });

    describe('navigating up', () => {
      it('does not let the user go into the columns row when none are sortable', async () => {
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.UP,
          currentFocusedCell: [0, 1],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });

      describe('when at least one column is sortable', () => {
        const sortableColumns = makeColumns();
        sortableColumns.forEach(col => {
          col.sortable = true;
        });

        it('does let the user go into the columns row', async () => {
          const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
            key: Platform.KeyboardUtilities.ArrowKey.UP,
            currentFocusedCell: [0, 1],
            columns: sortableColumns,
            rows: makeRows(),
          });
          assert.deepEqual(newFocusedCell, [0, 0]);
        });

        it('does not let the user go up if they are in the column header', async () => {
          const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
            key: Platform.KeyboardUtilities.ArrowKey.UP,
            currentFocusedCell: [0, 0],
            columns: sortableColumns,
            rows: makeRows(),
          });
          assert.deepEqual(newFocusedCell, [0, 0]);
        });

        it('correctly skips a hidden row to navigate into the columns row', async () => {
          const rowsWithFirstHidden = makeRows();
          rowsWithFirstHidden[0].hidden = true;
          const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
            key: Platform.KeyboardUtilities.ArrowKey.UP,
            currentFocusedCell: [0, 2],
            columns: sortableColumns,
            rows: rowsWithFirstHidden,
          });
          assert.deepEqual(newFocusedCell, [0, 0]);
        });
      });

      it('correctly skips a hidden row while navigating through the body rows', async () => {
        const rowsWithSecondHidden = makeRows();
        rowsWithSecondHidden[1].hidden = true;
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.UP,
          currentFocusedCell: [0, 3],
          columns: makeColumns(),
          rows: rowsWithSecondHidden,
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });

      it('does not let the user move up if no columns are sortable and all rows above are hidden', async () => {
        const rowsWithFirstAndSecondHidden = makeRows();
        rowsWithFirstAndSecondHidden[0].hidden = true;
        rowsWithFirstAndSecondHidden[1].hidden = true;
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.UP,
          currentFocusedCell: [0, 3],
          columns: makeColumns(),
          rows: rowsWithFirstAndSecondHidden,
        });
        assert.deepEqual(newFocusedCell, [0, 3]);
      });
    });

    describe('navigating down', () => {
      describe('when at least one column is sortable', () => {
        const sortableColumns = makeColumns();
        sortableColumns.forEach(col => {
          col.sortable = true;
        });

        it('lets the user navigate from the columns into the body', async () => {
          const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
            key: Platform.KeyboardUtilities.ArrowKey.DOWN,
            currentFocusedCell: [0, 0],
            columns: sortableColumns,
            rows: makeRows(),
          });
          assert.deepEqual(newFocusedCell, [0, 1]);
        });

        it('correctly skips any hidden body rows to find the first visible one', async () => {
          const rowsWithFirstHidden = makeRows();
          rowsWithFirstHidden[0].hidden = true;
          const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
            key: Platform.KeyboardUtilities.ArrowKey.DOWN,
            currentFocusedCell: [0, 0],
            columns: sortableColumns,
            rows: rowsWithFirstHidden,
          });
          assert.deepEqual(newFocusedCell, [0, 2]);
        });
      });

      it('correctly skips a hidden row while navigating through the body rows', async () => {
        const rowsWithSecondHidden = makeRows();
        rowsWithSecondHidden[1].hidden = true;
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.DOWN,
          currentFocusedCell: [0, 1],
          columns: makeColumns(),
          rows: rowsWithSecondHidden,
        });
        assert.deepEqual(newFocusedCell, [0, 3]);
      });

      it('does not let the user move down if all rows below are hidden', async () => {
        const rowsWithFirstAndSecondHidden = makeRows();
        rowsWithFirstAndSecondHidden[1].hidden = true;
        rowsWithFirstAndSecondHidden[2].hidden = true;
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.DOWN,
          currentFocusedCell: [0, 1],
          columns: makeColumns(),
          rows: rowsWithFirstAndSecondHidden,
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });

      it('leaves the user where they are if no body rows are visible', async () => {
        const rowsAllHidden = makeRows().map(row => {
          row.hidden = true;
          return row;
        });
        const sortableColumns = makeColumns().map(col => {
          col.sortable = true;
          return col;
        });
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.DOWN,
          currentFocusedCell: [0, 0],
          columns: sortableColumns,
          rows: rowsAllHidden,
        });
        assert.deepEqual(newFocusedCell, [0, 0]);
      });

      it('does not let the user move down if they are on the last row', async () => {
        const newFocusedCell = DataGrid.DataGridUtils.handleArrowKeyNavigation({
          key: Platform.KeyboardUtilities.ArrowKey.DOWN,
          currentFocusedCell: [0, 3],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [0, 3]);
      });
    });
  });

  describe('DataGrid.DataGridUtils.getCellTitleFromCellContent', () => {
    it('returns full cell content as title when content is short', async () => {
      const title = DataGrid.DataGridUtils.getCellTitleFromCellContent('some shortish cell value');
      assert.deepEqual(title, 'some shortish cell value');
    });

    it('returns truncated cell content as title when content is long', async () => {
      const title = DataGrid.DataGridUtils.getCellTitleFromCellContent('This cell contains text which is a bit longer');
      assert.deepEqual(title, 'This cell contains t…');
    });
  });
});
