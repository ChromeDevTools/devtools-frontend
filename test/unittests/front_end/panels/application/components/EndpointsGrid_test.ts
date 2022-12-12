// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as DataGrid from '../../../../../../front_end/ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertShadowRoot, getElementWithinComponent, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';
import {getHeaderCells, getValuesOfAllBodyRows} from '../../../ui/components/DataGridHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const renderEndpointsGrid =
    async(data?: ApplicationComponents.EndpointsGrid.EndpointsGridData|null): Promise<HTMLElement> => {
  const component = new ApplicationComponents.EndpointsGrid.EndpointsGrid();
  if (data) {
    component.data = data;
  }
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();
  if (!data) {
    return component;
  }

  const controller = getElementWithinComponent(
      component, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  assertShadowRoot(controller.shadowRoot);
  const datagrid = getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assertShadowRoot(datagrid.shadowRoot);
  return datagrid;
};

describeWithLocale('EndpointsGrid', async () => {
  it('displays placeholder text if no data', async () => {
    const component = new ApplicationComponents.EndpointsGrid.EndpointsGrid();
    renderElementIntoDOM(component);
    assertShadowRoot(component.shadowRoot);
    await coordinator.done();

    const placeholder = component.shadowRoot.querySelector('.reporting-placeholder div');
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
    assertShadowRoot(dataGrid.shadowRoot);

    const header = Array.from(getHeaderCells(dataGrid.shadowRoot), cell => {
      assertNotNullOrUndefined(cell.textContent);
      return cell.textContent.trim();
    });

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
