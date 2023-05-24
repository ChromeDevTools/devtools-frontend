// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../../../front_end/ui/components/report_view/report_view.js';
import {
  assertShadowRoot,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

async function makeView(storageKey: string) {
  const component = new ApplicationComponents.StorageMetadataView.StorageMetadataView();
  renderElementIntoDOM(component);
  component.setStorageKey(storageKey);
  await coordinator.done();
  return component;
}

describeWithLocale('SharedStorageMetadataView', () => {
  it('renders with an origin only', async () => {
    const component = await makeView('https://example.com/');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assertShadowRoot(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, 'https://example.com');

    assertShadowRoot(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'Origin',
    ]);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://example.com',
    ]);
  });

  it('renders with an top-level site', async () => {
    const component = await makeView('https://example.com/^0https://test.example');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assertShadowRoot(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, 'https://example.com');

    assertShadowRoot(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Origin', 'Top-level site', 'Is third-party']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(
        values,
        ['https://example.com', 'https://test.example', 'Yes, because the origin is outside of the top-level site']);
  });

  it('renders with an opaque top-level site', async () => {
    const component = await makeView('https://example.com/^43735928559^5110521^6');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assertShadowRoot(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, 'https://example.com');

    assertShadowRoot(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Origin', 'Top-level site', 'Is third-party', 'Is opaque']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://example.com',
      '(opaque)',
      'Yes, because the top-level site is opaque',
      'Yes, because the top-level site is opaque',
    ]);
  });

  it('renders with an opaque key', async () => {
    const component = await makeView('https://example.com/^13735928559^2110521');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assertShadowRoot(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, 'https://example.com');

    assertShadowRoot(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Origin', 'Is third-party', 'Is opaque']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, ['https://example.com', 'Yes, because the storage key is opaque', 'Yes']);
  });

  it('renders with a cross-site ancestor chain', async () => {
    const component = await makeView('https://example.com/^31');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assertShadowRoot(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, 'https://example.com');

    assertShadowRoot(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Origin', 'Is third-party']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, ['https://example.com', 'Yes, because the ancestry chain contains a third-party origin']);
  });
});
