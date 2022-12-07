// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import * as DataGrid from '../../../../../../../front_end/ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertShadowRoot, getElementWithinComponent, renderElementIntoDOM} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import {getHeaderCells, getValuesOfAllBodyRows} from '../../../../ui/components/DataGridHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const renderPreloadingGrid =
    async(rows: PreloadingComponents.PreloadingGrid.PreloadingGridRow[]): Promise<HTMLElement> => {
  const component = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
  component.update(rows);
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();

  const controller = getElementWithinComponent(
      component, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  assertShadowRoot(controller.shadowRoot);
  const datagrid = getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assertShadowRoot(datagrid.shadowRoot);

  return datagrid;
};

const getHeaderText = (cell: HTMLTableCellElement): string|null => {
  return cell.textContent?.trim() ||
      cell.querySelector('devtools-resources-reports-grid-status-header')?.shadowRoot?.textContent?.trim() || null;
};

describeWithEnvironment('PreloadingGrid', async () => {
  it('renders header', async () => {
    const dataGrid = await renderPreloadingGrid([]);
    assertShadowRoot(dataGrid.shadowRoot);

    const headerCells = getHeaderCells(dataGrid.shadowRoot);
    const values = Array.from(headerCells, getHeaderText);
    assert.deepEqual(values, ['Started at', 'Type', 'Trigger', 'URL', 'Status']);
  });

  it('renders grid with content', async () => {
    const rows = [{
      id: 'id',
      startedAt: '2006-01-02T15:04:05Z',
      type: 'Prerendering',
      trigger: 'SpeculationRules',
      url: 'https://example.com/prerendered.html',
      status: 'Prerendering',
    }];

    const dataGrid = await renderPreloadingGrid(rows);
    assertShadowRoot(dataGrid.shadowRoot);

    const rowValues = getValuesOfAllBodyRows(dataGrid.shadowRoot);
    assert.strictEqual(rowValues.length, 1);
    assert.strictEqual(rowValues[0][0], '2006-01-02T15:04:05Z');
    assert.strictEqual(rowValues[0][1], 'Prerendering');
    assert.strictEqual(rowValues[0][2], 'SpeculationRules');
    assert.strictEqual(rowValues[0][3], 'https://example.com/prerendered.html');
    assert.strictEqual(rowValues[0][4], 'Prerendering');
  });
});
