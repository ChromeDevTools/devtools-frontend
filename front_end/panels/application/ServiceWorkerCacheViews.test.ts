// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';

import * as Application from './application.js';

describeWithMockConnection('ServiceWorkerCacheView', function() {
  let target: SDK.Target.Target;
  let cacheStorageModel: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel;
  let cache: SDK.ServiceWorkerCacheModel.Cache;

  // Use a third-party storage key (origin + top-level site) to ensure high-signal metadata rendering.
  const testStorageKey = 'https://example.com/^0https://example.org';
  const testStorageBucket: Protocol.Storage.StorageBucket = {
    storageKey: testStorageKey,
  };

  beforeEach(() => {
    target = createTarget();
    cacheStorageModel = new SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel(target);
    cache = new SDK.ServiceWorkerCacheModel.Cache(
        cacheStorageModel, testStorageBucket, 'test-cache', 'id' as Protocol.CacheStorage.CacheId);

    setMockConnectionResponseHandler('CacheStorage.requestEntries', () => ({cacheDataEntries: [], returnCount: 0}));
  });

  it('creates the expected view structure with toolbar, metadata, grid, and details pane', () => {
    const view = new Application.ServiceWorkerCacheViews.ServiceWorkerCacheView(cacheStorageModel, cache);

    const toolbar = view.element.querySelector('devtools-toolbar');
    assert.isNotNull(toolbar, 'Expected a toolbar');

    const metadataView = view.element.querySelector('devtools-storage-metadata-view');
    assert.isNotNull(metadataView, 'Expected a metadata view');

    const dataGrid = view.element.querySelector('.data-grid');
    assert.isNotNull(dataGrid, 'Expected a cache entries data grid');

    const detailsPane = view.element.querySelector('[slot="main"]');
    assert.isNotNull(detailsPane, 'Expected a details pane');
  });

  it('renders metadata with storage key when no bucket info is found', async () => {
    const view = new Application.ServiceWorkerCacheViews.ServiceWorkerCacheView(cacheStorageModel, cache);
    renderElementIntoDOM(view);

    const metadataView = view.element.querySelector('devtools-storage-metadata-view');
    assert.isNotNull(metadataView);

    await RenderCoordinator.done();

    assert.isNotNull(metadataView.shadowRoot);
    const keys = getCleanTextContentFromElements(metadataView.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Frame origin', 'Top-level site', 'Is third-party']);

    const values = getCleanTextContentFromElements(metadataView.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://example.com',
      'https://example.org',
      'Yes, because the origin is outside of the top-level site',
    ]);
  });

  it('renders metadata with storage bucket info when found', async () => {
    const storageBucketsModel = target.model(SDK.StorageBucketsModel.StorageBucketsModel);
    assert.isNotNull(storageBucketsModel);
    sinon.stub(storageBucketsModel, 'getBucketByName').returns({
      bucket: {storageKey: testStorageKey, name: 'test-bucket'},
      id: 'id',
      expiration: 42,
      quota: 1024,
      persistent: true,
      durability: 'strict' as Protocol.Storage.StorageBucketsDurability,
    });

    const view = new Application.ServiceWorkerCacheViews.ServiceWorkerCacheView(cacheStorageModel, cache);
    renderElementIntoDOM(view);

    const metadataView = view.element.querySelector('devtools-storage-metadata-view');
    assert.isNotNull(metadataView);

    await RenderCoordinator.done();

    assert.isNotNull(metadataView.shadowRoot);
    const keys = getCleanTextContentFromElements(metadataView.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'Frame origin',
      'Top-level site',
      'Is third-party',
      'Bucket name',
    ]);

    const values = getCleanTextContentFromElements(metadataView.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://example.com',
      'https://example.org',
      'Yes, because the origin is outside of the top-level site',
      'test-bucket',
    ]);
  });
});
