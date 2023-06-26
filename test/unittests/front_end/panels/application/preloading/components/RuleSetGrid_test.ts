// Copyright 2023 The Chromium Authors. All rights reserved.
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

async function renderRuleSetsGrid(rows: PreloadingComponents.RuleSetGrid.RuleSetGridRow[]): Promise<HTMLElement> {
  const component = new PreloadingComponents.RuleSetGrid.RuleSetGrid();
  component.update(rows);
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();

  const controller = getElementWithinComponent(
      component, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  assertShadowRoot(controller.shadowRoot);
  const grid = getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assertShadowRoot(grid.shadowRoot);

  return grid;
}

describeWithEnvironment('RuleSetGrid', async () => {
  it('renders grid with content', async () => {
    const rows = [{
      id: 'ruleSetId:0.1',
      processLocalId: '1',
      preloadsStatusSummary: '1 Not triggered / 2 Ready / 3 Failure',
      validity: 'Valid',
      location: '<script>',
    }];

    const grid = await renderRuleSetsGrid(rows);
    assertShadowRoot(grid.shadowRoot);

    const header = Array.from(getHeaderCells(grid.shadowRoot), cell => {
      assertNotNullOrUndefined(cell.textContent);
      return cell.textContent.trim();
    });
    const bodyRows = getValuesOfAllBodyRows(grid.shadowRoot);
    assert.deepEqual([header, bodyRows], [
      ['#', 'Validity', 'Location', 'Preloads'],
      [['1', 'Valid', '<script>', '1 Not triggered / 2 Ready / 3 Failure']],
    ]);
  });
});
