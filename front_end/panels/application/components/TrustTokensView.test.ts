// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../core/sdk/sdk.js';
import {
  getCellByIndexes,
  getValuesOfAllBodyRows,
} from '../../../testing/DataGridHelpers.js';
import {
  dispatchClickEvent,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as ApplicationComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderTrustTokensView(): Promise<ApplicationComponents.TrustTokensView.TrustTokensView> {
  const component = new ApplicationComponents.TrustTokensView.TrustTokensView();
  renderElementIntoDOM(component);

  // The data-grid's renderer is scheduled, so we need to wait until the coordinator
  // is done before we can test against it.
  await coordinator.done({waitForWork: true});

  return component;
}

function getInternalDataGridShadowRoot(component: ApplicationComponents.TrustTokensView.TrustTokensView): ShadowRoot {
  const dataGridController = getElementWithinComponent(
      component, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  const dataGrid = getElementWithinComponent(dataGridController, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assert.isNotNull(dataGrid.shadowRoot);
  return dataGrid.shadowRoot;
}

describeWithMockConnection('TrustTokensView', () => {
  let target: SDK.Target.Target;

  beforeEach(() => {
    target = createTarget();
  });

  it('renders trust token data', async () => {
    sinon.stub(target.storageAgent(), 'invoke_getTrustTokens').resolves({
      tokens: [
        {issuerOrigin: 'foo.com', count: 42},
        {issuerOrigin: 'bar.org', count: 7},
      ],
      getError: () => undefined,
    });
    const component = await renderTrustTokensView();

    const dataGridShadowRoot = getInternalDataGridShadowRoot(component);
    const rowValues = getValuesOfAllBodyRows(dataGridShadowRoot);
    assert.deepEqual(rowValues, [
      ['bar.org', '7', ''],
      ['foo.com', '42', ''],
    ]);
  });

  it('does not display issuers with zero stored tokens', async () => {
    sinon.stub(target.storageAgent(), 'invoke_getTrustTokens').resolves({
      tokens: [
        {issuerOrigin: 'no-issuer.org', count: 0},
        {issuerOrigin: 'foo.com', count: 42},
      ],
      getError: () => undefined,
    });
    const component = await renderTrustTokensView();

    const dataGridShadowRoot = getInternalDataGridShadowRoot(component);
    const rowValues = getValuesOfAllBodyRows(dataGridShadowRoot);
    assert.deepEqual(rowValues, [['foo.com', '42', '']]);
  });

  it('removes trailing slashes from issuer origins', async () => {
    sinon.stub(target.storageAgent(), 'invoke_getTrustTokens').resolves({
      tokens: [
        {issuerOrigin: 'example.com/', count: 20},
        {issuerOrigin: 'sub.domain.org/', count: 14},
      ],
      getError: () => undefined,
    });
    const component = await renderTrustTokensView();

    const dataGridShadowRoot = getInternalDataGridShadowRoot(component);
    const rowValues = getValuesOfAllBodyRows(dataGridShadowRoot);
    assert.deepEqual(rowValues, [
      ['example.com', '20', ''],
      ['sub.domain.org', '14', ''],
    ]);
  });

  it('hides trust token table when there are no trust tokens', async () => {
    sinon.stub(target.storageAgent(), 'invoke_getTrustTokens').resolves({tokens: [], getError: () => undefined});
    const component = await renderTrustTokensView();

    const nullGridElement = component.shadowRoot!.querySelector('devtools-data-grid-controller');
    assert.isNull(nullGridElement);

    const noTrustTokensElement = component.shadowRoot!.querySelector('div.no-tt-message');
    assert.instanceOf(noTrustTokensElement, HTMLDivElement);
  });

  it('calls the delete handler with the right issuer when the delete button is clicked in a row', async () => {
    // Create a Promise that resolves with the issuer for which the delete button was clicked.
    sinon.stub(target.storageAgent(), 'invoke_getTrustTokens').resolves({
      tokens: [
        {issuerOrigin: 'bar.org', count: 42},
        {issuerOrigin: 'foo.com', count: 7},
      ],
      getError: () => undefined,
    });
    const clearTrustTokens = sinon.stub(target.storageAgent(), 'invoke_clearTrustTokens').resolves();

    const component = await renderTrustTokensView();

    const dataGridShadowRoot = getInternalDataGridShadowRoot(component);
    const deleteCell = getCellByIndexes(dataGridShadowRoot, {column: 2, row: 1});
    const deleteButtonComponent = deleteCell.querySelector('devtools-button');
    assert.instanceOf(deleteButtonComponent, HTMLElement);
    dispatchClickEvent(deleteButtonComponent);

    assert.isTrue(clearTrustTokens.calledOnceWith({issuerOrigin: 'bar.org'}));
  });
});
