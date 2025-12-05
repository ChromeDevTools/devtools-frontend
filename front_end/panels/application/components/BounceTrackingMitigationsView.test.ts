// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getValuesOfAllBodyRows} from '../../../testing/DataGridHelpers.js';
import {
  assertScreenshot,
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../../testing/MockConnection.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as ApplicationComponents from './components.js';

async function renderBounceTrackingMitigationsView():
    Promise<ApplicationComponents.BounceTrackingMitigationsView.BounceTrackingMitigationsView> {
  const element = document.createElement('div');
  element.style.display = 'block';
  element.style.width = '640px';
  element.style.height = '480px';
  const component = new ApplicationComponents.BounceTrackingMitigationsView.BounceTrackingMitigationsView(element);
  renderElementIntoDOM(component);

  await component.updateComplete;
  // The data-grid's renderer is scheduled, so we need to wait until the coordinator
  // is done before we can test against it.
  await RenderCoordinator.done();

  return component;
}

function getInternalDataGridShadowRoot(
    component: ApplicationComponents.BounceTrackingMitigationsView.BounceTrackingMitigationsView): ShadowRoot {
  const dataGrid = component.element.shadowRoot!.querySelector('devtools-data-grid')!;
  assert.isNotNull(dataGrid.shadowRoot);
  return dataGrid.shadowRoot;
}

describeWithMockConnection('BounceTrackingMitigationsView', () => {
  it('shows no message or table if the force run button has not been clicked', async () => {
    createTarget();
    setMockConnectionResponseHandler('SystemInfo.getFeatureState', () => ({featureEnabled: true}));
    setMockConnectionResponseHandler('Storage.runBounceTrackingMitigations', () => ({deletedSites: []}));

    const component = await renderBounceTrackingMitigationsView();
    await RenderCoordinator.done();
    await component.updateComplete;

    const nullGridElement = component.element.shadowRoot!.querySelector('devtools-data-grid');
    assert.isNull(nullGridElement);

    await assertScreenshot('application/bounce-tracking-mitigations-view-initial.png');

    const sections = component.element.shadowRoot!.querySelectorAll('devtools-report-section');
    const sectionsText = Array.from(sections).map(section => section.textContent?.trim());
    const expected = [
      'Force run',
      'Learn more: Bounce Tracking Mitigations',
    ];

    assert.deepEqual(sectionsText, expected);
  });

  it('shows a message indicating that Bounce Tracking Mitigations are disabled', async () => {
    createTarget();
    setMockConnectionResponseHandler('SystemInfo.getFeatureState', () => ({featureEnabled: false}));

    const component = await renderBounceTrackingMitigationsView();
    await RenderCoordinator.done();
    await component.updateComplete;

    const nullGridElement = component.element.shadowRoot!.querySelector('devtools-data-grid');
    assert.isNull(nullGridElement);

    await assertScreenshot('application/bounce-tracking-mitigations-view-disabled.png');

    const sections = component.element.shadowRoot!.querySelectorAll('devtools-report-section');
    const sectionsText = Array.from(sections).map(section => section.textContent?.trim());
    const expected = [
      'Bounce tracking mitigations are disabled.',
    ];

    assert.deepEqual(sectionsText, expected);
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
    await RenderCoordinator.done();
    await component.updateComplete;

    const forceRunButton = component.element.shadowRoot!.querySelector('[aria-label="Force run"]');
    assert.instanceOf(forceRunButton, HTMLElement);
    dispatchClickEvent(forceRunButton);
    await runBounceTrackingMitigationsPromise;

    await RenderCoordinator.done();
    await component.updateComplete;

    await assertScreenshot('application/bounce-tracking-mitigations-view-empty.png');

    const nullGridElement = component.element.shadowRoot!.querySelector('devtools-data-grid');
    assert.isNull(nullGridElement);

    const sections = component.element.shadowRoot!.querySelectorAll('devtools-report-section');
    const sectionsText = Array.from(sections).map(section => section.textContent?.trim());
    const expected = [
      'Force run',
      'State was not cleared for any potential bounce tracking sites. Either none were identified or third-party cookies are not blocked.',
      'Learn more: Bounce Tracking Mitigations',
    ];

    assert.deepEqual(sectionsText, expected);
  });

  it('renders deleted sites in a table', async () => {
    createTarget();
    setMockConnectionResponseHandler('SystemInfo.getFeatureState', () => ({featureEnabled: true}));
    setMockConnectionResponseHandler(
        'Storage.runBounceTrackingMitigations', () => ({deletedSites: ['tracker-1.example', 'tracker-2.example']}));

    const component = await renderBounceTrackingMitigationsView();
    await RenderCoordinator.done();
    await component.updateComplete;

    const forceRunButton = component.element.shadowRoot!.querySelector('[aria-label="Force run"]');
    assert.instanceOf(forceRunButton, HTMLElement);
    dispatchClickEvent(forceRunButton);

    await RenderCoordinator.done({waitForWork: true});
    await component.updateComplete;

    await assertScreenshot('application/bounce-tracking-mitigations-view-populated.png');

    const dataGridShadowRoot = getInternalDataGridShadowRoot(component);
    const rowValues = getValuesOfAllBodyRows(dataGridShadowRoot);
    assert.deepEqual(rowValues, [
      ['tracker-1.example'],
      ['tracker-2.example'],
    ]);
  });
});
