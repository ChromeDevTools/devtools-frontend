// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/kit/kit.js';

import * as Common from '../../../core/common/common.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import {
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../ui/components/report_view/report_view.js';
import * as UI from '../../../ui/legacy/legacy.js';

import * as ApplicationComponents from './components.js';

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
  await RenderCoordinator.done();
  return component;
}

describe('StorageMetadataView', () => {
  setupLocaleHooks();
  it('renders with an origin only', async () => {
    const component = await makeView('https://example.com/');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    const {textContent} = report.shadowRoot!.querySelector('.report-title')!;
    assert.strictEqual(textContent, 'https://example.com');

    assert.isNotNull(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, []);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, []);
  });

  it('renders with an top-level site', async () => {
    const component = await makeView('https://example.com/^0https://test.example');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    const {textContent} = report.shadowRoot!.querySelector('.report-title')!;
    assert.strictEqual(textContent, 'https://example.com');

    assert.isNotNull(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Frame origin', 'Top-level site', 'Is third-party']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(
        values,
        ['https://example.com', 'https://test.example', 'Yes, because the origin is outside of the top-level site']);
  });

  it('renders with an opaque top-level site', async () => {
    const component = await makeView('https://example.com/^43735928559^5110521^6');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    const {textContent} = report.shadowRoot!.querySelector('.report-title')!;
    assert.strictEqual(textContent, 'https://example.com');

    assert.isNotNull(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Top-level site', 'Is third-party', 'Is opaque']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      '(opaque)',
      'Yes, because the top-level site is opaque',
      'Yes, because the top-level site is opaque',
    ]);
  });

  it('renders with an opaque key', async () => {
    const component = await makeView('https://example.com/^13735928559^2110521');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    const {textContent} = report.shadowRoot!.querySelector('.report-title')!;
    assert.strictEqual(textContent, 'https://example.com');

    assert.isNotNull(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Is third-party', 'Is opaque']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, ['Yes, because the storage key is opaque', 'Yes']);
  });

  it('renders with a cross-site ancestor chain', async () => {
    const component = await makeView('https://example.com/^31');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    const {textContent} = report.shadowRoot!.querySelector('.report-title')!;
    assert.strictEqual(textContent, 'https://example.com');

    assert.isNotNull(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Is third-party']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, ['Yes, because the ancestry chain contains a third-party origin']);
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
    const {textContent} = report.shadowRoot!.querySelector('.report-title')!;
    assert.strictEqual(textContent, 'https://example.com');

    assert.isNotNull(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Is third-party', 'Bucket name', 'Is persistent', 'Durability', 'Quota', 'Expiration']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'Yes, because the ancestry chain contains a third-party origin',
      'My Bucket',
      'Yes',
      'relaxed',
      '4.1 kB',
      (new Date(42000)).toLocaleString(),
    ]);
  });

  it('renders with a top-level site that matches the origin', async () => {
    const component = await makeView('https://example.com/^0https://example.com');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    const {textContent} = report.shadowRoot!.querySelector('.report-title')!;
    assert.strictEqual(textContent, 'https://example.com');

    assert.isNotNull(component.shadowRoot);

    const keys = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Top-level site']);

    const values = getCleanTextContentFromElements(component.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, ['https://example.com']);
  });

  it('renders title with bucket name when storageBucketsModel is provided', async () => {
    const storageBucketsModel = {
      target: () => ({
        model: () => ({
          getBucketByName: () => null,
        }),
      }),
    } as unknown as SDK.StorageBucketsModel.StorageBucketsModel;

    const component = await makeView(
        {
          bucket: {storageKey: 'https://example.com/', name: 'My Bucket'},
          id: 'BUCKET_ID',
          persistent: true,
          durability: Protocol.Storage.StorageBucketsDurability.Relaxed,
          quota: 4096,
          expiration: 42,
        },
        storageBucketsModel);

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    const {textContent} = report.shadowRoot!.querySelector('.report-title')!;
    assert.strictEqual(textContent, 'My Bucket - https://example.com');
  });

  it('renders default bucket name in title when bucket name is empty', async () => {
    const storageBucketsModel = {
      target: () => ({
        model: () => ({
          getBucketByName: () => null,
        }),
      }),
    } as unknown as SDK.StorageBucketsModel.StorageBucketsModel;

    const component = await makeView(
        {
          bucket: {storageKey: 'https://example.com/', name: ''},
          id: 'BUCKET_ID',
          persistent: true,
          durability: Protocol.Storage.StorageBucketsDurability.Relaxed,
          quota: 4096,
          expiration: 42,
        },
        storageBucketsModel);

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    const {textContent} = report.shadowRoot!.querySelector('.report-title')!;
    assert.strictEqual(textContent, 'Default bucket - https://example.com');
  });

  it('renders with an emtpy string title', async () => {
    const component = await makeView('');

    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);
    assert.isNull(report.shadowRoot!.querySelector('.report-title'));
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

    const buttons = component.shadowRoot!.querySelectorAll('devtools-button');

    assert.lengthOf(buttons, 1);

    const [deleteButton] = buttons;
    assert.instanceOf(deleteButton, HTMLElement);
    assert.strictEqual(deleteButton.textContent!.trim(), 'Delete bucket');

    const showDialog = sinon.stub(UI.UIUtils.ConfirmDialog, 'show').resolves(true);
    deleteButton.click();
    sinon.assert.calledOnce(showDialog);

    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.calledOnceWithExactly(storageBucketsModel.deleteBucket, storageBucket);
  });

  it('renders bucket name as a link and reveals the bucket on click', async () => {
    const component = new ApplicationComponents.StorageMetadataView.StorageMetadataView();
    renderElementIntoDOM(component);
    const bucketInfo = {
      bucket: {
        storageKey: 'test-key',
        name: 'test-bucket',
      },
      id: 'test-id',
      expiration: 0,
      quota: 0,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Relaxed,
    };
    component.setStorageBucket(bucketInfo);
    component.setShowOnlyBucket(false);
    await RenderCoordinator.done();

    const report = component.shadowRoot!.querySelector('devtools-report');
    assert.exists(report);
    const link = report.querySelectorAll('devtools-report-value')[0].querySelector('devtools-link');
    assert.exists(link);
    assert.strictEqual(link.textContent?.trim(), 'test-bucket');

    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();
    link!.click();
    sinon.assert.calledOnce(revealStub);
    const revealArg = revealStub.firstCall.args[0];
    assert.instanceOf(revealArg, ApplicationComponents.StorageMetadataView.StorageBucketRevealInfo);
    assert.deepEqual(
        (revealArg as ApplicationComponents.StorageMetadataView.StorageBucketRevealInfo).bucketInfo, bucketInfo);
    revealStub.restore();
  });
});
