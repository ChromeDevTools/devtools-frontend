// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  getAllRows,
  getHeaderCellForColumnId,
  getValuesForColumn,
  getValuesOfAllBodyRows,
} from '../../../testing/DataGridHelpers.js';
import {
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import {TEXT_NODE, withMutations} from '../../../testing/MutationHelpers.js';
import * as Coordinator from '../render_coordinator/render_coordinator.js';

import * as DataGrid from './data_grid.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const getInternalDataGridShadowRoot = (component: DataGrid.DataGridController.DataGridController) => {
  const {shadowRoot} = component.shadowRoot!.querySelector('devtools-data-grid')!;
  assert.isNotNull(shadowRoot);
  return shadowRoot;
};

describe('DataGridController', () => {
  describeWithLocale('sorting the columns', () => {
    const columns = [
      {id: 'key', title: 'Key', sortable: true, widthWeighting: 1, visible: true, hideable: false},
    ] as DataGrid.DataGridUtils.Column[];
    const rows = [
      {cells: [{columnId: 'key', value: 'Bravo'}]},
      {cells: [{columnId: 'key', value: 'Alpha'}]},
      {cells: [{columnId: 'key', value: 'Charlie'}]},
    ];
    const numericRows = [
      {cells: [{columnId: 'key', value: 2}]},
      {cells: [{columnId: 'key', value: 1}]},
      {cells: [{columnId: 'key', value: 3}]},
    ];

    it('lets the user click to sort the column in ASC order', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows, columns};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const internalDataGridShadow = getInternalDataGridShadowRoot(component);

      await withMutations(
          [{
            // Two text mutations as LitHtml updates the text nodes but does not
            // touch the actual DOM nodes.
            target: TEXT_NODE,
            max: 2,
          }],
          internalDataGridShadow, async shadowRoot => {
            const keyHeader = getHeaderCellForColumnId(shadowRoot, 'key');
            dispatchClickEvent(keyHeader);
            await coordinator.done();
            const cellValues = getValuesForColumn(shadowRoot, 'key');
            assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
          });
    });

    it('supports sorting numeric columns', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows: numericRows, columns};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const internalDataGridShadow = getInternalDataGridShadowRoot(component);

      const keyHeader = getHeaderCellForColumnId(internalDataGridShadow, 'key');
      dispatchClickEvent(keyHeader);  // ASC order
      await coordinator.done();
      let cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['1', '2', '3']);
      dispatchClickEvent(keyHeader);  // DESC order
      await coordinator.done();
      cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['3', '2', '1']);
    });

    it('can be provided an initial sort which is immediately applied', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {
        rows,
        columns,
        initialSort: {
          columnId: 'key',
          direction: DataGrid.DataGridUtils.SortDirection.ASC,
        },
      };

      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
    });

    it('lets the user click to change the sort when it is initially provided', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {
        rows,
        columns,
        initialSort: {
          columnId: 'key',
          direction: DataGrid.DataGridUtils.SortDirection.ASC,
        },
      };

      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const keyHeader = getHeaderCellForColumnId(internalDataGridShadow, 'key');
      let cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
      dispatchClickEvent(keyHeader);  // DESC order
      await coordinator.done();
      cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Charlie', 'Bravo', 'Alpha']);
    });

    it('lets the user click twice to sort the column in DESC order', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows, columns};

      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);

      const keyHeader = getHeaderCellForColumnId(internalDataGridShadow, 'key');
      dispatchClickEvent(keyHeader);  // ASC order
      await coordinator.done();
      let cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
      dispatchClickEvent(keyHeader);  // DESC order
      await coordinator.done();
      cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Charlie', 'Bravo', 'Alpha']);
    });

    it('resets the sort if the user clicks after setting the sort to DESC', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows, columns};

      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);

      const keyHeader = getHeaderCellForColumnId(internalDataGridShadow, 'key');
      const originalCellValues = getValuesForColumn(internalDataGridShadow, 'key');
      dispatchClickEvent(keyHeader);  // ASC order
      await coordinator.done();
      let cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
      dispatchClickEvent(keyHeader);  // DESC order
      await coordinator.done();
      cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Charlie', 'Bravo', 'Alpha']);
      dispatchClickEvent(keyHeader);  // Now reset!
      await coordinator.done();
      const finalCellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(finalCellValues, originalCellValues);
    });

    it('persists the sort as new data is added and inserts new data into the right place', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows, columns};

      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);

      const keyHeader = getHeaderCellForColumnId(internalDataGridShadow, 'key');
      dispatchClickEvent(keyHeader);  // ASC order
      await coordinator.done();
      let cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      // Ensure we are in ASC order
      assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
      const newRow = {cells: [{columnId: 'key', value: 'Baz'}]};
      const newRows = [...rows, newRow];
      component.data = {
        ...component.data,
        rows: newRows,
      };
      await coordinator.done();
      cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Alpha', 'Baz', 'Bravo', 'Charlie']);
    });
  });

  describeWithLocale('filtering rows', () => {
    const columns = [
      {id: 'key', title: 'Letter', sortable: true, widthWeighting: 1, visible: true, hideable: false},
      {id: 'value', title: 'Phonetic', sortable: true, widthWeighting: 1, visible: true, hideable: false},
    ] as DataGrid.DataGridUtils.Column[];
    const rows = [
      {
        cells: [
          {columnId: 'key', value: 'Letter A'},
          {columnId: 'value', value: 'Alpha'},
        ],
      },
      {
        cells: [
          {columnId: 'key', value: 'Letter B'},
          {columnId: 'value', value: 'Bravo'},
        ],
      },
      {
        cells: [
          {columnId: 'key', value: 'Letter C'},
          {columnId: 'value', value: 'Charlie'},
        ],
      },
    ];

    const createPlainTextFilter = (text: string) => ({
      text,
      key: undefined,
      regex: undefined,
      negative: false,
    });

    const createRegexFilter = (text: string) => ({
      text: undefined,
      key: undefined,
      regex: new RegExp(text, 'i'),  // i because the FilterParser adds that flag
      negative: false,
    });

    const createColumnFilter = (key: string, text: string) => ({
      text,
      key,
      regex: undefined,
      negative: false,
    });

    it('only shows rows with values that match the filter', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows, columns, filters: [createPlainTextFilter('bravo')]};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter B', 'Bravo'],
      ]);
    });

    it('only compares visible columns when matching filter', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows, columns, filters: [createPlainTextFilter('e')]};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      let renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter A', 'Alpha'],
        ['Letter B', 'Bravo'],
        ['Letter C', 'Charlie'],
      ]);

      const columnsWithInvisible = structuredClone(columns);
      columnsWithInvisible[0].visible = false;
      component.data = {
        ...component.data,
        columns: columnsWithInvisible,
      };
      await coordinator.done();
      renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [['Charlie']]);
    });

    it('renders only visible rows, but maintains proper aria-rowindexes for the rows that are rendered', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows, columns, filters: [createPlainTextFilter('bravo')]};

      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const renderedRows = getAllRows(internalDataGridShadow);
      assert.deepEqual(renderedRows.map(row => row.getAttribute('aria-rowindex')), ['2']);
    });

    it('shows all rows if the filter is then cleared', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows, columns, filters: [createPlainTextFilter('bravo')]};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();

      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      let renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.lengthOf(renderedRowValues, 1);
      component.data = {
        ...component.data,
        filters: [],
      };
      await coordinator.done();
      renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow);
      assert.lengthOf(renderedRowValues, 3);
    });

    it('supports a regex filter', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows, columns, filters: [createRegexFilter('bravo')]};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter B', 'Bravo'],
      ]);
    });

    it('inverts the filter if given a negative filter', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      const filter = createPlainTextFilter('bravo');
      filter.negative = true;
      component.data = {rows, columns, filters: [filter]};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter A', 'Alpha'],
        ['Letter C', 'Charlie'],
      ]);
    });

    it('only shows rows that match all filters when given multiple filters', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      // This matches no rows, as no row can match both of these filters
      component.data = {rows, columns, filters: [createPlainTextFilter('alpha'), createPlainTextFilter('charlie')]};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, []);
    });

    it('supports filtering by column key', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      // By filtering for values with `e` we expect to only get the "Letter C: Charlie" row as it's the only value field with an `e` in.
      component.data = {rows, columns, filters: [createColumnFilter('value', 'e')]};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter C', 'Charlie'],
      ]);
    });

    it('supports negative filtering by column key', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      const filter = createColumnFilter('value', 'e');
      filter.negative = true;
      component.data = {rows, columns, filters: [filter]};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter A', 'Alpha'],
        ['Letter B', 'Bravo'],
      ]);
    });

    it('renders only matching rows even after sorting columns', async () => {
      const component = new DataGrid.DataGridController.DataGridController();
      component.data = {rows, columns, filters: [createPlainTextFilter('h')]};
      renderElementIntoDOM(component);
      assert.isNotNull(component.shadowRoot);
      await coordinator.done();
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      let renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter A', 'Alpha'],
        ['Letter C', 'Charlie'],
      ]);

      const keyHeader = getHeaderCellForColumnId(internalDataGridShadow, 'key');
      dispatchClickEvent(keyHeader);  // ASC order
      await coordinator.done();
      renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter A', 'Alpha'],
        ['Letter C', 'Charlie'],
      ]);

      dispatchClickEvent(keyHeader);  // DESC order
      await coordinator.done();
      renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter C', 'Charlie'],
        ['Letter A', 'Alpha'],
      ]);

      dispatchClickEvent(keyHeader);  // reset order
      await coordinator.done();
      renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter A', 'Alpha'],
        ['Letter C', 'Charlie'],
      ]);
    });
  });
});
