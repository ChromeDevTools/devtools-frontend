// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../../../../front_end/third_party/lit-html/lit-html.js';
import * as UIComponents from '../../../../../front_end/ui/components/components.js';

import {assertElement, assertElements, assertShadowRoot, dispatchClickEvent, dispatchKeyDownEvent, getEventPromise, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {withMutations} from '../../helpers/MutationHelpers.js';

import {assertCurrentFocusedCellIs, emulateUserFocusingCellAt, emulateUserKeyboardNavigation, focusTableCell, getCellByIndexes, getFocusableCell, getHeaderCellForColumnId, getHeaderCells, getValuesOfAllBodyRows, getValuesOfBodyRowByAriaIndex} from './DataGridHelpers.js';

const {assert} = chai;

const createColumns = (): UIComponents.DataGridUtils.Column[] => {
  return [
    {id: 'city', title: 'City', sortable: true, widthWeighting: 2},
    {id: 'country', title: 'Country', sortable: false, widthWeighting: 2},
    {id: 'population', title: 'Population', sortable: false, widthWeighting: 1},
  ];
};

const createRows = (): UIComponents.DataGridUtils.Row[] => {
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

const columns: UIComponents.DataGridUtils.Column[] = createColumns();
const rows: UIComponents.DataGridUtils.Row[] = createRows();
const columnsWithNoneSortable = createColumns().map(col => {
  col.sortable = false;
  return col;
});

Object.freeze(columns);
Object.freeze(columnsWithNoneSortable);
Object.freeze(rows);

const renderDataGrid = (data: Partial<UIComponents.DataGrid.DataGridData>): UIComponents.DataGrid.DataGrid => {
  const component = new UIComponents.DataGrid.DataGrid();
  component.data = {
    rows: data.rows || [],
    columns: data.columns || [],
    activeSort: data.activeSort || null,
  };
  return component;
};


describe('DataGrid', () => {
  describe('rendering and hiding rows/columns', () => {
    it('renders the right headers and values', () => {
      const component = renderDataGrid({rows, columns});
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);

      const headerCells = getHeaderCells(component.shadowRoot);
      const values = Array.from(headerCells, cell => cell.textContent || '');
      assert.deepEqual(values, ['City', 'Country', 'Population']);

      const renderedRows = component.shadowRoot.querySelectorAll('tbody tr');
      assertElements(renderedRows, HTMLTableRowElement);

      const rowValues = getValuesOfAllBodyRows(component.shadowRoot);
      assert.deepEqual(rowValues, [
        ['London', 'UK', '8.98m'],
        ['Munich', 'Germany', '1.47m'],
        ['Barcelona', 'Spain', '1.62m'],
      ]);
    });

    it('hides columns marked as hidden', () => {
      const columnsWithCityHidden = createColumns();
      columnsWithCityHidden[0].hidden = true;
      const component = renderDataGrid({rows, columns: columnsWithCityHidden});
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);

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

    it('hides rows marked as hidden', () => {
      const rowsWithLondonHidden = createRows();
      rowsWithLondonHidden[0].hidden = true;
      const component = renderDataGrid({rows: rowsWithLondonHidden, columns});
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);

      const rowValues = getValuesOfAllBodyRows(component.shadowRoot, {onlyVisible: true});
      assert.deepEqual(rowValues, [
        ['Munich', 'Germany', '1.47m'],
        ['Barcelona', 'Spain', '1.62m'],
      ]);
    });
  });

  describe('data-grid renderers', () => {
    /**
     * It's useful to use innerHTML in the tests to have full confidence in the
     * renderer output, but LitHtml uses comment nodes to split dynamic from
     * static parts of a template, and we don't want our tests full of noise
     * from those.
     */
    const stripLitHtmlCommentNodes = (text: string) => text.replaceAll('<!---->', '');

    it('uses the string renderer by default', () => {
      const columns: UIComponents.DataGridUtils.Column[] = [{id: 'key', title: 'Key', widthWeighting: 1}];
      const rows: UIComponents.DataGridUtils.Row[] = [{cells: [{columnId: 'key', value: 'Hello World'}]}];
      const component = renderDataGrid({columns, rows});
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      const cell = getCellByIndexes(component.shadowRoot, {column: 0, row: 1});
      assert.deepEqual(stripLitHtmlCommentNodes(cell.innerHTML), 'Hello World');
    });

    it('can use the code block render to render text in a <code> tag', () => {
      const columns: UIComponents.DataGridUtils.Column[] = [{id: 'key', title: 'Key', widthWeighting: 1}];
      const rows: UIComponents.DataGridUtils.Row[] = [
        {cells: [{columnId: 'key', value: 'Hello World', renderer: UIComponents.DataGridRenderers.codeBlockRenderer}]},
      ];
      const component = renderDataGrid({columns, rows});
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      const cell = getCellByIndexes(component.shadowRoot, {column: 0, row: 1});
      assert.deepEqual(stripLitHtmlCommentNodes(cell.innerHTML), '<code>Hello World</code>');
    });

    it('accepts any custom renderer', () => {
      const columns: UIComponents.DataGridUtils.Column[] = [{id: 'key', title: 'Key', widthWeighting: 1}];
      const rows: UIComponents.DataGridUtils.Row[] =
          [{cells: [{columnId: 'key', value: 'Hello World', renderer: value => LitHtml.html`<p>foo: ${value}</p>`}]}];
      const component = renderDataGrid({columns, rows});
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      const cell = getCellByIndexes(component.shadowRoot, {column: 0, row: 1});
      assert.deepEqual(stripLitHtmlCommentNodes(cell.innerHTML), '<p>foo: Hello World</p>');
    });
  });

  describe('aria-labels', () => {
    it('adds rowcount and colcount to the table', () => {
      const component = renderDataGrid({columns, rows});
      assertShadowRoot(component.shadowRoot);
      const table = component.shadowRoot.querySelector('table');
      assertElement(table, HTMLTableElement);
      assert.strictEqual(table.getAttribute('aria-rowcount'), '3');
      assert.strictEqual(table.getAttribute('aria-colcount'), '3');
    });

    it('shows the total row and colcount regardless of any hidden rows', () => {
      const rowsWithLondonHidden = createRows();
      rowsWithLondonHidden[0].hidden = true;
      const component = renderDataGrid({columns, rows: rowsWithLondonHidden});
      assertShadowRoot(component.shadowRoot);
      const table = component.shadowRoot.querySelector('table');
      assertElement(table, HTMLTableElement);
      assert.strictEqual(table.getAttribute('aria-rowcount'), '3');
      assert.strictEqual(table.getAttribute('aria-colcount'), '3');
    });

    it('labels a column when it is sortable and does not add a label when it is not', () => {
      const component = renderDataGrid({columns, rows});
      assertShadowRoot(component.shadowRoot);

      const cityHeader = getHeaderCellForColumnId(component.shadowRoot, 'city');
      const countryHeader = getHeaderCellForColumnId(component.shadowRoot, 'country');
      assert.strictEqual(cityHeader.getAttribute('aria-sort'), 'none');
      assert.strictEqual(countryHeader.getAttribute('aria-sort'), null);
    });

    it('labels a column when it is sorted in ASC order', () => {
      const component = renderDataGrid({
        columns,
        rows,
        activeSort: {
          columnId: 'city',
          direction: UIComponents.DataGridUtils.SortDirection.ASC,
        },
      });
      assertShadowRoot(component.shadowRoot);

      const cityHeader = getHeaderCellForColumnId(component.shadowRoot, 'city');
      assert.strictEqual(cityHeader.getAttribute('aria-sort'), 'ascending');
    });

    it('labels a column when it is sorted in DESC order', () => {
      const component = renderDataGrid({
        columns,
        rows,
        activeSort: {
          columnId: 'city',
          direction: UIComponents.DataGridUtils.SortDirection.DESC,
        },
      });
      assertShadowRoot(component.shadowRoot);
      const cityHeader = getHeaderCellForColumnId(component.shadowRoot, 'city');
      assert.strictEqual(cityHeader.getAttribute('aria-sort'), 'descending');
    });
  });

  describe('navigating with the keyboard', () => {
    it('makes the first body cell focusable by default when no columns are sortable', () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('does not let the user navigate into the columns when no colums are sortable', () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowUp');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('focuses the column header by default when it is sortable', () => {
      const component = renderDataGrid({rows, columns});
      assertShadowRoot(component.shadowRoot);
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 0});
    });

    it('lets the user press the right arrow key to navigate right', () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowRight');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 1, row: 1});
    });

    it('lets the user press the left arrow key to navigate left', () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      // Find a cell in the 2nd column to click to focus
      emulateUserFocusingCellAt(component.shadowRoot, {column: 1, row: 1});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowLeft');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('does not let the user move left if they are at the first visible column', () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowLeft');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('lets the user press the down arrow key to navigate down', () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 2});
    });

    it('keeps the user where they are if they are on the last row', () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      // Go down to row 2
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      // Go down to row 3 (the last row)
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 3});
      // Try going down again
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 3});
    });

    it('lets the user press the up arrow key to navigate up', () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);

      emulateUserFocusingCellAt(component.shadowRoot, {column: 1, row: 2});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowUp');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 1, row: 1});
    });

    it('does not let the user move up into the column row when none are sortable', () => {
      const component = renderDataGrid({rows, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowUp');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('does let the user move up into the column row when they are sortable', () => {
      const component = renderDataGrid({rows, columns});
      assertShadowRoot(component.shadowRoot);
      const table = component.shadowRoot.querySelector('table');
      assertElement(table, HTMLTableElement);
      emulateUserFocusingCellAt(component.shadowRoot, {column: 0, row: 1});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowUp');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 0});
    });

    it('correctly skips hidden columns', () => {
      const columnsWithCountryHidden = createColumns();
      columnsWithCountryHidden[1].hidden = true;
      const component = renderDataGrid({rows, columns: columnsWithCountryHidden});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowRight');
      // It's column 2 here because column 1 is hidden
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 2, row: 0});
    });

    it('correctly skips hidden rows when navigating from the column header', () => {
      const rowsWithLondonHidden = createRows();
      rowsWithLondonHidden[0].hidden = true;
      const component = renderDataGrid({rows: rowsWithLondonHidden, columns});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 0});
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      // It's row 2 here because row 1 is hidden
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 2});
    });

    it('correctly skips hidden rows when navigating from a body row to another', () => {
      const rowsWithMunichHidden = createRows();
      rowsWithMunichHidden[1].hidden = true;
      const component = renderDataGrid({rows: rowsWithMunichHidden, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      // It's 3 here because row 2 is hidden
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 3});
    });

    it('correctly marks the first visible row cell as focusable when the first row is hidden', () => {
      const rowsWithLondonHidden = createRows();
      rowsWithLondonHidden[0].hidden = true;
      const component = renderDataGrid({rows: rowsWithLondonHidden, columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 2});
    });

    it('re-adjusts the focused cell if a re-render puts that cell out of bounds', () => {
      const component = renderDataGrid({rows: createRows(), columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 3});
      const rowsWithLastRemoved = createRows();
      rowsWithLastRemoved.splice(2);
      component.data = {
        columns: columnsWithNoneSortable,
        rows: rowsWithLastRemoved,
        activeSort: null,
      };
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 2});
    });

    it('resets the user to the first focusable cell if their row is hidden', () => {
      const component = renderDataGrid({rows: createRows(), columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowDown');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 3});
      const rowsWithLastHidden = createRows();
      rowsWithLastHidden[2].hidden = true;
      component.data = {
        columns: columnsWithNoneSortable,
        rows: rowsWithLastHidden,
        activeSort: null,
      };
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 0, row: 1});
    });

    it('resets the user to the first focusable cell if their column is hidden', () => {
      const component = renderDataGrid({rows: createRows(), columns: columnsWithNoneSortable});
      assertShadowRoot(component.shadowRoot);
      focusTableCell(component.shadowRoot);
      emulateUserKeyboardNavigation(component.shadowRoot, 'ArrowRight');
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 1, row: 1});
      const columnsWithFirstHidden = createColumns();
      columnsWithFirstHidden[0].hidden = true;
      component.data = {
        columns: columnsWithFirstHidden,
        rows: createRows(),
        activeSort: null,
      };
      assertCurrentFocusedCellIs(component.shadowRoot, {column: 1, row: 0});
    });
  });

  it('emits an event when the user clicks a column header', async () => {
    const component = renderDataGrid({rows, columns});
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);

    const columnHeaderClickEvent =
        getEventPromise<UIComponents.DataGrid.ColumnHeaderClickEvent>(component, 'column-header-click');
    const cityColumn = getHeaderCellForColumnId(component.shadowRoot, 'city');
    dispatchClickEvent(cityColumn);

    const clickEvent = await columnHeaderClickEvent;
    assert.deepEqual(clickEvent.data, {column: columns[0], columnIndex: 0});
  });

  it('emits an event when the user "clicks" a column header with the enter key', async () => {
    const component = renderDataGrid({rows, columns});
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);

    const columnHeaderClickEvent =
        getEventPromise<UIComponents.DataGrid.ColumnHeaderClickEvent>(component, 'column-header-click');
    const focusableCell = getFocusableCell(component.shadowRoot);
    focusableCell.focus();
    const table = component.shadowRoot.querySelector('table');
    assertElement(table, HTMLTableElement);
    // Navigate up to the column header
    dispatchKeyDownEvent(table, {key: UIComponents.DataGridUtils.ArrowKey.UP});
    const newFocusedCell = getFocusableCell(component.shadowRoot);
    assert.strictEqual(newFocusedCell.getAttribute('data-row-index'), '0');
    assert.strictEqual(newFocusedCell.getAttribute('data-col-index'), '0');

    dispatchKeyDownEvent(table, {key: 'Enter'});

    const clickEvent = await columnHeaderClickEvent;

    assert.deepEqual(clickEvent.data, {column: columns[0], columnIndex: 0});
  });

  describe('adding new rows', () => {
    it('only has one DOM mutation to add the new row', async () => {
      const component = renderDataGrid({rows, columns});
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);

      await withMutations(
          [
            // We expect one <tr> to be added
            {target: 'tr', max: 1},
          ],
          component.shadowRoot, shadowRoot => {
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

            const newRowValues = getValuesOfBodyRowByAriaIndex(shadowRoot, 4);
            assert.deepEqual(newRowValues, ['Berlin', 'Germany', '3.66m']);
          });
    });

    it('scrolls to the bottom of the table when a row is inserted', async () => {
      const container = document.createElement('div');
      container.style.height = '100px';

      const columns = [
        {id: 'key', title: 'Key', sortable: false, widthWeighting: 1},
        {id: 'value', title: 'Value', sortable: false, widthWeighting: 1},
      ];

      const rows: UIComponents.DataGridUtils.Row[] = [
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'One'}]},
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'Two'}]},
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'Three'}]},
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'Four'}]},
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'Five'}]},
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'Six'}]},
      ];
      const component = renderDataGrid({rows, columns});
      container.appendChild(component);
      renderElementIntoDOM(container);
      assertShadowRoot(component.shadowRoot);

      const scrolledElement = component.shadowRoot.querySelector('.wrapping-container');
      assertElement(scrolledElement, HTMLDivElement);
      assert.strictEqual(scrolledElement.scrollTop, 0);
      const newRow = {
        cells: [
          {columnId: 'key', value: 'Newly inserted'},
          {columnId: 'value', value: 'row'},
        ],
      };
      component.data = {
        columns,
        rows: [...rows, newRow],
        activeSort: null,
      };
      assert.strictEqual(scrolledElement.scrollTop, 61);
    });

    it('does not auto scroll if the user has a cell selected', () => {
      const container = document.createElement('div');
      container.style.height = '100px';

      const columns = [
        {id: 'key', title: 'Key', sortable: false, widthWeighting: 1},
        {id: 'value', title: 'Value', sortable: false, widthWeighting: 1},
      ];

      const rows: UIComponents.DataGridUtils.Row[] = [
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'One'}]},
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'Two'}]},
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'Three'}]},
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'Four'}]},
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'Five'}]},
        {cells: [{columnId: 'key', value: 'Row'}, {columnId: 'value', value: 'Six'}]},
      ];
      const component = renderDataGrid({rows, columns});
      container.appendChild(component);
      renderElementIntoDOM(container);
      assertShadowRoot(component.shadowRoot);

      // Mimic the user tabbing into the table
      const firstFocusedCell = getFocusableCell(component.shadowRoot);
      firstFocusedCell.focus();

      const scrolledElement = component.shadowRoot.querySelector('.wrapping-container');
      assertElement(scrolledElement, HTMLDivElement);

      const newRow = {
        cells: [
          {columnId: 'key', value: 'Newly inserted'},
          {columnId: 'value', value: 'row'},
        ],
      };
      component.data = {
        columns,
        rows: [...rows, newRow],
        activeSort: null,
      };
      assert.strictEqual(scrolledElement.scrollTop, 0);
    });
  });

  describe('UIComponents.DataGridUtils.calculateColumnWidthPercentageFromWeighting', () => {
    const makeColumnsWithWeightings = (...weights: number[]): UIComponents.DataGridUtils.Column[] => {
      return weights.map((weight, index) => {
        return {
          id: `column-${index}`,
          title: `Column ${index}`,
          sortable: false,
          hidden: false,
          widthWeighting: weight,
        };
      });
    };

    it('correctly divides columns based on the weighting', () => {
      const columns = makeColumnsWithWeightings(1, 1);
      const calculatedWidths =
          columns.map(col => UIComponents.DataGridUtils.calculateColumnWidthPercentageFromWeighting(columns, col.id));
      assert.deepEqual(calculatedWidths, [50, 50]);
    });

    it('correctly divides and rounds when the % are not whole numbers', () => {
      const columns = makeColumnsWithWeightings(1, 1, 1);
      const calculatedWidths =
          columns.map(col => UIComponents.DataGridUtils.calculateColumnWidthPercentageFromWeighting(columns, col.id));
      assert.deepEqual(calculatedWidths, [33, 33, 33]);
    });

    it('does not include hidden columns when calculating weighting', () => {
      const columns = makeColumnsWithWeightings(1, 1, 1);
      columns[0].hidden = true;
      const calculatedWidths =
          columns.map(col => UIComponents.DataGridUtils.calculateColumnWidthPercentageFromWeighting(columns, col.id));
      assert.deepEqual(calculatedWidths, [0, 50, 50]);
    });

    it('errors if a column has a weighting of less than 1', () => {
      const columns = makeColumnsWithWeightings(0.5);
      assert.throws(
          () => UIComponents.DataGridUtils.calculateColumnWidthPercentageFromWeighting(columns, columns[0].id),
          'Error with column column-0: width weightings must be >= 1.');
    });
  });

  describe('#UIComponents.DataGridUtils.handleArrowKeyNavigation util', () => {
    const makeColumns = (): UIComponents.DataGridUtils.Column[] => {
      return [
        {id: 'a', title: 'A', sortable: false, hidden: false, widthWeighting: 1},
        {id: 'b', title: 'B', sortable: false, hidden: false, widthWeighting: 1},
        {id: 'c', title: 'C', sortable: false, hidden: false, widthWeighting: 1},
      ];
    };

    const makeRows = (): UIComponents.DataGridUtils.Row[] => {
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
      it('does not let the user move further left than the first column', () => {
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.LEFT,
          currentFocusedCell: [0, 1],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });

      it('does not let the user move left if there are no visible columns to the left', () => {
        const columnsWithFirstHidden = makeColumns();
        columnsWithFirstHidden[0].hidden = true;
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.LEFT,
          currentFocusedCell: [1, 1],
          columns: columnsWithFirstHidden,
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [1, 1]);
      });

      it('lets the user move left if the column to the left is visible', () => {
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.LEFT,
          currentFocusedCell: [1, 1],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });

      it('correctly skips a hidden column to get to the next left visible column', () => {
        const withSecondColumnHidden = makeColumns();
        withSecondColumnHidden[1].hidden = true;
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.LEFT,
          currentFocusedCell: [2, 1],
          columns: withSecondColumnHidden,
          rows,
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });
    });

    describe('navigating right', () => {
      it('does not let the user move further right than the last column', () => {
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.RIGHT,
          currentFocusedCell: [2, 1],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [2, 1]);
      });

      it('does not let the user move right if there are no visible columns to the right', () => {
        const columnsWithLastHidden = makeColumns();
        columnsWithLastHidden[2].hidden = true;
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.RIGHT,
          currentFocusedCell: [1, 1],
          columns: columnsWithLastHidden,
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [1, 1]);
      });

      it('lets the user move right if the column to the right is visible', () => {
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.RIGHT,
          currentFocusedCell: [1, 1],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [2, 1]);
      });

      it('correctly skips a hidden column to get to the next right visible column', () => {
        const withSecondColumnHidden = makeColumns();
        withSecondColumnHidden[1].hidden = true;
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.RIGHT,
          currentFocusedCell: [0, 1],
          columns: withSecondColumnHidden,
          rows,
        });
        assert.deepEqual(newFocusedCell, [2, 1]);
      });
    });

    describe('navigating up', () => {
      it('does not let the user go into the columns row when none are sortable', () => {
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.UP,
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

        it('does let the user go into the columns row', () => {
          const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
            key: UIComponents.DataGridUtils.ArrowKey.UP,
            currentFocusedCell: [0, 1],
            columns: sortableColumns,
            rows: makeRows(),
          });
          assert.deepEqual(newFocusedCell, [0, 0]);
        });

        it('does not let the user go up if they are in the column header', () => {
          const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
            key: UIComponents.DataGridUtils.ArrowKey.UP,
            currentFocusedCell: [0, 0],
            columns: sortableColumns,
            rows: makeRows(),
          });
          assert.deepEqual(newFocusedCell, [0, 0]);
        });

        it('correctly skips a hidden row to navigate into the columns row', () => {
          const rowsWithFirstHidden = makeRows();
          rowsWithFirstHidden[0].hidden = true;
          const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
            key: UIComponents.DataGridUtils.ArrowKey.UP,
            currentFocusedCell: [0, 2],
            columns: sortableColumns,
            rows: rowsWithFirstHidden,
          });
          assert.deepEqual(newFocusedCell, [0, 0]);
        });
      });

      it('correctly skips a hidden row while navigating through the body rows', () => {
        const rowsWithSecondHidden = makeRows();
        rowsWithSecondHidden[1].hidden = true;
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.UP,
          currentFocusedCell: [0, 3],
          columns: makeColumns(),
          rows: rowsWithSecondHidden,
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });

      it('does not let the user move up if no columns are sortable and all rows above are hidden', () => {
        const rowsWithFirstAndSecondHidden = makeRows();
        rowsWithFirstAndSecondHidden[0].hidden = true;
        rowsWithFirstAndSecondHidden[1].hidden = true;
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.UP,
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

        it('lets the user navigate from the columns into the body', () => {
          const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
            key: UIComponents.DataGridUtils.ArrowKey.DOWN,
            currentFocusedCell: [0, 0],
            columns: sortableColumns,
            rows: makeRows(),
          });
          assert.deepEqual(newFocusedCell, [0, 1]);
        });

        it('correctly skips any hidden body rows to find the first visible one', () => {
          const rowsWithFirstHidden = makeRows();
          rowsWithFirstHidden[0].hidden = true;
          const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
            key: UIComponents.DataGridUtils.ArrowKey.DOWN,
            currentFocusedCell: [0, 0],
            columns: sortableColumns,
            rows: rowsWithFirstHidden,
          });
          assert.deepEqual(newFocusedCell, [0, 2]);
        });
      });

      it('correctly skips a hidden row while navigating through the body rows', () => {
        const rowsWithSecondHidden = makeRows();
        rowsWithSecondHidden[1].hidden = true;
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.DOWN,
          currentFocusedCell: [0, 1],
          columns: makeColumns(),
          rows: rowsWithSecondHidden,
        });
        assert.deepEqual(newFocusedCell, [0, 3]);
      });

      it('does not let the user move down if all rows below are hidden', () => {
        const rowsWithFirstAndSecondHidden = makeRows();
        rowsWithFirstAndSecondHidden[1].hidden = true;
        rowsWithFirstAndSecondHidden[2].hidden = true;
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.DOWN,
          currentFocusedCell: [0, 1],
          columns: makeColumns(),
          rows: rowsWithFirstAndSecondHidden,
        });
        assert.deepEqual(newFocusedCell, [0, 1]);
      });

      it('leaves the user where they are if no body rows are visible', () => {
        const rowsAllHidden = makeRows().map(row => {
          row.hidden = true;
          return row;
        });
        const sortableColumns = makeColumns().map(col => {
          col.sortable = true;
          return col;
        });
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.DOWN,
          currentFocusedCell: [0, 0],
          columns: sortableColumns,
          rows: rowsAllHidden,
        });
        assert.deepEqual(newFocusedCell, [0, 0]);
      });

      it('does not let the user move down if they are on the last row', () => {
        const newFocusedCell = UIComponents.DataGridUtils.handleArrowKeyNavigation({
          key: UIComponents.DataGridUtils.ArrowKey.DOWN,
          currentFocusedCell: [0, 3],
          columns: makeColumns(),
          rows: makeRows(),
        });
        assert.deepEqual(newFocusedCell, [0, 3]);
      });
    });
  });
});
