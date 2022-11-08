// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../../../../front_end/generated/protocol.js';
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

describeWithLocale('SharedStorageMetadataView', () => {
  it('renders with a title and section headers', async () => {
    const component = new ApplicationComponents.SharedStorageMetadataView.SharedStorageMetadataReportView();
    renderElementIntoDOM(component);
    component.data = {
      creationTime: 10 as Protocol.Network.TimeSinceEpoch,
      length: 4,
      remainingBudget: 8.3,
    };

    assertShadowRoot(component.shadowRoot);
    await coordinator.done();
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assertShadowRoot(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, 'Shared Storage');

    const headers = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-section-header');
    assert.deepEqual(headers, [
      'Metadata',
      'Entries',
    ]);
  });

  it('renders report keys and values', async () => {
    const component = new ApplicationComponents.SharedStorageMetadataView.SharedStorageMetadataReportView();
    renderElementIntoDOM(component);
    component.origin = 'a.test';
    component.data = {
      creationTime: 10 as Protocol.Network.TimeSinceEpoch,
      length: 4,
      remainingBudget: 8.3,
    };

    assertShadowRoot(component.shadowRoot);
    await coordinator.done();
    await coordinator.done();  // 2nd call awaits async render

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'Origin',
      'Creation',
      'Budget',
      'Length',
    ]);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'a.test',
      (new Date(10 * 1e3)).toLocaleString(),
      '8.3',
      '4',
    ]);
  });

  it('renders default view when data is empty', async () => {
    const component = new ApplicationComponents.SharedStorageMetadataView.SharedStorageMetadataReportView();
    renderElementIntoDOM(component);
    component.data = {} as ApplicationComponents.SharedStorageMetadataView.SharedStorageMetadataViewData;

    assertShadowRoot(component.shadowRoot);
    await coordinator.done();
    await coordinator.done();  // 2nd call awaits async render

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'Origin',
      'Creation',
      'Budget',
      'Length',
    ]);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      '',
      '',
      '0',
      '0',
    ]);
  });
});
