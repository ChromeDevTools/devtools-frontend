// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../../../front_end/ui/components/report_view/report_view.js';
import * as UI from '../../../../../../front_end/ui/legacy/legacy.js';
import {
  assertElement,
  assertShadowRoot,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

async function makeView(
    storageKeyOrBucketInfo: string|Protocol.Storage.StorageBucketInfo,
    storageBucketsModel?: SDK.StorageBucketsModel.StorageBucketsModel) {
  const component = new ApplicationComponents.StorageMetadataView.StorageMetadataView();
  renderElementIntoDOM(component);
  if (storageBucketsModel) {
    component.enableStorageBucketControls(storageBucketsModel);
  }
  if (typeof storageKeyOrBucketInfo === 'string') {
    component.setStorageKey(storageKeyOrBucketInfo);
  } else {
    component.setStorageBucket(storageKeyOrBucketInfo);
  }
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

  it('renders with a bucket', async () => {
    const component = await makeView({
      bucket: {storageKey: 'https://example.com/^31', name: 'My Bucket'},
      id: 'BUCKET_ID',
      persistent: true,
      durability: Protocol.Storage.StorageBucketsDurability.Relaxed,
      quota: 4096,
      expiration: 42,
    });

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assertShadowRoot(report.shadowRoot);

    const titleElement = report.shadowRoot.querySelector('.report-title');
    assert.strictEqual(titleElement?.textContent, 'https://example.com');

    assertShadowRoot(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(
        keys, ['Origin', 'Is third-party', 'Bucket name', 'Is persistent', 'Durability', 'Quota', 'Expiration']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://example.com',
      'Yes, because the ancestry chain contains a third-party origin',
      'My Bucket',
      'Yes',
      'relaxed',
      '4.1 kB',
      (new Date(42000)).toLocaleString(),
    ]);
  });

  it('renders bucket controls', async () => {
    const storageBucketsModel = {
      deleteBucket: sinon.spy(),
      target: () => ({
        model: () => ({
          getBucketByName: () => null,
        }),
      }),
    };

    const storageBucket = {
      storageKey: 'https://example.com/^31',
      name: 'My Bucket',
    };

    const component = await makeView(
        {
          bucket: storageBucket,
          id: 'BUCKET_ID',
          persistent: true,
          durability: Protocol.Storage.StorageBucketsDurability.Relaxed,
          quota: 4096,
          expiration: 42,
        },
        storageBucketsModel as unknown as SDK.StorageBucketsModel.StorageBucketsModel);

    assertShadowRoot(component.shadowRoot);

    const buttons = component.shadowRoot.querySelectorAll('devtools-button');

    assert.strictEqual(buttons.length, 1);
    assertElement(buttons[0], HTMLElement);

    const deleteButton = buttons[0];
    assert.strictEqual(deleteButton.textContent?.trim(), 'Delete bucket');

    const showDialog = sinon.stub(UI.UIUtils.ConfirmDialog, 'show').resolves(true);
    deleteButton.click();
    assert.isTrue(showDialog.calledOnce);

    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(storageBucketsModel.deleteBucket.calledOnceWithExactly(storageBucket));
  });
});
