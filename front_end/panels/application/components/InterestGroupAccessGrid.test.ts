// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../../generated/protocol.js';
import {getValuesOfAllBodyRows} from '../../../testing/DataGridHelpers.js';
import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as ApplicationComponents from './components.js';

async function renderInterestGroupAccessGrid(events: Protocol.Storage.InterestGroupAccessedEvent[]):
    Promise<ApplicationComponents.InterestGroupAccessGrid.InterestGroupAccessGrid> {
  const component = new ApplicationComponents.InterestGroupAccessGrid.InterestGroupAccessGrid();
  renderElementIntoDOM(component);
  component.data = events;

  // The data-grid's renderer is scheduled, so we need to wait until the coordinator
  // is done before we can test against it.
  await RenderCoordinator.done();

  return component;
}

function getInternalDataGridShadowRoot(
    component: ApplicationComponents.InterestGroupAccessGrid.InterestGroupAccessGrid): ShadowRoot {
  const dataGrid = component.shadowRoot!.querySelector('devtools-data-grid')!;
  assert.isNotNull(dataGrid.shadowRoot);
  return dataGrid.shadowRoot;
}

describeWithLocale('InterestGroupAccessGrid', () => {
  it('renders interest group access events', async () => {
    const component = await renderInterestGroupAccessGrid([
      {
        accessTime: 0,
        type: Protocol.Storage.InterestGroupAccessType.Bid,
        ownerOrigin: 'https://owner1.com',
        name: 'cars',
      },
      {
        accessTime: 10,
        type: Protocol.Storage.InterestGroupAccessType.Join,
        ownerOrigin: 'https://owner2.com',
        name: 'trucks',
      },
    ]);

    const dataGridShadowRoot = getInternalDataGridShadowRoot(component);
    const rowValues = getValuesOfAllBodyRows(dataGridShadowRoot);
    const expectedValues = [
      [(new Date(0 * 1e3)).toLocaleString(), 'bid', 'https://owner1.com', 'cars'],
      [(new Date(10 * 1e3)).toLocaleString(), 'join', 'https://owner2.com', 'trucks'],
    ];
    assert.deepEqual(rowValues, expectedValues);
  });

  it('hides interest group event table when there are no events', async () => {
    const component = await renderInterestGroupAccessGrid([]);

    const nullGridElement = component.shadowRoot!.querySelector('devtools-data-grid');
    assert.isNull(nullGridElement);

    const noEventsElement = component.shadowRoot!.querySelector('.empty-state');
    assert.instanceOf(noEventsElement, HTMLDivElement);
  });
});
