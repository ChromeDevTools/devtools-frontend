// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../testing/MockConnection.js';

import * as Application from './application.js';

describeWithMockConnection('ServiceWorkerCacheView', function() {
  let target: SDK.Target.Target;
  let cacheStorageModel: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel;
  let cache: SDK.ServiceWorkerCacheModel.Cache;

  const testStorageBucket: Protocol.Storage.StorageBucket = {
    storageKey: 'https://example.com/',
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
});
