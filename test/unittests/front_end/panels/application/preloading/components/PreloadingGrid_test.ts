// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import * as DataGrid from '../../../../../../../front_end/ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertShadowRoot, getElementWithinComponent, renderElementIntoDOM} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import {getHeaderCells, getValuesOfAllBodyRows} from '../../../../ui/components/DataGridHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

function assertGridContents(gridComponent: HTMLElement, headerExpected: string[], rowsExpected: string[][]) {
  const controller = getElementWithinComponent(
      gridComponent, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  const grid = getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assertShadowRoot(grid.shadowRoot);

  const headerGot = Array.from(getHeaderCells(grid.shadowRoot), cell => {
    assertNotNullOrUndefined(cell.textContent);
    return cell.textContent.trim();
  });
  const rowsGot = getValuesOfAllBodyRows(grid.shadowRoot);

  assert.deepEqual([headerGot, rowsGot], [headerExpected, rowsExpected]);
}

describeWithEnvironment('PreloadingGrid', async () => {
  it('renders grid', async () => {
    const rows = [{
      id: 'id',
      action: 'prerender',
      url: 'https://example.com/prerendered.html',
      status: 'Running',
    }];

    const component = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
    component.update(rows);
    renderElementIntoDOM(component);
    await coordinator.done();

    assertGridContents(
        component,
        ['URL', 'Action', 'Status'],
        [
          ['https://example.com/prerendered.html', 'prerender', 'Running'],
        ],
    );
  });
});
