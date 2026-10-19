// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {
  getCleanTextContentFromElements,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('ServiceWorkerCacheView', function() {
  let target: SDK.Target.Target;
  let cacheEntries: Protocol.CacheStorage.DataEntry[];
  let cacheStorageModel: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel;
  let cache: SDK.ServiceWorkerCacheModel.Cache;

  // Use a third-party storage key (origin + top-level site) to ensure high-signal metadata rendering.
  const testStorageKey = 'https://example.com/^0https://example.org';
  const testStorageBucket: Protocol.Storage.StorageBucket = {
    storageKey: testStorageKey,
  };

  function createTestEntry(overrides: Partial<Protocol.CacheStorage.DataEntry> = {}): Protocol.CacheStorage.DataEntry {
    return {
      requestURL: 'https://example.com/script.js',
      requestMethod: 'GET',
      requestHeaders: [],
      responseTime: 1700000000,
      responseStatus: 200,
      responseStatusText: 'OK',
      responseType: 'basic' as Protocol.CacheStorage.CachedResponseType,
      responseHeaders: [
        {name: 'content-type', value: 'application/javascript'},
        {name: 'content-length', value: '1234'},
        {name: 'vary', value: 'Accept-Encoding'},
      ],
      ...overrides,
    };
  }

  function waitForUpdate(view: Application.ServiceWorkerCacheViews.ServiceWorkerCacheView): Promise<void> {
    return new Promise<void>(resolve => {
      const stub = sinon.stub(view as unknown as {updatedForTest: () => void}, 'updatedForTest').callsFake(() => {
        stub.restore();
        resolve();
      });
    });
  }

  beforeEach(() => {
    cacheEntries = [];
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('CacheStorage.requestEntries', params => {
      const pathFilter = params.pathFilter ?? '';
      const filtered = cacheEntries.filter(entry => entry.requestURL.includes(pathFilter));
      return {cacheDataEntries: filtered, returnCount: filtered.length};
    });
    connection.setSuccessHandler('CacheStorage.requestCachedResponse', () => ({response: {body: ''}}));
    connection.setSuccessHandler('CacheStorage.deleteEntry', () => ({}));
    target = createTarget({connection});
    cacheStorageModel = new SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel(target);
    cache = new SDK.ServiceWorkerCacheModel.Cache(cacheStorageModel, testStorageBucket, 'test-cache',
                                                  'id' as Protocol.CacheStorage.CacheId);
  });

  it('creates the expected view structure with toolbar, metadata, grid, and details pane', () => {
    const view = new Application.ServiceWorkerCacheViews.ServiceWorkerCacheView(cacheStorageModel, cache);

    const toolbar = view.element.querySelector('devtools-toolbar');
    assert.isNotNull(toolbar, 'Expected a toolbar');

    const metadataView = view.element.querySelector('.storage-metadata-view');
    assert.isNotNull(metadataView, 'Expected a metadata view');

    const dataGrid = view.element.querySelector('.data-grid');
    assert.isNotNull(dataGrid, 'Expected a cache entries data grid');

    const detailsPane = view.element.querySelector('[slot="main"]');
    assert.isNotNull(detailsPane, 'Expected a details pane');
  });

  it('renders metadata with storage key when no bucket info is found', async () => {
    const view = new Application.ServiceWorkerCacheViews.ServiceWorkerCacheView(cacheStorageModel, cache);
    renderElementIntoDOM(view);

    const metadataView = view.element.querySelector('.storage-metadata-view');
    assert.isNotNull(metadataView);

    await UI.Widget.Widget.allUpdatesComplete;

    assert.isNotNull(metadataView.shadowRoot);
    const keys = getCleanTextContentFromElements(metadataView.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, ['Frame origin', 'Top-level site', 'Is third-party']);

    const values = getCleanTextContentFromElements(metadataView.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      'https://example.com',
      'https://example.org',
      'Yes, because the origin is outside of the top-level site',
    ]);

    view.detach();
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

    const metadataView = view.element.querySelector('.storage-metadata-view');
    assert.isNotNull(metadataView);

    await UI.Widget.Widget.allUpdatesComplete;

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

    view.detach();
  });

  it('updates when the cache is changed', async () => {
    let resolveUpdate: () => void;
    let updatedForTestPromise = new Promise<void>(resolve => {
      resolveUpdate = resolve;
    });

    const loadStub =
        sinon.stub(cacheStorageModel, 'loadAllCacheData').callsFake((_cache, _skipCount, callback) => callback([], 0));

    const updateStub = sinon
                           .stub(Application.ServiceWorkerCacheViews.ServiceWorkerCacheView.prototype as unknown as
                                     {updatedForTest: () => void},
                                 'updatedForTest')
                           .callsFake(() => {
                             resolveUpdate();
                           });

    const view = new Application.ServiceWorkerCacheViews.ServiceWorkerCacheView(cacheStorageModel, cache);
    view.markAsRoot();
    renderElementIntoDOM(view);

    try {
      await updatedForTestPromise;
      sinon.assert.calledOnce(loadStub);

      updatedForTestPromise = new Promise<void>(resolve => {
        resolveUpdate = resolve;
      });

      cacheStorageModel.dispatchEventToListeners(SDK.ServiceWorkerCacheModel.Events.CACHE_STORAGE_CONTENT_UPDATED,
                                                 {cacheName: cache.cacheName, storageBucket: cache.storageBucket});

      await updatedForTestPromise;
      sinon.assert.calledTwice(loadStub);
    } finally {
      view.detach();
      updateStub.restore();
    }
  });

  it('renders populated cache entries in the data grid and summary bar', async () => {
    cacheEntries = [
      createTestEntry(),
      createTestEntry({
        requestURL: 'https://example.com/image.png',
        responseType: 'opaqueResponse' as Protocol.CacheStorage.CachedResponseType,
        responseHeaders: [{name: 'content-type', value: 'image/png'}],
      }),
    ];

    const view = new Application.ServiceWorkerCacheViews.ServiceWorkerCacheView(cacheStorageModel, cache);
    const updatedPromise = waitForUpdate(view);
    view.markAsRoot();
    renderElementIntoDOM(view);

    try {
      await updatedPromise;
      await UI.Widget.Widget.allUpdatesComplete;

      const nameCells = getCleanTextContentFromElements(view.element, '.data-grid td.name-column');
      assert.deepEqual(nameCells, ['/script.js', '/image.png']);

      const responseTypeCells = getCleanTextContentFromElements(view.element, '.data-grid td.response-type-column');
      assert.deepEqual(responseTypeCells, ['basic', 'opaque']);

      const contentTypeCells = getCleanTextContentFromElements(view.element, '.data-grid td.content-type-column');
      assert.deepEqual(contentTypeCells, ['application/javascript', 'image/png']);

      const varyHeaderCells = getCleanTextContentFromElements(view.element, '.data-grid td.vary-header-column');
      assert.deepEqual(varyHeaderCells, ['Accept-Encoding', '']);

      const summaryBar = view.element.querySelector('.cache-storage-summary-bar');
      assert.isNotNull(summaryBar);
      assert.strictEqual(summaryBar.textContent, 'Total entries: 2');
    } finally {
      view.detach();
    }
  });

  it('filters entries by path and updates summary bar to show matching entries count', async () => {
    cacheEntries = [
      createTestEntry({requestURL: 'https://example.com/script.js'}),
      createTestEntry({requestURL: 'https://example.com/style.css'}),
    ];

    const view = new Application.ServiceWorkerCacheViews.ServiceWorkerCacheView(cacheStorageModel, cache);
    const initialUpdate = waitForUpdate(view);
    view.markAsRoot();
    renderElementIntoDOM(view);

    try {
      await initialUpdate;

      const filterUpdate = waitForUpdate(view);
      const filterPrompt = view.element.querySelector<HTMLElement>('.toolbar-input-prompt');
      assert.isNotNull(filterPrompt);
      filterPrompt.textContent = 'style';
      filterPrompt.dispatchEvent(new Event('input', {bubbles: true}));

      await filterUpdate;
      await UI.Widget.Widget.allUpdatesComplete;

      const nameCells = getCleanTextContentFromElements(view.element, '.data-grid td.name-column');
      assert.deepEqual(nameCells, ['/style.css']);

      const summaryBar = view.element.querySelector('.cache-storage-summary-bar');
      assert.isNotNull(summaryBar);
      assert.strictEqual(summaryBar.textContent, 'Matching entries: 1');
    } finally {
      view.detach();
    }
  });

  it('previews the selected entry and deletes it when the delete button is clicked', async () => {
    cacheEntries = [createTestEntry({requestURL: 'https://example.com/script.js'})];
    const deleteSpy = sinon.spy(cacheStorageModel, 'deleteCacheEntry');

    const view = new Application.ServiceWorkerCacheViews.ServiceWorkerCacheView(cacheStorageModel, cache);
    const updatedPromise = waitForUpdate(view);
    view.markAsRoot();
    renderElementIntoDOM(view);

    try {
      await updatedPromise;
      await UI.Widget.Widget.allUpdatesComplete;

      const row = view.element.querySelector<HTMLElement>('.data-grid tbody tr.data-grid-data-grid-node');
      assert.isNotNull(row);
      row.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
      await UI.Widget.Widget.allUpdatesComplete;

      const tabbedPane = view.element.querySelector('.tabbed-pane');
      assert.isNotNull(tabbedPane, 'Expected RequestView tabbed pane to be shown when an entry is selected');

      const deleteButton = view.element.querySelector<HTMLElement>('devtools-button[aria-label="Delete selected"]');
      assert.isNotNull(deleteButton);
      deleteButton.click();

      sinon.assert.calledOnceWithExactly(deleteSpy, cache, 'https://example.com/script.js');
    } finally {
      view.detach();
    }
  });

  it('persists the selected RequestView tab in settings only on user gesture', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'cache-storage-test', urlString`https://example.com/script.js`, Platform.DevToolsPath.EmptyUrlString, null);
    const viewStub = createViewFunctionStub(Application.ServiceWorkerCacheViews.RequestView);
    const requestView = new Application.ServiceWorkerCacheViews.RequestView(request, viewStub);
    await viewStub.nextInput;

    assert.strictEqual(viewStub.input.request, request);
    assert.strictEqual(viewStub.input.selectedTabId, 'preview');

    viewStub.input.onTabSelected('headers', /* isUserGesture= */ false);
    assert.strictEqual(Common.Settings.Settings.instance().createSetting('cache-storage-view-tab', 'preview').get(),
                       'preview');

    viewStub.input.onTabSelected('headers', /* isUserGesture= */ true);
    assert.strictEqual(Common.Settings.Settings.instance().createSetting('cache-storage-view-tab', 'preview').get(),
                       'headers');

    requestView.requestUpdate();
    await viewStub.nextInput;
    assert.strictEqual(viewStub.input.selectedTabId, 'headers');
  });
});
