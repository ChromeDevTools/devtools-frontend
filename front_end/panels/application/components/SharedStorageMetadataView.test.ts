// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import {
  dispatchClickEvent,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../ui/components/report_view/report_view.js';

import * as ApplicationComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

function makeView(origin: string, metadata: Protocol.Storage.SharedStorageMetadata, resetBudget?: () => Promise<void>) {
  return new ApplicationComponents.SharedStorageMetadataView.SharedStorageMetadataView(
      {
        getMetadata: async () => metadata,
        resetBudget: resetBudget || (async () => {}),
      },
      origin);
}

describeWithLocale('SharedStorageMetadataView', () => {
  it('renders with a title', async () => {
    const component = makeView('https://a.test', {
      creationTime: 10 as Protocol.Network.TimeSinceEpoch,
      length: 4,
      remainingBudget: 8.3,
      bytesUsed: 200,
    });
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await coordinator.done();
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);

    const {textContent} = report.shadowRoot!.querySelector('.report-title')!;
    assert.strictEqual(textContent, 'Shared storage');
  });

  it('renders report keys and values', async () => {
    const component = makeView('https://a.test', {
      creationTime: 10 as Protocol.Network.TimeSinceEpoch,
      length: 4,
      remainingBudget: 8.3,
      bytesUsed: 200,
    });
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await coordinator.done({waitForWork: true});

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'Origin',
      'Creation Time',
      'Number of Entries',
      'Number of Bytes Used',
      'Entropy Budget for Fenced Frames',
    ]);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://a.test',
      (new Date(10 * 1e3)).toLocaleString(),
      '4',
      '200',
      '8.3',
    ]);
  });

  it('renders default view when data is empty', async () => {
    const component = makeView('', {} as Protocol.Storage.SharedStorageMetadata);
    renderElementIntoDOM(component);

    assert.isNotNull(component.shadowRoot);
    await coordinator.done({waitForWork: true});

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'Origin',
      'Creation Time',
      'Number of Entries',
      'Number of Bytes Used',
      'Entropy Budget for Fenced Frames',
    ]);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      '',
      'Not yet created',
      '0',
      '0',
      '0',
    ]);
  });

  it('renders reset budget button', async () => {
    const resetBudgetHandlerSpy = sinon.spy();
    const component = makeView(
        'https://a.test', {
          creationTime: 10 as Protocol.Network.TimeSinceEpoch,
          length: 4,
          remainingBudget: 8.3,
          bytesUsed: 200,
        },
        resetBudgetHandlerSpy);
    renderElementIntoDOM(component);

    await coordinator.done({waitForWork: true});

    const resetButtonComponent = component.shadowRoot!.querySelector('devtools-button');
    assert.instanceOf(resetButtonComponent, HTMLElement);
    dispatchClickEvent(resetButtonComponent);

    assert.isTrue(resetBudgetHandlerSpy.calledOnce);
  });
});
