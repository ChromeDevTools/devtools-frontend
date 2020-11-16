// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UIComponents from '../../../../../front_end/ui/components/components.js';  // eslint-disable-line rulesdir/es_modules_import
import {assertNotNull, assertShadowRoot, dispatchClickEvent, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {TEXT_NODE, withMutations, withNoMutations} from '../../helpers/MutationHelpers.js';
import {getAllRows, getHeaderCellForColumnId, getValuesForColumn, getValuesOfAllBodyRows} from './DataGridHelpers.js';

const {assert} = chai;


const getInternalDataGridShadowRoot = (component: UIComponents.DataGridController.DataGridController): ShadowRoot => {
  assertShadowRoot(component.shadowRoot);
  const internalDataGrid = component.shadowRoot.querySelector('devtools-data-grid');
  assertNotNull(internalDataGrid);
  const internalShadow = internalDataGrid.shadowRoot;
  assertShadowRoot(internalShadow);
  return internalShadow;
};

describe('DataGridController', () => {
  describe('sorting the columns', () => {
    const columns = [
      {id: 'key', title: 'Key', sortable: true, widthWeighting: 1},
    ];
    const rows = [
      {cells: [{columnId: 'key', value: 'Bravo', title: 'Bravo'}]},
      {cells: [{columnId: 'key', value: 'Alpha', title: 'Alpha'}]},
      {cells: [{columnId: 'key', value: 'Charlie', title: 'Charlie'}]},
    ];

    it('lets the user click to sort the column in ASC order', async () => {
      const component = new UIComponents.DataGridController.DataGridController();
      component.data = {rows, columns};

      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);

      const internalDataGridShadow = getInternalDataGridShadowRoot(component);

      await withMutations(
          [{
            // Two text mutations as LitHtml updates the text nodes but does not
            // touch the actual DOM nodes.
            target: TEXT_NODE,
            max: 2,
          }],
          internalDataGridShadow, shadowRoot => {
            const keyHeader = getHeaderCellForColumnId(shadowRoot, 'key');
            dispatchClickEvent(keyHeader);
            const cellValues = getValuesForColumn(shadowRoot, 'key');
            assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
          });
    });

    it('can be provided an initial sort which is immediately applied', async () => {
      const component = new UIComponents.DataGridController.DataGridController();
      component.data = {
        rows,
        columns,
        initialSort: {
          columnId: 'key',
          direction: UIComponents.DataGridUtils.SortDirection.ASC,
        },
      };

      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);

      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
    });

    it('lets the user click to change the sort when it is initially provided', async () => {
      const component = new UIComponents.DataGridController.DataGridController();
      component.data = {
        rows,
        columns,
        initialSort: {
          columnId: 'key',
          direction: UIComponents.DataGridUtils.SortDirection.ASC,
        },
      };

      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);

      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const keyHeader = getHeaderCellForColumnId(internalDataGridShadow, 'key');
      let cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
      dispatchClickEvent(keyHeader);  // DESC order
      cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Charlie', 'Bravo', 'Alpha']);
    });

    it('lets the user click twice to sort the column in DESC order', () => {
      const component = new UIComponents.DataGridController.DataGridController();
      component.data = {rows, columns};

      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);

      const keyHeader = getHeaderCellForColumnId(internalDataGridShadow, 'key');
      dispatchClickEvent(keyHeader);  // ASC order
      let cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
      dispatchClickEvent(keyHeader);  // DESC order
      cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Charlie', 'Bravo', 'Alpha']);
    });

    it('resets the sort if the user clicks after setting the sort to DESC', () => {
      const component = new UIComponents.DataGridController.DataGridController();
      component.data = {rows, columns};

      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);

      const keyHeader = getHeaderCellForColumnId(internalDataGridShadow, 'key');
      const originalCellValues = getValuesForColumn(internalDataGridShadow, 'key');
      dispatchClickEvent(keyHeader);  // ASC order
      let cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Alpha', 'Bravo', 'Charlie']);
      dispatchClickEvent(keyHeader);  // DESC order
      cellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(cellValues, ['Charlie', 'Bravo', 'Alpha']);
      dispatchClickEvent(keyHeader);  // Now reset!
      const finalCellValues = getValuesForColumn(internalDataGridShadow, 'key');
      assert.deepEqual(finalCellValues, originalCellValues);
    });
  });

  describe('filtering rows', () => {
    const columns = [
      {id: 'key', title: 'Letter', sortable: true, widthWeighting: 1},
      {id: 'value', title: 'Phonetic', sortable: true, widthWeighting: 1},
    ];
    const rows = [
      {
        cells: [
          {columnId: 'key', value: 'Letter A', title: 'Letter A'},
          {columnId: 'value', value: 'Alpha', title: 'Alpha'},
        ],
      },
      {
        cells: [
          {columnId: 'key', value: 'Letter B', title: 'Letter B'},
          {columnId: 'value', value: 'Bravo', title: 'Bravo'},
        ],
      },
      {
        cells: [
          {columnId: 'key', value: 'Letter C', title: 'Letter C'},
          {columnId: 'value', value: 'Charlie', title: 'Charlie'},
        ],
      },
    ];

    it('only shows rows with values that match the filter', () => {
      const component = new UIComponents.DataGridController.DataGridController();
      component.data = {rows, columns, filterText: 'Bravo'};

      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      const renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.deepEqual(renderedRowValues, [
        ['Letter B', 'Bravo'],
      ]);
    });

    it('does not mutate the DOM when filtering', async () => {
      const component = new UIComponents.DataGridController.DataGridController();
      component.data = {rows, columns};
      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);

      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      await withNoMutations(internalDataGridShadow, internalShadowRoot => {
        component.data = {rows, columns, filterText: 'Bravo'};
        const renderedRowValues = getValuesOfAllBodyRows(internalShadowRoot, {onlyVisible: true});
        assert.deepEqual(renderedRowValues, [
          ['Letter B', 'Bravo'],
        ]);
      });
    });

    it('renders all rows but applies a hidden class to hide non-matching rows, maintaining proper aria-rowindex labels',
       () => {
         const component = new UIComponents.DataGridController.DataGridController();
         component.data = {rows, columns, filterText: 'Bravo'};

         renderElementIntoDOM(component);
         assertShadowRoot(component.shadowRoot);
         const internalDataGridShadow = getInternalDataGridShadowRoot(component);
         const renderedRows = getAllRows(internalDataGridShadow);
         assert.lengthOf(renderedRows, 3);
         assert.deepEqual(renderedRows.map(row => row.classList.contains('hidden')), [true, false, true]);
         assert.deepEqual(renderedRows.map(row => row.getAttribute('aria-rowindex')), ['1', '2', '3']);
       });

    it('shows all rows if the filter is then cleared', () => {
      const component = new UIComponents.DataGridController.DataGridController();
      component.data = {rows, columns, filterText: 'Bravo'};

      renderElementIntoDOM(component);
      assertShadowRoot(component.shadowRoot);
      const internalDataGridShadow = getInternalDataGridShadowRoot(component);
      let renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow, {onlyVisible: true});
      assert.lengthOf(renderedRowValues, 1);
      component.data = {
        ...component.data,
        filterText: undefined,
      };
      renderedRowValues = getValuesOfAllBodyRows(internalDataGridShadow);
      assert.lengthOf(renderedRowValues, 3);
    });
  });
});
