// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getHeaderCells, getValuesOfAllBodyRows} from '../../../testing/DataGridHelpers.js';
import {
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as ApplicationComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const renderEndpointsGrid = async (data?: ApplicationComponents.EndpointsGrid.EndpointsGridData|null) => {
  const component = new ApplicationComponents.EndpointsGrid.EndpointsGrid();
  if (data) {
    component.data = data;
  }
  renderElementIntoDOM(component);
  assert.isNotNull(component.shadowRoot);
  await coordinator.done();
  if (!data) {
    return component;
  }

  const controller = getElementWithinComponent(
      component, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  assert.isNotNull(controller.shadowRoot);
  const datagrid = getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assert.isNotNull(datagrid.shadowRoot);
  return datagrid;
};

describeWithLocale('EndpointsGrid', () => {
  it('displays placeholder text if no data', async () => {
    const component = new ApplicationComponents.EndpointsGrid.EndpointsGrid();
    renderElementIntoDOM(component);
    await coordinator.done();

    const placeholder = component.shadowRoot!.querySelector('.reporting-placeholder div');
    assert.strictEqual(placeholder?.textContent, 'No endpoints to display');
  });

  it('renders grid with correct content', async () => {
    const endpoints = new Map([
      [
        'https://www.my-page.com',
        [
          {url: 'https://www.reports-endpoint/main', groupName: 'main-endpoint'},
          {url: 'https://www.reports-endpoint/default', groupName: 'default'},
        ],
      ],
      [
        'https://www.other-page.com',
        [
          {url: 'https://www.csp-reports/csp', groupName: 'csp-endpoint'},
        ],
      ],
    ]);
    const data = {endpoints};

    const dataGrid = await renderEndpointsGrid(data);
    assert.isNotNull(dataGrid.shadowRoot);

    const header = getHeaderCells(dataGrid.shadowRoot).map(({textContent}) => textContent!.trim());
    assert.deepEqual(header, ['Origin', 'Name', 'URL']);

    const rowValues = getValuesOfAllBodyRows(dataGrid.shadowRoot);
    assert.strictEqual(rowValues.length, 3);
    assert.strictEqual(rowValues[0][0], 'https://www.my-page.com', 'Endpoint origin does not match');
    assert.strictEqual(rowValues[0][1], 'main-endpoint', 'Endpoint name does not match');
    assert.strictEqual(rowValues[0][2], 'https://www.reports-endpoint/main', 'Endpoint URL does not match');
    assert.strictEqual(rowValues[1][0], 'https://www.my-page.com', 'Endpoint origin does not match');
    assert.strictEqual(rowValues[1][1], 'default', 'Endpoint name does not match');
    assert.strictEqual(rowValues[1][2], 'https://www.reports-endpoint/default', 'Endpoint URL does not match');
    assert.strictEqual(rowValues[2][0], 'https://www.other-page.com', 'Endpoint origin does not match');
    assert.strictEqual(rowValues[2][1], 'csp-endpoint', 'Endpoint name does not match');
    assert.strictEqual(rowValues[2][2], 'https://www.csp-reports/csp', 'Endpoint URL does not match');
  });
});
