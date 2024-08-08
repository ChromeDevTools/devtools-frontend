// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getValuesOfAllBodyRows} from '../../../testing/DataGridHelpers.js';
import {
  dispatchClickEvent,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../../testing/MockConnection.js';
import * as DataGrid from '../../../ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as ApplicationComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderBounceTrackingMitigationsView():
    Promise<ApplicationComponents.BounceTrackingMitigationsView.BounceTrackingMitigationsView> {
  const component = new ApplicationComponents.BounceTrackingMitigationsView.BounceTrackingMitigationsView();
  renderElementIntoDOM(component);

  // The data-grid's renderer is scheduled, so we need to wait until the coordinator
  // is done before we can test against it.
  await coordinator.done();

  return component;
}

function getInternalDataGridShadowRoot(
    component: ApplicationComponents.BounceTrackingMitigationsView.BounceTrackingMitigationsView): ShadowRoot {
  const dataGridController = getElementWithinComponent(
      component, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  const dataGrid = getElementWithinComponent(dataGridController, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assert.isNotNull(dataGrid.shadowRoot);
  return dataGrid.shadowRoot;
}

describeWithMockConnection('BounceTrackingMitigationsView', () => {
  it('shows no message or table if the force run button has not been clicked', async () => {
    createTarget();
    setMockConnectionResponseHandler('SystemInfo.getFeatureState', () => ({featureEnabled: true}));
    setMockConnectionResponseHandler('Storage.runBounceTrackingMitigations', () => ({deletedSites: []}));

    const component = await renderBounceTrackingMitigationsView();
    await coordinator.done();

    const nullGridElement = component.shadowRoot!.querySelector('devtools-data-grid-controller');
    assert.isNull(nullGridElement);

    const sections = component.shadowRoot!.querySelectorAll('devtools-report-section');
    const sectionsText = Array.from(sections).map(section => section.textContent?.trim());
    const expected = [
      'Force run',
      'Learn more: Bounce Tracking Mitigations',
    ];

    assert.deepStrictEqual(sectionsText, expected);
  });

  it('shows a message explaining that Bounce Tracking Mitigations must be enabled to use the panel', async () => {
    createTarget();
    setMockConnectionResponseHandler('SystemInfo.getFeatureState', () => ({featureEnabled: false}));

    const component = await renderBounceTrackingMitigationsView();
    await coordinator.done();

    const nullGridElement = component.shadowRoot!.querySelector('devtools-data-grid-controller');
    assert.isNull(nullGridElement);

    const sections = component.shadowRoot!.querySelectorAll('devtools-report-section');
    const sectionsText = Array.from(sections).map(section => section.textContent?.trim());
    const expected = [
      'Bounce tracking mitigations are disabled. To enable them, set the flag at Bounce Tracking Mitigations Feature Flag to "Enabled With Deletion".',
    ];

    assert.deepStrictEqual(sectionsText, expected);
  });

  it('hides deleted sites table and shows explanation message when there are no deleted tracking sites', async () => {
    createTarget();
    setMockConnectionResponseHandler('SystemInfo.getFeatureState', () => ({featureEnabled: true}));
    const runBounceTrackingMitigationsPromise = new Promise(resolve => {
      setMockConnectionResponseHandler('Storage.runBounceTrackingMitigations', () => {
        resolve(undefined);
        return {deletedSites: []};
      });
    });

    const component = await renderBounceTrackingMitigationsView();
    await coordinator.done();

    const forceRunButton = component.shadowRoot!.querySelector('[aria-label="Force run"]');
    assert.instanceOf(forceRunButton, HTMLElement);
    dispatchClickEvent(forceRunButton);
    await runBounceTrackingMitigationsPromise;

    await coordinator.done();

    const nullGridElement = component.shadowRoot!.querySelector('devtools-data-grid-controller');
    assert.isNull(nullGridElement);

    const sections = component.shadowRoot!.querySelectorAll('devtools-report-section');
    const sectionsText = Array.from(sections).map(section => section.textContent?.trim());
    const expected = [
      'Force run',
      'State was not cleared for any potential bounce tracking sites. Either none were identified or third-party cookies are not blocked.',
      'Learn more: Bounce Tracking Mitigations',
    ];

    assert.deepStrictEqual(sectionsText, expected);
  });

  it('renders deleted sites in a table', async () => {
    createTarget();
    setMockConnectionResponseHandler('SystemInfo.getFeatureState', () => ({featureEnabled: true}));
    setMockConnectionResponseHandler(
        'Storage.runBounceTrackingMitigations', () => ({deletedSites: ['tracker-1.example', 'tracker-2.example']}));

    const component = await renderBounceTrackingMitigationsView();
    await coordinator.done();

    const forceRunButton = component.shadowRoot!.querySelector('[aria-label="Force run"]');
    assert.instanceOf(forceRunButton, HTMLElement);
    dispatchClickEvent(forceRunButton);

    await coordinator.done({waitForWork: true});

    const dataGridShadowRoot = getInternalDataGridShadowRoot(component);
    const rowValues = getValuesOfAllBodyRows(dataGridShadowRoot);
    assert.deepEqual(rowValues, [
      ['tracker-1.example'],
      ['tracker-2.example'],
    ]);
  });
});
