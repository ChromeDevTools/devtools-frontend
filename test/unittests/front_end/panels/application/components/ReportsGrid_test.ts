// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../../front_end/core/root/root.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as DataGrid from '../../../../../../front_end/ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertShadowRoot, getElementWithinComponent, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {getHeaderCells, getValuesOfAllBodyRows} from '../../../ui/components/DataGridHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const renderReportsGrid =
    async(data?: ApplicationComponents.ReportsGrid.ReportsGridData|null): Promise<HTMLElement> => {
  const component = new ApplicationComponents.ReportsGrid.ReportsGrid();
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

const getHeaderText = (cell: HTMLTableCellElement): string => {
  const ret = cell.textContent?.trim() ||
      cell.querySelector('devtools-resources-reports-grid-status-header')?.shadowRoot?.textContent?.trim();
  assertNotNullOrUndefined(ret);
  return ret;
};

describeWithEnvironment('ReportsGrid', async () => {
  it('displays placeholder text if no data', async () => {
    const component = await renderReportsGrid();
    assertShadowRoot(component.shadowRoot);

    const placeholder = component.shadowRoot.querySelector('.reporting-placeholder div');
    assert.strictEqual(placeholder?.textContent, 'No reports to display');
  });

  it('renders grid with correct content', async () => {
    const body = {
      columnNumber: 8,
      id: 'PrefixedStorageInfo',
      lineNumber: 15,
      message:
          '\'window.webkitStorageInfo\' is deprecated. Please use \'navigator.webkitTemporaryStorage\' or \'navigator.webkitPersistentStorage\' instead.',
      sourceFile: 'https://example.com/script.js',
    };
    const data = {
      reports: [{
        id: 'some_id' as Protocol.Network.ReportId,
        initiatorUrl: 'https://example.com/script.js',
        destination: 'main-endpoint',
        type: 'deprecation',
        timestamp: 1632747042.12696,
        depth: 1,
        completedAttempts: 0,
        body: JSON.stringify(body),
        status: Protocol.Network.ReportStatus.Queued,
      }],
    };

    const dataGrid = await renderReportsGrid(data);
    assertShadowRoot(dataGrid.shadowRoot);

    const headerCells = getHeaderCells(dataGrid.shadowRoot);
    const values = Array.from(headerCells, getHeaderText);
    assert.deepEqual(values, ['URL', 'Type', 'Status', 'Destination', 'Generated at', 'Body']);

    const rowValues = getValuesOfAllBodyRows(dataGrid.shadowRoot);
    assert.strictEqual(rowValues[0][0], 'https://example.com/script.js', 'URL does not match');
    assert.strictEqual(rowValues[0][1], 'deprecation', 'Type does not match');
    assert.strictEqual(rowValues[0][2], 'Queued', 'Status does not match');
    assert.strictEqual(rowValues[0][3], 'main-endpoint', 'Destination does not match');
    assert.strictEqual(rowValues[0][5], JSON.stringify(JSON.stringify(body)), 'Body does not match');
  });

  it('renders ID column if experiment is enabled', async () => {
    Root.Runtime.experiments.enableForTest('protocolMonitor');
    const body = {
      columnNumber: 8,
      id: 'PrefixedStorageInfo',
      lineNumber: 15,
      message:
          '\'window.webkitStorageInfo\' is deprecated. Please use \'navigator.webkitTemporaryStorage\' or \'navigator.webkitPersistentStorage\' instead.',
      sourceFile: 'https://example.com/script.js',
    };
    const data = {
      reports: [{
        id: 'some_id' as Protocol.Network.ReportId,
        initiatorUrl: 'https://example.com/script.js',
        destination: 'main-endpoint',
        type: 'deprecation',
        timestamp: 1632747042.12696,
        depth: 1,
        completedAttempts: 0,
        body: JSON.stringify(body),
        status: Protocol.Network.ReportStatus.Queued,
      }],
    };

    const dataGrid = await renderReportsGrid(data);
    assertShadowRoot(dataGrid.shadowRoot);

    const headerCells = getHeaderCells(dataGrid.shadowRoot);
    const values = Array.from(headerCells, getHeaderText);
    assert.deepEqual(values, ['ID', 'URL', 'Type', 'Status', 'Destination', 'Generated at', 'Body']);

    const rowValues = getValuesOfAllBodyRows(dataGrid.shadowRoot);
    assert.strictEqual(rowValues[0][0], 'some_id', 'ID does not match');
    assert.strictEqual(rowValues[0][1], 'https://example.com/script.js', 'URL does not match');
    assert.strictEqual(rowValues[0][2], 'deprecation', 'Type does not match');
    assert.strictEqual(rowValues[0][3], 'Queued', 'Status does not match');
    assert.strictEqual(rowValues[0][4], 'main-endpoint', 'Destination does not match');
    assert.strictEqual(rowValues[0][6], JSON.stringify(JSON.stringify(body)), 'Body does not match');
  });
});
