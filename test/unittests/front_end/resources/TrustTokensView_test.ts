// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Coordinator from '../../../../front_end/render_coordinator/render_coordinator.js';
import * as Resources from '../../../../front_end/resources/resources.js';
import * as Components from '../../../../front_end/ui/components/components.js';
import {assertShadowRoot, getElementWithinComponent, renderElementIntoDOM} from '../helpers/DOMHelpers.js';
import {getValuesOfAllBodyRows} from '../ui/components/DataGridHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

describe('TrustTokensView', () => {
  it('renders trust token data', async () => {
    const component = new Resources.TrustTokensView.TrustTokensView();
    renderElementIntoDOM(component);

    component.data = {
      tokens: [
        {issuerOrigin: 'foo.com', count: 42},
        {issuerOrigin: 'bar.org', count: 7},
      ],
    };
    // The data-grid's renderer is scheduled, so we need to wait until the coordinator
    // is done before we can test against it.
    await coordinator.done();

    const dataGridController = getElementWithinComponent(
        component, 'devtools-data-grid-controller', Components.DataGridController.DataGridController);
    const dataGrid = getElementWithinComponent(dataGridController, 'devtools-data-grid', Components.DataGrid.DataGrid);
    assertShadowRoot(dataGrid.shadowRoot);
    const rowValues = getValuesOfAllBodyRows(dataGrid.shadowRoot);
    assert.deepEqual(rowValues, [
      ['bar.org', '7'],
      ['foo.com', '42'],
    ]);
  });

  it('does not display issuers with zero stored tokens', async () => {
    const component = new Resources.TrustTokensView.TrustTokensView();
    renderElementIntoDOM(component);

    component.data = {
      tokens: [
        {issuerOrigin: 'no-issuer.org', count: 0},
        {issuerOrigin: 'foo.com', count: 42},
      ],
    };
    await coordinator.done();

    const dataGridController = getElementWithinComponent(
        component, 'devtools-data-grid-controller', Components.DataGridController.DataGridController);
    const dataGrid = getElementWithinComponent(dataGridController, 'devtools-data-grid', Components.DataGrid.DataGrid);
    assertShadowRoot(dataGrid.shadowRoot);
    const rowValues = getValuesOfAllBodyRows(dataGrid.shadowRoot);
    assert.deepEqual(rowValues, [['foo.com', '42']]);
  });
});
